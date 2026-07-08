from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class PaymentOut(BaseModel):
    payment_id: int
    rental_id: Optional[int] = None
    client_id: int
    amount: float
    payment_type: str
    status: str
    external_id: Optional[str] = None
    processed_at: datetime

    model_config = {"from_attributes": True}
