from typing import Optional
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_auth
from app.models.bookings import Booking
from app.models.cars import Car
from app.models.clients import Client
from app.models.client_discounts import ClientDiscount
from app.models.discounts import Discount
from app.schemas.bookings import BookingOut
from app.services.audit_service import log_action

router = APIRouter()

BOOKING_TTL_MINUTES = 20


class BookingCreateRequest(BaseModel):
    car_id: int
    discount_code: Optional[str] = None


@router.post("/", response_model=BookingOut, status_code=status.HTTP_201_CREATED)
def create_booking(body: BookingCreateRequest, payload: dict = Depends(require_auth), db: Session = Depends(get_db)):
    if payload["actor_type"] != "CLIENT":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Client only")

    client_id = int(payload["sub"])

    client = db.query(Client).filter(Client.client_id == client_id).first()
    if not client or client.status != "ACTIVE":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Client not verified or blocked")

    car = db.query(Car).filter(Car.car_id == body.car_id).first()
    if not car or car.status != "FREE":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Car not available")

    discount_id = None
    if body.discount_code:
        discount = db.query(Discount).filter(
            Discount.code == body.discount_code,
            Discount.is_active == True,
        ).first()
        if not discount:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Discount code not found")

        now = datetime.now(timezone.utc).date()
        if discount.valid_from > now or (discount.valid_until and discount.valid_until < now):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Discount expired or not yet valid")

        if discount.usage_limit and discount.used_count >= discount.usage_limit:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Discount usage limit reached")

        discount_id = discount.discount_id

    booking = Booking(
        client_id=client_id,
        car_id=body.car_id,
        discount_id=discount_id,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=BOOKING_TTL_MINUTES),
    )
    db.add(booking)
    db.flush()

    if discount_id:
        discount = db.query(Discount).filter(Discount.discount_id == discount_id).first()
        discount.used_count += 1
        cd = ClientDiscount(client_id=client_id, discount_id=discount_id)
        db.add(cd)

    car.status = "BOOKED"
    db.flush()

    log_action(
        db, "CLIENT", client_id, "BOOKING_CREATED",
        "bookings", booking.booking_id,
        {"car_id": body.car_id},
    )
    return booking


@router.post("/{booking_id}/cancel", response_model=BookingOut)
def cancel_booking(booking_id: int, payload: dict = Depends(require_auth), db: Session = Depends(get_db)):
    booking = db.query(Booking).filter(Booking.booking_id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

    actor_type = payload["actor_type"]
    sub = int(payload["sub"])

    if actor_type == "CLIENT":
        if booking.client_id != sub:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your booking")
        booking.status = "CANCELLED_CLIENT"
    else:
        booking.status = "CANCELLED_STAFF"

    car = db.query(Car).filter(Car.car_id == booking.car_id).first()
    if car:
        car.status = "FREE"
    db.flush()

    log_actor = actor_type.split(":")[0] if ":" in actor_type else actor_type
    log_action(
        db, log_actor, sub, "BOOKING_CANCELLED",
        "bookings", booking.booking_id,
    )

    from app.services.ws_manager import broadcast_sync
    broadcast_sync({"type": "booking_cancelled", "booking_id": booking.booking_id, "car_id": booking.car_id})

    return booking


@router.get("/", response_model=list[BookingOut])
def list_bookings(payload: dict = Depends(require_auth), db: Session = Depends(get_db)):
    if payload["actor_type"] == "CLIENT":
        return db.query(Booking).filter(Booking.client_id == int(payload["sub"])).all()
    return db.query(Booking).all()


@router.get("/{booking_id}", response_model=BookingOut)
def get_booking(booking_id: int, payload: dict = Depends(require_auth), db: Session = Depends(get_db)):
    booking = db.query(Booking).filter(Booking.booking_id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    if payload["actor_type"] == "CLIENT" and booking.client_id != int(payload["sub"]):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your booking")
    return booking
