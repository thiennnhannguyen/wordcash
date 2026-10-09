"""user_entry_progress thêm first_mastered_at: lần ĐẦU TIÊN mục từ đạt "đã thuộc", không đổi khi quên rồi thuộc lại.
Bảng xếp hạng tuần chỉ tính mốc này, nên thuộc lại không được cộng điểm tuần lần nữa.

Dữ liệu cũ: điền từ mastered_at hiện có (mốc gần nhất biết được). Chỉ mục bảng xếp hạng tuần chuyển từ
(status, mastered_at) sang (status, first_mastered_at).

Chỉ nâng thêm (không sửa migration cũ).

Revision ID: d8e3f9a2b4c6
Revises: c5d2e8f1a3b7
Create Date: 2026-10-10 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd8e3f9a2b4c6'
down_revision: Union[str, Sequence[str], None] = 'c5d2e8f1a3b7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("user_entry_progress", sa.Column("first_mastered_at", sa.DateTime(timezone=True), nullable=True))
    op.execute("UPDATE user_entry_progress SET first_mastered_at = mastered_at WHERE mastered_at IS NOT NULL")
    op.drop_index("ix_user_entry_progress_status_mastered_at", table_name="user_entry_progress")
    op.create_index("ix_user_entry_progress_status_first_mastered_at", "user_entry_progress", ["status", "first_mastered_at"])


def downgrade() -> None:
    op.drop_index("ix_user_entry_progress_status_first_mastered_at", table_name="user_entry_progress")
    op.create_index("ix_user_entry_progress_status_mastered_at", "user_entry_progress", ["status", "mastered_at"])
    op.drop_column("user_entry_progress", "first_mastered_at")
