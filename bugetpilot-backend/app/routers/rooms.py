# app/routers/rooms.py
from pathlib import Path
from typing import Dict, List, Optional

import pandas as pd
from fastapi import APIRouter, HTTPException, Query

from app.models import Room, RoomImage, RoomWithImages

router = APIRouter(prefix="/rooms", tags=["rooms"])

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
ROOMS_CSV = DATA_DIR / "dummy_rooms.csv"
IMAGES_CSV = DATA_DIR / "dummy_room_images.csv"

_rooms: List[Room] = []
_room_images: List[RoomImage] = []
_room_image_map: Dict[int, List[str]] = {}

def generate_korean_description(room_data) -> str:
    """숙소 정보를 바탕으로 한국어 설명 생성"""
    bedroom_count = room_data.get("bedroom_count", 0)
    bed_count = room_data.get("bed_count", 0)
    bathroom_count = room_data.get("bathroom_count", 0)
    headcount_capacity = room_data.get("headcount_capacity", 0)
    title = room_data.get("title", "")
    address = room_data.get("address", "")
    
    descriptions = []
    
    # 침실 정보
    if bedroom_count > 0:
        descriptions.append(f"{bedroom_count}개의 침실")
    
    # 침대 정보
    if bed_count > 0:
        descriptions.append(f"침대 {bed_count}개")
    
    # 욕실 정보
    if bathroom_count > 0:
        descriptions.append(f"욕실 {bathroom_count}개")
    
    # 수용 인원
    if headcount_capacity > 0:
        descriptions.append(f"최대 {headcount_capacity}인")
    
    # 기본 설명 생성
    if descriptions:
        base_desc = f"편안하고 깔끔한 숙소입니다. {'과 '.join(descriptions)}를 갖추고 있어 있습니다. "
    else:
        base_desc = "편안하고 깔끔한 숙소입니다. "
    
    # 숙소 타입별 추가 설명
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
    
    # 위치 정보 추가
    if address:
        # 시/도 추출
        if "서울" in address:
            base_desc += " 서울의 중심지 근처에 위치해 있어 관광과 쇼핑에 편리합니다."
        elif "부산" in address:
            base_desc += " 부산의 주요 관광지와 가까운 위치에 있습니다."
        elif "제주" in address:
            base_desc += " 제주의 아름다운 자연 속에서 여유로운 시간을 보낼 수 있습니다."
        elif "인천" in address:
            base_desc += " 인천국제공항과 가까워 출국 전후 숙박에 편리합니다."
    
    return base_desc

def load_data():
    global _rooms, _room_images, _room_image_map

    # --- rooms ---
    df_rooms = pd.read_csv(ROOMS_CSV)

    # room_id 없으면 index 기반으로 생성
    if "room_id" not in df_rooms.columns:
        df_rooms["room_id"] = df_rooms.index + 1

    _rooms = []
    for _, row in df_rooms.iterrows():
        room_data = {
            "bedroom_count": int(row.bedroom_count),
            "bed_count": int(row.bed_count),
            "bathroom_count": int(row.bathroom_count),
            "headcount_capacity": int(row.headcount_capacity),
            "title": row.title,
            "address": row.address,
        }
        
        # 한국어 설명 생성
        korean_description = generate_korean_description(room_data)
        
        _rooms.append(
            Room(
                room_id=int(row.room_id),
                host_id=int(row.host_id),
                title=row.title,
                description=korean_description,
                address=row.address,
                lat=float(row.lat),
                lng=float(row.lng),
                bathroom_count=int(row.bathroom_count),
                bed_count=int(row.bed_count),
                bedroom_count=int(row.bedroom_count),
                headcount_capacity=int(row.headcount_capacity),
                cleaning_fee=int(row.cleaning_fee),
                daily_price=int(row.daily_price),
                lodging_tax_ratio=float(row.lodging_tax_ratio),
                sale_ratio=float(row.sale_ratio),
                service_fee=int(row.service_fee),
                rating_star_score=float(row.rating_star_score),
                review_count=int(row.review_count),
            )
        )

    # --- room_images ---
    df_images = pd.read_csv(IMAGES_CSV)

    _room_images = []
    image_map: Dict[int, List[str]] = {}
    for _, row in df_images.iterrows():
        room_id = int(row.room_id)
        img = RoomImage(room_id=room_id, image_url=row.image_url)
        _room_images.append(img)
        image_map.setdefault(room_id, []).append(img.image_url)

    _room_image_map = image_map

# 모듈 import 될 때 한 번 로딩
load_data()

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
