"""topics thêm topic_code: mã chủ đề (greetings, food…) là khóa nối nội dung content/<cấp>/<topic_code>.json với chặng;
địa danh (landmark_*) chỉ còn là thuộc tính hiển thị. Duy nhất trong một cấp. Điền sẵn cho 20 chặng A1–A2 đã seed (theo
landmark_key tại thời điểm viết migration); chặng khác để rỗng.

Chỉ nâng thêm (không sửa migration cũ).

Revision ID: 578060e34394
Revises: 7aa06e6fca5b
Create Date: 2026-10-07 18:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '578060e34394'
down_revision: Union[str, Sequence[str], None] = '7aa06e6fca5b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Ảnh chụp ánh xạ lúc viết migration (không đọc seed để migration không đổi theo code về sau)
BACKFILL = {
    "a1_ho_guom": "greetings", "a1_van_mieu": "family", "a1_chua_mot_cot": "numbers_time", "a1_pho_co": "food",
    "a1_mu_cang_chai": "home", "a1_cau_long_bien": "travel", "a1_cho_dong_xuan": "shopping", "a1_fansipan": "weather",
    "a1_trang_an": "nature", "a1_ma_pi_leng": "school",
    "a2_dai_noi_hue": "daily_routine", "a2_chua_thien_mu": "feelings", "a2_hoi_an": "festivals", "a2_cau_rong": "city",
    "a2_phong_nha": "exploring", "a2_mui_ne": "beach_holidays", "a2_da_lat": "free_time", "a2_ben_thanh": "money_prices",
    "a2_nha_tho_duc_ba": "architecture", "a2_cho_noi_cai_rang": "farm_food",
}


def upgrade() -> None:
    op.add_column("topics", sa.Column("topic_code", sa.String(40), nullable=True))
    topics = sa.table("topics", sa.column("landmark_key", sa.String), sa.column("topic_code", sa.String))
    for landmark, code in BACKFILL.items():
        op.execute(topics.update().where(topics.c.landmark_key == landmark).values(topic_code=code))
    op.create_unique_constraint(op.f("uq_topics_level_id_topic_code"), "topics", ["level_id", "topic_code"])


def downgrade() -> None:
    op.drop_constraint(op.f("uq_topics_level_id_topic_code"), "topics", type_="unique")
    op.drop_column("topics", "topic_code")
