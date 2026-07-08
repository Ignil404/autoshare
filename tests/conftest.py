import os

os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["SECRET_KEY"] = "test-secret-key"
os.environ["TESTING"] = "1"

from datetime import date

import pytest
from sqlalchemy import create_engine, JSON, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.schema import DefaultClause

from app.core.security import hash_password


@compiles(JSONB, "sqlite")
def compile_jsonb_sqlite(type_, compiler, **kw):
    return "JSON"


engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSession = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def _patch_for_sqlite():
    from app.core.database import Base

    Base.metadata.schema = None
    for t in Base.metadata.tables.values():
        t.schema = None
        for col in t.columns:
            sd = col.server_default
            if sd is not None and hasattr(sd, "arg"):
                arg_str = str(sd.arg)
                if "now()" in arg_str:
                    col.server_default = DefaultClause(text("(datetime('now'))"))


@pytest.fixture(autouse=True)
def setup_db():
    _patch_for_sqlite()
    from app.core.database import Base

    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def db():
    session = TestSession()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


@pytest.fixture()
def client(db):
    from fastapi.testclient import TestClient
    from app.core.database import get_db
    from app.main import app

    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture()
def seed_client(db):
    from datetime import datetime
    from app.models.clients import Client

    c = Client(
        last_name="Иванов",
        first_name="Иван",
        birth_date=date(1990, 1, 1),
        phone="+79001112233",
        email="test@example.com",
        password_hash=hash_password("pass123"),
        license_number="AB123456",
        license_issued=date(2020, 6, 15),
        status="ACTIVE",
    )
    db.add(c)
    db.flush()
    return c


@pytest.fixture()
def seed_staff(db):
    from datetime import datetime
    from app.models.staff import Staff

    s = Staff(
        full_name="Admin User",
        email="admin@example.com",
        password_hash=hash_password("admin123"),
        role="ADMIN",
        status="ACTIVE",
    )
    db.add(s)
    db.flush()
    return s


@pytest.fixture()
def seed_tariff(db):
    from app.models.tariffs import Tariff

    t = Tariff(
        name="Базовый",
        tariff_type="MINUTE",
        rate_active=5.0,
        rate_pause=1.0,
        min_charge=50.0,
        status="ACTIVE",
    )
    db.add(t)
    db.flush()
    return t


@pytest.fixture()
def seed_car(db, seed_tariff):
    from app.models.cars import Car

    car = Car(
        plate_number="A001AA",
        brand="Kia",
        model="Rio",
        year=2023,
        color="Белый",
        car_class="ECONOMY",
        status="FREE",
        tariff_id=seed_tariff.tariff_id,
    )
    db.add(car)
    db.flush()
    return car
