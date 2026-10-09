"""entries thêm cloze_en (câu riêng cho câu hỏi Mức 4 "điền vào câu", chỉ đúng một đáp án hợp) và cloze_distractors (đúng 3
đáp án nhiễu soạn sẵn, cùng từ loại). Trống → không ra câu Mức 4 cho mục đó (lùi về Mức 3).

Chỉ nâng thêm (không sửa migration cũ).

Revision ID: e4a7c1b9d2f3
Revises: d8e3f9a2b4c6
Create Date: 2026-10-10 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'e4a7c1b9d2f3'
down_revision: Union[str, Sequence[str], None] = 'd8e3f9a2b4c6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("entries", sa.Column("cloze_en", sa.String(length=300), nullable=True))
    op.add_column("entries", sa.Column("cloze_distractors", postgresql.JSONB(astext_type=sa.Text()),
                                       server_default=sa.text("'[]'::jsonb"), nullable=False))


def downgrade() -> None:
    op.drop_column("entries", "cloze_distractors")
    op.drop_column("entries", "cloze_en")
