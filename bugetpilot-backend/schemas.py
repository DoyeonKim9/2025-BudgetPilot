# app/schemas.py
from pydantic import BaseModel
from typing import Optional, Dict, Any

class HotelSearchQuery(BaseModel):
    lat: float
    lng: float
    radius_km: float = 10
    polygon: Optional[Dict[str, Any]] = None
    check_in: str
    check_out: str
    adults: int = 2
    currency: str = "KRW"
    budget_mode: str = "per_night"  # "per_night" or "total"
    budget_min: float
    budget_max: float

class HotelItem(BaseModel):
    hotel_name: str
    hotel_id: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    rating: Optional[float] = None
    check_in: str
    check_out: str
    currency: str
    total: float
    per_night: float
    board: Optional[str] = None
    raw_price: Optional[Dict[str, Any]] = None
    source: Optional[str] = None
    score: Optional[float] = None





