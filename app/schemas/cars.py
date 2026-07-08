from datetime import date
from typing import Optional
from pydantic import BaseModel


class CarOut(BaseModel):
    car_id: int
    plate_number: str
    brand: str
    model: str
    year: int
    color: Optional[str] = None
    car_class: str
    status: str
    mileage: int
    tariff_id: Optional[int] = None
    zone_id: Optional[int] = None
    last_service: Optional[date] = None
    lat: Optional[float] = None
    lng: Optional[float] = None

    model_config = {"from_attributes": True}
