from datetime import datetime, timedelta, timezone

from app.core.security import create_access_token
from app.models.bookings import Booking


def _auth_header(user_id: int, actor_type: str = "CLIENT"):
    token = create_access_token(str(user_id), actor_type)
    return {"Authorization": f"Bearer {token}"}


def _create_booking(client, seed_client, seed_car):
    headers = _auth_header(seed_client.client_id)
    r = client.post("/api/v1/bookings/", json={"car_id": seed_car.car_id}, headers=headers)
    return r.json()["booking_id"]


def test_booking_not_expired_within_ttl(client, seed_client, seed_car, db):
    booking_id = _create_booking(client, seed_client, seed_car)
    booking = db.query(Booking).filter(Booking.booking_id == booking_id).first()
    assert booking.status == "CREATED"


def test_booking_expired_manually(client, seed_client, seed_car, db):
    from app.services.booking_expirer import expire_bookings

    booking_id = _create_booking(client, seed_client, seed_car)
    booking = db.query(Booking).filter(Booking.booking_id == booking_id).first()
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    booking.created_at = now - timedelta(hours=1)
    booking.expires_at = now - timedelta(minutes=1)
    db.flush()

    count = expire_bookings(db)
    assert count == 1

    db.refresh(booking)
    assert booking.status == "CANCELLED_TIMER"

    from app.models.cars import Car
    car = db.query(Car).filter(Car.car_id == seed_car.car_id).first()
    assert car.status == "FREE"


def test_booking_not_converted_not_expired(client, seed_client, seed_car, db):
    from app.services.booking_expirer import expire_bookings

    booking_id = _create_booking(client, seed_client, seed_car)
    booking = db.query(Booking).filter(Booking.booking_id == booking_id).first()
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    booking.created_at = now - timedelta(hours=1)
    booking.expires_at = now - timedelta(minutes=1)
    booking.status = "CONVERTED"
    db.flush()

    count = expire_bookings(db)
    assert count == 0

    db.refresh(booking)
    assert booking.status == "CONVERTED"
