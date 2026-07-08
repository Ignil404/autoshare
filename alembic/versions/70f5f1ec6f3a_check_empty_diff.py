"""check_empty_diff

Revision ID: 70f5f1ec6f3a
Revises: 001
Create Date: 2026-07-07 11:33:03.851722
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '70f5f1ec6f3a'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
