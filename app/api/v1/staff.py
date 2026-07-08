from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_auth
from app.core.security import hash_password
from app.models.staff import Staff
from app.schemas.staff import StaffOut
from app.services.audit_service import log_action

router = APIRouter()


class StaffCreateRequest(BaseModel):
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    password: str
    role: str


@router.get("/", response_model=list[StaffOut])
def list_staff(payload: dict = Depends(require_auth), db: Session = Depends(get_db)):
    if payload["actor_type"] != "STAFF:ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    return db.query(Staff).all()


@router.post("/", response_model=StaffOut, status_code=status.HTTP_201_CREATED)
def create_staff(body: StaffCreateRequest, payload: dict = Depends(require_auth), db: Session = Depends(get_db)):
    if payload["actor_type"] != "STAFF:ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")

    if db.query(Staff).filter(Staff.email == body.email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already taken")

    staff = Staff(
        full_name=body.full_name,
        email=body.email,
        phone=body.phone,
        password_hash=hash_password(body.password),
        role=body.role,
    )
    db.add(staff)
    db.flush()

    log_action(
        db, "STAFF", int(payload["sub"]), "STAFF_CREATED",
        "staff", staff.staff_id,
        {"role": body.role},
    )
    return staff


@router.post("/{staff_id}/block", response_model=StaffOut)
def block_staff(staff_id: int, payload: dict = Depends(require_auth), db: Session = Depends(get_db)):
    if payload["actor_type"] != "STAFF:ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")

    staff = db.query(Staff).filter(Staff.staff_id == staff_id).first()
    if not staff:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff not found")

    staff.status = "BLOCKED"
    db.flush()

    log_action(
        db, "STAFF", int(payload["sub"]), "STAFF_BLOCKED",
        "staff", staff.staff_id,
    )
    return staff
