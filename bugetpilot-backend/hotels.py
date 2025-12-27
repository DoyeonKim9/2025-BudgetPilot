# app/routers/hotels.py
"""
호텔 검색/추천 라우터 (FastAPI)
- GET /hotels/health : 환경/키 상태
- GET /hotels/search : URL 파라미터(지역/예산)로 Amadeus 검색 + 필터링
- GET /hotels/recommend : 질문 플로우로 누적된 URL 전체(raw)를 받아
    GPT로 정규화 → Amadeus 검색 → 예산/거리/평점 기반 스코어링 후 추천
"""

from __future__ import annotations
import json
import math
import re
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query

from config import get_settings
from schemas import HotelSearchQuery, HotelItem
from services.amadeus import get_access_token, search_hotel_offers

router = APIRouter(prefix="/hotels", tags=["hotels"])
S = get_settings()

# ======================
# 공통 유틸
# ======================

def _nights(check_in: str, check_out: str) -> int:
    try:
        d1 = datetime.fromisoformat(check_in)
        d2 = datetime.fromisoformat(check_out)
        return max((d2 - d1).days, 1)
    except Exception:
        return 1

def _to_float(x: Any) -> float:
    try:
        if x is None:
            return float("nan")
        return float(x)
    except Exception:
        return float("nan")

def _flatten_offers(payload: Dict[str, Any]) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    for item in payload.get("data", []):
        hotel = item.get("hotel", {}) or {}
        offers = item.get("offers", []) or []
        for ofr in offers:
            p = ofr.get("price", {}) or {}
            rows.append({
                "hotel_name": hotel.get("name"),
                "hotel_id": hotel.get("hotelId"),
                "lat": hotel.get("latitude"),
                "lng": hotel.get("longitude"),
                "rating": hotel.get("rating"),
                "check_in": ofr.get("checkInDate"),
                "check_out": ofr.get("checkOutDate"),
                "board": (ofr.get("boardType") or "").upper(),
                "currency": p.get("currency"),
                "total": _to_float(p.get("total")),
                "base": _to_float(p.get("base")) if p.get("base") else None,
                "raw_price": p,
            })
    return rows

def _point_in_polygon(lat: float, lng: float, polygon_geojson: dict) -> bool:
    try:
        ring = polygon_geojson["coordinates"][0]
    except Exception:
        return True
    x, y = lng, lat
    inside = False
    for i in range(len(ring)):
        x1, y1 = ring[i][0], ring[i][1]
        x2, y2 = ring[(i + 1) % len(ring)][0], ring[(i + 1) % len(ring)][1]
        if (y1 > y) != (y2 > y):
            xinters = (x2 - x1) * (y - y1) / ((y2 - y1) + 1e-12) + x1
            if x < xinters:
                inside = not inside
    return inside

def _filter_region(rows: List[Dict[str, Any]], polygon: Optional[dict]) -> List[Dict[str, Any]]:
    if not polygon:
        return rows
    out: List[Dict[str, Any]] = []
    for r in rows:
        if r["lat"] is None or r["lng"] is None:
            continue
        if _point_in_polygon(float(r["lat"]), float(r["lng"]), polygon):
            out.append(r)
    return out

def _filter_budget(rows: List[Dict[str, Any]], *, nights: int, mode: str, bmin: float, bmax: float) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    for r in rows:
        if math.isnan(r["total"]):
            continue
        per_night = r["total"] / max(nights, 1)
        r["per_night"] = per_night
        if mode == "per_night":
            ok = (bmin <= per_night <= bmax)
        else:
            ok = (bmin <= r["total"] <= bmax)
        if ok:
            out.append(r)
    key = "per_night" if mode == "per_night" else "total"
    out.sort(key=lambda x: x[key])
    return out

def _dedup_min_by_hotel(rows: List[Dict[str, Any]], key: str) -> List[Dict[str, Any]]:
    best: Dict[str, Dict[str, Any]] = {}
    for r in rows:
        hid = r.get("hotel_id") or r.get("hotel_name") or "UNKNOWN"
        prev = best.get(hid)
        if (prev is None) or ((r.get(key) or 1e18) < (prev.get(key) or 1e18)):
            best[hid] = r
    return list(best.values())

def _haversine_km(lat1, lng1, lat2, lng2) -> float:
    import math
    R = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dlng/2)**2
    return 2 * R * math.asin(min(1, math.sqrt(a)))

def _score(h, target_per_night: float, lat: float, lng: float, 
           who: Optional[List[str]] = None, style: Optional[List[str]] = None) -> float:
    """
    숙박 추천 스코어 계산
    - 가격 근접성 (0.4)
    - 거리 (0.2)
    - 평점 (0.2)
    - 동행자 조건 매칭 (0.1)
    - 여행 스타일 매칭 (0.1)
    """
    try:
        price = float(h["per_night"])
    except Exception:
        return 0.0
    
    # 가격 점수: 예산에 가까울수록 높음
    price_diff = abs(price - target_per_night)
    price_score = max(0.0, 1.0 - price_diff / max(target_per_night, 1.0))
    
    # 거리 점수: 중심지에서 가까울수록 높음
    dist_km = 0.0
    if h.get("lat") and h.get("lng"):
        dist_km = _haversine_km(lat, lng, float(h["lat"]), float(h["lng"]))
    dist_score = max(0.0, 1.0 - (dist_km / 10.0))
    
    # 평점 점수: 높을수록 좋음
    try:
        rating = float(h.get("rating") or 0)
    except:
        rating = 0.0
    rating_score = min(1.0, rating / 5.0)
    
    # 동행자 조건 점수
    who_score = 1.0
    if who:
        hotel_name_lower = (h.get("hotel_name") or "").lower()
        # 동행자별 숙박 특성 매칭
        who_keywords = {
            "혼자": ["호스텔", "게스트하우스", "모텔"],
            "연인": ["리조트", "호텔", "펜션", "로맨틱"],
            "부모님": ["리조트", "호텔", "온천", "휴양"],
            "친구": ["호스텔", "게스트하우스", "펜션", "호텔"],
            "반려동물": ["펜션", "리조트", "펫"],
        }
        matches = 0
        for w in who:
            keywords = who_keywords.get(w, [])
            if any(kw in hotel_name_lower for kw in keywords):
                matches += 1
        if matches > 0:
            who_score = 0.5 + (matches / len(who)) * 0.5  # 0.5 ~ 1.0
    
    # 여행 스타일 조건 점수
    style_score = 1.0
    if style:
        hotel_name_lower = (h.get("hotel_name") or "").lower()
        board_type = (h.get("board") or "").upper()
        
        # 스타일별 숙박 특성 매칭
        style_keywords = {
            "힐링, 휴향": ["리조트", "스파", "온천", "휴양", "힐링"],
            "쇼핑": ["호텔", "도심", "쇼핑"],
            "액티비티": ["리조트", "펜션", "레저"],
            "감성, 핫플": ["호텔", "부티크", "디자인"],
            "맛집 탐방": ["호텔", "도심", "시내"],
            "명소 관람": ["호텔", "도심", "관광"],
        }
        matches = 0
        for s in style:
            keywords = style_keywords.get(s, [])
            if any(kw in hotel_name_lower for kw in keywords):
                matches += 1
        if matches > 0:
            style_score = 0.5 + (matches / len(style)) * 0.5  # 0.5 ~ 1.0
        
        # 보드 타입 매칭 (식사 포함 여부)
        if "맛집 탐방" in style and board_type in ["BB", "HB", "FB"]:
            style_score = min(1.0, style_score + 0.2)
    
    # 가중 평균 계산
    return (0.4 * price_score + 
            0.2 * dist_score + 
            0.2 * rating_score + 
            0.1 * who_score + 
            0.1 * style_score)

def _parse_latlng_fallback(region: str) -> dict:
    m = re.match(r"\s*([\-0-9.]+)\s*,\s*([\-0-9.]+)\s*$", region or "")
    if m:
        return {"lat": float(m.group(1)), "lng": float(m.group(2))}
    city = {
        "서울": {"lat": 37.5665, "lng": 126.9780},
        "부산": {"lat": 35.1796, "lng": 129.0756},
        "제주": {"lat": 33.4996, "lng": 126.5312},
        "인천": {"lat": 37.4563, "lng": 126.7052},
        "대구": {"lat": 35.8714, "lng": 128.6014},
        "대전": {"lat": 36.3504, "lng": 127.3845},
        "광주": {"lat": 35.1595, "lng": 126.8526},
        "울산": {"lat": 35.5384, "lng": 129.3114},
    }
    return city.get(region or "", city["서울"])

# ======================
# GPT 보조 정규화 (옵션)
# ======================

def _gpt_normalize_from_url(raw_url_or_query: dict | str) -> dict:
    """
    누적된 URL(querystring 전체)에서 여행 의도/예산/기간/지역 등을 추출해
    호텔 검색 파라미터로 정규화.
    - totalAmount / breakdown.숙소
    - period → nights
    - region → lat/lng
    - checkIn/checkOut 있으면 그대로 사용
    """
    # 키가 없다면 fallback: URL 직접 파싱
    if not getattr(S, "OPENAI_API_KEY", None):
        from urllib.parse import urlparse, parse_qs
        if isinstance(raw_url_or_query, str):
            qs = parse_qs(urlparse(raw_url_or_query).query)
        else:
            qs = raw_url_or_query
        region = (qs.get("region") or qs.get("regionIds") or ["서울"])[0]
        period = (qs.get("period") or ["1박2일"])[0]
        check_in = (qs.get("checkIn") or [None])[0]
        check_out = (qs.get("checkOut") or [None])[0]
        nights = 1 if "1박" in period else 2 if "2박" in period else 3 if "3박" in period else 1
        center = _parse_latlng_fallback(region)
        total = float((qs.get("totalAmount") or [0])[0] or 0)
        try:
            breakdown = json.loads((qs.get("breakdown") or ["{}"])[0])
        except Exception:
            breakdown = {}
        숙소예산 = float(breakdown.get("숙소") or total * 0.25)
        per_night = max(0.0, 숙소예산 / max(nights, 1))
        
        # who, style 파라미터 추출
        who_str = (qs.get("who") or [None])[0]
        who = who_str.split(",") if who_str else None
        
        style_str = (qs.get("style") or [None])[0]
        style = style_str.split(",") if style_str else None
        
        return {
            "region": region, "lat": center["lat"], "lng": center["lng"],
            "nights": nights, "adults": 2, "currency": "KRW",
            "budget_mode": "per_night", "budget_min": 0.0, "budget_max": per_night,
            "check_in": check_in, "check_out": check_out,
            "who": who, "style": style,
        }

    # GPT 사용 경로
    from openai import OpenAI
    client = OpenAI(api_key=S.OPENAI_API_KEY)

    city_map = {
        "서울": {"lat": 37.5665, "lng": 126.9780},
        "부산": {"lat": 35.1796, "lng": 129.0756},
        "제주": {"lat": 33.4996, "lng": 126.5312},
        "인천": {"lat": 37.4563, "lng": 126.7052},
        "대구": {"lat": 35.8714, "lng": 128.6014},
        "대전": {"lat": 36.3504, "lng": 127.3845},
        "광주": {"lat": 35.1595, "lng": 126.8526},
        "울산": {"lat": 35.5384, "lng": 129.3114},
    }

    system = (
        "You normalize a Korean trip URL into hotel search params. "
        "Use nights from period like '2박3일'. "
        "Map city names to coordinates if missing using provided city_map. "
        "budget_per_night = breakdown.숙소 / nights (fallback to totalAmount*0.25 / nights). "
        "Return JSON with keys: region, lat, lng, nights, adults, currency, "
        "budget_mode('per_night'), budget_min(0), budget_max, check_in, check_out."
    )
    tool = {
        "name": "set_params",
        "description": "Extract normalized hotel search params.",
        "parameters": {
            "type": "object",
            "properties": {
                "region": {"type": "string"},
                "lat": {"type": "number"},
                "lng": {"type": "number"},
                "nights": {"type": "integer"},
                "adults": {"type": "integer"},
                "currency": {"type": "string"},
                "budget_mode": {"type": "string", "enum": ["per_night","total"]},
                "budget_min": {"type": "number"},
                "budget_max": {"type": "number"},
                "check_in": {"type": "string"},
                "check_out": {"type": "string"},
                "who": {"type": "array", "items": {"type": "string"}},
                "style": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["region","lat","lng","nights","adults","currency","budget_mode","budget_min","budget_max"]
        }
    }

    user = raw_url_or_query if isinstance(raw_url_or_query, str) else json.dumps(raw_url_or_query, ensure_ascii=False)
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        temperature=0,
        messages=[
            {"role":"system","content":system},
            {"role":"system","content":"city_map = " + json.dumps(city_map, ensure_ascii=False)},
            {"role":"user","content":user}
        ],
        functions=[tool],
        function_call={"name":"set_params"},
    )
    args = json.loads(resp.choices[0].message.function_call.arguments or "{}")
    return args

# ======================
# 엔드포인트
# ======================

@router.get("/health")
def health():
    return {
        "ok": True,
        "env": S.AMADEUS_ENV,
        "has_openai_key": bool(getattr(S, "OPENAI_API_KEY", None)),
    }

@router.get("/search")
def search_hotels(
    lat: Optional[float] = Query(None),
    lng: Optional[float] = Query(None),
    radius_km: float = Query(10),
    polygon: Optional[str] = Query(None, description="GeoJSON Polygon (URL-encoded JSON)"),
    check_in: Optional[str] = Query(None),
    check_out: Optional[str] = Query(None),
    adults: int = Query(2, ge=1),
    currency: str = Query("KRW"),
    budget_mode: str = Query("per_night", pattern="^(per_night|total)$"),
    budget_min: float = Query(..., ge=0),
    budget_max: float = Query(..., ge=0),
    use_gpt: bool = Query(False),
    dedup: bool = Query(False),
):
    # 입력 검증 & 스키마 구성
    if lat is None or lng is None or not check_in or not check_out:
        raise HTTPException(status_code=400, detail="lat/lng/check_in/check_out은 필수입니다.")
    poly_json = None
    if polygon:
        try:
            poly_json = json.loads(polygon)
        except Exception:
            raise HTTPException(status_code=400, detail="polygon은 유효한 GeoJSON 문자열이어야 합니다.")
    q = HotelSearchQuery(
        lat=lat, lng=lng, radius_km=radius_km, polygon=poly_json,
        check_in=check_in, check_out=check_out, adults=adults,
        currency=currency, budget_mode=budget_mode,
        budget_min=budget_min, budget_max=budget_max,
    )

    token = get_access_token()
    payload = search_hotel_offers(
        token,
        latitude=q.lat, longitude=q.lng, radius=int(q.radius_km), radiusUnit="KM",
        checkInDate=q.check_in, checkOutDate=q.check_out,
        adults=q.adults, currency=q.currency,
        includeClosed="false", bestRateOnly="false",
    )

    rows = _flatten_offers(payload)
    if not rows:
        return {"count": 0, "items": []}

    rows = _filter_region(rows, q.polygon)
    nights = _nights(q.check_in, q.check_out)
    rows = _filter_budget(rows, nights=nights, mode=q.budget_mode, bmin=q.budget_min, bmax=q.budget_max)
    if not rows:
        return {"count": 0, "items": []}

    key = "per_night" if q.budget_mode == "per_night" else "total"
    if dedup:
        rows = _dedup_min_by_hotel(rows, key=key)

    items: List[Dict[str, Any]] = []
    for r in rows:
        item = HotelItem(
            hotel_name=r["hotel_name"],
            hotel_id=r.get("hotel_id"),
            lat=r.get("lat"),
            lng=r.get("lng"),
            rating=r.get("rating"),
            check_in=r["check_in"],
            check_out=r["check_out"],
            currency=r["currency"],
            total=r["total"],
            per_night=r["per_night"],
            board=r.get("board"),
            raw_price=r["raw_price"],
            source=f"Amadeus({S.AMADEUS_ENV})",
        ).model_dump()
        items.append(item)

    return {"count": len(items), "items": items[:100]}

@router.get("/recommend")
def recommend_hotels(
    raw: Optional[str] = Query(None, description="현재 프론트의 전체 URL(권장) 또는 querystring JSON"),
    top_k: int = Query(12, ge=1, le=50),
):
    """
    1) raw(URL 전체)를 GPT로 정규화 → 검색 파라미터 생성
    2) Amadeus 검색
    3) 예산(박당), 거리, 평점으로 스코어링 후 상위 K개 추천
    """
    # 1) 파라미터 정규화
    try:
        prefs = _gpt_normalize_from_url(raw or {})
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"파라미터 정규화 실패: {e}")

    # 날짜 보정: check_in/out 미전달 시 '오늘 + nights'
    ci = prefs.get("check_in")
    co = prefs.get("check_out")
    nights = int(prefs.get("nights", 1))
    if not ci or not co:
        start = datetime.utcnow().date()
        ci = start.isoformat()
        co = (start + timedelta(days=max(nights, 1))).isoformat()

    # 2) 검색
    token = get_access_token()
    payload = search_hotel_offers(
        token,
        latitude=float(prefs["lat"]), longitude=float(prefs["lng"]),
        radius=10, radiusUnit="KM",
        checkInDate=ci, checkOutDate=co,
        includeClosed="false", bestRateOnly="false",
        adults=int(prefs.get("adults", 2)),
        currency=prefs.get("currency", "KRW"),
    )

    offers = _flatten_offers(payload)
    if not offers:
        return {"params": prefs | {"check_in": ci, "check_out": co}, "count": 0, "items": [], "message": "조건에 맞는 호텔을 찾지 못했습니다."}

    # per-night 계산 및 예산 필터
    for r in offers:
        if not math.isnan(r["total"]):
            r["per_night"] = r["total"] / max(nights, 1)
        else:
            r["per_night"] = float("inf")

    bmax = float(prefs.get("budget_max", 1e12))
    filtered = [r for r in offers if r["per_night"] <= bmax]
    if not filtered:
        return {"params": prefs | {"check_in": ci, "check_out": co}, "count": 0, "items": [], "message": "예산 범위 내 결과가 없습니다."}

    # 스코어링(가격 0.4 + 거리 0.2 + 평점 0.2 + 동행자 0.1 + 스타일 0.1)
    who = prefs.get("who")
    style = prefs.get("style")
    for r in filtered:
        r["_score"] = _score(r, target_per_night=bmax, lat=float(prefs["lat"]), lng=float(prefs["lng"]),
                            who=who, style=style)
    filtered.sort(key=lambda x: (-x["_score"], x["per_night"]))

    top = filtered[:top_k]
    
    # 추천 이유 생성
    conditions = []
    if who:
        conditions.append(f"동행자({', '.join(who)})")
    if style:
        conditions.append(f"여행 스타일({', '.join(style)})")
    conditions_str = ", ".join(conditions) if conditions else ""
    
    reason = (
        f"예산(박당 ≤ {int(bmax):,}원), 지역({prefs['region']} 주변), 숙박 {nights}박 조건에 가장 잘 맞는 순으로 정렬했습니다. "
        f"가격 근접성(40%), 거리(20%), 평점(20%), 동행자 조건(10%), 여행 스타일(10%)을 종합 반영했습니다."
        + (f" {conditions_str} 조건을 고려했습니다." if conditions_str else "")
    )

    items = [{
        "hotel_name": r["hotel_name"],
        "hotel_id": r.get("hotel_id"),
        "lat": r.get("lat"),
        "lng": r.get("lng"),
        "rating": r.get("rating"),
        "check_in": ci,
        "check_out": co,
        "currency": r.get("currency"),
        "total": r.get("total"),
        "per_night": r.get("per_night"),
        "board": r.get("board"),
        "raw_price": r.get("raw_price"),
        "score": r["_score"],
        "source": f"Amadeus({S.AMADEUS_ENV})"
    } for r in top]

    return {"params": prefs | {"check_in": ci, "check_out": co}, "count": len(items), "items": items, "message": reason}
