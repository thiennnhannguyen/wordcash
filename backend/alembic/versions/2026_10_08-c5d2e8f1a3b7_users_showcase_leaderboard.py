"""users thêm showcase_mascot_ids (tủ trưng bày hồ sơ: tối đa 3 linh vật đang sở hữu; NULL = mặc định 3 con hiếm nhất) và
show_on_leaderboard (mặc định true; tắt thì không xuất hiện trong bảng xếp hạng nhưng vẫn thấy hạng của mình).
Chỉ mục cho bảng xếp hạng tuần: user_entry_progress (status, mastered_at).

Chỉ nâng thêm (không sửa migration cũ).

Revision ID: c5d2e8f1a3b7
Revises: b41e7c2d9a10
Create Date: 2026-10-08 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'c5d2e8f1a3b7'
down_revision: Union[str, Sequence[str], None] = 'b41e7c2d9a10'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("showcase_mascot_ids", postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column("users", sa.Column("show_on_leaderboard", sa.Boolean(), server_default=sa.true(), nullable=False))
    op.create_index("ix_user_entry_progress_status_mastered_at", "user_entry_progress", ["status", "mastered_at"])


def downgrade() -> None:
    op.drop_index("ix_user_entry_progress_status_mastered_at", table_name="user_entry_progress")
    op.drop_column("users", "show_on_leaderboard")
    op.drop_column("users", "showcase_mascot_ids")
