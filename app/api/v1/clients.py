from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_auth
from app.models.bookings import Booking
from app.models.clients import Client
from app.models.payments import Payment
from app.models.rentals import Rental
from app.schemas.clients import ClientOut, ClientVerifyRequest
from app.schemas.payments import PaymentOut
from app.services.audit_service import log_action

router = APIRouter()


@router.get("/me", response_model=ClientOut)
def get_me(payload: dict = Depends(require_auth), db: Session = Depends(get_db)):
    if payload["actor_type"] != "CLIENT":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Client only")

    client = db.query(Client).filter(Client.client_id == int(payload["sub"])).first()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    return client


@router.get("/me/stats")
def get_me_stats(payload: dict = Depends(require_auth), db: Session = Depends(get_db)):
    if payload["actor_type"] != "CLIENT":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Client only")

    client_id = int(payload["sub"])
    client = db.query(Client).filter(Client.client_id == client_id).first()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    total_bookings = db.query(Booking).filter(Booking.client_id == client_id).count()
    active_bookings = db.query(Booking).filter(Booking.client_id == client_id, Booking.status == "CREATED").count()
    total_rentals = db.query(Rental).filter(Rental.client_id == client_id).count()
    active_rentals = db.query(Rental).filter(Rental.client_id == client_id, Rental.status.in_(["ACTIVE", "PAUSED"])).count()
    completed_rentals = db.query(Rental).filter(Rental.client_id == client_id, Rental.status == "COMPLETED").count()

    from sqlalchemy import func as sqlfunc
    total_spent = db.query(sqlfunc.coalesce(sqlfunc.sum(Rental.total_cost), 0)).filter(
        Rental.client_id == client_id, Rental.status == "COMPLETED"
    ).scalar()

    return {
        "balance": float(client.balance),
        "total_bookings": total_bookings,
        "active_bookings": active_bookings,
        "total_rentals": total_rentals,
        "active_rentals": active_rentals,
        "completed_rentals": completed_rentals,
        "total_spent": float(total_spent),
    }


class ClientTopUpRequest(BaseModel):
    amount: float


@router.post("/me/topup", response_model=ClientOut)
def topup_me(body: ClientTopUpRequest, payload: dict = Depends(require_auth), db: Session = Depends(get_db)):
    if payload["actor_type"] != "CLIENT":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Client only")

    if body.amount <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Amount must be positive")

    if body.amount > 10000:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Maximum top-up is 10000 BYN")

    client = db.query(Client).filter(Client.client_id == int(payload["sub"])).first()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    from decimal import Decimal
    client.balance = float(Decimal(str(client.balance)) + Decimal(str(body.amount)))

    payment = Payment(
        client_id=client.client_id,
        amount=body.amount,
        payment_type="TOPUP",
        status="COMPLETED",
    )
    db.add(payment)
    db.flush()

    log_action(
        db, "CLIENT", client.client_id, "CLIENT_SELF_TOPUP",
        "clients", client.client_id,
        {"amount": body.amount},
    )
    return client


@router.get("/me/payments", response_model=list[PaymentOut])
def get_me_payments(payload: dict = Depends(require_auth), db: Session = Depends(get_db)):
    if payload["actor_type"] != "CLIENT":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Client only")

    client_id = int(payload["sub"])
    payments = db.query(Payment).filter(Payment.client_id == client_id).order_by(Payment.processed_at.desc()).all()
    return payments


@router.get("/{client_id}", response_model=ClientOut)
def get_client(client_id: int, payload: dict = Depends(require_auth), db: Session = Depends(get_db)):
    if payload["actor_type"] == "CLIENT" and int(payload["sub"]) != client_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    client = db.query(Client).filter(Client.client_id == client_id).first()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    return client


@router.post("/verify", response_model=ClientOut)
def verify_client(body: ClientVerifyRequest, payload: dict = Depends(require_auth), db: Session = Depends(get_db)):
    if not payload["actor_type"].startswith("STAFF"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Staff only")

    client = db.query(Client).filter(Client.client_id == body.client_id).first()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    if client.status != "PENDING":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Client already verified")

    client.status = "ACTIVE"
    db.flush()

    log_action(
        db, "STAFF", int(payload["sub"]), "CLIENT_VERIFIED",
        "clients", client.client_id,
        {"client_id": client.client_id},
    )
    return client


@router.post("/{client_id}/block", response_model=ClientOut)
def block_client(client_id: int, payload: dict = Depends(require_auth), db: Session = Depends(get_db)):
    if payload["actor_type"] != "STAFF:ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")

    client = db.query(Client).filter(Client.client_id == client_id).first()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    client.status = "BLOCKED"
    db.flush()

    log_action(
        db, "STAFF", int(payload["sub"]), "CLIENT_BLOCKED",
        "clients", client.client_id,
        {"client_id": client.client_id},
    )
    return client


class TopUpRequest(BaseModel):
    amount: float
    comment: str = ""


@router.post("/{client_id}/topup", response_model=ClientOut)
def topup_client(client_id: int, body: TopUpRequest, payload: dict = Depends(require_auth), db: Session = Depends(get_db)):
    if not payload["actor_type"].startswith("STAFF"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Staff only")

    if body.amount <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Amount must be positive")

    client = db.query(Client).filter(Client.client_id == client_id).first()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    from decimal import Decimal
    client.balance = float(Decimal(str(client.balance)) + Decimal(str(body.amount)))
    db.flush()

    log_action(
        db, "STAFF", int(payload["sub"]), "CLIENT_TOPUP",
        "clients", client.client_id,
        {"amount": body.amount, "comment": body.comment},
    )
    return client
