from datetime import date
from typing import Optional
from sqlalchemy import CheckConstraint, Date, ForeignKey, Numeric, String, func, text as sa_text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Tariff(Base):
    __tablename__ = "tariffs"
    tariff_id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    tariff_type: Mapped[str] = mapped_column(String(20))
    rate_active: Mapped[float] = mapped_column(Numeric(8, 2))
    rate_pause: Mapped[float] = mapped_column(Numeric(8, 2))
    rate_km: Mapped[float] = mapped_column(Numeric(8, 2), server_default=sa_text("0"))
    min_charge: Mapped[float] = mapped_column(Numeric(8, 2), server_default=sa_text("0"))
    zone_id: Mapped[Optional[int]] = mapped_column(ForeignKey("zones.zone_id"))
    status: Mapped[str] = mapped_column(String(20), server_default=sa_text("'ACTIVE'"))
    valid_from: Mapped[date] = mapped_column(Date, server_default=func.current_date())

    __table_args__ = (
        CheckConstraint("tariff_type IN ('MINUTE','HOUR','DAY')", name="ck_tariffs_type"),
        CheckConstraint("rate_active > 0", name="ck_tariffs_rate_active"),
        CheckConstraint("rate_pause >= 0", name="ck_tariffs_rate_pause"),
        CheckConstraint("status IN ('ACTIVE','INACTIVE')", name="ck_tariffs_status"),
    )

    zone: Mapped[Optional["Zone"]] = relationship(back_populates="tariffs")
    cars: Mapped[list["Car"]] = relationship(back_populates="tariff")
    rentals: Mapped[list["Rental"]] = relationship(back_populates="tariff")
