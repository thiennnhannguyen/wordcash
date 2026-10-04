"""
API Học Viện + Cửa Ải + /me/stats qua httpx (PostgreSQL test thật, clock cố định bằng fixture clock_at).
Kiểm tra: không lộ đáp án trước khi nộp, nộp lại idempotent, chặn route học khi chưa vượt Cửa Ải, route dev không có ngoài dev/e2e.
"""

import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import select

from app.models import DailyCheck, StudySession
from tests import academy_helpers as H

DAY1 = datetime(2026, 10, 4, 3, 0, tzinfo=UTC)  # 10:00 giờ Việt Nam
API = "/api/v1"


async def _keys(db, sid):
    study = await db.scalar(select(StudySession).where(StudySession.id == sid).execution_options(populate_existing=True))
    return {q["id"]: q for q in study.questions}


def _no_answers(questions):
    for q in questions:
        assert "answer" not in q and "entry_id" not in q and "topic_id" not in q, q


async def _submit_all(client, db, headers, sid, right=True):
    keys = await _keys(db, sid)
    answers = [{"question_id": qid, "answer": k["answer"] if right else "sai"} for qid, k in keys.items()]
    return await client.post(f"{API}/study-sessions/{sid}/answers", json={"answers": answers}, headers=headers)


async def test_roadmap_learn_and_test_flow(client, db_session, auth_user, clock_at):
    clock_at(DAY1)
    await H.seeded(db_session)
    h = auth_user["headers"]
    res = await client.get(f"{API}/academy/roadmap", headers=h)
    assert res.status_code == 200, res.text
    road = res.json()
    unit1 = road["levels"][0]["topics"][0]["units"][0]
    unit2 = road["levels"][0]["topics"][0]["units"][1]
    assert unit1["status"] == "unlocked" and unit2["status"] == "locked" and road["passport"]["total"] == 22

    detail = (await client.get(f"{API}/academy/units/{unit1['id']}", headers=h)).json()
    assert len(detail["words"]) == 15 and detail["new_words_left_today"] == 40
    assert (await client.get(f"{API}/academy/units/{unit2['id']}", headers=h)).json()["error"]["code"] == "UNIT_LOCKED"

    learn = await client.post(f"{API}/academy/units/{unit1['id']}/learn-sessions", headers=h)
    assert learn.status_code == 201, learn.text
    body = learn.json()
    assert len(body["cards"]) == 15 and body["total"] == 30 and body["kind"] == "unit_learn"
    _no_answers(body["questions"])
    assert {q["level"] for q in body["questions"]} >= {1, 3}

    test = (await client.post(f"{API}/academy/units/{unit1['id']}/test-sessions", headers=h)).json()
    _no_answers(test["questions"])
    first = test["questions"][0]["id"]
    keys = await _keys(db_session, test["id"])
    one = await client.post(f"{API}/study-sessions/{test['id']}/answers",
                            json={"answers": [{"question_id": first, "answer": keys[first]["answer"]}]}, headers=h)
    assert one.json()["results"][0]["correct"] is True and one.json()["results"][0]["correct_answer"] is None  # test: chưa lộ đáp án

    done = await _submit_all(client, db_session, h, test["id"])
    out = done.json()
    assert out["finished"] and out["summary"]["score"] == 100 and out["outcome"]["passed"]
    assert out["outcome"]["unlocked"][0]["id"] == unit2["id"]
    assert all(r["correct_answer"] for r in out["results"])  # nộp hết mới lộ đáp án

    # Nộp lại cả phiên: trả kết quả cũ, không tính thêm lượt làm bài
    again = (await _submit_all(client, db_session, h, test["id"])).json()
    assert again["outcome"] == out["outcome"] and again["summary"] == out["summary"]
    road = (await client.get(f"{API}/academy/roadmap", headers=h)).json()
    assert road["levels"][0]["topics"][0]["units"][0]["attempts"] == 1
    # Câu mới vào phiên đã xong → SESSION_FINISHED
    bad = await client.post(f"{API}/study-sessions/{test['id']}/answers", json={"answers": [{"question_id": "q99", "answer": "x"}]}, headers=h)
    assert bad.status_code == 409 and bad.json()["error"]["code"] == "SESSION_FINISHED"


async def test_daily_check_gate_and_stats(client, db_session, auth_user, clock_at):
    clock_at(DAY1)
    await H.seeded(db_session)
    h = auth_user["headers"]
    road = (await client.get(f"{API}/academy/roadmap", headers=h)).json()
    unit1 = road["levels"][0]["topics"][0]["units"][0]["id"]

    # Ngày 1: chưa học từ nào → được miễn, học bình thường
    today = (await client.get(f"{API}/daily-check/today", headers=h)).json()
    assert today["status"] == "exempt" and today["questions"] == []
    learn = (await client.post(f"{API}/academy/units/{unit1}/learn-sessions", headers=h)).json()
    await _submit_all(client, db_session, h, learn["id"])

    # Ngày 2: route học bị chặn tới khi vượt Cửa Ải; GET và /me/stats vẫn dùng được
    clock_at(DAY1 + timedelta(days=1))
    blocked = await client.post(f"{API}/academy/units/{unit1}/test-sessions", headers=h)
    assert blocked.status_code == 409 and blocked.json()["error"]["code"] == "DAILY_CHECK_REQUIRED"
    for path in ("/review/sessions",):
        r = await client.post(f"{API}{path}", headers=h)
        assert r.json()["error"]["code"] == "DAILY_CHECK_REQUIRED", path
    assert (await client.get(f"{API}/academy/roadmap", headers=h)).status_code == 200
    stats = (await client.get(f"{API}/me/stats", headers=h)).json()
    assert stats["today"]["daily_check"] == "pending" and stats["streak"]["current"] == 0

    check = (await client.get(f"{API}/daily-check/today", headers=h)).json()
    assert check["status"] == "pending" and 2 <= check["total"] <= 5
    assert {q["type"] for q in check["questions"]} <= {"type_word", "fill_blank"}
    _no_answers(check["questions"])
    row = await db_session.scalar(select(DailyCheck).where(DailyCheck.id == check["id"]).execution_options(populate_existing=True))
    answers = [{"question_id": q["id"], "answer": q["answer"]} for q in row.questions]
    res = await client.post(f"{API}/daily-check/today/answers", json={"answers": answers}, headers=h)
    body = res.json()
    assert res.status_code == 200 and body["status"] == "passed" and body["result"]["streak"] == 1
    assert body["results"][0]["correct_answer"] and body["results"][0]["entry"]["ipa"]
    again = await client.post(f"{API}/daily-check/today/answers", json={"answers": answers}, headers=h)
    assert again.json()["result"] == body["result"]  # nộp lại: kết quả cũ

    ok = await client.post(f"{API}/academy/units/{unit1}/test-sessions", headers=h)
    assert ok.status_code == 201
    stats = (await client.get(f"{API}/me/stats", headers=h)).json()
    assert stats["streak"]["current"] == 1 and stats["today"]["daily_check"] == "passed"
    assert stats["rank"]["current"] == "tan_binh" and stats["spins"]["progress"]["target"] == 50
    assert stats["position"]["step"] == "unit" and stats["passport"] == {"visited": 0, "total": 22}
    week = stats["streak"]["week"]
    assert len(week) == 7 and [d["status"] for d in week if d["today"]] == ["passed"]


async def test_dev_router_absent_outside_dev(client, auth_user):
    res = await client.post(f"{API}/dev/academy/fast-forward", json={"level_code": "A1"}, headers=auth_user["headers"])
    assert res.status_code == 404
    for path in (f"/dev/study-sessions/{uuid.uuid4()}/key", "/dev/daily-check/key"):
        assert (await client.get(f"{API}{path}", headers=auth_user["headers"])).status_code == 404


def test_dev_router_only_registered_in_dev_and_e2e():
    """Router dev chỉ được gắn khi ENV development/e2e (kiểm tra trên app dựng lại với từng ENV)."""
    import importlib

    from app.core.config import settings
    import app.api.v1 as v1

    from fastapi import FastAPI

    def paths(router):
        probe = FastAPI()
        probe.include_router(router)
        return set(probe.openapi()["paths"])

    original = settings.ENV
    try:
        for env, expected in (("production", False), ("testing", False), ("development", True), ("e2e", True)):
            settings.ENV = env
            module = importlib.reload(v1)
            assert ("/api/v1/dev/daily-check/key" in paths(module.api_router)) is expected, env
    finally:
        settings.ENV = original
        importlib.reload(v1)


async def test_ielts_branch_is_coming_soon(client, db_session, auth_user, clock_at):
    clock_at(DAY1)
    await H.seeded(db_session)
    body = (await client.get(f"{API}/academy/roadmap?branch=ielts", headers=auth_user["headers"])).json()
    assert body["available"] is False and body["levels"] == []
    bad = await client.get(f"{API}/academy/roadmap?branch=xyz", headers=auth_user["headers"])
    assert bad.status_code == 422



async def test_review_due_and_session(client, db_session, auth_user, clock_at):
    clock_at(DAY1)
    await H.seeded(db_session)
    h = auth_user["headers"]
    road = (await client.get(f"{API}/academy/roadmap", headers=h)).json()
    unit1 = road["levels"][0]["topics"][0]["units"][0]["id"]
    before = (await client.get(f"{API}/review/due", headers=h)).json()
    assert before["due_count"] == 0 and before["status_counts"]["new"] == 15
    learn = (await client.post(f"{API}/academy/units/{unit1}/learn-sessions", headers=h)).json()
    await _submit_all(client, db_session, h, learn["id"])
    assert (await client.post(f"{API}/review/sessions", headers=h)).json()["error"]["code"] == "NOTHING_TO_STUDY"

    clock_at(DAY1 + timedelta(days=1, hours=1))  # hạn ôn đầu tiên: 1 ngày sau
    await client.get(f"{API}/daily-check/today", headers=h)
    row = await db_session.scalar(select(DailyCheck).where(DailyCheck.status == "pending").execution_options(populate_existing=True))
    await client.post(f"{API}/daily-check/today/answers", json={"answers": [{"question_id": q["id"], "answer": q["answer"]} for q in row.questions]}, headers=h)
    due = (await client.get(f"{API}/review/due", headers=h)).json()
    assert due["due_count"] > 0 and len(due["words"]) == 15 and due["status_counts"]["new"] == 0
    session = (await client.post(f"{API}/review/sessions", headers=h)).json()
    assert session["kind"] == "review" and session["total"] == min(due["due_count"], 20)
    _no_answers(session["questions"])
