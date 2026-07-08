from datetime import date
from typing import Optional
from sqlalchemy import CheckConstraint, Date, ForeignKey, Index, Integer, SmallInteger, String, text as sa_text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Car(Base):
    __tablename__ = "cars"

    car_id: Mapped[int] = mapped_column(primary_key=True)
    plate_number: Mapped[str] = mapped_column(String(20), unique=True)
    brand: Mapped[str] = mapped_column(String(50))
    model: Mapped[str] = mapped_column(String(50))
    year: Mapped[int] = mapped_column(SmallInteger)
    color: Mapped[Optional[str]] = mapped_column(String(30))
    car_class: Mapped[str] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(String(20), server_default=sa_text("'FREE'"))
    mileage: Mapped[int] = mapped_column(Integer, server_default=sa_text("0"))
    tariff_id: Mapped[Optional[int]] = mapped_column(ForeignKey("tariffs.tariff_id"))
    zone_id: Mapped[Optional[int]] = mapped_column(ForeignKey("zones.zone_id"))
    last_service: Mapped[Optional[date]] = mapped_column(Date)
    lat: Mapped[Optional[float]] = mapped_column()
    lng: Mapped[Optional[float]] = mapped_column()

    __table_args__ = (
        CheckConstraint("car_class IN ('ECONOMY','COMFORT','BUSINESS')", name="ck_cars_class"),
        CheckConstraint(
            "status IN ('FREE','BOOKED','RENTED','MAINTENANCE','UNAVAILABLE')",
            name="ck_cars_status",
        ),
        Index("idx_cars_status", "status"),
        Index("idx_cars_tariff", "tariff_id"),
        Index("idx_cars_zone", "zone_id"),
    )

    tariff: Mapped[Optional["Tariff"]] = relationship(back_populates="cars")
    zone: Mapped[Optional["Zone"]] = relationship(back_populates="cars")
    bookings: Mapped[list["Booking"]] = relationship(back_populates="car")
    rentals: Mapped[list["Rental"]] = relationship(back_populates="car")
    maintenance_records: Mapped[list["Maintenance"]] = relationship(back_populates="car")
