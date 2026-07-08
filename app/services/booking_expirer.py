from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.bookings import Booking
from app.models.cars import Car
from app.services.audit_service import log_action


def expire_bookings(db: Session) -> int:
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    expired = db.query(Booking).filter(
        Booking.status == "CREATED",
        Booking.expires_at < now,
    ).all()

    for booking in expired:
        booking.status = "CANCELLED_TIMER"
        car = db.query(Car).filter(Car.car_id == booking.car_id).first()
        if car and car.status == "BOOKED":
            car.status = "FREE"
        log_action(
            db, "SYSTEM", None, "BOOKING_EXPIRED",
            "bookings", booking.booking_id,
        )

    db.commit()
    return len(expired)
