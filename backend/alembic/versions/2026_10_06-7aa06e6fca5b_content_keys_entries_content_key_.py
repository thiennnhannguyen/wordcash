"""Kho từ thật nạp từ backend/content/: entries thêm content_key (duy nhất), content_version, retired_at, example_vi,
mnemonic_vi, image_keyword, ipa_unverified; units thêm content_key (duy nhất); entry_type thêm giá trị "phrase".

Chỉ nâng thêm (không sửa migration cũ). Dữ liệu cũ: content_key rỗng (mục mẫu DEV_SAMPLE, từ tự tạo), content_version 0.

Revision ID: 7aa06e6fca5b
Revises: 7f3c1b2a9d40
Create Date: 2026-10-06 23:54:05.967605

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '7aa06e6fca5b'
down_revision: Union[str, Sequence[str], None] = '7f3c1b2a9d40'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

OLD_TYPES = "'word', 'collocation', 'phrasal_verb', 'idiom'"
NEW_TYPES = OLD_TYPES + ", 'phrase'"


def upgrade() -> None:
    op.add_column("entries", sa.Column("content_key", sa.String(160), nullable=True))
    op.add_column("entries", sa.Column("content_version", sa.Integer(), server_default=sa.text("0"), nullable=False))
    op.add_column("entries", sa.Column("retired_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("entries", sa.Column("example_vi", sa.Text(), nullable=True))
    op.add_column("entries", sa.Column("mnemonic_vi", sa.Text(), nullable=True))
    op.add_column("entries", sa.Column("image_keyword", sa.String(100), nullable=True))
    op.add_column("entries", sa.Column("ipa_unverified", sa.Boolean(), server_default=sa.text("false"), nullable=False))
    op.create_unique_constraint(op.f("uq_entries_content_key"), "entries", ["content_key"])
    op.add_column("units", sa.Column("content_key", sa.String(80), nullable=True))
    op.create_unique_constraint(op.f("uq_units_content_key"), "units", ["content_key"])
    op.drop_constraint(op.f("ck_entries_entry_type"), "entries", type_="check")
    op.create_check_constraint(op.f("ck_entries_entry_type"), "entries", f"entry_type IN ({NEW_TYPES})")


def downgrade() -> None:
    op.execute("UPDATE entries SET entry_type = 'collocation' WHERE entry_type = 'phrase'")
    op.drop_constraint(op.f("ck_entries_entry_type"), "entries", type_="check")
    op.create_check_constraint(op.f("ck_entries_entry_type"), "entries", f"entry_type IN ({OLD_TYPES})")
    op.drop_constraint(op.f("uq_units_content_key"), "units", type_="unique")
    op.drop_column("units", "content_key")
    op.drop_constraint(op.f("uq_entries_content_key"), "entries", type_="unique")
    for col in ("ipa_unverified", "image_keyword", "mnemonic_vi", "example_vi", "retired_at", "content_version", "content_key"):
        op.drop_column("entries", col)
