from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class ClientDiscount(Base):
    __tablename__ = "client_discounts"

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.client_id"))
    discount_id: Mapped[int] = mapped_column(ForeignKey("discounts.discount_id"))
    applied_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    __table_args__ = (
        Index("idx_client_discounts_client", "client_id"),
    )

    client: Mapped["Client"] = relationship(back_populates="discounts")
    discount: Mapped["Discount"] = relationship(back_populates="client_uses")
