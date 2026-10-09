"""
Báo lỗi nội dung (POST /content-reports, /admin/content-reports) trên PostgreSQL test:
- câu hỏi: server chụp lại đề ĐÚNG như người học thấy (phần đề đã lưu + đáp án đúng), content_key / content_version lúc báo;
  KHÔNG lưu đáp án người học đã chọn; "Đáp án gây nhầm" ở câu Mức 4 → cloze_en, cloze_distractors;
- thẻ học: chụp các trường thẻ; từ tự tạo không báo được; phiên của người khác → 404;
- Cửa Ải Hôm Nay báo được câu vừa làm;
- cùng người + mục + loại trong ngày: gửi lại vẫn thành công, không thêm dòng; tối đa 20 báo cáo mới mỗi ngày (ngày mới mở lại);
- quản trị: CHỈ admin (401 khi chưa đăng nhập, 403 với người dùng thường); gom theo mục, sắp theo số báo cáo; đánh dấu resolved
  một mục → mọi báo cáo đang mở của mục đó resolved; đổi trạng thái từng báo cáo.
"""

import random
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import func, select

from app.core.config import settings
from app.core.security import create_access_token
from app.models import ContentReport, DailyCheck, DailyCheckStatus, Role, SessionKind, StudyMode
from app.services import session_engine
from tests.factories import make_custom, make_entry, make_user

API = "/api/v1"
NOW = datetime(2026, 10, 10, 3, 0, tzinfo=UTC)


def auth(user):
    return {"Authorization": f"Bearer {create_access_token(user.id, user.role.value)[0]}"}


async def _entries(db):
    rice = await make_entry(db, "rice", "cơm", cefr="A1", example="We eat rice.", content_key="a1.food.rice.noun", content_version=3,
                            cloze_en="In Vietnam, people cook white rice and eat it with fish.", cloze_distractors=["milk", "juice", "tea"])
    others = [await make_entry(db, w, m, cefr="A1") for w, m in (("egg", "quả trứng"), ("soup", "canh"), ("bread", "bánh mì"))]
    return rice, others


async def _session(db, user, rice, others):
    public, keys = session_engine.build_questions([(rice, 4), (rice, 1)], [rice, *others], random.Random(5))
    study = await session_engine.create_session(db, user, kind=SessionKind.UNIT_LEARN, mode=StudyMode.LEARN, keys=keys, now=NOW)
    return study, public


async def count(db, *where):
    return await db.scalar(select(func.count()).select_from(ContentReport).where(*where))


async def test_question_report_snapshots_exactly_what_learner_saw(client, db_session, clock_at):
    clock_at(NOW)
    db = db_session
    user = await make_user(db)
    rice, others = await _entries(db)
    study, public = await _session(db, user, rice, others)
    study.answers = {"q1": {"answer": "juice", "correct": False}}  # người học chọn sai
    await db.flush()
    body = {"kind": "confusing_answer", "note": "milk cũng hợp", "question": {"kind": "study", "session_id": str(study.id), "question_id": "q1"}}
    res = await client.post(f"{API}/content-reports", json=body, headers=auth(user))
    assert res.status_code == 200, res.text
    assert res.json() == {"created": True}
    report = await db.scalar(select(ContentReport))
    assert report.snapshot == {**public[0], "correct_answer": "rice"}  # câu, 4 lựa chọn, đáp án đúng
    assert report.snapshot["sentence"] == "In Vietnam, people cook white ______ and eat it with fish."
    assert "juice" not in {report.snapshot.get("answer"), report.snapshot.get("chosen")} and "answer" not in report.snapshot
    assert (report.content_key, report.content_version, report.source, report.context.value) == ("a1.food.rice.noun", 3, "unit_learn", "question")
    assert report.fields == ["cloze_en", "cloze_distractors"] and report.note == "milk cũng hợp" and report.local_day == date(2026, 10, 10)
    # câu Mức 1 (đáp án nhiễu là nghĩa) → thêm meaning_vi
    body["question"]["question_id"] = "q2"
    body["kind"] = "wrong_meaning"
    assert (await client.post(f"{API}/content-reports", json=body, headers=auth(user))).json() == {"created": True}
    q2 = await db.scalar(select(ContentReport).where(ContentReport.kind == "wrong_meaning"))
    assert q2.fields == ["meaning_vi"] and q2.snapshot["type"] == "choose_meaning"


async def test_card_custom_and_foreign_session(client, db_session, clock_at):
    clock_at(NOW)
    db = db_session
    user, other = await make_user(db), await make_user(db, "binh")
    rice, others = await _entries(db)
    res = await client.post(f"{API}/content-reports", json={"kind": "wrong_example", "entry_id": rice.id, "source": "unit_learn"}, headers=auth(user))
    assert res.json() == {"created": True}
    card = await db.scalar(select(ContentReport))
    assert card.context.value == "card" and card.snapshot["headword"] == "rice" and card.snapshot["example"] == "We eat rice."
    assert card.fields == ["example_en", "example_vi"] and card.source == "unit_learn"
    mine = await make_custom(db, user, "refactor", "tái cấu trúc")
    res = await client.post(f"{API}/content-reports", json={"kind": "other", "entry_id": mine.id}, headers=auth(user))
    assert res.status_code == 422 and res.json()["error"]["code"] == "CONTENT_REPORT_NOT_ALLOWED"
    study, _ = await _session(db, other, rice, others)
    res = await client.post(f"{API}/content-reports", json={"kind": "other", "question": {"kind": "study", "session_id": str(study.id), "question_id": "q1"}},
                            headers=auth(user))
    assert res.status_code == 404
    res = await client.post(f"{API}/content-reports", json={"kind": "other", "entry_id": rice.id, "question": {"kind": "daily_check", "question_id": "q1"}},
                            headers=auth(user))
    assert res.status_code == 422  # đúng một trong hai
    assert (await client.post(f"{API}/content-reports", json={"kind": "other", "entry_id": rice.id})).status_code == 401


async def test_daily_check_question(client, db_session, clock_at):
    clock_at(NOW)
    db = db_session
    user = await make_user(db)
    rice, others = await _entries(db)
    public, keys = session_engine.build_questions([(rice, 4)], [rice, *others], random.Random(1))
    db.add(DailyCheck(user_id=user.id, local_date=date(2026, 10, 10), status=DailyCheckStatus.PENDING,
                      questions=[{"public": p, **k} for p, k in zip(public, keys)], total=1))
    await db.flush()
    res = await client.post(f"{API}/content-reports", json={"kind": "confusing_answer", "question": {"kind": "daily_check", "question_id": "q1"}},
                            headers=auth(user))
    assert res.json() == {"created": True}
    report = await db.scalar(select(ContentReport))
    assert report.source == "daily_check" and report.snapshot["options"] == public[0]["options"]


async def test_dedupe_and_daily_limit(client, db_session, clock_at, monkeypatch):
    clock_at(NOW)
    db = db_session
    user = await make_user(db)
    entries = [await make_entry(db, f"w{i}", f"nghĩa {i}", cefr="A1") for i in range(settings.CONTENT_REPORT_DAILY_LIMIT + 1)]
    send = lambda e, kind="other": client.post(f"{API}/content-reports", json={"kind": kind, "entry_id": e.id}, headers=auth(user))  # noqa: E731
    assert (await send(entries[0])).json() == {"created": True}
    again = await send(entries[0])
    assert again.status_code == 200 and again.json() == {"created": False}  # gửi lại: thành công, không thêm dòng
    assert await count(db, ContentReport.user_id == user.id) == 1
    for e in entries[1:settings.CONTENT_REPORT_DAILY_LIMIT]:
        assert (await send(e)).json() == {"created": True}
    over = await send(entries[-1])
    assert over.status_code == 429 and over.json()["error"]["code"] == "CONTENT_REPORT_LIMIT"
    assert (await send(entries[0])).json() == {"created": False}  # trùng vẫn trả thành công khi đã chạm giới hạn
    assert await count(db, ContentReport.user_id == user.id) == settings.CONTENT_REPORT_DAILY_LIMIT
    clock_at(NOW + timedelta(days=1))  # ngày mới (theo múi giờ người dùng)
    assert (await send(entries[-1])).json() == {"created": True}
    assert (await send(entries[0])).json() == {"created": True}


async def test_admin_endpoints_permission_grouping_and_resolve(client, db_session, clock_at):
    clock_at(NOW)
    db = db_session
    users = [await make_user(db, f"u{i}") for i in range(3)]
    admin = await make_user(db, "admin")
    admin.role = Role.ADMIN
    rice, others = await _entries(db)
    egg = others[0]
    for u in users:
        await client.post(f"{API}/content-reports", json={"kind": "confusing_answer", "entry_id": rice.id}, headers=auth(u))
    await client.post(f"{API}/content-reports", json={"kind": "wrong_meaning", "entry_id": rice.id}, headers=auth(users[0]))
    await client.post(f"{API}/content-reports", json={"kind": "wrong_audio", "entry_id": egg.id}, headers=auth(users[1]))

    assert (await client.get(f"{API}/admin/content-reports")).status_code == 401
    for method, path in (("GET", "/admin/content-reports"), ("PATCH", f"/admin/content-reports/entries/{rice.id}")):
        res = await client.request(method, f"{API}{path}", json={"status": "resolved"} if method == "PATCH" else None, headers=auth(users[0]))
        assert res.status_code == 403 and res.json()["error"]["code"] == "FORBIDDEN"

    body = (await client.get(f"{API}/admin/content-reports", headers=auth(admin))).json()
    assert [(g["headword"], g["count"]) for g in body["groups"]] == [("rice", 4), ("egg", 1)]  # sắp theo số báo cáo
    top = body["groups"][0]
    assert top["kinds"] == {"confusing_answer": 3, "wrong_meaning": 1} and top["content_key"] == "a1.food.rice.noun"
    assert top["fields"] == ["cloze_en", "cloze_distractors", "meaning_vi"] and top["current_version"] == 3
    assert "email" not in str(body) and all("user_id" not in r for r in top["reports"])

    res = await client.patch(f"{API}/admin/content-reports/entries/{rice.id}", json={"status": "resolved"}, headers=auth(admin))
    assert res.json() == {"updated": 4}
    assert await count(db, ContentReport.entry_id == rice.id, ContentReport.status == "resolved", ContentReport.resolved_by == admin.id) == 4
    opened = (await client.get(f"{API}/admin/content-reports", headers=auth(admin))).json()
    assert [g["headword"] for g in opened["groups"]] == ["egg"]
    egg_report = opened["groups"][0]["reports"][0]["id"]
    assert (await client.patch(f"{API}/admin/content-reports/{egg_report}", json={"status": "dismissed"}, headers=auth(admin))).json() == {"updated": 1}
    assert (await client.get(f"{API}/admin/content-reports", headers=auth(admin))).json()["groups"] == []
    every = (await client.get(f"{API}/admin/content-reports", params={"status": "all"}, headers=auth(admin))).json()
    assert sum(g["count"] for g in every["groups"]) == 5
