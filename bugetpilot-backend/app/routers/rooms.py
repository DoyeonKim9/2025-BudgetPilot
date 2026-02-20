# app/routers/rooms.py
import re
from pathlib import Path
from typing import Dict, List, Optional

import pandas as pd
from fastapi import APIRouter, HTTPException, Query

from app.models import Room, RoomImage, RoomWithImages

router = APIRouter(prefix="/rooms", tags=["rooms"])

# app 패키지 기준 data (app/data)
APP_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = APP_ROOT / "data"

ROOMS_CSV = DATA_DIR / "dummy_rooms.csv"
IMAGES_CSV = DATA_DIR / "dummy_room_images.csv"

# 백엔드 루트(/app) 기준
BACKEND_ROOT = APP_ROOT.parent  # .../app
CULTURE_FILENAME = "문화체육관광부_전국호텔현황_20230405.csv"

# 문화 CSV 후보 경로들 (여기가 핵심!)
CULTURE_CSV_CANDIDATES = [
    BACKEND_ROOT / CULTURE_FILENAME,                  # /app/파일명
    BACKEND_ROOT / "data" / CULTURE_FILENAME,         # /app/data/파일명  ✅ 너 레포 구조
    DATA_DIR / CULTURE_FILENAME,                      # /app/app/data/파일명
]

_rooms: List[Room] = []
_room_images: List[RoomImage] = []
_room_image_map: Dict[int, List[str]] = {}

STAR_DEFAULT_PRICE = {1: 35_000, 2: 55_000, 3: 80_000, 4: 120_000, 5: 180_000}
STAR_IMAGES = {
    1: ["https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800"],
    2: ["https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800"],
    3: ["https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800"],
    4: ["https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800"],
    5: ["https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800"],
}


def _star_from_grade(grade_str: str) -> int:
    if pd.isna(grade_str) or not isinstance(grade_str, str):
        return 3
    m = re.search(r"(\d)성", str(grade_str).strip())
    return int(m.group(1)) if m else 3


def generate_korean_description(room_data) -> str:
    bedroom_count = room_data.get("bedroom_count", 0)
    bed_count = room_data.get("bed_count", 0)
    bathroom_count = room_data.get("bathroom_count", 0)
    headcount_capacity = room_data.get("headcount_capacity", 0)
    title = room_data.get("title", "")
    address = room_data.get("address", "")

    descriptions = []
    if bedroom_count > 0:
        descriptions.append(f"{bedroom_count}개의 침실")
    if bed_count > 0:
        descriptions.append(f"침대 {bed_count}개")
    if bathroom_count > 0:
        descriptions.append(f"욕실 {bathroom_count}개")
    if headcount_capacity > 0:
        descriptions.append(f"최대 {headcount_capacity}인")

    if descriptions:
        base_desc = f"편안하고 깔끔한 숙소입니다. {'과 '.join(descriptions)}를 갖추고 있어 있습니다. "
    else:
        base_desc = "편안하고 깔끔한 숙소입니다. "

    title_lower = title.lower()
    if "호텔" in title or "hotel" in title_lower:
        base_desc += "전문적인 서비스와 깔끔한 객실을 제공합니다."
    elif "게스트하우스" in title or "guest" in title_lower:
        base_desc += "친근한 분위기에서 저렴하게 머무를 수 있는 게스트하우스입니다."
    elif "펜션" in title or "pension" in title_lower:
        base_desc += "아늑한 분위기의 펜션으로 휴식하기 좋은 공간입니다."
    elif "한옥" in title:
        base_desc += "전통 한옥의 아름다움을 경험할 수 있는 특별한 숙소입니다."
    elif "모텔" in title or "motel" in title_lower:
        base_desc += "합리적인 가격에 편리하게 이용할 수 있는 모텔입니다."
    elif "멘션" in title or "아파트" in title or "apartment" in title_lower:
        base_desc += "넓은 공간과 다양한 편의시설을 갖춘 아파트형 숙소입니다."
    else:
        base_desc += "편안한 휴식을 즐길 수 있는 숙소입니다."

    if address:
        if "서울" in address:
            base_desc += " 서울의 중심지 근처에 위치해 있어 관광과 쇼핑에 편리합니다."
        elif "부산" in address:
            base_desc += " 부산의 주요 관광지와 가까운 위치에 있습니다."
        elif "제주" in address:
            base_desc += " 제주의 아름다운 자연 속에서 여유로운 시간을 보낼 수 있습니다."
        elif "인천" in address:
            base_desc += " 인천국제공항과 가까워 출국 전후 숙박에 편리합니다."

    return base_desc


def _read_csv_robust(csv_path: Path) -> Optional[pd.DataFrame]:
    """encoding/strip까지 포함해서 최대한 안전하게 CSV 읽기"""
    if not csv_path.exists():
        return None

    # utf-8-sig 먼저 (BOM 대응)
    for enc in ("utf-8-sig", "utf-8", "cp949"):
        try:
            df = pd.read_csv(csv_path, encoding=enc)
            df.columns = df.columns.astype(str).str.strip()
            return df
        except Exception:
            continue
    return None


def _load_culture_hotels() -> bool:
    global _rooms, _room_images, _room_image_map

    csv_path = next((p for p in CULTURE_CSV_CANDIDATES if p.exists()), None)
    if not csv_path:
        return False

    df = _read_csv_robust(csv_path)
    if df is None:
        return False

    # 필수 컬럼(공백/변형 대비)
    required_cols = {"호텔명", "지역"}
    if not required_cols.issubset(set(df.columns)):
        return False

    _rooms = []
    _room_image_map = {}

    for idx, row in df.iterrows():
        star = _star_from_grade(str(row.get("결정 등급", "3성")))
        star = max(1, min(5, star))

        title = str(row.get("호텔명", "") or "").strip()
        address = str(row.get("주소", "") or "").strip()
        region = str(row.get("지역", "") or "").strip()
        if not title:
            continue

        room_count = 0
        try:
            room_count = int(float(row.get("객실수", 0) or 0))
        except Exception:
            room_count = 0

        daily_price = STAR_DEFAULT_PRICE.get(star, 80_000)
        if room_count > 0:
            daily_price = int(daily_price * (0.9 + (idx % 20) / 200.0))

        room_id = int(idx) + 1
        room_data = {
            "bedroom_count": 1,
            "bed_count": min(2, max(1, room_count // 50)) if room_count else 1,
            "bathroom_count": 1,
            "headcount_capacity": min(4, max(2, room_count // 30)) if room_count else 2,
            "title": title,
            "address": address or region,
        }
        korean_description = generate_korean_description(room_data)

        _rooms.append(
            Room(
                room_id=room_id,
                host_id=1,
                title=title,
                description=korean_description,
                address=address or region,
                lat=0.0,
                lng=0.0,
                bathroom_count=room_data["bathroom_count"],
                bed_count=room_data["bed_count"],
                bedroom_count=room_data["bedroom_count"],
                headcount_capacity=room_data["headcount_capacity"],
                cleaning_fee=0,
                daily_price=daily_price,
                lodging_tax_ratio=0.0,
                sale_ratio=0.0,
                service_fee=0,
                rating_star_score=float(star),
                review_count=room_count * 2 if room_count else 10,
            )
        )
        _room_image_map[room_id] = STAR_IMAGES.get(star, STAR_IMAGES[3])[:]

    _room_images = []
    return len(_rooms) > 0


def load_data():
    global _rooms, _room_images, _room_image_map

    # 1) 문화 CSV 우선
    if _load_culture_hotels():
        return

    # 2) fallback dummy
    df_rooms = _read_csv_robust(ROOMS_CSV)
    if df_rooms is None:
        _rooms = []
        _room_image_map = {}
        return

    if "room_id" not in df_rooms.columns:
        df_rooms["room_id"] = df_rooms.index + 1

    def _to_int(v, default=0):
        try:
            if pd.isna(v):
                return default
            return int(float(v))
        except Exception:
            return default

    def _to_float(v, default=0.0):
        try:
            if pd.isna(v):
                return default
            return float(v)
        except Exception:
            return default

    _rooms = []
    for _, row in df_rooms.iterrows():
        room_data = {
            "bedroom_count": _to_int(row.get("bedroom_count", 0)),
            "bed_count": _to_int(row.get("bed_count", 0)),
            "bathroom_count": _to_int(row.get("bathroom_count", 0)),
            "headcount_capacity": _to_int(row.get("headcount_capacity", 0)),
            "title": str(row.get("title", "") or ""),
            "address": str(row.get("address", "") or ""),
        }
        korean_description = generate_korean_description(room_data)

        _rooms.append(
            Room(
                room_id=_to_int(row.get("room_id", 0), 0),
                host_id=_to_int(row.get("host_id", 1), 1),
                title=room_data["title"],
                description=korean_description,
                address=room_data["address"],
                lat=_to_float(row.get("lat", 0.0)),
                lng=_to_float(row.get("lng", 0.0)),
                bathroom_count=room_data["bathroom_count"],
                bed_count=room_data["bed_count"],
                bedroom_count=room_data["bedroom_count"],
                headcount_capacity=room_data["headcount_capacity"],
                cleaning_fee=_to_int(row.get("cleaning_fee", 0)),
                daily_price=_to_int(row.get("daily_price", 0)),
                lodging_tax_ratio=_to_float(row.get("lodging_tax_ratio", 0.0)),
                sale_ratio=_to_float(row.get("sale_ratio", 0.0)),
                service_fee=_to_int(row.get("service_fee", 0)),
                rating_star_score=_to_float(row.get("rating_star_score", 0.0)),
                review_count=_to_int(row.get("review_count", 0)),
            )
        )

    df_images = _read_csv_robust(IMAGES_CSV)
    _room_images = []
    image_map: Dict[int, List[str]] = {}
    if df_images is not None and {"room_id", "image_url"}.issubset(set(df_images.columns)):
        for _, row in df_images.iterrows():
            room_id = _to_int(row.get("room_id"))
            image_url = str(row.get("image_url", "") or "")
            if room_id and image_url:
                img = RoomImage(room_id=room_id, image_url=image_url)
                _room_images.append(img)
                image_map.setdefault(room_id, []).append(img.image_url)

    _room_image_map = image_map


@router.get("", response_model=List[RoomWithImages])
@router.get("/", response_model=List[RoomWithImages])
def list_rooms(
    city_keyword: Optional[str] = Query(None, description="주소/도시 검색 키워드"),
    max_price: Optional[int] = Query(None),
    min_rating: Optional[float] = Query(None),
    include_images: Optional[int] = Query(1, ge=0, le=10, description="각 숙소별 포함할 이미지 수"),
):
    data = _rooms

    if city_keyword:
        key = city_keyword.lower()
        data = [r for r in data if key in r.address.lower() or key in r.title.lower()]

    if max_price is not None:
        data = [r for r in data if r.daily_price <= max_price]

    if min_rating is not None:
        data = [r for r in data if r.rating_star_score >= min_rating]

    result: List[RoomWithImages] = []
    for room in data:
        images = _room_image_map.get(room.room_id, [])
        if include_images and include_images > 0:
            images = images[: include_images]
        else:
            images = []
        result.append(RoomWithImages(**room.dict(), images=images))

    return result


@router.get("/{room_id}", response_model=RoomWithImages)
def get_room(room_id: int):
    room = next((r for r in _rooms if r.room_id == room_id), None)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    images = _room_image_map.get(room_id, [])
    return RoomWithImages(**room.dict(), images=images)


# 서버 시작 시 로딩
load_data()