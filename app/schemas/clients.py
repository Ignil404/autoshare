from typing import Optional
from datetime import date
from pydantic import BaseModel, EmailStr


class ClientOut(BaseModel):
    client_id: int
    last_name: str
    first_name: str
    middle_name: Optional[str] = None
    birth_date: date
    phone: str
    email: str
    is_email_verified: bool
    license_number: str
    status: str
    balance: float

    model_config = {"from_attributes": True}


class ClientVerifyRequest(BaseModel):
    client_id: int
