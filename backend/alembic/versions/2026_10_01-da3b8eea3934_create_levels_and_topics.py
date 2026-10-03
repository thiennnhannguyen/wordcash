"""create levels and topics

Bảng cấp độ và chặng chủ đề (kèm cột địa danh cho bản đồ). Tách từ migration đầu tiên khi bảng users
được làm lại với id UUID (chưa triển khai nên viết lại lịch sử migration).

Revision ID: da3b8eea3934
Revises:
Create Date: 2026-10-01 21:20:03.728317

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'da3b8eea3934'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('levels',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('code', sa.String(length=2), nullable=False),
    sa.Column('name', sa.String(length=64), nullable=False),
    sa.Column('order', sa.Integer(), nullable=False),
    sa.Column('region_theme', sa.String(length=32), nullable=True),
    sa.Column('boss_landmark_key', sa.String(length=64), nullable=True),
    sa.Column('boss_landmark_name', sa.String(length=128), nullable=True),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_levels')),
    sa.UniqueConstraint('code', name=op.f('uq_levels_code')),
    sa.UniqueConstraint('order', name=op.f('uq_levels_order'))
    )
    op.create_table('topics',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('level_id', sa.Integer(), nullable=False),
    sa.Column('order', sa.Integer(), nullable=False),
    sa.Column('title', sa.String(length=128), nullable=False),
    sa.Column('landmark_key', sa.String(length=64), nullable=True),
    sa.Column('landmark_name', sa.String(length=128), nullable=True),
    sa.Column('landmark_image', sa.String(length=512), nullable=True),
    sa.ForeignKeyConstraint(['level_id'], ['levels.id'], name=op.f('fk_topics_level_id_levels'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_topics')),
    sa.UniqueConstraint('level_id', 'order', name=op.f('uq_topics_level_id_order'))
    )
    op.create_index(op.f('ix_topics_level_id'), 'topics', ['level_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_topics_level_id'), table_name='topics')
    op.drop_table('topics')
    op.drop_table('levels')
