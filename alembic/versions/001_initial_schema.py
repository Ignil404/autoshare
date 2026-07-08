"""initial schema — op.create_table based on SQLAlchemy models

Revision ID: 001
Revises:
Create Date: 2026-07-05
"""
from alembic import op
from sqlalchemy import (
    BigInteger, Boolean, CheckConstraint, Column, Date, DateTime, ForeignKey,
    Index, Integer, Numeric, SmallInteger, String, Text, func, text,
)
from sqlalchemy.dialects.postgresql import JSONB

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE SCHEMA IF NOT EXISTS autoshare")
    op.create_table(
        "clients",
        Column("client_id", Integer, primary_key=True, autoincrement=True),
        Column("last_name", String(100), nullable=False),
        Column("first_name", String(100), nullable=False),
        Column("middle_name", String(100), nullable=True),
        Column("birth_date", Date, nullable=False),
        Column("phone", String(20), nullable=False, unique=True),
        Column("email", String(150), nullable=False, unique=True),
        Column("password_hash", Text, nullable=False),
        Column("two_factor_secret", String(64), nullable=True),
        Column("is_email_verified", Boolean, nullable=False, server_default=text("false")),
        Column("license_number", String(20), nullable=False, unique=True),
        Column("license_issued", Date, nullable=False),
        Column("status", String(20), nullable=False, server_default=text("'PENDING'")),
        Column("balance", Numeric(10, 2), nullable=False, server_default=text("0")),
        Column("created_at", DateTime, nullable=False, server_default=func.now()),
        CheckConstraint("status IN ('PENDING','ACTIVE','BLOCKED')", name="ck_clients_status"),
        schema="autoshare",
    )

    op.create_table(
        "staff",
        Column("staff_id", Integer, primary_key=True, autoincrement=True),
        Column("full_name", String(150), nullable=False),
        Column("email", String(150), nullable=False, unique=True),
        Column("phone", String(20), nullable=True),
        Column("password_hash", Text, nullable=False),
        Column("role", String(20), nullable=False),
        Column("status", String(20), nullable=False, server_default=text("'ACTIVE'")),
        Column("created_at", DateTime, nullable=False, server_default=func.now()),
        CheckConstraint("role IN ('OPERATOR','ADMIN','MAINTENANCE')", name="ck_staff_role"),
        CheckConstraint("status IN ('ACTIVE','BLOCKED')", name="ck_staff_status"),
        schema="autoshare",
    )

    op.create_table(
        "zones",
        Column("zone_id", Integer, primary_key=True, autoincrement=True),
        Column("name", String(100), nullable=False),
        Column("zone_type", String(20), nullable=False),
        Column("boundary", Text, nullable=False),
        Column("status", String(20), nullable=False, server_default=text("'ACTIVE'")),
        CheckConstraint("zone_type IN ('AVAILABLE','RESTRICTED')", name="ck_zones_zone_type"),
        CheckConstraint("status IN ('ACTIVE','INACTIVE')", name="ck_zones_status"),
        schema="autoshare",
    )

    op.create_table(
        "discounts",
        Column("discount_id", Integer, primary_key=True, autoincrement=True),
        Column("code", String(30), nullable=False, unique=True),
        Column("type", String(10), nullable=False),
        Column("value", Numeric(8, 2), nullable=False),
        Column("valid_from", Date, nullable=False),
        Column("valid_until", Date, nullable=True),
        Column("usage_limit", Integer, nullable=True),
        Column("used_count", Integer, nullable=False, server_default=text("0")),
        Column("is_active", Boolean, nullable=False, server_default=text("true")),
        CheckConstraint("type IN ('PERCENT','FIXED')", name="ck_discounts_type"),
        CheckConstraint("value > 0", name="ck_discounts_value"),
        CheckConstraint("valid_until IS NULL OR valid_until > valid_from", name="ck_discounts_dates"),
        schema="autoshare",
    )

    op.create_table(
        "audit_log",
        Column("log_id", BigInteger, primary_key=True, autoincrement=True),
        Column("actor_type", String(10), nullable=False),
        Column("actor_id", Integer, nullable=True),
        Column("action", String(50), nullable=False),
        Column("entity", String(50), nullable=False),
        Column("entity_id", Integer, nullable=True),
        Column("details", JSONB, nullable=True),
        Column("created_at", DateTime, nullable=False, server_default=func.now()),
        CheckConstraint("actor_type IN ('CLIENT','STAFF','SYSTEM')", name="ck_audit_log_actor_type"),
        Index("idx_audit_log_actor", "actor_type", "actor_id"),
        Index("idx_audit_log_entity", "entity", "entity_id"),
        schema="autoshare",
    )

    op.create_table(
        "tariffs",
        Column("tariff_id", Integer, primary_key=True, autoincrement=True),
        Column("name", String(100), nullable=False),
        Column("tariff_type", String(20), nullable=False),
        Column("rate_active", Numeric(8, 2), nullable=False),
        Column("rate_pause", Numeric(8, 2), nullable=False),
        Column("min_charge", Numeric(8, 2), nullable=False, server_default=text("0")),
        Column("zone_id", Integer, ForeignKey("autoshare.zones.zone_id"), nullable=True),
        Column("status", String(20), nullable=False, server_default=text("'ACTIVE'")),
        Column("valid_from", Date, nullable=False, server_default=func.current_date()),
        CheckConstraint("tariff_type IN ('MINUTE','HOUR','DAY')", name="ck_tariffs_type"),
        CheckConstraint("rate_active > 0", name="ck_tariffs_rate_active"),
        CheckConstraint("rate_pause >= 0", name="ck_tariffs_rate_pause"),
        CheckConstraint("status IN ('ACTIVE','INACTIVE')", name="ck_tariffs_status"),
        schema="autoshare",
    )

    op.create_table(
        "cars",
        Column("car_id", Integer, primary_key=True, autoincrement=True),
        Column("plate_number", String(20), nullable=False, unique=True),
        Column("brand", String(50), nullable=False),
        Column("model", String(50), nullable=False),
        Column("year", SmallInteger, nullable=False),
        Column("color", String(30), nullable=True),
        Column("car_class", String(20), nullable=False),
        Column("status", String(20), nullable=False, server_default=text("'FREE'")),
        Column("mileage", Integer, nullable=False, server_default=text("0")),
        Column("tariff_id", Integer, ForeignKey("autoshare.tariffs.tariff_id"), nullable=True),
        Column("zone_id", Integer, ForeignKey("autoshare.zones.zone_id"), nullable=True),
        Column("last_service", Date, nullable=True),
        CheckConstraint("car_class IN ('ECONOMY','COMFORT','BUSINESS')", name="ck_cars_class"),
        CheckConstraint(
            "status IN ('FREE','BOOKED','RENTED','MAINTENANCE','UNAVAILABLE')",
            name="ck_cars_status",
        ),
        Index("idx_cars_status", "status"),
        Index("idx_cars_tariff", "tariff_id"),
        Index("idx_cars_zone", "zone_id"),
        schema="autoshare",
    )

    op.create_table(
        "client_discounts",
        Column("id", Integer, primary_key=True, autoincrement=True),
        Column("client_id", Integer, ForeignKey("autoshare.clients.client_id"), nullable=False),
        Column("discount_id", Integer, ForeignKey("autoshare.discounts.discount_id"), nullable=False),
        Column("applied_at", DateTime, nullable=False, server_default=func.now()),
        Index("idx_client_discounts_client", "client_id"),
        schema="autoshare",
    )

    op.create_table(
        "bookings",
        Column("booking_id", Integer, primary_key=True, autoincrement=True),
        Column("client_id", Integer, ForeignKey("autoshare.clients.client_id"), nullable=False),
        Column("car_id", Integer, ForeignKey("autoshare.cars.car_id"), nullable=False),
        Column("discount_id", Integer, ForeignKey("autoshare.discounts.discount_id"), nullable=True),
        Column("created_at", DateTime, nullable=False, server_default=func.now()),
        Column("expires_at", DateTime, nullable=False),
        Column("status", String(30), nullable=False, server_default=text("'CREATED'")),
        CheckConstraint(
            "status IN ('CREATED','CONVERTED','CANCELLED_CLIENT','CANCELLED_TIMER')",
            name="ck_bookings_status",
        ),
        CheckConstraint("expires_at > created_at", name="ck_bookings_expires"),
        Index("idx_bookings_client", "client_id"),
        Index("idx_bookings_car", "car_id"),
        Index("idx_bookings_status", "status"),
        Index(
            "idx_bookings_one_active_per_car",
            "car_id",
            unique=True,
            postgresql_where=text("status = 'CREATED'"),
        ),
        Index(
            "idx_bookings_one_active_per_client",
            "client_id",
            unique=True,
            postgresql_where=text("status = 'CREATED'"),
        ),
        schema="autoshare",
    )

    op.create_table(
        "rentals",
        Column("rental_id", Integer, primary_key=True, autoincrement=True),
        Column("booking_id", Integer, ForeignKey("autoshare.bookings.booking_id"), nullable=False),
        Column("client_id", Integer, ForeignKey("autoshare.clients.client_id"), nullable=False),
        Column("car_id", Integer, ForeignKey("autoshare.cars.car_id"), nullable=False),
        Column("tariff_id", Integer, ForeignKey("autoshare.tariffs.tariff_id"), nullable=False),
        Column("started_at", DateTime, nullable=False),
        Column("finished_at", DateTime, nullable=True),
        Column("active_minutes", Integer, nullable=False, server_default=text("0")),
        Column("pause_minutes", Integer, nullable=False, server_default=text("0")),
        Column("distance_km", Numeric(8, 2), nullable=False, server_default=text("0")),
        Column("total_cost", Numeric(10, 2), nullable=True),
        Column("status", String(30), nullable=False, server_default=text("'ACTIVE'")),
        CheckConstraint(
            "status IN ('ACTIVE','PAUSED','COMPLETED','FORCE_COMPLETED')",
            name="ck_rentals_status",
        ),
        CheckConstraint(
            "finished_at IS NULL OR finished_at > started_at",
            name="ck_rentals_finished",
        ),
        Index("idx_rentals_client", "client_id"),
        Index("idx_rentals_car", "car_id"),
        Index("idx_rentals_status", "status"),
        Index("idx_rentals_started", "started_at"),
        schema="autoshare",
    )

    op.create_table(
        "payments",
        Column("payment_id", Integer, primary_key=True, autoincrement=True),
        Column("rental_id", Integer, ForeignKey("autoshare.rentals.rental_id"), nullable=True),
        Column("client_id", Integer, ForeignKey("autoshare.clients.client_id"), nullable=False),
        Column("amount", Numeric(10, 2), nullable=False),
        Column("payment_type", String(20), nullable=False),
        Column("status", String(20), nullable=False, server_default=text("'PENDING'")),
        Column("external_id", String(100), nullable=True),
        Column("processed_at", DateTime, nullable=False, server_default=func.now()),
        CheckConstraint("amount <> 0", name="ck_payments_amount"),
        CheckConstraint("payment_type IN ('RENTAL','FINE','REFUND')", name="ck_payments_type"),
        CheckConstraint(
            "status IN ('PENDING','COMPLETED','FAILED','REFUNDED')",
            name="ck_payments_status",
        ),
        CheckConstraint(
            "payment_type != 'RENTAL' OR rental_id IS NOT NULL",
            name="ck_payments_rental_required",
        ),
        Index("idx_payments_client", "client_id"),
        Index("idx_payments_rental", "rental_id"),
        schema="autoshare",
    )

    op.create_table(
        "maintenance",
        Column("maintenance_id", Integer, primary_key=True, autoincrement=True),
        Column("car_id", Integer, ForeignKey("autoshare.cars.car_id"), nullable=False),
        Column("work_type", String(30), nullable=False),
        Column("description", Text, nullable=True),
        Column("assigned_to_staff_id", Integer, ForeignKey("autoshare.staff.staff_id"), nullable=True),
        Column("created_at", DateTime, nullable=False, server_default=func.now()),
        Column("completed_at", DateTime, nullable=True),
        Column("status", String(20), nullable=False, server_default=text("'OPEN'")),
        Column("mileage_at_open", Integer, nullable=True),
        CheckConstraint("work_type IN ('SERVICE','REPAIR','WASH')", name="ck_maintenance_work_type"),
        CheckConstraint("status IN ('OPEN','IN_PROGRESS','CLOSED')", name="ck_maintenance_status"),
        CheckConstraint(
            "completed_at IS NULL OR completed_at >= created_at",
            name="ck_maintenance_completed",
        ),
        Index("idx_maintenance_car", "car_id"),
        Index("idx_maintenance_staff", "assigned_to_staff_id"),
        Index("idx_maintenance_status", "status"),
        schema="autoshare",
    )


def downgrade() -> None:
    op.drop_table("maintenance", schema="autoshare")
    op.drop_table("payments", schema="autoshare")
    op.drop_table("rentals", schema="autoshare")
    op.drop_table("bookings", schema="autoshare")
    op.drop_table("client_discounts", schema="autoshare")
    op.drop_table("cars", schema="autoshare")
    op.drop_table("tariffs", schema="autoshare")
    op.drop_table("discounts", schema="autoshare")
    op.drop_table("audit_log", schema="autoshare")
    op.drop_table("zones", schema="autoshare")
    op.drop_table("staff", schema="autoshare")
    op.drop_table("clients", schema="autoshare")
