"""
Kiểm thử phiên học trong "Khóa học của tôi": chọn từ theo chế độ, phần đề không lộ đáp án, chấm ở server,
SRS và quy tắc đếm rank (từ tự tạo không làm tăng mastered_count). Đồng hồ được dời bằng monkeypatch, không sleep thật.
"""

import random
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import select

from app.core.config import settings
from app.core.errors import AppError
from app.models import StudyMode, UserEntryProgress
from app.schemas.course import AnswerIn, CourseEntryUpdateIn, CourseIn, CustomEntryIn
from app.services import course_service, study_service
from tests.factories import make_entry, make_user

WORDS = [
    ("deadline", "hạn chót", "The deadline for applications is Friday."),
    ("salary", "tiền lương", "The salary is quite high."),
    ("colleague", "đồng nghiệp", "My colleague is friendly."),
    ("candidate", "ứng viên", "She is the best candidate."),
    ("skill", "kỹ năng", "Good communication skills matter."),
]


@pytest.fixture
def clock(monkeypatch):
    """Đặt "bây giờ" cho cả course_service và study_service."""
    state = {"now": datetime.now(UTC)}

    def now():
        return state["now"]

    monkeypatch.setattr(study_service, "_now", now)
    monkeypatch.setattr(course_service, "_now", now)

    def travel(**delta):
        state["now"] = state["now"] + timedelta(**delta)

    return travel


async def _setup(db, words=WORDS):
    user = await make_user(db)
    course = await course_service.create_course(db, user, CourseIn(title="Phỏng vấn", icon="briefcase", color="primary"))
    entries = []
    for word, meaning, example in words:
        entry = await make_entry(db, word, meaning, example=example)
        await course_service.add_from_bank(db, user, course.id, entry.id)
        entries.append(entry)
    return user, course, entries


async def _start(db, user, course, mode, limit=None, **kw):
    return await study_service.build_study_session(db, user, course.id, StudyMode(mode), limit, rng=random.Random(7), **kw)


async def _answer_key(db, session_id):
    from app.models import StudySession

    study = await db.get(StudySession, session_id)
    return {q["id"]: q["answer"] for q in study.questions}


async def _answer_all(db, user, out, correct=True):
    key = await _answer_key(db, out["id"])
    answers = [AnswerIn(question_id=q["id"], answer=key[q["id"]] if correct else "sai bét") for q in out["questions"]]
    return await study_service.submit_answers(db, user, out["id"], answers)


def _assert_no_answers(questions, entries):
    for q in questions:
        assert "answer" not in q and "entry_id" not in q
        if q["level"] == 1:
            continue  # câu chọn nghĩa hiện từ, đáp án là nghĩa (nằm lẫn trong 4 lựa chọn)
        hidden = {k: v for k, v in q.items() if k != "options"}
        assert not any(e.headword in str(hidden) for e in entries)


async def test_learn_session_cards_and_questions_without_answers(db_session, clock):
    user, course, entries = await _setup(db_session)
    out = await _start(db_session, user, course, "learn", limit=3)
    assert len(out["cards"]) == 3 and out["cards"][0]["headword"] == "deadline"
    assert out["total"] == 6 and [q["level"] for q in out["questions"][:3]] == [1, 1, 1]
    _assert_no_answers(out["questions"], entries)


async def test_submit_grades_and_reveals_after_answer(db_session, clock):
    user, course, _ = await _setup(db_session)
    out = await _start(db_session, user, course, "learn", limit=1)
    key = await _answer_key(db_session, out["id"])
    first = out["questions"][0]
    res = await study_service.submit_answers(db_session, user, out["id"], [AnswerIn(question_id=first["id"], answer=key[first["id"]])])
    result = res["results"][0]
    assert result["correct"] and result["correct_answer"] == "hạn chót" and result["entry"]["headword"] == "deadline"
    assert result["status"] == "learning" and not res["finished"]

    # Gửi lại cùng câu (mạng chập chờn): trả kết quả cũ, không ghi tiến độ lần hai
    again = await study_service.submit_answers(db_session, user, out["id"], [AnswerIn(question_id=first["id"], answer="khác")])
    assert again["results"][0]["correct"] is True
    progress = await db_session.get(UserEntryProgress, (user.id, (await db_session.scalars(select(UserEntryProgress.entry_id))).first()))
    assert progress.correct_count == 1


async def test_test_mode_hides_answers_until_finished(db_session, clock):
    user, course, _ = await _setup(db_session)
    out = await _start(db_session, user, course, "test")
    # Khóa nhỏ: mỗi cặp (từ, mức) chỉ hỏi một lần → 5 từ × mức 1, 3 (+ mức 4 khi câu ví dụ chứa đúng từ) = 14 câu < 20
    assert out["total"] == 14
    key = await _answer_key(db_session, out["id"])
    qs = out["questions"]
    partial = await study_service.submit_answers(db_session, user, out["id"], [AnswerIn(question_id=qs[0]["id"], answer="sai")])
    assert partial["results"][0]["correct"] is False
    assert "correct_answer" not in partial["results"][0] or partial["results"][0]["correct_answer"] is None
    rest = [AnswerIn(question_id=q["id"], answer=key[q["id"]]) for q in qs[1:]]
    final = await study_service.submit_answers(db_session, user, out["id"], rest)
    assert final["finished"] and final["summary"]["score"] == 93  # 13/14
    assert final["results"][0]["correct_answer"] is not None
    assert len(final["summary"]["review"]) == 14 and len(final["summary"]["wrong"]) == 1
    with pytest.raises(AppError) as exc:
        await study_service.submit_answers(db_session, user, out["id"], [AnswerIn(question_id="q99", answer="x")])
    assert exc.value.code == "STUDY_SESSION_FINISHED"


async def test_review_mode_uses_srs_due_dates(db_session, clock):
    user, course, _ = await _setup(db_session)
    with pytest.raises(AppError) as exc:
        await _start(db_session, user, course, "review")
    assert exc.value.code == "NOTHING_TO_STUDY"
    await _answer_all(db_session, user, await _start(db_session, user, course, "learn", limit=2))
    with pytest.raises(AppError):
        await _start(db_session, user, course, "review")  # chưa tới hạn
    clock(days=1, hours=1)
    out = await _start(db_session, user, course, "review")
    assert out["total"] == 2
    stats = await course_service.course_stats(db_session, user, course.id)
    assert stats["due_count"] == 2 and stats["by_status"]["learning"] == 2 and stats["by_status"]["new"] == 3
    assert stats["accuracy_7d"] == 1.0 and stats["modes"]["review"] == 2


async def test_daily_new_word_limit(db_session, clock, monkeypatch):
    monkeypatch.setattr(settings, "DAILY_NEW_WORDS_LIMIT", 2)
    user, course, _ = await _setup(db_session)
    await _answer_all(db_session, user, await _start(db_session, user, course, "learn", limit=5))
    with pytest.raises(AppError) as exc:
        await _start(db_session, user, course, "learn")
    assert exc.value.details["reason"] == "daily_limit"
    assert (await course_service.course_stats(db_session, user, course.id))["modes"]["learn"] == 0


async def test_hard_mode_starred_and_wrong(db_session, clock):
    user, course, entries = await _setup(db_session)
    with pytest.raises(AppError):
        await _start(db_session, user, course, "hard")
    await course_service.update_course_entry(db_session, user, course.id, entries[4].id, CourseEntryUpdateIn(is_starred=True))
    out = await _start(db_session, user, course, "hard")
    assert out["total"] == 1 and all(q["level"] >= 3 for q in out["questions"])


async def _master(db, user, course, entry_ids, clock):
    """Trả lời đúng mức ≥ 3 trong 3 ngày khác nhau."""
    for _ in range(3):
        out = await _start(db, user, course, "hard", entry_ids=entry_ids)
        await _answer_all(db, user, out)
        clock(days=1)


async def test_system_word_mastery_increments_mastered_count(db_session, clock):
    user, course, entries = await _setup(db_session)
    await course_service.update_course_entry(db_session, user, course.id, entries[0].id, CourseEntryUpdateIn(is_starred=True))
    await _master(db_session, user, course, [entries[0].id], clock)
    await db_session.refresh(user)
    assert (user.mastered_count, user.custom_mastered_count) == (1, 0)
    listing = await course_service.list_courses(db_session, user)
    assert listing["mastered_total"] == 1 and listing["items"][0]["mastered_count"] == 1


async def test_custom_word_mastery_does_not_count_for_rank(db_session, clock):
    user, course, _ = await _setup(db_session)
    row = await course_service.create_custom_entry(db_session, user, course.id, CustomEntryIn(headword="refactor", meaning_vi="tái cấu trúc mã"))
    await course_service.update_course_entry(db_session, user, course.id, row["entry_id"], CourseEntryUpdateIn(is_starred=True))
    await _master(db_session, user, course, [row["entry_id"]], clock)
    await db_session.refresh(user)
    assert (user.mastered_count, user.custom_mastered_count) == (0, 1)

    await course_service.delete_custom_entry(db_session, user, row["entry_id"])
    await db_session.refresh(user)
    assert user.custom_mastered_count == 0


async def test_small_course_gets_distractors_from_bank(db_session, clock):
    user, course, _ = await _setup(db_session, words=WORDS[:1])
    for word, meaning in (("hire", "thuê"), ("employer", "nhà tuyển dụng"), ("skillful", "khéo léo")):
        await make_entry(db_session, word, meaning)
    out = await _start(db_session, user, course, "learn", limit=1)
    level1 = out["questions"][0]
    assert level1["level"] == 1 and len(level1["options"]) == 4


async def test_session_belongs_to_owner_and_expires(db_session, clock):
    user, course, _ = await _setup(db_session)
    other = await make_user(db_session, "binh")
    out = await _start(db_session, user, course, "quick")
    assert out["total"] == 14
    answer = [AnswerIn(question_id="q1", answer="x")]
    with pytest.raises(AppError) as exc:
        await study_service.submit_answers(db_session, other, out["id"], answer)
    assert exc.value.code == "STUDY_SESSION_NOT_FOUND"
    with pytest.raises(AppError) as exc:
        await _start(db_session, other, course, "quick")
    assert exc.value.code == "COURSE_NOT_FOUND"
    clock(hours=settings.STUDY_SESSION_TTL_HOURS + 1)
    with pytest.raises(AppError) as exc:
        await study_service.submit_answers(db_session, user, out["id"], answer)
    assert exc.value.code == "STUDY_SESSION_EXPIRED"


async def test_entry_ids_must_be_in_course(db_session, clock):
    user, course, _ = await _setup(db_session)
    outsider = await make_entry(db_session, "outside", "bên ngoài")
    with pytest.raises(AppError) as exc:
        await _start(db_session, user, course, "quick", entry_ids=[outsider.id])
    assert exc.value.code == "NOTHING_TO_STUDY"


async def test_quick_mode_caps_at_twenty_questions(db_session, clock):
    words = [(f"word{i}", f"nghĩa {i}", None) for i in range(25)]
    user, course, _ = await _setup(db_session, words=words)
    out = await _start(db_session, user, course, "quick")
    assert out["total"] == settings.STUDY_QUICK_QUESTIONS
