from datetime import date
from typing import Optional
from pydantic import BaseModel


class DiscountOut(BaseModel):
    discount_id: int
    code: str
    type: str
    value: float
    valid_from: date
    valid_until: Optional[date] = None
    usage_limit: Optional[int] = None
    used_count: int
    is_active: bool

    model_config = {"from_attributes": True}
