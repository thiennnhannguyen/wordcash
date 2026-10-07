"""entries thêm variant_note: ghi chú biến thể Anh-Mỹ của mục từ (vd. autumn → "Mỹ thường dùng: fall"), hiện dưới nghĩa trên
thẻ học. Rỗng với mục không cần ghi chú và từ tự tạo.

Chỉ nâng thêm (không sửa migration cũ).

Revision ID: b41e7c2d9a10
Revises: 578060e34394
Create Date: 2026-10-07 21:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b41e7c2d9a10'
down_revision: Union[str, Sequence[str], None] = '578060e34394'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("entries", sa.Column("variant_note", sa.String(length=120), nullable=True))


def downgrade() -> None:
    op.drop_column("entries", "variant_note")
