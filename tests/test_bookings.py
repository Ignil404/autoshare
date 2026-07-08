from app.core.security import create_access_token


def _auth_header(user_id: int, actor_type: str = "CLIENT"):
    token = create_access_token(str(user_id), actor_type)
    return {"Authorization": f"Bearer {token}"}


def test_create_booking(client, seed_client, seed_car):
    headers = _auth_header(seed_client.client_id)
    r = client.post("/api/v1/bookings/", json={"car_id": seed_car.car_id}, headers=headers)
    assert r.status_code == 201
    data = r.json()
    assert data["status"] == "CREATED"
    assert data["car_id"] == seed_car.car_id


def test_create_booking_not_free_car(client, seed_client, seed_car, db):
    seed_car.status = "RENTED"
    db.flush()
    headers = _auth_header(seed_client.client_id)
    r = client.post("/api/v1/bookings/", json={"car_id": seed_car.car_id}, headers=headers)
    assert r.status_code == 409


def test_create_booking_staff_forbidden(client, seed_staff):
    headers = _auth_header(seed_staff.staff_id, "STAFF:ADMIN")
    r = client.post("/api/v1/bookings/", json={"car_id": 1}, headers=headers)
    assert r.status_code == 403


def test_cancel_booking_client(client, seed_client, seed_car):
    headers = _auth_header(seed_client.client_id)
    create = client.post("/api/v1/bookings/", json={"car_id": seed_car.car_id}, headers=headers)
    booking_id = create.json()["booking_id"]
    r = client.post(f"/api/v1/bookings/{booking_id}/cancel", headers=headers)
    assert r.status_code == 200
    assert r.json()["status"] == "CANCELLED_CLIENT"


def test_cancel_booking_staff(client, seed_client, seed_staff, seed_car):
    client_headers = _auth_header(seed_client.client_id)
    create = client.post("/api/v1/bookings/", json={"car_id": seed_car.car_id}, headers=client_headers)
    booking_id = create.json()["booking_id"]

    staff_headers = _auth_header(seed_staff.staff_id, "STAFF:ADMIN")
    r = client.post(f"/api/v1/bookings/{booking_id}/cancel", headers=staff_headers)
    assert r.status_code == 200
    assert r.json()["status"] == "CANCELLED_STAFF"


def test_cancel_booking_car_freed(client, seed_client, seed_car):
    headers = _auth_header(seed_client.client_id)
    create = client.post("/api/v1/bookings/", json={"car_id": seed_car.car_id}, headers=headers)
    booking_id = create.json()["booking_id"]
    client.post(f"/api/v1/bookings/{booking_id}/cancel", headers=headers)
    r = client.get(f"/api/v1/cars/{seed_car.car_id}", headers=headers)
    assert r.json()["status"] == "FREE"


def test_list_bookings(client, seed_client, seed_car):
    headers = _auth_header(seed_client.client_id)
    client.post("/api/v1/bookings/", json={"car_id": seed_car.car_id}, headers=headers)
    r = client.get("/api/v1/bookings/", headers=headers)
    assert r.status_code == 200
    assert len(r.json()) >= 1


def test_get_booking(client, seed_client, seed_car):
    headers = _auth_header(seed_client.client_id)
    create = client.post("/api/v1/bookings/", json={"car_id": seed_car.car_id}, headers=headers)
    booking_id = create.json()["booking_id"]
    r = client.get(f"/api/v1/bookings/{booking_id}", headers=headers)
    assert r.status_code == 200
    assert r.json()["booking_id"] == booking_id
