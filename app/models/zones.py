from sqlalchemy import CheckConstraint, String, Text, text as sa_text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Zone(Base):
    __tablename__ = "zones"
    __table_args__ = (
        CheckConstraint("zone_type IN ('AVAILABLE','RESTRICTED')", name="ck_zones_zone_type"),
        CheckConstraint("status IN ('ACTIVE','INACTIVE')", name="ck_zones_status"),
    )

    zone_id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    zone_type: Mapped[str] = mapped_column(String(20))
    boundary: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), server_default=sa_text("'ACTIVE'"))

    tariffs: Mapped[list["Tariff"]] = relationship(back_populates="zone")
    cars: Mapped[list["Car"]] = relationship(back_populates="zone")
