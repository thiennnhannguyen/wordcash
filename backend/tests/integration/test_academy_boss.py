"""
Trận Boss: thắng ≥ 85%; thua thì chặng yếu đúng; thử lại bị chặn trước 12 giờ (BOSS_COOLDOWN kèm retry_at, weak_topics);
luyện đủ chặng yếu thì được thử ngay; sau 12 giờ thì được thử; thắng lần hai không cấp thêm lượt.
"""

from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import func, select

from app.core.errors import AppError
from app.models import SpinGrant, UserStats
from app.services import boss_service, lesson_service, roadmap_service
from tests import academy_helpers as H
from tests.factories import make_user

NOW = datetime(2026, 10, 4, 3, 0, tzinfo=UTC)


@pytest.fixture
async def at_boss(db_session, clock_at):
    clock_at(NOW)
    await H.seeded(db_session)
    user = await make_user(db_session)
    await H.fast_forward_to_boss(db_session, user, "A1", NOW)
    return db_session, user, await H.level(db_session, "A1"), await H.topics(db_session, "A1")


async def _lose_with_weak(db, user, level, weak_topics, now):
    """Sai mọi câu của các chặng `weak_topics`, đúng phần còn lại → thua (10 câu sai / 50 = 80%)."""
    out = await boss_service.start_boss(db, user, level.id, now)
    keys = await H.keys_of(db, out["id"])
    weak_ids = {t.id for t in weak_topics}
    wrong = {k["entry_id"] for k in keys if k["topic_id"] in weak_ids}
    return await H.answer(db, user, out, wrong_ids=wrong)


async def test_lose_reports_weak_topics_and_blocks_retry(at_boss, clock_at):
    db, user, level, topics = at_boss
    res = await _lose_with_weak(db, user, level, [topics[3], topics[7]], NOW)
    o = res["outcome"]
    assert o["passed"] is False and o["score"] == 80
    assert [w["id"] for w in o["weak_topics"]] == [topics[3].id, topics[7].id]
    assert o["retry_at"] == (NOW + timedelta(hours=12)).isoformat()
    assert all("correct_answer" in r for r in res["results"])  # nộp hết: lộ đáp án

    clock_at(NOW + timedelta(hours=11, minutes=59))
    with pytest.raises(AppError) as e:
        await boss_service.start_boss(db, user, level.id, NOW + timedelta(hours=11, minutes=59))
    assert e.value.code == "BOSS_COOLDOWN"
    assert e.value.details["retry_at"] == (NOW + timedelta(hours=12)).isoformat()
    assert [w["id"] for w in e.value.details["weak_topics"]] == [topics[3].id, topics[7].id]
    status = await boss_service.get_boss(db, user, level.id, NOW + timedelta(hours=1))
    assert status["status"] == "cooldown" and status["can_retry"]["allowed"] is False

    # Sau 12 giờ thì được thử lại dù chưa luyện
    later = NOW + timedelta(hours=12)
    clock_at(later)
    assert (await boss_service.get_boss(db, user, level.id, later))["can_retry"]["reason"] == "cooldown_over"
    assert (await boss_service.start_boss(db, user, level.id, later))["total"] == 50


async def test_practicing_every_weak_topic_allows_immediate_retry(at_boss, clock_at):
    db, user, level, topics = at_boss
    await _lose_with_weak(db, user, level, [topics[0], topics[1]], NOW)
    t = NOW + timedelta(minutes=10)
    clock_at(t)

    # Luyện một chặng yếu chưa đủ
    practice = await lesson_service.start_topic_practice(db, user, topics[0].id, t)
    assert practice["total"] >= 10
    res = await H.answer(db, user, practice, correct=0)  # hoàn thành là đủ, không xét điểm
    assert res["outcome"]["boss_retry"]["allowed"] is False
    assert [w["practiced"] for w in res["outcome"]["boss_retry"]["weak_topics"]] == [True, False]
    with pytest.raises(AppError):
        await boss_service.start_boss(db, user, level.id, t)

    # Luyện chặng không yếu không tính
    await H.answer(db, user, await lesson_service.start_topic_practice(db, user, topics[5].id, t))
    assert (await boss_service.can_retry(db, user, await roadmap_service.load_structure(db), level, t))["allowed"] is False

    res = await H.answer(db, user, await lesson_service.start_topic_practice(db, user, topics[1].id, t))
    assert res["outcome"]["boss_retry"] | {"weak_topics": None} == {"allowed": True, "reason": "practiced", "practiced": True,
                                                                   "retry_at": (NOW + timedelta(hours=12)).isoformat(), "weak_topics": None}
    assert (await boss_service.start_boss(db, user, level.id, t))["total"] == 50


async def test_win_after_loss_and_rewin_gives_no_extra_spin(at_boss, clock_at):
    db, user, level, topics = at_boss
    await _lose_with_weak(db, user, level, [topics[2], topics[4]], NOW)
    later = NOW + timedelta(hours=13)
    clock_at(later)
    win = await H.answer(db, user, await boss_service.start_boss(db, user, level.id, later))
    assert win["outcome"]["passed"] and win["outcome"]["first_win"] and len(win["rewards"]["spins"]) == 1
    again = await H.answer(db, user, await boss_service.start_boss(db, user, level.id, later))  # đã thắng: đánh lại tự do
    assert again["outcome"]["passed"] and again["outcome"]["first_win"] is False and again["rewards"]["spins"] == []
    grants = await db.scalar(select(func.count()).select_from(SpinGrant).where(SpinGrant.user_id == user.id, SpinGrant.reason == "boss"))
    stats = await db.scalar(select(UserStats).where(UserStats.user_id == user.id).execution_options(populate_existing=True))
    assert grants == 1 and stats.spins_special == 1
