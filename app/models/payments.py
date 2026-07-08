from typing import Optional
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Numeric, String, func, text as sa_text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Payment(Base):
    __tablename__ = "payments"

    payment_id: Mapped[int] = mapped_column(primary_key=True)
    rental_id: Mapped[Optional[int]] = mapped_column(ForeignKey("rentals.rental_id"))
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.client_id"))
    amount: Mapped[float] = mapped_column(Numeric(10, 2))
    payment_type: Mapped[str] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(String(20), server_default=sa_text("'PENDING'"))
    external_id: Mapped[Optional[str]] = mapped_column(String(100))
    processed_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    __table_args__ = (
        CheckConstraint("amount <> 0", name="ck_payments_amount"),
        CheckConstraint(
            "payment_type IN ('RENTAL','FINE','REFUND','TOPUP')",
            name="ck_payments_type",
        ),
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
    )

    rental: Mapped[Optional["Rental"]] = relationship(back_populates="payments")
    client: Mapped["Client"] = relationship(back_populates="payments")
