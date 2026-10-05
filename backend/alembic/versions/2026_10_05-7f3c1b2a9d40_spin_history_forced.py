"""spin_history thêm cột forced: đánh dấu lượt quay do POST /dev/force-next ép ra (chỉ dev/e2e).

Các dòng cũ nhận false (server_default), production luôn false.

Revision ID: 7f3c1b2a9d40
Revises: 29ca2fa1d9e0
Create Date: 2026-10-05 10:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "7f3c1b2a9d40"
down_revision: Union[str, None] = "29ca2fa1d9e0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("spin_history", sa.Column("forced", sa.Boolean(), server_default=sa.false(), nullable=False))


def downgrade() -> None:
    op.drop_column("spin_history", "forced")
