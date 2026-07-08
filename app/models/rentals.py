from typing import Optional
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Integer, Numeric, String, text as sa_text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Rental(Base):
    __tablename__ = "rentals"

    rental_id: Mapped[int] = mapped_column(primary_key=True)
    booking_id: Mapped[int] = mapped_column(ForeignKey("bookings.booking_id"))
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.client_id"))
    car_id: Mapped[int] = mapped_column(ForeignKey("cars.car_id"))
    tariff_id: Mapped[int] = mapped_column(ForeignKey("tariffs.tariff_id"))
    started_at: Mapped[datetime] = mapped_column(DateTime)
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    active_minutes: Mapped[int] = mapped_column(Integer, server_default=sa_text("0"))
    pause_minutes: Mapped[int] = mapped_column(Integer, server_default=sa_text("0"))
    distance_km: Mapped[float] = mapped_column(Numeric(8, 2), server_default=sa_text("0"))
    total_cost: Mapped[Optional[float]] = mapped_column(Numeric(10, 2))
    status: Mapped[str] = mapped_column(String(30), server_default=sa_text("'ACTIVE'"))

    __table_args__ = (
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
    )

    booking: Mapped["Booking"] = relationship(back_populates="rental")
    client: Mapped["Client"] = relationship(back_populates="rentals")
    car: Mapped["Car"] = relationship(back_populates="rentals")
    tariff: Mapped["Tariff"] = relationship(back_populates="rentals")
    payments: Mapped[list["Payment"]] = relationship(back_populates="rental")
