from typing import Optional
from pydantic import BaseModel


class StaffOut(BaseModel):
    staff_id: int
    full_name: str
    email: str
    phone: Optional[str] = None
    role: str
    status: str

    model_config = {"from_attributes": True}
