from datetime import date
from typing import Optional
from pydantic import BaseModel


class TariffOut(BaseModel):
    tariff_id: int
    name: str
    tariff_type: str
    rate_active: float
    rate_pause: float
    rate_km: float
    min_charge: float
    zone_id: Optional[int] = None
    status: str
    valid_from: date

    model_config = {"from_attributes": True}


class ZoneOut(BaseModel):
    zone_id: int
    name: str
    zone_type: str
    boundary: Optional[str] = None
    status: str

    model_config = {"from_attributes": True}
