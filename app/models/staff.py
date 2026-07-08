from typing import Optional
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, String, Text, func, text as sa_text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Staff(Base):
    __tablename__ = "staff"
    staff_id: Mapped[int] = mapped_column(primary_key=True)
    full_name: Mapped[str] = mapped_column(String(150))
    email: Mapped[str] = mapped_column(String(150), unique=True)
    phone: Mapped[Optional[str]] = mapped_column(String(20))
    password_hash: Mapped[str] = mapped_column(Text)
    role: Mapped[str] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(String(20), server_default=sa_text("'ACTIVE'"))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    __table_args__ = (
        CheckConstraint("role IN ('OPERATOR','ADMIN','MAINTENANCE')", name="ck_staff_role"),
        CheckConstraint("status IN ('ACTIVE','BLOCKED')", name="ck_staff_status"),
    )

    maintenance_tasks: Mapped[list["Maintenance"]] = relationship(back_populates="assigned_staff")
