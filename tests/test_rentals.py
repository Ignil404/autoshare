from datetime import datetime, timedelta, timezone

from app.core.security import create_access_token
from app.models.bookings import Booking


def _auth_header(user_id: int, actor_type: str = "CLIENT"):
    token = create_access_token(str(user_id), actor_type)
    return {"Authorization": f"Bearer {token}"}


def _create_booking_and_rental(client, seed_client, seed_car):
    headers = _auth_header(seed_client.client_id)
    r = client.post("/api/v1/bookings/", json={"car_id": seed_car.car_id}, headers=headers)
    booking_id = r.json()["booking_id"]
    r = client.post("/api/v1/rentals/start", json={"booking_id": booking_id}, headers=headers)
    return r.json()["rental_id"]


def test_start_rental(client, seed_client, seed_car):
    headers = _auth_header(seed_client.client_id)
    create = client.post("/api/v1/bookings/", json={"car_id": seed_car.car_id}, headers=headers)
    booking_id = create.json()["booking_id"]
    r = client.post("/api/v1/rentals/start", json={"booking_id": booking_id}, headers=headers)
    assert r.status_code == 201
    data = r.json()
    assert data["status"] == "ACTIVE"
    assert data["car_id"] == seed_car.car_id


def test_start_rental_staff_forbidden(client, seed_staff):
    headers = _auth_header(seed_staff.staff_id, "STAFF:ADMIN")
    r = client.post("/api/v1/rentals/start", json={"booking_id": 999}, headers=headers)
    assert r.status_code == 403


def test_pause_rental(client, seed_client, seed_car):
    rental_id = _create_booking_and_rental(client, seed_client, seed_car)
    headers = _auth_header(seed_client.client_id)
    r = client.post(f"/api/v1/rentals/{rental_id}/pause", headers=headers)
    assert r.status_code == 200
    assert r.json()["status"] == "PAUSED"


def test_resume_rental(client, seed_client, seed_car):
    rental_id = _create_booking_and_rental(client, seed_client, seed_car)
    headers = _auth_header(seed_client.client_id)
    client.post(f"/api/v1/rentals/{rental_id}/pause", headers=headers)
    r = client.post(f"/api/v1/rentals/{rental_id}/resume", headers=headers)
    assert r.status_code == 200
    assert r.json()["status"] == "ACTIVE"


def test_complete_rental_calculates_cost(client, seed_client, seed_car, seed_tariff):
    rental_id = _create_booking_and_rental(client, seed_client, seed_car)
    headers = _auth_header(seed_client.client_id)
    r = client.post(f"/api/v1/rentals/{rental_id}/complete", headers=headers, json={"distance_km": 12.5})
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "COMPLETED"
    assert data["distance_km"] == 12.5
    assert data["total_cost"] is not None
    assert float(data["total_cost"]) >= float(seed_tariff.min_charge)


def test_complete_rental_car_freed(client, seed_client, seed_car):
    rental_id = _create_booking_and_rental(client, seed_client, seed_car)
    headers = _auth_header(seed_client.client_id)
    client.post(f"/api/v1/rentals/{rental_id}/complete", headers=headers)
    r = client.get(f"/api/v1/cars/{seed_car.car_id}", headers=headers)
    assert r.json()["status"] == "FREE"


def test_list_rentals(client, seed_client, seed_car):
    _create_booking_and_rental(client, seed_client, seed_car)
    headers = _auth_header(seed_client.client_id)
    r = client.get("/api/v1/rentals/", headers=headers)
    assert r.status_code == 200
    assert len(r.json()) >= 1


def test_get_rental(client, seed_client, seed_car):
    rental_id = _create_booking_and_rental(client, seed_client, seed_car)
    headers = _auth_header(seed_client.client_id)
    r = client.get(f"/api/v1/rentals/{rental_id}", headers=headers)
    assert r.status_code == 200
    assert r.json()["rental_id"] == rental_id
