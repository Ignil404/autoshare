"""add topup payment type

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-07-07
"""
from typing import Sequence, Union

from alembic import op

revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE autoshare.payments DROP CONSTRAINT IF EXISTS ck_payments_type")
    op.execute(
        "ALTER TABLE autoshare.payments ADD CONSTRAINT ck_payments_type "
        "CHECK (payment_type IN ('RENTAL','FINE','REFUND','TOPUP'))"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE autoshare.payments DROP CONSTRAINT IF EXISTS ck_payments_type")
    op.execute(
        "ALTER TABLE autoshare.payments ADD CONSTRAINT ck_payments_type "
        "CHECK (payment_type IN ('RENTAL','FINE','REFUND'))"
    )
