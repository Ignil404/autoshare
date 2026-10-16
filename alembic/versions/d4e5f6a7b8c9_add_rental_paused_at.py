"""add paused_at to rentals

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-07-09
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "d4e5f6a7b8c9"
down_revision: Union[str, None] = "c3d4e5f6a7b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("rentals", sa.Column("paused_at", sa.DateTime(), nullable=True), schema="autoshare")


def downgrade() -> None:
    op.drop_column("rentals", "paused_at", schema="autoshare")
