from datetime import date

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.clients import Client
from app.models.staff import Staff
from app.models.zones import Zone
from app.models.tariffs import Tariff
from app.models.cars import Car
from app.models.discounts import Discount


def seed():
    db = SessionLocal()
    try:
        if db.query(Staff).count() > 0:
            print("Already seeded, skipping.")
            return

        # ── Staff ──────────────────────────────────────────────
        staff_members = [
            Staff(
                full_name="Администратор Системы",
                email="admin@autoshare.by",
                phone="+375291000001",
                password_hash=hash_password("admin123"),
                role="ADMIN",
            ),
            Staff(
                full_name="Оператор Петрова А.В.",
                email="operator@autoshare.by",
                phone="+375291000002",
                password_hash=hash_password("operator123"),
                role="OPERATOR",
            ),
            Staff(
                full_name="Мастер Сидоров К.П.",
                email="maintenance@autoshare.by",
                phone="+375291000003",
                password_hash=hash_password("master123"),
                role="MAINTENANCE",
            ),
        ]
        db.add_all(staff_members)

        # ── Clients ────────────────────────────────────────────
        clients = [
            Client(
                last_name="Иванов",
                first_name="Иван",
                middle_name="Иванович",
                birth_date=date(1990, 3, 15),
                phone="+375291111111",
                email="ivan@test.by",
                password_hash=hash_password("secret123"),
                license_number="1234АВ1",
                license_issued=date(2020, 1, 10),
                status="ACTIVE",
                balance=5000,
            ),
            Client(
                last_name="Петрова",
                first_name="Мария",
                middle_name="Сергеевна",
                birth_date=date(1995, 7, 22),
                phone="+375292222222",
                email="maria@test.by",
                password_hash=hash_password("secret123"),
                license_number="5678НР2",
                license_issued=date(2021, 6, 15),
                status="ACTIVE",
                balance=3000,
            ),
            Client(
                last_name="Сидоров",
                first_name="Пётр",
                middle_name="Алексеевич",
                birth_date=date(1985, 11, 8),
                phone="+375293333333",
                email="petr@test.by",
                password_hash=hash_password("secret123"),
                license_number="9012МК1",
                license_issued=date(2019, 9, 1),
                status="ACTIVE",
                balance=1500,
            ),
            Client(
                last_name="Козлова",
                first_name="Анна",
                middle_name="Дмитриевна",
                birth_date=date(1998, 1, 30),
                phone="+375294444444",
                email="anna@test.by",
                password_hash=hash_password("secret123"),
                license_number="3456ОС2",
                license_issued=date(2022, 3, 20),
                status="PENDING",
                balance=0,
            ),
            Client(
                last_name="Новиков",
                first_name="Дмитрий",
                middle_name=None,
                birth_date=date(1988, 5, 12),
                phone="+375295555555",
                email="blocked@test.by",
                password_hash=hash_password("secret123"),
                license_number="7890ХТ1",
                license_issued=date(2018, 12, 1),
                status="BLOCKED",
                balance=0,
            ),
        ]
        db.add_all(clients)
        db.flush()

        # ── Zones ──────────────────────────────────────────────
        zones = [
            Zone(
                name="Минск — Центр",
                zone_type="AVAILABLE",
                boundary="POLYGON((27.5 53.85, 27.6 53.85, 27.6 53.95, 27.5 53.95, 27.5 53.85))",
            ),
            Zone(
                name="Минск — Спальные районы",
                zone_type="AVAILABLE",
                boundary="POLYGON((27.4 53.8, 27.7 53.8, 27.7 54.0, 27.4 54.0, 27.4 53.8))",
            ),
            Zone(
                name="Брест",
                zone_type="AVAILABLE",
                boundary="POLYGON((23.6 52.05, 23.8 52.05, 23.8 52.15, 23.6 52.15, 23.6 52.05))",
            ),
        ]
        db.add_all(zones)
        db.flush()

        # ── Tariffs ────────────────────────────────────────────
        tariffs = [
            Tariff(
                name="Поминутный",
                tariff_type="MINUTE",
                rate_active=0.35,
                rate_pause=0.05,
                min_charge=3.00,
                zone_id=zones[0].zone_id,
            ),
            Tariff(
                name="Почасовой",
                tariff_type="HOUR",
                rate_active=12.00,
                rate_pause=2.50,
                min_charge=10.00,
                zone_id=zones[0].zone_id,
            ),
            Tariff(
                name="Суточный",
                tariff_type="DAY",
                rate_active=65.00,
                rate_pause=10.00,
                min_charge=65.00,
                zone_id=zones[1].zone_id,
            ),
        ]
        db.add_all(tariffs)
        db.flush()

        # ── Cars ───────────────────────────────────────────────
        cars = [
            Car(
                plate_number="1234АВ1", brand="Kia", model="Rio",
                year=2024, color="Белый", car_class="ECONOMY",
                status="FREE", mileage=1200,
                tariff_id=tariffs[0].tariff_id, zone_id=zones[0].zone_id,
                lat=53.9006, lng=27.5590,
            ),
            Car(
                plate_number="5678НР2", brand="Hyundai", model="Solaris",
                year=2024, color="Серебристый", car_class="ECONOMY",
                status="FREE", mileage=800,
                tariff_id=tariffs[0].tariff_id, zone_id=zones[0].zone_id,
                lat=53.9045, lng=27.5615,
            ),
            Car(
                plate_number="9012МК1", brand="Kia", model="Ceed",
                year=2023, color="Чёрный", car_class="COMFORT",
                status="FREE", mileage=15000,
                tariff_id=tariffs[1].tariff_id, zone_id=zones[0].zone_id,
                lat=53.8930, lng=27.5470,
            ),
            Car(
                plate_number="3456ОС2", brand="Skoda", model="Octavia",
                year=2023, color="Синий", car_class="COMFORT",
                status="FREE", mileage=22000,
                tariff_id=tariffs[1].tariff_id, zone_id=zones[1].zone_id,
                lat=53.9200, lng=27.5800,
            ),
            Car(
                plate_number="7890ХТ1", brand="BMW", model="3 Series",
                year=2024, color="Серый", car_class="BUSINESS",
                status="FREE", mileage=500,
                tariff_id=tariffs[2].tariff_id, zone_id=zones[0].zone_id,
                lat=53.8880, lng=27.5720,
            ),
            Car(
                plate_number="2345ЕА2", brand="Toyota", model="Camry",
                year=2022, color="Белый", car_class="BUSINESS",
                status="MAINTENANCE", mileage=45000,
                tariff_id=tariffs[2].tariff_id, zone_id=zones[2].zone_id,
                lat=52.0976, lng=23.7341,
            ),
        ]
        db.add_all(cars)

        # ── Discounts ──────────────────────────────────────────
        discounts = [
            Discount(
                code="ПЕРВЫЙ10",
                type="PERCENT",
                value=10.00,
                valid_from=date(2026, 1, 1),
                valid_until=date(2026, 12, 31),
                usage_limit=100,
                is_active=True,
            ),
            Discount(
                code="ЛЕТО500",
                type="FIXED",
                value=500.00,
                valid_from=date(2026, 6, 1),
                valid_until=date(2026, 8, 31),
                usage_limit=50,
                is_active=True,
            ),
        ]
        db.add_all(discounts)

        db.commit()
        print("Seed data inserted successfully.")
    except Exception as e:
        db.rollback()
        print(f"Seed error: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
