from typing import Optional
from datetime import date, datetime

from sqlalchemy import Boolean, CheckConstraint, Date, DateTime, Numeric, String, Text, func, text as sa_text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Client(Base):
    __tablename__ = "clients"
    client_id: Mapped[int] = mapped_column(primary_key=True)
    last_name: Mapped[str] = mapped_column(String(100))
    first_name: Mapped[str] = mapped_column(String(100))
    middle_name: Mapped[Optional[str]] = mapped_column(String(100))
    birth_date: Mapped[date] = mapped_column(Date)
    phone: Mapped[str] = mapped_column(String(20), unique=True)
    email: Mapped[str] = mapped_column(String(150), unique=True)
    password_hash: Mapped[str] = mapped_column(Text)
    two_factor_secret: Mapped[Optional[str]] = mapped_column(String(64))
    is_email_verified: Mapped[bool] = mapped_column(Boolean, server_default=sa_text("false"))
    license_number: Mapped[str] = mapped_column(String(20), unique=True)
    license_issued: Mapped[date] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(20), server_default=sa_text("'PENDING'"))
    balance: Mapped[float] = mapped_column(Numeric(10, 2), server_default=sa_text("0"))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    __table_args__ = (
        CheckConstraint("status IN ('PENDING','ACTIVE','BLOCKED')", name="ck_clients_status"),
    )

    bookings: Mapped[list["Booking"]] = relationship(back_populates="client")
    rentals: Mapped[list["Rental"]] = relationship(back_populates="client")
    payments: Mapped[list["Payment"]] = relationship(back_populates="client")
    discounts: Mapped[list["ClientDiscount"]] = relationship(back_populates="client")
