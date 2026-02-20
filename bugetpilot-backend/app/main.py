# backend/app/main.py
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional

# 1) 앱 생성
app = FastAPI(title="Backend API")

# 2) CORS 미들웨어 추가 (app 생성 이후)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.routers import rooms, schedule

# GET /rooms (끝에 슬래시 없음) 명시 등록 — 일부 환경에서 404 방지
@app.get("/rooms")
def get_rooms(
    city_keyword: Optional[str] = Query(None),
    max_price: Optional[int] = Query(None),
    min_rating: Optional[float] = Query(None),
    include_images: Optional[int] = Query(1, ge=0, le=10),
):
    return rooms.list_rooms(city_keyword, max_price, min_rating, include_images)

app.include_router(rooms.router)
app.include_router(schedule.router)

# 3) 라우터 등록
import hotels  # import는 app 생성 후에
app.include_router(hotels.router)

# (옵션) 루트 핑
@app.get("/")
def root():
    return {"ok": True}
