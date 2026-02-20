# app/routers/rooms.py
import re
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


def _read_csv_robust(path: Path) -> pd.DataFrame:
    """
    인코딩/구분자/컬럼 공백 등을 최대한 견고하게 처리.
    """
    # 1) utf-8 시도 → 실패하면 cp949
    try:
        df = pd.read_csv(path, encoding="utf-8")
    except UnicodeDecodeError:
        df = pd.read_csv(path, encoding="cp949")

    # 컬럼명 strip
    df.columns = df.columns.astype(str).str.strip()

    # 만약 컬럼이 1개로 합쳐져 있으면(구분자 문제) -> 쉼표로 다시 읽어보기
    if len(df.columns) == 1:
        try:
            df = pd.read_csv(path, encoding="cp949", sep=",")
            df.columns = df.columns.astype(str).str.strip()
        except Exception:
            pass

    return df


def _load_culture_hotels() -> bool:
    """
    문화체육관광부 전국 호텔 현황 CSV 로드.
    - 경로를 함수 안에서 직접 계산(스코프 문제 제거)
    - 후보 경로 다양화
    - columns strip/encoding 처리
    - Railway에서 파일이 실제로 들어왔는지 로그로 확인 가능
    """
    global _rooms, _room_images, _room_image_map

    # ✅ 후보 경로를 "함수 안에서" 계산 (스코프 에러 제거)
    backend_root = Path(__file__).resolve().parent.parent.parent  # .../budgetpilot-backend
    data_dir = Path(__file__).resolve().parent.parent / "data"    # .../budgetpilot-backend/app/data

    filename = "문화체육관광부_전국호텔현황_20230405.csv"

    culture_candidates = [
        backend_root / filename,          # budgetpilot-backend/파일.csv
        backend_root / "data" / filename, # budgetpilot-backend/data/파일.csv  ← 너 현재 구조
        data_dir / filename,              # budgetpilot-backend/app/data/파일.csv
    ]

    csv_path = next((p for p in culture_candidates if p.exists()), None)

    # ✅ 디버그 로그
    print("[CULTURE] candidates:", [str(p) for p in culture_candidates])
    print("[CULTURE] exists:", [(str(p), p.exists()) for p in culture_candidates])
    print("[CULTURE] chosen:", str(csv_path))

    if not csv_path:
        return False

    try:
        df = _read_csv_robust(csv_path)
    except Exception as e:
        print("[CULTURE] read failed:", repr(e))
        return False

    print("[CULTURE] columns:", list(df.columns))
    print("[CULTURE] rows:", len(df))

    # ✅ 컬럼명 strip했는데도 혹시 다른 이름이면 대비 (너 CSV 헤더 확인)
    # 기대: "호텔명", "지역" / 혹은 "호텔명 ", " 지역" 같은 경우 strip로 해결됨
    if "호텔명" not in df.columns or "지역" not in df.columns:
        print("[CULTURE] missing required columns:", {"호텔명": "호텔명" in df.columns, "지역": "지역" in df.columns})
        return False

    if len(df) == 0:
        print("[CULTURE] empty dataframe")
        return False

    # ✅ 실제 파싱
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

        description = f"{region} {star}성급 호텔입니다. 객실 {room_count}개 보유."

        room_id = idx + 1
        _rooms.append(
            Room(
                room_id=room_id,
                host_id=1,
                title=title,
                description=description,
                address=address or region,
                lat=0.0,
                lng=0.0,
                bathroom_count=1,
                bed_count=min(2, max(1, room_count // 50)) if room_count else 1,
                bedroom_count=1,
                headcount_capacity=min(4, max(2, room_count // 30)) if room_count else 2,
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