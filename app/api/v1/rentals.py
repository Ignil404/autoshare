from typing import Optional
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_auth
from app.models.bookings import Booking
from app.models.cars import Car
from app.models.rentals import Rental
from app.models.tariffs import Tariff
from app.schemas.rentals import RentalOut
from app.services.audit_service import log_action

router = APIRouter()


def _utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)


class StartRentalRequest(BaseModel):
    booking_id: int


class RentalActionRequest(BaseModel):
    distance_km: Optional[float] = None


@router.post("/start", response_model=RentalOut, status_code=status.HTTP_201_CREATED)
def start_rental(body: StartRentalRequest, payload: dict = Depends(require_auth), db: Session = Depends(get_db)):
    if payload["actor_type"] != "CLIENT":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Client only")

    client_id = int(payload["sub"])

    booking = db.query(Booking).filter(
        Booking.booking_id == body.booking_id,
        Booking.client_id == client_id,
        Booking.status == "CREATED",
    ).first()
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Active booking not found")

    car = db.query(Car).filter(Car.car_id == booking.car_id).first()
    tariff_id = car.tariff_id or (db.query(Tariff).filter(Tariff.zone_id == car.zone_id, Tariff.status == "ACTIVE").first().tariff_id if car.zone_id else None)
    if not tariff_id:
        tariff = db.query(Tariff).filter(Tariff.status == "ACTIVE").first()
        if not tariff:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No active tariff available")
        tariff_id = tariff.tariff_id

    rental = Rental(
        booking_id=booking.booking_id,
        client_id=client_id,
        car_id=car.car_id,
        tariff_id=tariff_id,
        started_at=_utcnow(),
    )
    db.add(rental)
    booking.status = "CONVERTED"
    car.status = "RENTED"
    db.flush()

    log_action(
        db, "CLIENT", client_id, "RENTAL_STARTED",
        "rentals", rental.rental_id,
    )
    return rental


@router.post("/{rental_id}/pause", response_model=RentalOut)
def pause_rental(rental_id: int, payload: dict = Depends(require_auth), db: Session = Depends(get_db)):
    rental = _get_client_rental(rental_id, payload, db)
    if rental.status != "ACTIVE":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Rental not active")

    now = _utcnow()
    elapsed = int((now - rental.started_at).total_seconds() / 60)
    rental.active_minutes += elapsed
    rental.paused_at = now
    rental.status = "PAUSED"
    db.flush()

    log_action(db, "CLIENT", int(payload["sub"]), "RENTAL_PAUSED", "rentals", rental.rental_id)
    return rental


@router.post("/{rental_id}/resume", response_model=RentalOut)
def resume_rental(rental_id: int, payload: dict = Depends(require_auth), db: Session = Depends(get_db)):
    rental = _get_client_rental(rental_id, payload, db)
    if rental.status != "PAUSED":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Rental not paused")

    if rental.paused_at:
        pause_elapsed = int((_utcnow() - rental.paused_at).total_seconds() / 60)
        rental.pause_minutes += pause_elapsed

    rental.started_at = _utcnow()
    rental.paused_at = None
    rental.status = "ACTIVE"
    db.flush()

    log_action(db, "CLIENT", int(payload["sub"]), "RENTAL_RESUMED", "rentals", rental.rental_id)
    return rental


@router.post("/{rental_id}/complete", response_model=RentalOut)
def complete_rental(rental_id: int, body: RentalActionRequest = RentalActionRequest(), payload: dict = Depends(require_auth), db: Session = Depends(get_db)):
    rental = _get_client_rental(rental_id, payload, db)
    if rental.status not in ("ACTIVE", "PAUSED"):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Rental not active or paused")

    now = _utcnow()
    rental.finished_at = now
    if rental.status == "ACTIVE":
        elapsed = max(1, int((now - rental.started_at).total_seconds() / 60))
        rental.active_minutes += elapsed
    if body.distance_km is not None:
        rental.distance_km = body.distance_km

    tariff = db.query(Tariff).filter(Tariff.tariff_id == rental.tariff_id).first()
    if tariff:
        active_cost = float(tariff.rate_active) * rental.active_minutes
        pause_cost = float(tariff.rate_pause) * rental.pause_minutes
        km_cost = float(tariff.rate_km) * (rental.distance_km or 0)
        rental.total_cost = max(float(tariff.min_charge), active_cost + pause_cost + km_cost)

    rental.status = "COMPLETED"

    if rental.total_cost and rental.total_cost > 0:
        from app.models.clients import Client
        from app.models.payments import Payment
        from decimal import Decimal

        client = db.query(Client).filter(Client.client_id == rental.client_id).first()
        if client:
            client.balance = float(Decimal(str(client.balance)) - Decimal(str(rental.total_cost)))

        payment = Payment(
            rental_id=rental.rental_id,
            client_id=rental.client_id,
            amount=rental.total_cost,
            payment_type="RENTAL",
            status="COMPLETED",
        )
        db.add(payment)

    car = db.query(Car).filter(Car.car_id == rental.car_id).first()
    if car:
        car.status = "FREE"
        if rental.distance_km:
            car.mileage += int(rental.distance_km)
    db.flush()

    log_action(
        db, "CLIENT", int(payload["sub"]), "RENTAL_COMPLETED",
        "rentals", rental.rental_id,
        {"total_cost": str(rental.total_cost)},
    )
    return rental


def _get_client_rental(rental_id: int, payload: dict, db: Session) -> Rental:
    rental = db.query(Rental).filter(Rental.rental_id == rental_id).first()
    if not rental:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rental not found")
    if payload["actor_type"] == "CLIENT" and rental.client_id != int(payload["sub"]):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your rental")
    return rental


@router.get("/", response_model=list[RentalOut])
def list_rentals(payload: dict = Depends(require_auth), db: Session = Depends(get_db)):
    if payload["actor_type"] == "CLIENT":
        return db.query(Rental).filter(Rental.client_id == int(payload["sub"])).all()
    return db.query(Rental).all()


@router.get("/{rental_id}", response_model=RentalOut)
def get_rental(rental_id: int, payload: dict = Depends(require_auth), db: Session = Depends(get_db)):
    rental = db.query(Rental).filter(Rental.rental_id == rental_id).first()
    if not rental:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rental not found")
    if payload["actor_type"] == "CLIENT" and rental.client_id != int(payload["sub"]):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your rental")
    return rental
