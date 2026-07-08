from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class MaintenanceOut(BaseModel):
    maintenance_id: int
    car_id: int
    work_type: str
    description: Optional[str] = None
    assigned_to_staff_id: Optional[int] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    status: str
    mileage_at_open: Optional[int] = None

    model_config = {"from_attributes": True}
