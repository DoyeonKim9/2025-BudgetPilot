# app/models.py
from pydantic import BaseModel
from pydantic import Field
from typing import List

class Room(BaseModel):
    room_id: int            # 나중에 CSV에 없으면 index로 만들어도 됨
    host_id: int
    title: str
    description: str
    address: str
    lat: float
    lng: float
    bathroom_count: int
    bed_count: int
    bedroom_count: int
    headcount_capacity: int
    cleaning_fee: int
    daily_price: int
    lodging_tax_ratio: float
    sale_ratio: float
    service_fee: int
    rating_star_score: float
    review_count: int

class RoomImage(BaseModel):
    room_id: int
    image_url: str

class RoomWithImages(Room):
    images: List[str] = Field(default_factory=list)
