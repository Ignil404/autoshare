from app.core.security import create_access_token


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_register_success(client):
    r = client.post("/api/v1/auth/register", json={
        "last_name": "Петров",
        "first_name": "Пётр",
        "birth_date": "1995-05-10",
        "phone": "+79000000001",
        "email": "petrov@test.com",
        "password": "secret",
        "license_number": "X123456",
        "license_issued": "2021-03-20",
    })
    assert r.status_code == 201
    data = r.json()
    assert "access_token" in data
    assert "refresh_token" in data


def test_register_duplicate_email(client, seed_client):
    r = client.post("/api/v1/auth/register", json={
        "last_name": "Дубль",
        "first_name": "Тест",
        "birth_date": "1990-01-01",
        "phone": "+79999999999",
        "email": "test@example.com",
        "password": "x",
        "license_number": "Y999999",
        "license_issued": "2020-01-01",
    })
    assert r.status_code == 409


def test_login_success(client, seed_client):
    r = client.post("/api/v1/auth/login", json={
        "email": "test@example.com",
        "password": "pass123",
    })
    assert r.status_code == 200
    assert "access_token" in r.json()


def test_login_wrong_password(client, seed_client):
    r = client.post("/api/v1/auth/login", json={
        "email": "test@example.com",
        "password": "wrong",
    })
    assert r.status_code == 401


def test_login_nonexistent_user(client):
    r = client.post("/api/v1/auth/login", json={
        "email": "nobody@test.com",
        "password": "x",
    })
    assert r.status_code == 401


def test_staff_login_success(client, seed_staff):
    r = client.post("/api/v1/auth/staff/login", json={
        "email": "admin@example.com",
        "password": "admin123",
    })
    assert r.status_code == 200
    data = r.json()
    assert "access_token" in data


def test_staff_login_wrong_password(client, seed_staff):
    r = client.post("/api/v1/auth/staff/login", json={
        "email": "admin@example.com",
        "password": "wrong",
    })
    assert r.status_code == 401


def test_refresh_token(client, seed_client):
    login = client.post("/api/v1/auth/login", json={
        "email": "test@example.com",
        "password": "pass123",
    })
    refresh = login.json()["refresh_token"]
    r = client.post("/api/v1/auth/refresh", json={
        "refresh_token": refresh,
    })
    assert r.status_code == 200
    assert "access_token" in r.json()


def test_refresh_invalid_token(client):
    r = client.post("/api/v1/auth/refresh", json={
        "refresh_token": "bad",
    })
    assert r.status_code == 401
