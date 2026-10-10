"""content_reports: báo lỗi nội dung từ người học (nút "Báo lỗi" ở thẻ học và tấm phản hồi sau mỗi câu, chỉ mục từ hệ thống).
Lưu loại lỗi, ghi chú, content_key + content_version lúc báo, nội dung đúng như người học đã thấy (snapshot: đề + lựa chọn +
đáp án đúng, KHÔNG có đáp án người học chọn), các trường cần xem, trạng thái open / resolved / dismissed. Một dòng mỗi
(người, mục, loại, ngày địa phương).

Chỉ nâng thêm (không sửa migration cũ).

Revision ID: 03f709a01677
Revises: e4a7c1b9d2f3
Create Date: 2026-10-10 05:26:15.765763

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '03f709a01677'
down_revision: Union[str, Sequence[str], None] = 'e4a7c1b9d2f3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('content_reports',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('user_id', sa.Uuid(), nullable=False),
    sa.Column('entry_id', sa.Integer(), nullable=False),
    sa.Column('content_key', sa.String(length=160), nullable=True),
    sa.Column('content_version', sa.Integer(), server_default='0', nullable=False),
    sa.Column('kind', sa.Enum('confusing_answer', 'wrong_meaning', 'wrong_example', 'wrong_audio', 'other', name='report_kind', native_enum=False, create_constraint=True), nullable=False),
    sa.Column('note', sa.String(length=500), nullable=True),
    sa.Column('context', sa.Enum('card', 'question', name='report_context', native_enum=False, create_constraint=True, length=16), nullable=False),
    sa.Column('source', sa.String(length=32), nullable=False),
    sa.Column('snapshot', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
    sa.Column('fields', postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'[]'::jsonb"), nullable=False),
    sa.Column('status', sa.Enum('open', 'resolved', 'dismissed', name='report_status', native_enum=False, create_constraint=True, length=16), server_default='open', nullable=False),
    sa.Column('local_day', sa.Date(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('resolved_by', sa.Uuid(), nullable=True),
    sa.ForeignKeyConstraint(['entry_id'], ['entries.id'], name=op.f('fk_content_reports_entry_id_entries'), ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['resolved_by'], ['users.id'], name=op.f('fk_content_reports_resolved_by_users'), ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_content_reports_user_id_users'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_content_reports')),
    sa.UniqueConstraint('user_id', 'entry_id', 'kind', 'local_day', name=op.f('uq_content_reports_user_id_entry_id_kind_local_day'))
    )
    op.create_index('ix_content_reports_entry_status', 'content_reports', ['entry_id', 'status'], unique=False)
    op.create_index('ix_content_reports_user_day', 'content_reports', ['user_id', 'local_day'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_content_reports_user_day', table_name='content_reports')
    op.drop_index('ix_content_reports_entry_status', table_name='content_reports')
    op.drop_table('content_reports')
