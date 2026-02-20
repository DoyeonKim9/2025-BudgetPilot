# 식당(식품_일반음식점) + 카페(전국카페표준데이터) CSV 기반 API
from pathlib import Path
from typing import List, Optional

import pandas as pd
from fastapi import APIRouter, Query

router = APIRouter(prefix="/restaurants", tags=["restaurants"])

BACKEND_ROOT = Path(__file__).resolve().parent.parent.parent
DATA_DIR = Path(__file__).resolve().parent.parent / "data"
REST_CSV = BACKEND_ROOT / "식품_일반음식점.csv"
REST_CSV_ALT = BACKEND_ROOT / "식품_일반음식점_여행지역만.csv"
CAFE_CSV = BACKEND_ROOT / "전국카페표준데이터.csv"

_restaurants_df = None  # 식당 (필요 컬럼만)
_cafes_df = None

# CSV에 가격 없음 → 업태/유형별 참고 단가
DEFAULT_PRICE_REST = 12000
DEFAULT_PRICE_CAFE = 8000
PLACEHOLDER_IMAGE_REST = "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800"
PLACEHOLDER_IMAGE_CAFE = "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800"


def _load_data():
    global _restaurants_df, _cafes_df
    if _restaurants_df is not None:
        return
    try:
        rest_path = REST_CSV if REST_CSV.exists() else REST_CSV_ALT
        if not rest_path.exists():
            _restaurants_df = pd.DataFrame(columns=["사업장명", "_addr", "업태구분명"])
        else:
            # 식당: 필요한 컬럼만 로드 (필터 파일은 utf-8, 원본은 cp949)
            try:
                df_rest = pd.read_csv(
                    rest_path,
                    encoding="utf-8",
                    usecols=["사업장명", "도로명주소", "지번주소", "업태구분명"],
                    low_memory=False,
                )
            except (UnicodeDecodeError, KeyError):
                df_rest = pd.read_csv(
                    rest_path,
                    encoding="cp949",
                    usecols=["사업장명", "도로명주소", "지번주소", "업태구분명"],
                    low_memory=False,
                )
            df_rest = df_rest.dropna(subset=["사업장명"])
            df_rest["_addr"] = (df_rest["도로명주소"].fillna("") + " " + df_rest["지번주소"].fillna("")).str.strip()
            _restaurants_df = df_rest
    except Exception:
        _restaurants_df = pd.DataFrame(columns=["사업장명", "_addr", "업태구분명"])
    try:
        df_cafe = pd.read_csv(
            CAFE_CSV,
            encoding="cp949",
            usecols=["사업장명", "시도명", "시군구명", "소재지도로명주소"],
            low_memory=False,
        )
        df_cafe = df_cafe.dropna(subset=["사업장명"])
        df_cafe["_addr"] = (
            df_cafe["시도명"].fillna("") + " "
            + df_cafe["시군구명"].fillna("") + " "
            + df_cafe["소재지도로명주소"].fillna("")
        ).str.strip()
        _cafes_df = df_cafe
    except Exception:
        _cafes_df = pd.DataFrame(columns=["사업장명", "_addr"])


@router.get("")
@router.get("/")
def list_restaurants(
    city_keyword: Optional[str] = Query(None, description="지역 키워드 (예: 강릉, 마포구)"),
    max_price: Optional[int] = Query(None),
    limit: int = Query(50, ge=1, le=200),
):
    _load_data()
    results = []
    seen = set()

    def add_row(name: str, addr: str, type_label: str, base_price: int, image: str, idx: int):
        if not name or name.strip() in seen:
            return
        seen.add(name.strip())
        price = base_price + (idx % 5) * 2000
        if max_price is not None and price > max_price:
            return
        results.append({
            "id": f"rest-{len(results)}",
            "name": name.strip(),
            "type": type_label,
            "location": (addr or "").strip()[:80],
            "price": price,
            "description": f"{type_label}입니다. {addr[:50] if addr else ''}",
            "image": image,
            "rating": round(3.5 + (idx % 15) / 10, 1),
            "reviewCount": 50 + (idx % 200),
        })

    # 식당
    if _restaurants_df is not None and len(_restaurants_df) > 0:
        df = _restaurants_df
        if city_keyword:
            kw = city_keyword.strip()
            df = df[df["_addr"].str.contains(kw, na=False, case=False)]
        for i, row in df.head(limit).iterrows():
            add_row(
                str(row["사업장명"]),
                str(row.get("_addr", "")),
                str(row.get("업태구분명", "식당") or "식당"),
                DEFAULT_PRICE_REST,
                PLACEHOLDER_IMAGE_REST,
                i,
            )

    # 카페 (같은 키워드로)
    if _cafes_df is not None and len(_cafes_df) > 0 and len(results) < limit:
        df = _cafes_df
        if city_keyword:
            kw = city_keyword.strip()
            df = df[df["_addr"].str.contains(kw, na=False, case=False)]
        for i, row in df.head(limit - len(results)).iterrows():
            add_row(
                str(row["사업장명"]),
                str(row.get("_addr", "")),
                "카페",
                DEFAULT_PRICE_CAFE,
                PLACEHOLDER_IMAGE_CAFE,
                i + 10000,
            )

    return results[:limit]
