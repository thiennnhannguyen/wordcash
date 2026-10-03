"""
Kiểm thử API "Khóa học của tôi" qua HTTP: luồng chính, phân quyền giữa hai người dùng (404 chứ không phải 403),
giới hạn, nhập hàng loạt có dòng lỗi, khớp kho hệ thống, phiên học không lộ đáp án, quy tắc đếm rank.
"""

import pytest

from app.core.config import settings
from app.models import StudySession
from tests.factories import make_entry

API = "/api/v1"


def code(res) -> str:
    return res.json()["error"]["code"]


@pytest.fixture
async def other_headers(client):
    res = await client.post(f"{API}/auth/register", json={"email": "binh@wordclash.vn", "username": "binh.wc", "display_name": "Bình", "password": "Wordclash2026"})
    client.cookies.clear()
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


@pytest.fixture
async def bank(db_session):
    words = [
        ("deadline", "hạn chót", "B1", "noun", "The deadline for applications is Friday."),
        ("salary", "tiền lương", "B1", "noun", "The salary is quite high."),
        ("bug", "con bọ", "A2", "noun", "There is a bug on the leaf."),
        ("deploy", "triển khai", "C1", "verb", "We deploy every Friday."),
        ("colleague", "đồng nghiệp", "B1", "noun", None),
    ]
    return {w: await make_entry(db_session, w, m, cefr=c, pos=p, example=e) for w, m, c, p, e in words}


async def create_course(client, headers, title="Từ vựng IT", **extra):
    res = await client.post(f"{API}/courses", json={"title": title, "icon": "code", "color": "sky", **extra}, headers=headers)
    assert res.status_code == 201, res.text
    return res.json()


async def test_requires_login(client):
    for method, url in (("get", "/courses"), ("post", "/courses"), ("get", "/bank/search?q=a")):
        res = await getattr(client, method)(f"{API}{url}")
        assert res.status_code == 401 and code(res) == "TOKEN_INVALID"


async def test_course_crud_flow(client, auth_user):
    h = auth_user["headers"]
    course = await create_course(client, h, description="  Từ hay gặp khi đi làm  ")
    assert course["visibility"] == "private" and course["description"] == "Từ hay gặp khi đi làm"

    res = await client.patch(f"{API}/courses/{course['id']}", json={"title": "IT nâng cao", "color": "gold"}, headers=h)
    assert res.status_code == 200 and res.json()["title"] == "IT nâng cao" and res.json()["icon"] == "code"

    detail = (await client.get(f"{API}/courses/{course['id']}", headers=h)).json()
    assert detail["stats"]["word_count"] == 0 and detail["stats"]["modes"]["learn"] == 0

    assert (await client.post(f"{API}/courses/{course['id']}/archive", headers=h)).json()["archived_at"]
    assert (await client.get(f"{API}/courses", headers=h)).json()["items"] == []
    archived = (await client.get(f"{API}/courses?archived=true", headers=h)).json()["items"]
    assert [c["id"] for c in archived] == [course["id"]]
    assert (await client.post(f"{API}/courses/{course['id']}/restore", headers=h)).json()["archived_at"] is None

    res = await client.delete(f"{API}/courses/{course['id']}", headers=h)
    assert res.status_code == 400 and code(res) == "CONFIRM_REQUIRED"
    assert (await client.delete(f"{API}/courses/{course['id']}?confirm=true", headers=h)).status_code == 204
    assert (await client.get(f"{API}/courses/{course['id']}", headers=h)).status_code == 404


async def test_validation_errors(client, auth_user):
    h = auth_user["headers"]
    res = await client.post(f"{API}/courses", json={"title": "x" * 61, "icon": "skull", "color": "#ff0000"}, headers=h)
    assert res.status_code == 422 and code(res) == "VALIDATION_ERROR"
    assert {d["field"] for d in res.json()["error"]["details"]} == {"title", "icon", "color"}
    res = await client.post(f"{API}/courses", json={"title": "   "}, headers=h)
    assert res.status_code == 422


async def test_course_limit(client, auth_user, monkeypatch):
    monkeypatch.setattr(settings, "COURSE_MAX_PER_USER", 1)
    await create_course(client, auth_user["headers"])
    res = await client.post(f"{API}/courses", json={"title": "Thứ hai"}, headers=auth_user["headers"])
    assert res.status_code == 409 and code(res) == "COURSE_LIMIT_REACHED"


async def test_other_user_cannot_touch_course(client, auth_user, other_headers, bank):
    h = auth_user["headers"]
    course = await create_course(client, h)
    cid = course["id"]
    custom = (await client.post(f"{API}/courses/{cid}/entries/custom", json={"headword": "standup", "meaning_vi": "họp đứng"}, headers=h)).json()
    await client.post(f"{API}/courses/{cid}/entries/from-bank", json={"entry_id": bank["deadline"].id}, headers=h)
    session = (await client.post(f"{API}/courses/{cid}/study-sessions", json={"mode": "quick"}, headers=h)).json()

    calls = [
        ("get", f"/courses/{cid}", None),
        ("patch", f"/courses/{cid}", {"title": "Của tôi"}),
        ("delete", f"/courses/{cid}?confirm=true", None),
        ("post", f"/courses/{cid}/archive", None),
        ("get", f"/courses/{cid}/stats", None),
        ("get", f"/courses/{cid}/entries", None),
        ("post", f"/courses/{cid}/entries/from-bank", {"entry_id": bank["salary"].id}),
        ("post", f"/courses/{cid}/entries/custom", {"headword": "x", "meaning_vi": "y"}),
        ("patch", f"/courses/{cid}/entries/{bank['deadline'].id}", {"is_starred": True}),
        ("delete", f"/courses/{cid}/entries/{bank['deadline'].id}", None),
        ("post", f"/courses/{cid}/import/preview", {"text": "a - b"}),
        ("post", f"/courses/{cid}/import/commit", {"text": "a - b"}),
        ("post", f"/courses/{cid}/study-sessions", {"mode": "quick"}),
        ("get", f"/bank/search?q=dead&course_id={cid}", None),
    ]
    for method, url, body in calls:
        kwargs = {"headers": other_headers}
        if body is not None:
            kwargs["json"] = body
        res = await client.request(method.upper(), f"{API}{url}", **kwargs)
        assert res.status_code == 404 and code(res) == "COURSE_NOT_FOUND", (method, url, res.text)

    res = await client.post(f"{API}/study-sessions/{session['id']}/answers", json={"answers": [{"question_id": "q1", "answer": "x"}]}, headers=other_headers)
    assert res.status_code == 404 and code(res) == "STUDY_SESSION_NOT_FOUND"

    # Từ tự tạo của A vô hình với B: không tìm thấy, không thêm được, không xóa được
    own = await create_course(client, other_headers, "Của Bình")
    res = await client.post(f"{API}/courses/{own['id']}/entries/from-bank", json={"entry_id": custom["entry_id"]}, headers=other_headers)
    assert res.status_code == 404 and code(res) == "ENTRY_NOT_FOUND"
    assert (await client.delete(f"{API}/custom-entries/{custom['entry_id']}", headers=other_headers)).status_code == 404
    assert (await client.get(f"{API}/bank/search?q=standup", headers=other_headers)).json() == []
    assert (await client.get(f"{API}/courses", headers=other_headers)).json()["items"][0]["id"] == own["id"]


async def test_add_words_and_list(client, auth_user, bank):
    h = auth_user["headers"]
    cid = (await create_course(client, h))["id"]
    res = await client.post(f"{API}/courses/{cid}/entries/from-bank", json={"entry_id": bank["deadline"].id, "personal_note": "nộp đồ án"}, headers=h)
    assert res.status_code == 201 and res.json()["source"] == "system" and res.json()["cefr"] == "B1"
    res = await client.post(f"{API}/courses/{cid}/entries/from-bank", json={"entry_id": bank["deadline"].id}, headers=h)
    assert res.status_code == 409 and code(res) == "DUPLICATE_IN_COURSE"

    res = await client.post(f"{API}/courses/{cid}/entries/custom", json={"headword": "Bug", "meaning_vi": "lỗi phần mềm"}, headers=h)
    assert res.status_code == 409 and code(res) == "SYSTEM_ENTRY_EXISTS"
    assert res.json()["error"]["details"]["suggestions"][0]["cefr"] == "A2"
    res = await client.post(f"{API}/courses/{cid}/entries/custom", json={"headword": "Bug", "meaning_vi": "lỗi phần mềm", "pos": "noun", "force": True}, headers=h)
    assert res.status_code == 201 and res.json()["source"] == "user"
    bug_id = res.json()["entry_id"]

    res = await client.patch(f"{API}/courses/{cid}/entries/{bank['deadline'].id}", json={"meaning_vi": "sửa kho"}, headers=h)
    assert res.status_code == 403 and code(res) == "ENTRY_NOT_OWNED"
    res = await client.patch(f"{API}/courses/{cid}/entries/{bug_id}", json={"is_starred": True, "example": "Fix this bug today."}, headers=h)
    assert res.json()["is_starred"] and res.json()["example"] == "Fix this bug today."

    page = (await client.get(f"{API}/courses/{cid}/entries?filter=starred", headers=h)).json()
    assert page["total"] == 1 and page["items"][0]["entry_id"] == bug_id
    page = (await client.get(f"{API}/courses/{cid}/entries?sort=alpha&page_size=1&page=2", headers=h)).json()
    assert page["total"] == 2 and page["items"][0]["headword"] == "deadline"
    assert (await client.get(f"{API}/courses/{cid}/entries?filter=nope", headers=h)).status_code == 422

    assert (await client.delete(f"{API}/courses/{cid}/entries/{bug_id}", headers=h)).status_code == 204
    assert (await client.get(f"{API}/courses/{cid}", headers=h)).json()["word_count"] == 1
    assert (await client.delete(f"{API}/custom-entries/{bank['deadline'].id}", headers=h)).status_code == 403
    assert (await client.delete(f"{API}/custom-entries/{bug_id}", headers=h)).status_code == 204


async def test_bank_search(client, auth_user, bank):
    h = auth_user["headers"]
    cid = (await create_course(client, h))["id"]
    await client.post(f"{API}/courses/{cid}/entries/from-bank", json={"entry_id": bank["deploy"].id}, headers=h)
    res = await client.get(f"{API}/bank/search", params={"q": "de", "course_id": cid}, headers=h)
    assert [(r["headword"], r["cefr"], r["in_course"]) for r in res.json()] == [("deploy", "C1", True), ("deadline", "B1", False)]
    assert (await client.get(f"{API}/bank/search?q=", headers=h)).status_code == 422


async def test_import_preview_and_commit(client, auth_user, bank):
    h = auth_user["headers"]
    cid = (await create_course(client, h))["id"]
    text = "refactor - tái cấu trúc\ndeadline: hạn nộp\nrefactor - lặp\nchỉ có từ\n\nmerge\tgộp nhánh"
    res = await client.post(f"{API}/courses/{cid}/import/preview", json={"text": text, "format": "lines"}, headers=h)
    body = res.json()
    assert [r["status"] for r in body["rows"]] == ["new_custom", "match_system", "duplicate_in_course", "invalid", "new_custom"]
    assert body["rows"][3]["reason"] and body["to_add"] == 3
    assert (await client.get(f"{API}/courses/{cid}", headers=h)).json()["word_count"] == 0  # xem trước không lưu

    res = await client.post(f"{API}/courses/{cid}/import/commit", json={"text": text, "format": "lines", "skip_lines": [6]}, headers=h)
    assert res.status_code == 200
    assert (res.json()["added"], res.json()["created_custom"], res.json()["linked"]) == (2, 1, 1)
    assert res.json()["course"]["word_count"] == 2

    csv_text = "word,meaning,example,note\npull request,yêu cầu gộp,Open a pull request.,git\n,thiếu từ,,\n"
    body = (await client.post(f"{API}/courses/{cid}/import/preview", json={"text": csv_text, "format": "csv"}, headers=h)).json()
    assert [r["status"] for r in body["rows"]] == ["new_custom", "invalid"] and body["rows"][0]["note"] == "git"

    res = await client.post(f"{API}/courses/{cid}/import/preview", json={"text": "word;meaning\na;b", "format": "csv"}, headers=h)
    assert res.status_code == 422 and code(res) == "IMPORT_INVALID"


async def test_import_too_many_rows(client, auth_user, monkeypatch):
    monkeypatch.setattr(settings, "IMPORT_MAX_ROWS", 3)
    h = auth_user["headers"]
    cid = (await create_course(client, h))["id"]
    text = "\n".join(f"w{i} - n{i}" for i in range(4))
    res = await client.post(f"{API}/courses/{cid}/import/preview", json={"text": text}, headers=h)
    assert res.status_code == 422 and code(res) == "IMPORT_INVALID" and res.json()["error"]["details"]["rows"] == 4


async def test_study_session_never_leaks_answers(client, auth_user, bank, db_session):
    h = auth_user["headers"]
    cid = (await create_course(client, h))["id"]
    for word in ("deadline", "salary", "colleague", "deploy"):
        await client.post(f"{API}/courses/{cid}/entries/from-bank", json={"entry_id": bank[word].id}, headers=h)

    res = await client.post(f"{API}/courses/{cid}/study-sessions", json={"mode": "test"}, headers=h)
    assert res.status_code == 201
    body = res.json()
    study = await db_session.get(StudySession, body["id"])
    keys = {q["id"]: q for q in study.questions}
    for q in body["questions"]:
        assert set(q) & {"answer", "entry_id", "correct_answer"} == set()
        if q["level"] in (3, 4):
            assert keys[q["id"]]["answer"] not in str({k: v for k, v in q.items() if k != "options"})

    first = body["questions"][0]
    res = await client.post(f"{API}/study-sessions/{body['id']}/answers", json={"answers": [{"question_id": first["id"], "answer": keys[first["id"]]["answer"]}]}, headers=h)
    result = res.json()["results"][0]
    assert result["correct"] is True and result["correct_answer"] is None  # bài kiểm tra: chưa lộ đáp án


async def test_learn_flow_and_rank_counter(client, auth_user, bank, db_session):
    h = auth_user["headers"]
    cid = (await create_course(client, h))["id"]
    await client.post(f"{API}/courses/{cid}/entries/custom", json={"headword": "refactor", "meaning_vi": "tái cấu trúc mã"}, headers=h)
    res = await client.post(f"{API}/courses/{cid}/study-sessions", json={"mode": "learn", "limit": 5}, headers=h)
    body = res.json()
    assert len(body["cards"]) == 1 and body["cards"][0]["source"] == "user" and body["course"]["title"] == "Từ vựng IT"

    study = await db_session.get(StudySession, body["id"])
    answers = [{"question_id": q["id"], "answer": q["answer"]} for q in study.questions]
    res = await client.post(f"{API}/study-sessions/{body['id']}/answers", json={"answers": answers}, headers=h)
    out = res.json()
    assert out["finished"] and out["summary"]["score"] == 100 and out["results"][0]["correct_answer"]

    me = (await client.get(f"{API}/users/me", headers=h)).json()
    assert me["mastered_count"] == 0 and me["custom_mastered_count"] == 0

    res = await client.post(f"{API}/courses/{cid}/study-sessions", json={"mode": "review"}, headers=h)
    assert res.status_code == 409 and code(res) == "NOTHING_TO_STUDY"
    res = await client.post(f"{API}/courses/{cid}/study-sessions", json={"mode": "sleep"}, headers=h)
    assert res.status_code == 422


async def test_mode_counts_follow_progress(client, auth_user, bank, db_session):
    """Số từ của 5 nút chế độ học đổi theo tiến độ; nút có 0 từ thì bắt đầu sẽ báo NOTHING_TO_STUDY."""
    h = auth_user["headers"]
    cid = (await create_course(client, h))["id"]
    for word in ("deadline", "salary", "colleague"):
        await client.post(f"{API}/courses/{cid}/entries/from-bank", json={"entry_id": bank[word].id}, headers=h)

    modes = (await client.get(f"{API}/courses/{cid}/stats", headers=h)).json()["modes"]
    assert modes == {"learn": 3, "review": 0, "quick": 3, "hard": 0, "test": 3}

    body = (await client.post(f"{API}/courses/{cid}/study-sessions", json={"mode": "learn", "limit": 2}, headers=h)).json()
    study = await db_session.get(StudySession, body["id"])
    # Sai đúng một câu → từ đó vào nhóm "Từ khó"
    answers = [{"question_id": q["id"], "answer": "sai" if i == 0 else q["answer"]} for i, q in enumerate(study.questions)]
    summary = (await client.post(f"{API}/study-sessions/{body['id']}/answers", json={"answers": answers}, headers=h)).json()["summary"]
    assert summary["correct"] == 3 and len(summary["wrong"]) == 1

    stats = (await client.get(f"{API}/courses/{cid}/stats", headers=h)).json()
    assert stats["modes"]["learn"] == 1 and stats["modes"]["hard"] == 1 and stats["by_status"]["learning"] == 2
    assert stats["accuracy_7d"] == 0.75

    wrong_id = summary["wrong"][0]["id"]
    for mode, payload in (("hard", {}), ("quick", {"entry_ids": [wrong_id]}), ("test", {})):
        res = await client.post(f"{API}/courses/{cid}/study-sessions", json={"mode": mode, **payload}, headers=h)
        assert res.status_code == 201, (mode, res.text)
    hard = (await client.post(f"{API}/courses/{cid}/study-sessions", json={"mode": "hard"}, headers=h)).json()
    assert hard["total"] == 1 and hard["questions"][0]["level"] >= 3
