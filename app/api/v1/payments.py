from typing import Optional
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_auth
from app.models.clients import Client
from app.models.payments import Payment
from app.models.rentals import Rental
from app.schemas.payments import PaymentOut
from app.services.audit_service import log_action

router = APIRouter()


class PaymentCreateRequest(BaseModel):
    rental_id: Optional[int] = None
    client_id: int
    amount: float
    payment_type: str


@router.post("/", response_model=PaymentOut, status_code=status.HTTP_201_CREATED)
def create_payment(body: PaymentCreateRequest, payload: dict = Depends(require_auth), db: Session = Depends(get_db)):
    if not payload["actor_type"].startswith("STAFF"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Staff only")

    if body.payment_type == "RENTAL" and body.rental_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rental ID required for RENTAL payment")

    client = db.query(Client).filter(Client.client_id == body.client_id).first()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    payment = Payment(
        rental_id=body.rental_id,
        client_id=body.client_id,
        amount=body.amount,
        payment_type=body.payment_type,
        status="COMPLETED",
    )
    db.add(payment)

    client.balance -= Decimal(str(body.amount))
    db.flush()

    log_action(
        db, "STAFF", int(payload["sub"]), "PAYMENT_CREATED",
        "payments", payment.payment_id,
        {"amount": str(body.amount), "type": body.payment_type},
    )
    return payment


@router.get("/", response_model=list[PaymentOut])
def list_payments(payload: dict = Depends(require_auth), db: Session = Depends(get_db)):
    if payload["actor_type"] == "CLIENT":
        return db.query(Payment).filter(Payment.client_id == int(payload["sub"])).all()
    return db.query(Payment).all()


@router.get("/{payment_id}", response_model=PaymentOut)
def get_payment(payment_id: int, payload: dict = Depends(require_auth), db: Session = Depends(get_db)):
    payment = db.query(Payment).filter(Payment.payment_id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")
    if payload["actor_type"] == "CLIENT" and payment.client_id != int(payload["sub"]):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your payment")
    return payment
