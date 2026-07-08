from typing import Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.database import get_db
from app.core.dependencies import require_auth
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.clients import Client
from app.models.staff import Staff
from app.services.audit_service import log_action

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


class RegisterRequest(BaseModel):
    last_name: str
    first_name: str
    middle_name: Optional[str] = None
    birth_date: date
    phone: str
    email: EmailStr
    password: str
    license_number: str
    license_issued: date


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


@limiter.limit("10/minute")
@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(request: Request, body: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(Client).filter(
        (Client.email == body.email) | (Client.phone == body.phone)
    ).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email or phone already registered")

    client = Client(
        last_name=body.last_name,
        first_name=body.first_name,
        middle_name=body.middle_name,
        birth_date=body.birth_date,
        phone=body.phone,
        email=body.email,
        password_hash=hash_password(body.password),
        license_number=body.license_number,
        license_issued=body.license_issued,
    )
    db.add(client)
    db.flush()

    log_action(db, "CLIENT", client.client_id, "REGISTER", "clients", client.client_id)

    access = create_access_token(str(client.client_id), "CLIENT")
    refresh = create_refresh_token(str(client.client_id), "CLIENT")
    return TokenResponse(access_token=access, refresh_token=refresh)


@limiter.limit("5/minute")
@router.post("/login", response_model=TokenResponse)
def login(request: Request, body: LoginRequest, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.email == body.email).first()
    if not client or not verify_password(body.password, client.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if client.status == "BLOCKED":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account blocked")

    access = create_access_token(str(client.client_id), "CLIENT")
    refresh = create_refresh_token(str(client.client_id), "CLIENT")
    return TokenResponse(access_token=access, refresh_token=refresh)


@limiter.limit("5/minute")
@router.post("/staff/login", response_model=TokenResponse)
def staff_login(request: Request, body: LoginRequest, db: Session = Depends(get_db)):
    staff = db.query(Staff).filter(Staff.email == body.email).first()
    if not staff or not verify_password(body.password, staff.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if staff.status == "BLOCKED":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account blocked")

    access = create_access_token(str(staff.staff_id), f"STAFF:{staff.role}")
    refresh = create_refresh_token(str(staff.staff_id), f"STAFF:{staff.role}")
    return TokenResponse(access_token=access, refresh_token=refresh)


class RefreshRequest(BaseModel):
    refresh_token: str


@router.post("/refresh", response_model=TokenResponse)
def refresh(body: RefreshRequest):
    payload = decode_token(body.refresh_token)
    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    access = create_access_token(payload["sub"], payload["actor_type"])
    refresh = create_refresh_token(payload["sub"], payload["actor_type"])
    return TokenResponse(access_token=access, refresh_token=refresh)


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


@router.post("/change-password")
def change_password(body: ChangePasswordRequest, payload: dict = Depends(require_auth), db: Session = Depends(get_db)):
    if len(body.new_password) < 6:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must be at least 6 characters")

    if payload["actor_type"] == "CLIENT":
        user = db.query(Client).filter(Client.client_id == int(payload["sub"])).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        if not verify_password(body.old_password, user.password_hash):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect current password")
        user.password_hash = hash_password(body.new_password)
    elif payload["actor_type"].startswith("STAFF"):
        user = db.query(Staff).filter(Staff.staff_id == int(payload["sub"])).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        if not verify_password(body.old_password, user.password_hash):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect current password")
        user.password_hash = hash_password(body.new_password)
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unknown actor type")

    db.flush()
    log_action(db, payload["actor_type"].split(":")[0], int(payload["sub"]), "PASSWORD_CHANGED", "auth", int(payload["sub"]))
    return {"detail": "Password changed successfully"}
