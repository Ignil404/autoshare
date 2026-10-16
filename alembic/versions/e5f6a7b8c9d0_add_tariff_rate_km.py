"""add rate_km to tariffs

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-07-09
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "e5f6a7b8c9d0"
down_revision: Union[str, None] = "d4e5f6a7b8c9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("tariffs", sa.Column("rate_km", sa.Numeric(8, 2), server_default="0"), schema="autoshare")


def downgrade() -> None:
    op.drop_column("tariffs", "rate_km", schema="autoshare")
