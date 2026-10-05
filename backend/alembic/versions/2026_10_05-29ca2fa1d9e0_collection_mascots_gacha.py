"""Bộ Sưu Tập & vòng quay: mascots, user_mascots, spin_history, shard_exchanges, idempotency_keys; user_stats thêm
shards / pity_counter / total_spins; users thêm arena_mascot_id và khóa ngoại avatar_mascot_id → mascots.

Dữ liệu:
- Ghi sẵn 100 dòng gốc của mascots (ảnh chụp cố định của seeds/data/mascots.json lúc viết migration: id, mã, tên, độ hiếm,
  vùng, trạng thái, cách nhận, cờ khởi đầu) để khóa ngoại và bước bù sở hữu chạy được; `python -m seeds.seed_mascots`
  cập nhật các trường hiển thị và hồ sơ sau đó.
- avatar_mascot_id không có trong mascots (không thể xảy ra với quy tắc cũ 1–3, phòng hờ) → NULL trước khi thêm khóa ngoại.
- Người dùng có avatar_mascot_id ∈ {1, 2, 3} được tạo user_mascots tương ứng (source = starter); chưa có avatar thì không tạo gì.

Revision ID: 29ca2fa1d9e0
Revises: a027e19df0ee
Create Date: 2026-10-05 01:01:59.528659

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# (id, code, name, rarity, region, status, obtain, is_starter)
BASE_MASCOTS = [
    (1, '001', 'Bông Tím', 'common', 'A1', 'released', 'gacha', True),
    (2, '002', 'Bé Thính', 'common', 'A2', 'released', 'gacha', True),
    (3, '003', 'Ớt Hiểm', 'common', 'A2', 'released', 'gacha', True),
    (4, '004', 'Bánh Mì Bé', 'common', 'A2', 'released', 'gacha', False),
    (5, '005', 'Nấm Nón', 'common', 'A1', 'released', 'gacha', False),
    (6, '006', 'Phin Phin', 'common', 'A2', 'released', 'gacha', False),
    (7, '007', 'Tò He', 'rare', 'A1', 'released', 'gacha', False),
    (8, '008', 'Lung Linh', 'rare', 'A2', 'released', 'gacha', False),
    (9, '009', 'Bánh Bao Sấm', 'epic', 'A1', 'released', 'gacha', False),
    (10, '010', 'Rồng Mây', 'legendary', 'A1', 'released', 'gacha', False),
    (11, '011', 'Trà Đá', 'common', 'A1', 'released', 'gacha', False),
    (12, '012', 'Trâu Trâu', 'common', 'A1', 'released', 'gacha', False),
    (13, '013', 'Cốm Non', 'common', 'A1', 'released', 'gacha', False),
    (14, '014', 'Diều Sáo', 'rare', 'A1', 'released', 'gacha', False),
    (15, '015', 'Tí Tễu', 'epic', 'A1', 'released', 'gacha', False),
    (16, '016', 'Dừa Xiêm', 'common', 'A2', 'released', 'gacha', False),
    (17, '017', 'Thúng Chai', 'common', 'A2', 'released', 'gacha', False),
    (18, '018', 'Sếu Đỏ', 'rare', 'A2', 'released', 'gacha', False),
    (19, '019', 'Nhũ Nhũ', 'rare', 'A2', 'released', 'gacha', False),
    (20, '020', 'Kim Đá', 'legendary', 'A2', 'released', 'gacha', False),
    (21, '021', 'Kem Kem', 'common', 'A1', 'released', 'gacha', False),
    (22, '022', 'Voọc Quần Đùi', 'common', 'A1', 'released', 'gacha', False),
    (23, '023', 'Xe Hoa', 'common', 'A1', 'released', 'gacha', False),
    (24, '024', 'Búp Sen', 'rare', 'A1', 'released', 'gacha', False),
    (25, '025', 'Đồng Đồng', 'rare', 'A1', 'released', 'gacha', False),
    (26, '026', 'Đào Đào', 'rare', 'A1', 'released', 'gacha', False),
    (27, '027', 'Lân Lân', 'epic', 'A1', 'released', 'gacha', False),
    (28, '028', 'Xèo Xèo', 'common', 'A2', 'released', 'gacha', False),
    (29, '029', 'Mai Vàng', 'rare', 'A2', 'released', 'gacha', False),
    (30, '030', 'Chép Vũ Môn', 'epic', 'A2', 'released', 'gacha', False),
    (31, '031', None, 'common', 'A2', 'coming_soon', 'gacha', False),
    (32, '032', None, 'rare', 'A2', 'coming_soon', 'gacha', False),
    (33, '033', None, 'epic', 'A2', 'coming_soon', 'gacha', False),
    (34, '034', None, 'epic', 'A2', 'coming_soon', 'gacha', False),
    (35, '035', None, 'common', 'B1', 'coming_soon', 'gacha', False),
    (36, '036', None, 'common', 'B1', 'coming_soon', 'gacha', False),
    (37, '037', None, 'common', 'B1', 'coming_soon', 'gacha', False),
    (38, '038', None, 'common', 'B1', 'coming_soon', 'gacha', False),
    (39, '039', None, 'common', 'B1', 'coming_soon', 'gacha', False),
    (40, '040', None, 'common', 'B1', 'coming_soon', 'gacha', False),
    (41, '041', None, 'common', 'B1', 'coming_soon', 'gacha', False),
    (42, '042', None, 'rare', 'B1', 'coming_soon', 'gacha', False),
    (43, '043', None, 'rare', 'B1', 'coming_soon', 'gacha', False),
    (44, '044', None, 'rare', 'B1', 'coming_soon', 'gacha', False),
    (45, '045', None, 'rare', 'B1', 'coming_soon', 'gacha', False),
    (46, '046', None, 'rare', 'B1', 'coming_soon', 'gacha', False),
    (47, '047', None, 'epic', 'B1', 'coming_soon', 'gacha', False),
    (48, '048', None, 'epic', 'B1', 'coming_soon', 'gacha', False),
    (49, '049', None, 'legendary', 'B1', 'coming_soon', 'gacha', False),
    (50, '050', None, 'common', 'B2', 'coming_soon', 'gacha', False),
    (51, '051', None, 'common', 'B2', 'coming_soon', 'gacha', False),
    (52, '052', None, 'common', 'B2', 'coming_soon', 'gacha', False),
    (53, '053', None, 'common', 'B2', 'coming_soon', 'gacha', False),
    (54, '054', None, 'common', 'B2', 'coming_soon', 'gacha', False),
    (55, '055', None, 'common', 'B2', 'coming_soon', 'gacha', False),
    (56, '056', None, 'common', 'B2', 'coming_soon', 'gacha', False),
    (57, '057', None, 'rare', 'B2', 'coming_soon', 'gacha', False),
    (58, '058', None, 'rare', 'B2', 'coming_soon', 'gacha', False),
    (59, '059', None, 'rare', 'B2', 'coming_soon', 'gacha', False),
    (60, '060', None, 'rare', 'B2', 'coming_soon', 'gacha', False),
    (61, '061', None, 'epic', 'B2', 'coming_soon', 'gacha', False),
    (62, '062', None, 'epic', 'B2', 'coming_soon', 'gacha', False),
    (63, '063', None, 'epic', 'B2', 'coming_soon', 'gacha', False),
    (64, '064', None, 'legendary', 'B2', 'coming_soon', 'gacha', False),
    (65, '065', None, 'common', 'C1', 'coming_soon', 'gacha', False),
    (66, '066', None, 'common', 'C1', 'coming_soon', 'gacha', False),
    (67, '067', None, 'common', 'C1', 'coming_soon', 'gacha', False),
    (68, '068', None, 'common', 'C1', 'coming_soon', 'gacha', False),
    (69, '069', None, 'common', 'C1', 'coming_soon', 'gacha', False),
    (70, '070', None, 'common', 'C1', 'coming_soon', 'gacha', False),
    (71, '071', None, 'rare', 'C1', 'coming_soon', 'gacha', False),
    (72, '072', None, 'rare', 'C1', 'coming_soon', 'gacha', False),
    (73, '073', None, 'rare', 'C1', 'coming_soon', 'gacha', False),
    (74, '074', None, 'rare', 'C1', 'coming_soon', 'gacha', False),
    (75, '075', None, 'epic', 'C1', 'coming_soon', 'gacha', False),
    (76, '076', None, 'epic', 'C1', 'coming_soon', 'gacha', False),
    (77, '077', None, 'epic', 'C1', 'coming_soon', 'gacha', False),
    (78, '078', None, 'legendary', 'C1', 'coming_soon', 'gacha', False),
    (79, '079', None, 'common', 'C2', 'coming_soon', 'gacha', False),
    (80, '080', None, 'common', 'C2', 'coming_soon', 'gacha', False),
    (81, '081', None, 'common', 'C2', 'coming_soon', 'gacha', False),
    (82, '082', None, 'common', 'C2', 'coming_soon', 'gacha', False),
    (83, '083', None, 'common', 'C2', 'coming_soon', 'gacha', False),
    (84, '084', None, 'common', 'C2', 'coming_soon', 'gacha', False),
    (85, '085', None, 'rare', 'C2', 'coming_soon', 'gacha', False),
    (86, '086', None, 'rare', 'C2', 'coming_soon', 'gacha', False),
    (87, '087', None, 'rare', 'C2', 'coming_soon', 'gacha', False),
    (88, '088', None, 'rare', 'C2', 'coming_soon', 'gacha', False),
    (89, '089', None, 'rare', 'C2', 'coming_soon', 'gacha', False),
    (90, '090', None, 'epic', 'C2', 'coming_soon', 'gacha', False),
    (91, '091', None, 'epic', 'C2', 'coming_soon', 'gacha', False),
    (92, '092', None, 'epic', 'C2', 'coming_soon', 'gacha', False),
    (93, '093', None, 'legendary', 'C2', 'coming_soon', 'gacha', False),
    (94, '094', None, 'common', 'SPECIAL', 'coming_soon', 'achievement', False),
    (95, '095', None, 'common', 'SPECIAL', 'coming_soon', 'achievement', False),
    (96, '096', None, 'common', 'SPECIAL', 'coming_soon', 'achievement', False),
    (97, '097', None, 'rare', 'SPECIAL', 'coming_soon', 'achievement', False),
    (98, '098', None, 'rare', 'SPECIAL', 'coming_soon', 'achievement', False),
    (99, '099', None, 'epic', 'SPECIAL', 'coming_soon', 'achievement', False),
    (100, '100', None, 'legendary', 'SPECIAL', 'coming_soon', 'achievement', False),
]

# Bù sở hữu linh vật khởi đầu cho người dùng cũ (tests/integration/test_collection_service.py chạy đúng câu này)
BACKFILL_STARTERS_SQL = (
    "INSERT INTO user_mascots (user_id, mascot_id, copies, source, first_obtained_at, last_obtained_at, is_new) "
    "SELECT id, avatar_mascot_id, 1, 'starter', COALESCE(onboarding_completed_at, created_at), "
    "COALESCE(onboarding_completed_at, created_at), false FROM users WHERE avatar_mascot_id IN (1, 2, 3) "
    "ON CONFLICT (user_id, mascot_id) DO NOTHING"
)

# revision identifiers, used by Alembic.
revision: str = '29ca2fa1d9e0'
down_revision: Union[str, Sequence[str], None] = 'a027e19df0ee'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('mascots',
    sa.Column('id', sa.Integer(), autoincrement=False, nullable=False),
    sa.Column('code', sa.String(length=3), nullable=False),
    sa.Column('name', sa.String(length=40), nullable=True),
    sa.Column('rarity', sa.Enum('common', 'rare', 'epic', 'legendary', name='mascot_rarity', native_enum=False, create_constraint=True, length=16), nullable=False),
    sa.Column('region', sa.Enum('A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'SPECIAL', name='mascot_region', native_enum=False, create_constraint=True, length=16), nullable=False),
    sa.Column('status', sa.Enum('released', 'coming_soon', name='mascot_status', native_enum=False, create_constraint=True, length=16), nullable=False),
    sa.Column('obtain', sa.Enum('gacha', 'achievement', name='mascot_obtain', native_enum=False, create_constraint=True, length=16), nullable=False),
    sa.Column('is_starter', sa.Boolean(), server_default='false', nullable=False),
    sa.Column('shape', sa.String(length=16), nullable=True),
    sa.Column('primary_color', sa.String(length=32), nullable=True),
    sa.Column('accessory', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('image_url', sa.String(length=500), nullable=True),
    sa.Column('lottie_url', sa.String(length=500), nullable=True),
    sa.Column('birthday_text', sa.String(length=120), nullable=True),
    sa.Column('hometown', sa.String(length=120), nullable=True),
    sa.Column('personality', sa.Text(), nullable=True),
    sa.Column('likes', sa.Text(), nullable=True),
    sa.Column('dislikes', sa.Text(), nullable=True),
    sa.Column('favorite_word', sa.String(length=64), nullable=True),
    sa.Column('catchphrase', sa.Text(), nullable=True),
    sa.Column('bio', sa.Text(), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_mascots')),
    sa.UniqueConstraint('code', name=op.f('uq_mascots_code'))
    )
    op.create_table('idempotency_keys',
    sa.Column('id', sa.BigInteger(), nullable=False),
    sa.Column('user_id', sa.Uuid(), nullable=False),
    sa.Column('key', sa.String(length=64), nullable=False),
    sa.Column('endpoint', sa.String(length=64), nullable=False),
    sa.Column('request_hash', sa.String(length=64), nullable=False),
    sa.Column('response_json', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_idempotency_keys_user_id_users'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_idempotency_keys')),
    sa.UniqueConstraint('user_id', 'key', 'endpoint', name=op.f('uq_idempotency_keys_user_id_key_endpoint'))
    )
    op.create_index(op.f('ix_idempotency_keys_created_at'), 'idempotency_keys', ['created_at'], unique=False)
    op.create_table('shard_exchanges',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Uuid(), nullable=False),
    sa.Column('mascot_id', sa.Integer(), nullable=False),
    sa.Column('cost', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['mascot_id'], ['mascots.id'], name=op.f('fk_shard_exchanges_mascot_id_mascots')),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_shard_exchanges_user_id_users'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_shard_exchanges'))
    )
    op.create_index(op.f('ix_shard_exchanges_user_id'), 'shard_exchanges', ['user_id'], unique=False)
    op.create_table('spin_history',
    sa.Column('id', sa.BigInteger(), nullable=False),
    sa.Column('user_id', sa.Uuid(), nullable=False),
    sa.Column('batch_id', sa.Uuid(), nullable=False),
    sa.Column('kind', sa.Enum('normal', 'special', name='spin_history_kind', native_enum=False, create_constraint=True, length=16), nullable=False),
    sa.Column('rolled_rarity', sa.Enum('common', 'rare', 'epic', 'legendary', name='spin_rolled_rarity', native_enum=False, create_constraint=True, length=16), nullable=False),
    sa.Column('final_rarity', sa.Enum('common', 'rare', 'epic', 'legendary', name='spin_final_rarity', native_enum=False, create_constraint=True, length=16), nullable=False),
    sa.Column('rarity_fallback', sa.Boolean(), nullable=False),
    sa.Column('pity_triggered', sa.Boolean(), nullable=False),
    sa.Column('mascot_id', sa.Integer(), nullable=False),
    sa.Column('was_duplicate', sa.Boolean(), nullable=False),
    sa.Column('shards_gained', sa.Integer(), nullable=False),
    sa.Column('pity_before', sa.Integer(), nullable=False),
    sa.Column('pity_after', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['mascot_id'], ['mascots.id'], name=op.f('fk_spin_history_mascot_id_mascots')),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_spin_history_user_id_users'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_spin_history'))
    )
    op.create_index(op.f('ix_spin_history_batch_id'), 'spin_history', ['batch_id'], unique=False)
    op.create_index('ix_spin_history_user_created', 'spin_history', ['user_id', 'created_at'], unique=False)
    op.create_table('user_mascots',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Uuid(), nullable=False),
    sa.Column('mascot_id', sa.Integer(), nullable=False),
    sa.Column('copies', sa.Integer(), server_default='1', nullable=False),
    sa.Column('source', sa.Enum('starter', 'gacha', 'exchange', 'achievement', name='mascot_source', native_enum=False, create_constraint=True, length=16), nullable=False),
    sa.Column('first_obtained_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('last_obtained_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('is_new', sa.Boolean(), server_default='true', nullable=False),
    sa.CheckConstraint('copies >= 1', name=op.f('ck_user_mascots_copies_positive')),
    sa.ForeignKeyConstraint(['mascot_id'], ['mascots.id'], name=op.f('fk_user_mascots_mascot_id_mascots')),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_user_mascots_user_id_users'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_user_mascots')),
    sa.UniqueConstraint('user_id', 'mascot_id', name=op.f('uq_user_mascots_user_id_mascot_id'))
    )
    op.create_index(op.f('ix_user_mascots_user_id'), 'user_mascots', ['user_id'], unique=False)
    op.add_column('user_stats', sa.Column('shards', sa.Integer(), server_default='0', nullable=False))
    op.add_column('user_stats', sa.Column('pity_counter', sa.Integer(), server_default='0', nullable=False))
    op.add_column('user_stats', sa.Column('total_spins', sa.Integer(), server_default='0', nullable=False))
    op.create_check_constraint(op.f('ck_user_stats_shards_non_negative'), 'user_stats', 'shards >= 0')
    op.create_check_constraint(op.f('ck_user_stats_pity_non_negative'), 'user_stats', 'pity_counter >= 0')
    op.add_column('users', sa.Column('arena_mascot_id', sa.Integer(), nullable=True))

    mascots = sa.table('mascots', sa.column('id', sa.Integer), sa.column('code', sa.String), sa.column('name', sa.String),
                       sa.column('rarity', sa.String), sa.column('region', sa.String), sa.column('status', sa.String),
                       sa.column('obtain', sa.String), sa.column('is_starter', sa.Boolean))
    op.bulk_insert(mascots, [dict(zip(('id', 'code', 'name', 'rarity', 'region', 'status', 'obtain', 'is_starter'), row)) for row in BASE_MASCOTS])
    op.execute("UPDATE users SET avatar_mascot_id = NULL WHERE avatar_mascot_id IS NOT NULL AND avatar_mascot_id NOT IN (SELECT id FROM mascots)")
    op.execute(BACKFILL_STARTERS_SQL)
    op.create_foreign_key(op.f('fk_users_avatar_mascot_id_mascots'), 'users', 'mascots', ['avatar_mascot_id'], ['id'])
    op.create_foreign_key(op.f('fk_users_arena_mascot_id_mascots'), 'users', 'mascots', ['arena_mascot_id'], ['id'])
    # ### end Alembic commands ###


def downgrade() -> None:
    """Downgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_constraint(op.f('fk_users_arena_mascot_id_mascots'), 'users', type_='foreignkey')
    op.drop_constraint(op.f('fk_users_avatar_mascot_id_mascots'), 'users', type_='foreignkey')
    op.drop_column('users', 'arena_mascot_id')
    op.drop_constraint(op.f('ck_user_stats_pity_non_negative'), 'user_stats', type_='check')
    op.drop_constraint(op.f('ck_user_stats_shards_non_negative'), 'user_stats', type_='check')
    op.drop_column('user_stats', 'total_spins')
    op.drop_column('user_stats', 'pity_counter')
    op.drop_column('user_stats', 'shards')
    op.drop_index(op.f('ix_user_mascots_user_id'), table_name='user_mascots')
    op.drop_table('user_mascots')
    op.drop_index('ix_spin_history_user_created', table_name='spin_history')
    op.drop_index(op.f('ix_spin_history_batch_id'), table_name='spin_history')
    op.drop_table('spin_history')
    op.drop_index(op.f('ix_shard_exchanges_user_id'), table_name='shard_exchanges')
    op.drop_table('shard_exchanges')
    op.drop_index(op.f('ix_idempotency_keys_created_at'), table_name='idempotency_keys')
    op.drop_table('idempotency_keys')
    op.drop_table('mascots')
    # ### end Alembic commands ###
