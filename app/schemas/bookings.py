from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class BookingOut(BaseModel):
    booking_id: int
    client_id: int
    car_id: int
    discount_id: Optional[int] = None
    created_at: datetime
    expires_at: datetime
    status: str

    model_config = {"from_attributes": True}
