from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class RentalOut(BaseModel):
    rental_id: int
    booking_id: int
    client_id: int
    car_id: int
    tariff_id: int
    started_at: datetime
    finished_at: Optional[datetime] = None
    active_minutes: int
    pause_minutes: int
    distance_km: float
    total_cost: Optional[float] = None
    status: str

    model_config = {"from_attributes": True}
