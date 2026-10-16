from typing import Optional
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, func, text as sa_text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Booking(Base):
    __tablename__ = "bookings"

    booking_id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.client_id"))
    car_id: Mapped[int] = mapped_column(ForeignKey("cars.car_id"))
    discount_id: Mapped[Optional[int]] = mapped_column(ForeignKey("discounts.discount_id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    status: Mapped[str] = mapped_column(String(30), server_default=sa_text("'CREATED'"))

    __table_args__ = (
        CheckConstraint(
            "status IN ('CREATED','CONVERTED','CANCELLED_CLIENT','CANCELLED_TIMER','CANCELLED_STAFF')",
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
            postgresql_where=sa_text("status = 'CREATED'"),
        ),
        Index(
            "idx_bookings_one_active_per_client",
            "client_id",
            unique=True,
            postgresql_where=sa_text("status = 'CREATED'"),
        ),
    )

    client: Mapped["Client"] = relationship(back_populates="bookings")
    car: Mapped["Car"] = relationship(back_populates="bookings")
    discount: Mapped[Optional["Discount"]] = relationship(back_populates="bookings")
    rental: Mapped[Optional["Rental"]] = relationship(back_populates="booking", uselist=False)
