from datetime import date
from typing import Optional
from sqlalchemy import Boolean, CheckConstraint, Date, Integer, Numeric, String, text as sa_text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Discount(Base):
    __tablename__ = "discounts"
    discount_id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(30), unique=True)
    type: Mapped[str] = mapped_column(String(10))
    value: Mapped[float] = mapped_column(Numeric(8, 2))
    valid_from: Mapped[date] = mapped_column(Date)
    valid_until: Mapped[Optional[date]] = mapped_column(Date)
    usage_limit: Mapped[Optional[int]] = mapped_column(Integer)
    used_count: Mapped[int] = mapped_column(Integer, server_default=sa_text("0"))
    is_active: Mapped[bool] = mapped_column(Boolean, server_default=sa_text("true"))

    __table_args__ = (
        CheckConstraint("type IN ('PERCENT','FIXED')", name="ck_discounts_type"),
        CheckConstraint("value > 0", name="ck_discounts_value"),
        CheckConstraint(
            "valid_until IS NULL OR valid_until > valid_from",
            name="ck_discounts_dates",
        ),
    )

    client_uses: Mapped[list["ClientDiscount"]] = relationship(back_populates="discount")
    bookings: Mapped[list["Booking"]] = relationship(back_populates="discount")
