"""add cancelled_staff status to bookings

Revision ID: a1b2c3d4e5f6
Revises: 70f5f1ec6f3a
Create Date: 2026-07-07
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "70f5f1ec6f3a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE autoshare.bookings DROP CONSTRAINT IF EXISTS ck_bookings_status")
    op.execute(
        "ALTER TABLE autoshare.bookings ADD CONSTRAINT ck_bookings_status "
        "CHECK (status IN ('CREATED','CONVERTED','CANCELLED_CLIENT','CANCELLED_TIMER','CANCELLED_STAFF'))"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE autoshare.bookings DROP CONSTRAINT IF EXISTS ck_bookings_status")
    op.execute(
        "ALTER TABLE autoshare.bookings ADD CONSTRAINT ck_bookings_status "
        "CHECK (status IN ('CREATED','CONVERTED','CANCELLED_CLIENT','CANCELLED_TIMER'))"
    )
