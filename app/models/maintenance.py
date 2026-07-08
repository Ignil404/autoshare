from typing import Optional
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Integer, String, Text, func, text as sa_text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Maintenance(Base):
    __tablename__ = "maintenance"

    maintenance_id: Mapped[int] = mapped_column(primary_key=True)
    car_id: Mapped[int] = mapped_column(ForeignKey("cars.car_id"))
    work_type: Mapped[str] = mapped_column(String(30))
    description: Mapped[Optional[str]] = mapped_column(Text)
    assigned_to_staff_id: Mapped[Optional[int]] = mapped_column(ForeignKey("staff.staff_id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    status: Mapped[str] = mapped_column(String(20), server_default=sa_text("'OPEN'"))
    mileage_at_open: Mapped[Optional[int]] = mapped_column(Integer)

    __table_args__ = (
        CheckConstraint(
            "work_type IN ('SERVICE','REPAIR','WASH')",
            name="ck_maintenance_work_type",
        ),
        CheckConstraint(
            "status IN ('OPEN','IN_PROGRESS','CLOSED')",
            name="ck_maintenance_status",
        ),
        CheckConstraint(
            "completed_at IS NULL OR completed_at >= created_at",
            name="ck_maintenance_completed",
        ),
        Index("idx_maintenance_car", "car_id"),
        Index("idx_maintenance_staff", "assigned_to_staff_id"),
        Index("idx_maintenance_status", "status"),
    )

    car: Mapped["Car"] = relationship(back_populates="maintenance_records")
    assigned_staff: Mapped[Optional["Staff"]] = relationship(back_populates="maintenance_tasks")
