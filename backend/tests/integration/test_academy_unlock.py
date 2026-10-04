"""
Mở khóa Học Viện trên PostgreSQL thật: bài → bài tổng hợp chặng → chặng kế → Boss → cấp kế; gọi phần bị khóa nhận đúng mã lỗi;
không bao giờ khóa lại; Hộ chiếu tăng khi đóng dấu.
"""

from datetime import UTC, datetime

import pytest

from app.core.errors import AppError
from app.models import ProgressStatus as S
from app.services import boss_service, lesson_service, roadmap_service
from tests import academy_helpers as H
from tests.factories import make_user

NOW = datetime(2026, 10, 4, 3, 0, tzinfo=UTC)


@pytest.fixture
async def world(db_session, clock_at):
    clock_at(NOW)
    await H.seeded(db_session)
    user = await make_user(db_session)
    return db_session, user


async def test_new_user_gets_a1_topic1_unit1(world):
    db, user = world
    road = await roadmap_service.get_roadmap(db, user, NOW)
    a1, a2 = road["levels"]
    assert a1["code"] == "A1" and a1["status"] == S.UNLOCKED and a2["status"] == S.LOCKED
    t1 = a1["topics"][0]
    assert t1["status"] == S.UNLOCKED and [u["status"] for u in t1["units"]] == [S.UNLOCKED, S.LOCKED]
    assert t1["test"]["status"] == "locked" and a1["topics"][1]["status"] == S.LOCKED
    assert a1["boss"]["status"] == "locked"
    assert road["passport"] == {"visited": 0, "total": 22}  # chỉ đếm cấp có trong DB: (10 + 1) × 2
    assert road["current"]["step"] == "unit" and road["current"]["unit_position"] == 1
    assert road["upcoming_levels"] == ["B1", "B2", "C1", "C2"]
    assert road["branches"][1] == {"code": "ielts", "available": False}


async def test_locked_parts_return_error_codes(world):
    db, user = world
    t1, t2 = (await H.topics(db, "A1"))[:2]
    u1, u2 = await H.units(db, t1)
    with pytest.raises(AppError) as e:
        await lesson_service.start_unit_test(db, user, u2.id, NOW)
    assert e.value.code == "UNIT_LOCKED"
    with pytest.raises(AppError) as e:
        await lesson_service.start_learn(db, user, (await H.units(db, t2))[0].id, NOW)
    assert e.value.code == "UNIT_LOCKED"
    with pytest.raises(AppError) as e:
        await lesson_service.start_topic_test(db, user, t1.id, NOW)
    assert e.value.code == "TOPIC_LOCKED"
    with pytest.raises(AppError) as e:
        await lesson_service.start_topic_practice(db, user, t2.id, NOW)
    assert e.value.code == "TOPIC_LOCKED"
    with pytest.raises(AppError) as e:
        await boss_service.start_boss(db, user, (await H.level(db, "A1")).id, NOW)
    assert e.value.code == "BOSS_LOCKED"
    with pytest.raises(AppError) as e:
        await boss_service.start_boss(db, user, (await H.level(db, "A2")).id, NOW)
    assert e.value.code == "LEVEL_LOCKED"


async def test_unit_test_threshold_unlocks_next_unit(world):
    db, user = world
    t1 = (await H.topics(db, "A1"))[0]
    u1, u2 = await H.units(db, t1)
    out = await lesson_service.start_unit_test(db, user, u1.id, NOW)
    assert out["total"] == 15  # bài 15 từ < 20 câu → hỏi hết
    assert all("answer" not in q and "entry_id" not in q for q in out["questions"])  # không lộ đáp án
    fail = await H.answer(db, user, out, correct=H.enough(15, 0.8) - 1)  # 11/15 = 73%
    assert fail["outcome"]["passed"] is False and fail["outcome"]["unlocked"] == []
    road = await roadmap_service.get_roadmap(db, user, NOW)
    assert road["levels"][0]["topics"][0]["units"][1]["status"] == S.LOCKED

    out = await lesson_service.start_unit_test(db, user, u1.id, NOW)
    ok = await H.answer(db, user, out, correct=H.enough(15, 0.8))  # 12/15 = 80%
    assert ok["outcome"]["passed"] is True
    assert ok["outcome"]["unlocked"] == [{"type": "unit", "id": u2.id, "topic_id": t1.id, "position": 2, "title": u2.title}]
    road = await roadmap_service.get_roadmap(db, user, NOW)
    u = road["levels"][0]["topics"][0]["units"]
    assert u[0]["status"] == S.COMPLETED and u[0]["best_score"] == 80 and u[0]["attempts"] == 2
    assert u[1]["status"] == S.UNLOCKED

    # Làm lại và trượt: không bao giờ khóa lại, điểm cao nhất giữ nguyên
    out = await lesson_service.start_unit_test(db, user, u1.id, NOW)
    await H.answer(db, user, out, correct=0)
    road = await roadmap_service.get_roadmap(db, user, NOW)
    u = road["levels"][0]["topics"][0]["units"]
    assert u[0]["status"] == S.COMPLETED and u[0]["best_score"] == 80 and u[1]["status"] == S.UNLOCKED


async def test_topic_test_stamps_and_opens_next_topic(world):
    db, user = world
    t1, t2 = (await H.topics(db, "A1"))[:2]
    for unit in await H.units(db, t1):
        await H.answer(db, user, await lesson_service.start_unit_test(db, user, unit.id, NOW))
    road = await roadmap_service.get_roadmap(db, user, NOW)
    assert road["levels"][0]["topics"][0]["test"]["status"] == "available"
    assert road["current"]["step"] == "topic_test"

    out = await lesson_service.start_topic_test(db, user, t1.id, NOW)
    assert out["total"] == 20
    res = await H.answer(db, user, out)
    assert res["outcome"]["passed"] is True
    assert res["outcome"]["stamps"][0]["landmark_key"] == t1.landmark_key
    types = [e["type"] for e in res["outcome"]["unlocked"]]
    assert types == ["topic", "unit"] and res["outcome"]["unlocked"][0]["id"] == t2.id
    road = await roadmap_service.get_roadmap(db, user, NOW)
    assert road["passport"]["visited"] == 1 and road["levels"][0]["passport"] == {"visited": 1, "total": 11}
    assert road["levels"][0]["topics"][0]["stamped_at"] is not None
    assert road["current"]["topic_id"] == t2.id and road["current"]["unit_position"] == 1


async def test_last_topic_opens_boss_and_win_opens_next_level(world):
    db, user = world
    a1 = await H.level(db, "A1")
    await H.fast_forward_to_boss(db, user, "A1", NOW)
    road = await roadmap_service.get_roadmap(db, user, NOW)
    assert road["levels"][0]["boss"]["status"] == "available" and road["current"]["step"] == "boss"
    assert road["passport"]["visited"] == 10

    out = await boss_service.start_boss(db, user, a1.id, NOW)
    assert out["total"] == 50
    res = await H.answer(db, user, out, correct=H.enough(50, 0.85))  # 43/50 = 86%
    o = res["outcome"]
    assert o["passed"] and o["first_win"]
    assert o["stamps"] == [{"type": "boss", "level_id": a1.id, "landmark_key": "a1_boss_ha_long", "landmark_name": "Vịnh Hạ Long",
                            "stamped_at": NOW.isoformat()}]
    assert [e["type"] for e in o["unlocked"]] == ["level", "topic", "unit"] and o["unlocked"][0]["code"] == "A2"
    assert res["rewards"]["spins"] == [{"kind": "special", "reason": "boss", "ref": "A1"}]
    road = await roadmap_service.get_roadmap(db, user, NOW)
    assert road["levels"][0]["status"] == S.COMPLETED and road["levels"][0]["boss"]["status"] == "won"
    assert road["levels"][1]["status"] == S.UNLOCKED and road["passport"]["visited"] == 11
    assert road["current"]["level_code"] == "A2"


async def test_learn_respects_daily_new_word_limit(world):
    db, user = world
    t1 = (await H.topics(db, "A1"))[0]
    u1, u2 = await H.units(db, t1)
    first = await lesson_service.start_learn(db, user, u1.id, NOW)
    assert len(first["cards"]) == 15
    await H.answer(db, user, first)
    await H.answer(db, user, await lesson_service.start_unit_test(db, user, u1.id, NOW))
    second = await lesson_service.start_learn(db, user, u2.id, NOW)
    assert len(second["cards"]) == 5  # 20 từ mới / ngày
    await H.answer(db, user, second)
    # Hết quota: luyện lại đúng 5 từ đã gặp của bài 2, không đưa 10 từ chưa học vào
    third = await lesson_service.start_learn(db, user, u2.id, NOW)
    assert third["reason"] == "daily_limit" and third["cards"] == [] and third["total"] == 10
    keys = await H.keys_of(db, third["id"])
    assert len({k["entry_id"] for k in keys}) == 5
