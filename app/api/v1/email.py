import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_auth
from app.models.clients import Client
from app.services.audit_service import log_action
from app.services.log_store import write_log

router = APIRouter()

_tokens: dict[str, dict] = {}


class VerifyRequest(BaseModel):
    email: str


class VerifyConfirmRequest(BaseModel):
    token: str


@router.post("/request")
def request_verification(body: VerifyRequest, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.email == body.email).first()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    if client.is_email_verified:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already verified")

    token = secrets.token_urlsafe(32)
    _tokens[token] = {
        "client_id": client.client_id,
        "expires": datetime.utcnow() + timedelta(hours=24),
    }

    write_log("INFO", f"Email verification token for {body.email}: {token}", {"client_id": client.client_id})

    return {
        "detail": "Verification email sent",
        "token": token,
        "expires_in": "24 hours",
        "verify_url": f"/api/v1/email/verify?token={token}",
    }


@router.post("/verify")
def verify_email(body: VerifyConfirmRequest, db: Session = Depends(get_db)):
    token_data = _tokens.get(body.token)
    if not token_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired token")

    if datetime.utcnow() > token_data["expires"]:
        del _tokens[body.token]
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Token expired")

    client = db.query(Client).filter(Client.client_id == token_data["client_id"]).first()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    client.is_email_verified = True
    if client.status == "PENDING":
        client.status = "ACTIVE"
    db.flush()

    del _tokens[body.token]

    log_action(db, "CLIENT", client.client_id, "EMAIL_VERIFIED", "clients", client.client_id)
    return {"detail": "Email verified successfully"}
