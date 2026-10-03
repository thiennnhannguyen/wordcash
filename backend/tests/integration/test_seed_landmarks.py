"""
Kiểm thử seed địa danh A1, A2: mỗi cấp 10 chặng (bảng topics) + 1 Boss (cột boss_landmark_* của bảng levels) = 22 địa danh,
khớp khóa tranh trong frontend (landmarkRegistry.js), chạy lại nhiều lần không nhân bản dữ liệu.
"""

import re
from pathlib import Path

from sqlalchemy import func, select

from app.models import Level, Topic
from seeds.seed_landmarks import LANDMARKS, seed_landmarks

REGISTRY = Path(__file__).resolve().parents[3] / "frontend/src/components/academy/landmarks/landmarkRegistry.js"
BOSSES = {"A1": ("a1_boss_ha_long", "Vịnh Hạ Long"), "A2": ("a2_boss_cau_vang", "Cầu Vàng Bà Nà")}


async def _all_keys(session) -> list[str]:
    topic_keys = (await session.scalars(select(Topic.landmark_key))).all()
    boss_keys = (await session.scalars(select(Level.boss_landmark_key))).all()
    return [*topic_keys, *boss_keys]


async def test_seed_has_22_landmarks(db_session):
    await seed_landmarks(db_session)
    levels = {lv.code: lv for lv in (await db_session.scalars(select(Level))).all()}
    assert set(levels) == {"A1", "A2"}
    for code, (boss_key, boss_name) in BOSSES.items():
        level = levels[code]
        assert (level.boss_landmark_key, level.boss_landmark_name) == (boss_key, boss_name)
        orders = (await db_session.scalars(select(Topic.order).where(Topic.level_id == level.id).order_by(Topic.order))).all()
        assert orders == list(range(1, 11))
    assert levels["A1"].region_theme == "vn-north" and levels["A2"].region_theme == "vn-central-south"
    keys = await _all_keys(db_session)
    assert len(keys) == len(set(keys)) == 22
    assert all(re.fullmatch(r"a[12]_[a-z_]+", k) for k in keys)
    expected = {t["landmark_key"] for d in LANDMARKS.values() for t in d["topics"]} | {k for k, _ in BOSSES.values()}
    assert set(keys) == expected


async def test_seed_matches_frontend_registry(db_session):
    await seed_landmarks(db_session)
    registry = set(re.findall(r"\ba[12]_[a-z_]+\b", REGISTRY.read_text(encoding="utf-8")))
    assert set(await _all_keys(db_session)) == registry


async def test_seed_is_idempotent(db_session):
    await seed_landmarks(db_session)
    topic = await db_session.scalar(select(Topic).where(Topic.landmark_key == "a1_ho_guom"))
    topic.title = "Sửa tay"
    await db_session.commit()
    await seed_landmarks(db_session)
    assert await db_session.scalar(select(func.count()).select_from(Level)) == 2
    assert await db_session.scalar(select(func.count()).select_from(Topic)) == 20
    assert (await db_session.scalar(select(Topic).where(Topic.landmark_key == "a1_ho_guom"))).title == "Chào hỏi"
