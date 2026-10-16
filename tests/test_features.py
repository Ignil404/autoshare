from datetime import date, datetime

from app.core.database import SessionLocal, engine, Base
from app.core.security import create_access_token, hash_password
from app.models.clients import Client
from app.models.staff import Staff
from app.models.cars import Car
from app.models.tariffs import Tariff
from app.models.zones import Zone
from app.models.bookings import Booking
from app.models.rentals import Rental


def _auth(user_id: int, actor_type: str = "CLIENT"):
    return {"Authorization": f"Bearer {create_access_token(str(user_id), actor_type)}"}


def test_change_password(client, db, seed_client):
    headers = _auth(seed_client.client_id)
    r = client.post("/api/v1/auth/change-password", json={
        "old_password": "pass123",
        "new_password": "newpass123",
    }, headers=headers)
    assert r.status_code == 200
    r2 = client.post("/api/v1/auth/login", json={
        "email": "test@example.com",
        "password": "newpass123",
    })
    assert r2.status_code == 200


def test_change_password_wrong_old(client, db, seed_client):
    headers = _auth(seed_client.client_id)
    r = client.post("/api/v1/auth/change-password", json={
        "old_password": "wrongpass",
        "new_password": "newpass123",
    }, headers=headers)
    assert r.status_code == 400


def test_client_stats(client, db, seed_client):
    headers = _auth(seed_client.client_id)
    r = client.get("/api/v1/clients/me/stats", headers=headers)
    assert r.status_code == 200
    data = r.json()
    assert "balance" in data
    assert "total_bookings" in data
    assert "total_rentals" in data
    assert "total_spent" in data


def test_client_topup(client, db, seed_client):
    headers = _auth(seed_client.client_id)
    initial = client.get("/api/v1/clients/me", headers=headers).json()["balance"]
    r = client.post("/api/v1/clients/me/topup", json={"amount": 25.50}, headers=headers)
    assert r.status_code == 200
    assert r.json()["balance"] == initial + 25.50


def test_client_topup_invalid_amount(client, db, seed_client):
    headers = _auth(seed_client.client_id)
    r = client.post("/api/v1/clients/me/topup", json={"amount": -10}, headers=headers)
    assert r.status_code == 400


def test_client_topup_over_limit(client, db, seed_client):
    headers = _auth(seed_client.client_id)
    r = client.post("/api/v1/clients/me/topup", json={"amount": 50000}, headers=headers)
    assert r.status_code == 400


def test_client_payments(client, db, seed_client):
    headers = _auth(seed_client.client_id)
    client.post("/api/v1/clients/me/topup", json={"amount": 10}, headers=headers)
    r = client.get("/api/v1/clients/me/payments", headers=headers)
    assert r.status_code == 200
    assert len(r.json()) >= 1


def test_staff_topup_client(client, db, seed_client, seed_staff):
    staff_headers = _auth(seed_staff.staff_id, "STAFF:ADMIN")
    client_headers = _auth(seed_client.client_id)
    initial = client.get("/api/v1/clients/me", headers=client_headers).json()["balance"]
    r = client.post(f"/api/v1/clients/{seed_client.client_id}/topup", json={"amount": 100, "comment": "test"}, headers=staff_headers)
    assert r.status_code == 200
    assert r.json()["balance"] == initial + 100


def test_car_photo_upload_and_get(client, db, seed_staff):
    from app.models.cars import Car as CarModel
    car = Car(
        plate_number="TEST001", brand="Test", model="Car",
        year=2024, car_class="ECONOMY", status="FREE", mileage=0,
        lat=53.9, lng=27.5,
    )
    db.add(car)
    db.flush()

    staff_headers = _auth(seed_staff.staff_id, "STAFF:ADMIN")
    import io
    photo_content = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100
    r = client.post(
        f"/api/v1/cars/{car.car_id}/photo",
        files={"file": ("test.png", io.BytesIO(photo_content), "image/png")},
        headers=staff_headers,
    )
    assert r.status_code == 200

    r2 = client.get(f"/api/v1/cars/{car.car_id}/photo")
    assert r2.status_code == 200


def test_email_verification(client, db, seed_client):
    r = client.post("/api/v1/email/request", json={"email": "test@example.com"})
    assert r.status_code == 200
    token = r.json()["token"]

    r2 = client.post("/api/v1/email/verify", json={"token": token})
    assert r2.status_code == 200

    db.refresh(seed_client)
    assert seed_client.is_email_verified is True


def test_email_verification_invalid_token(client, db):
    r = client.post("/api/v1/email/verify", json={"token": "invalid"})
    assert r.status_code == 400


def test_logs_endpoint(client, db, seed_staff):
    staff_headers = _auth(seed_staff.staff_id, "STAFF:ADMIN")
    r = client.get("/api/v1/logs/", headers=staff_headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_logs_non_staff_forbidden(client, db, seed_client):
    headers = _auth(seed_client.client_id)
    r = client.get("/api/v1/logs/", headers=headers)
    assert r.status_code == 200
    assert r.json() == []


def test_reports_fleet_utilization(client, db, seed_staff):
    staff_headers = _auth(seed_staff.staff_id, "STAFF:ADMIN")
    r = client.get("/api/v1/reports/fleet-utilization", params={"start": "2026-01-01", "end": "2026-12-31"}, headers=staff_headers)
    assert r.status_code == 200


def test_booking_with_discount(client, db, seed_client, seed_car):
    from app.models.discounts import Discount
    d = Discount(
        code="TEST10", type="PERCENT", value=10.0,
        valid_from=date(2026, 1, 1), valid_until=date(2026, 12, 31),
        usage_limit=100, is_active=True,
    )
    db.add(d)
    db.flush()

    headers = _auth(seed_client.client_id)
    r = client.post("/api/v1/bookings/", json={
        "car_id": seed_car.car_id,
        "discount_code": "TEST10",
    }, headers=headers)
    assert r.status_code == 201
    assert r.json()["discount_id"] == d.discount_id


def test_rental_cost_calculation(client, db, seed_client, seed_car, seed_tariff):
    from app.models.rentals import Rental

    headers = _auth(seed_client.client_id)

    booking = client.post("/api/v1/bookings/", json={"car_id": seed_car.car_id}, headers=headers)
    booking_id = booking.json()["booking_id"]

    rental = client.post("/api/v1/rentals/start", json={"booking_id": booking_id}, headers=headers)
    rental_id = rental.json()["rental_id"]

    r = db.query(Rental).filter(Rental.rental_id == rental_id).first()
    r.active_minutes = 10
    r.pause_minutes = 5
    db.flush()

    r = client.post(f"/api/v1/rentals/{rental_id}/complete", headers=headers)
    assert r.status_code == 200
    total = r.json()["total_cost"]
    expected = max(float(seed_tariff.min_charge), float(seed_tariff.rate_active) * 11 + float(seed_tariff.rate_pause) * 5)
    assert abs(total - expected) < 0.01
