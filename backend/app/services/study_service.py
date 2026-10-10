"""
Phiên học: dựng phiên cho "Khóa học của tôi" và NỘP BÀI dùng chung cho mọi loại phiên (khóa học, Học Viện, Ôn tập).

Chế độ khóa học (StudyMode):
- learn: thẻ học các từ `new` (tối đa `limit` và số từ mới còn lại trong ngày), rồi luyện ngay: mỗi từ một câu mức 1 và một câu mức 3/4.
- review: các từ đến hạn ôn theo SRS, mỗi từ một câu (từ mới học dùng mức 1–2, còn lại mức 3–4).
- quick: STUDY_QUICK_QUESTIONS câu trộn ngẫu nhiên từ cả khóa (vẫn cập nhật SRS).
- hard: từ gắn sao hoặc sai nhiều nhất, mức 3–4.
- test: STUDY_TEST_QUESTIONS câu, có điểm; không mở khóa gì. Đáp án đúng chỉ trả về khi đã nộp hết.

Câu hỏi kèm đáp án lưu trong StudySession.questions (chỉ ở server). Client chỉ nhận phần đề (services/session_engine.py).
Nộp bài (`submit_answers`, mọi `kind`):
- Chấm ở server, ghi tiến độ qua progress_service.record_answer (SRS, mastery, hoạt động ngày, rank, lượt quay theo mốc).
- Chế độ test (kiểm tra bài, bài tổng hợp, Boss): mỗi câu chỉ biết đúng/sai; đáp án đúng chỉ lộ khi nộp hết.
- Nộp xong câu cuối: tính tổng kết và gọi phần xử lý riêng của Học Viện (lesson_service.on_session_finished: mở khóa,
  con dấu, Boss, lượt quay). Kết quả lưu ở StudySession.result.
- IDEMPOTENT: nộp lại câu đã chấm trả lại đúng kết quả cũ, không ghi tiến độ lần hai; nộp lại cả phiên đã xong trả lại kết
  quả cũ (kể cả phần mở khóa / phần thưởng) mà không tính lại. Gửi câu mới vào phiên đã xong → SESSION_FINISHED.
"""

import random
import uuid
from datetime import datetime

from fastapi.encoders import jsonable_encoder
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import clock
from app.core.config import settings
from app.core.errors import AppError
from app.models import Entry, EntryState, SessionKind, StudyMode, StudySession, User, UserCourseEntry, UserEntryProgress
from app.services import course_service, question_builder, session_engine
from app.services.progress_service import record_answer
from app.services.stats_service import Rewards

QB = question_builder


def _now() -> datetime:
    return clock.now()


def _data(entry: Entry) -> QB.EntryData:
    return session_engine.entry_data(entry)


def _is_new(progress: UserEntryProgress | None) -> bool:
    return progress is None or progress.status == EntryState.NEW


def _card(link: UserCourseEntry, entry: Entry) -> dict:
    return session_engine.card(entry, link.personal_note)


def _levels_for(mode: StudyMode, entry: QB.EntryData, progress: UserEntryProgress | None, rng: random.Random) -> list[int]:
    available = QB.available_levels(entry)
    strong = [lvl for lvl in available if lvl >= 3]
    weak = [lvl for lvl in available if lvl <= 2]
    if mode == StudyMode.LEARN:
        return [1, rng.choice(strong)]
    if mode == StudyMode.HARD:
        return [rng.choice(strong)]
    if mode == StudyMode.REVIEW:
        fresh = progress is None or progress.correct_count < 2
        return [rng.choice(weak if fresh else strong)]
    return [rng.choice(available)]


async def build_study_session(session: AsyncSession, user: User, course_id: uuid.UUID, mode: StudyMode, limit: int | None,
                              entry_ids: list[int] | None = None, *, rng: random.Random | None = None) -> dict:
    course = await course_service.get_course(session, user, course_id)
    rng = rng or random.Random()
    now = _now()
    limit = min(limit or settings.STUDY_DEFAULT_LIMIT, settings.STUDY_MAX_LIMIT)

    rows = list(await session.execute(course_service._course_rows(user).where(UserCourseEntry.course_id == course.id).order_by(UserCourseEntry.position)))
    if entry_ids is not None:
        wanted = set(entry_ids)
        rows = [r for r in rows if r[1].id in wanted]

    if mode == StudyMode.LEARN:
        chosen = [r for r in rows if _is_new(r[2])][:limit]
    elif mode == StudyMode.REVIEW:
        due = [r for r in rows if r[2] is not None and r[2].due_at is not None and r[2].due_at <= now]
        chosen = sorted(due, key=lambda r: r[2].due_at)[:limit]
    elif mode == StudyMode.HARD:
        hard = [r for r in rows if r[0].is_starred or (r[2] is not None and r[2].wrong_count > 0)]
        hard.sort(key=lambda r: (not r[0].is_starred, -((r[2].wrong_count - r[2].correct_count) if r[2] else 0)))
        chosen = hard[:limit]
    else:
        chosen = rows
    if not chosen:
        raise AppError("NOTHING_TO_STUDY", details={"mode": mode.value, "reason": "empty"})

    # Cặp (từ, mức) cho từng câu
    pairs: list[tuple] = []
    if mode in (StudyMode.QUICK, StudyMode.TEST):
        target = settings.STUDY_QUICK_QUESTIONS if mode == StudyMode.QUICK else settings.STUDY_TEST_QUESTIONS
        options = [(r, lvl) for r in chosen for lvl in QB.available_levels(_data(r[1]))]
        rng.shuffle(options)
        # Mỗi từ một câu trước, thiếu mới lặp lại từ ở mức khác
        firsts, seconds, used = [], [], set()
        for r, lvl in options:
            (seconds if r[1].id in used else firsts).append((r, lvl))
            used.add(r[1].id)
        pairs = (firsts + seconds)[:target]
    else:
        for r in chosen:
            for lvl in _levels_for(mode, _data(r[1]), r[2], rng):
                pairs.append((r, lvl))
        if mode == StudyMode.LEARN:
            # Mức 1 của mọi từ trước, rồi mức 3/4 theo thứ tự ngẫu nhiên
            easy = [p for p in pairs if p[1] == 1]
            hard_pairs = [p for p in pairs if p[1] != 1]
            rng.shuffle(hard_pairs)
            pairs = easy + hard_pairs
        else:
            rng.shuffle(pairs)

    # Nguồn đáp án nhiễu
    course_entries = [r[1] for r in rows] if entry_ids is None else [
        r[1] for r in await session.execute(course_service._course_rows(user).where(UserCourseEntry.course_id == course.id))
    ]
    pool_entries = list(course_entries)
    if len(pool_entries) < QB.OPTION_COUNT:
        pool_entries += await session_engine.extra_pool(session, [e.id for e in pool_entries], {e.pos for e in pool_entries}, QB.OPTION_COUNT * 2)
    questions_public, questions_key = session_engine.build_questions([(r[1], level) for r, level in pairs], pool_entries, rng)

    cards = [_card(link, entry) for link, entry, _ in chosen] if mode == StudyMode.LEARN else []
    study = await session_engine.create_session(session, user, kind=SessionKind.COURSE, mode=mode, keys=questions_key, now=now,
                                                course_id=course.id)
    await session.commit()
    return {
        "id": study.id,
        "mode": mode,
        "course": {"id": course.id, "title": course.title, "icon": course.icon, "color": course.color},
        "cards": cards,
        "questions": questions_public,
        "total": len(questions_public),
        "expires_at": study.expires_at,
    }


def _reveal(key: dict, entry: Entry | None) -> dict:
    return {
        "correct_answer": key["answer"],
        "entry": course_service.entry_brief(entry) if entry else None,
    }


SOURCES = {SessionKind.COURSE: "course", SessionKind.REVIEW: "review"}  # còn lại: "academy"


def _rewards_of(stored: dict) -> Rewards:
    saved = stored.get("rewards") or {}
    return Rewards(list(saved.get("spins", [])), saved.get("rank"))


async def submit_answers(session: AsyncSession, user: User, session_id: uuid.UUID, answers: list) -> dict:
    study = await session.scalar(
        select(StudySession).where(StudySession.id == session_id, StudySession.user_id == user.id).with_for_update()
    )
    if study is None:
        raise AppError("STUDY_SESSION_NOT_FOUND")
    now = _now()
    keys = {q["id"]: q for q in study.questions}
    recorded = dict(study.answers or {})
    replay = study.finished_at is not None
    if replay and not all(a.question_id in recorded for a in answers):
        raise AppError("SESSION_FINISHED")
    if not replay and now >= study.expires_at:
        raise AppError("STUDY_SESSION_EXPIRED")

    is_test = study.mode == StudyMode.TEST
    source = SOURCES.get(study.kind, "academy")
    entry_ids = {keys[a.question_id]["entry_id"] for a in answers if a.question_id in keys}
    entries = {e.id: e for e in await session.scalars(select(Entry).where(Entry.id.in_(entry_ids), Entry.visible_to(user.id)))}

    rewards = Rewards()
    results = []
    for item in answers:
        key = keys.get(item.question_id)
        if key is None:
            raise AppError("VALIDATION_ERROR", details=[{"field": "question_id", "message": "Câu hỏi không thuộc phiên học này"}])
        entry = entries.get(key["entry_id"])
        if item.question_id in recorded:
            prev = recorded[item.question_id]
            result = {"question_id": item.question_id, "correct": prev["correct"], "status": prev.get("status"),
                      "became_mastered": prev.get("became_mastered", False)}
        else:
            correct = QB.check_answer(key, item.answer)
            status, became = None, False
            if entry is not None:  # từ có thể vừa bị xóa khỏi kho trong lúc học
                outcome = await record_answer(session, user, entry, key["level"], correct, now, source=source)
                status, became = outcome.status, outcome.became_mastered
                rewards.merge(outcome.rewards)
            recorded[item.question_id] = {"answer": item.answer, "correct": correct, "status": status, "became_mastered": became}
            result = {"question_id": item.question_id, "correct": correct, "status": status, "became_mastered": became}
        if not is_test:
            result.update(_reveal(key, entry))
        results.append(result)

    finished = len(recorded) == len(keys)
    study.answers = recorded
    stored = dict(study.result or {})
    if not replay:
        # Cộng dồn phần thưởng của cả phiên (lượt quay theo mốc, đổi rank) để nộp lại vẫn thấy đủ
        stored["rewards"] = _rewards_of(stored).merge(rewards).as_dict()
    if finished and study.finished_at is None:
        study.finished_at = now
        summary = await _summary(session, user, study, keys, recorded, is_test)
        from app.services import lesson_service  # tránh import vòng

        outcome = await lesson_service.on_session_finished(session, user, study, summary, keys, recorded, now)
        hook_rewards = outcome.pop("rewards", None)  # vd. lượt đặc biệt khi lần đầu thắng Boss
        rewards.merge(hook_rewards)
        stored["rewards"] = _rewards_of(stored).merge(hook_rewards).as_dict()
        stored["summary"], stored["outcome"] = summary, outcome
    study.result = stored = jsonable_encoder(stored)  # JSONB: datetime → chuỗi ISO, lần đầu và lần nộp lại trả cùng dạng
    await session.commit()

    out = {"results": results, "answered": len(recorded), "total": len(keys), "finished": finished, "summary": None,
           "outcome": None, "rewards": stored.get("rewards") if replay or finished else rewards.as_dict()}
    if finished:
        out["summary"], out["outcome"] = stored.get("summary"), stored.get("outcome")
        if is_test:
            # Kiểm tra: nộp hết rồi mới lộ đáp án của các câu vừa gửi
            for result in out["results"]:
                key = keys[result["question_id"]]
                result.update(_reveal(key, await session.get(Entry, key["entry_id"])))
    return out


async def _summary(session: AsyncSession, user: User, study: StudySession, keys: dict, recorded: dict, is_test: bool) -> dict:
    entry_ids = {k["entry_id"] for k in keys.values()}
    entries = {e.id: e for e in await session.scalars(select(Entry).where(Entry.id.in_(entry_ids), Entry.visible_to(user.id)))}
    correct = sum(1 for r in recorded.values() if r["correct"])
    wrong, seen = [], set()
    for qid, key in keys.items():
        if not recorded[qid]["correct"] and key["entry_id"] not in seen and key["entry_id"] in entries:
            seen.add(key["entry_id"])
            wrong.append({**course_service.entry_brief(entries[key["entry_id"]]), "your_answer": recorded[qid]["answer"]})
    review = None
    if is_test:
        review = [
            {"question_id": qid, "level": key["level"], "correct": recorded[qid]["correct"], "your_answer": recorded[qid]["answer"],
             "correct_answer": key["answer"], "entry": course_service.entry_brief(entries[key["entry_id"]]) if key["entry_id"] in entries else None}
            for qid, key in keys.items()
        ]
    return {
        "total": len(keys),
        "correct": correct,
        "score": round(correct * 100 / len(keys)) if keys else 0,
        "mastered_now": sum(1 for r in recorded.values() if r.get("became_mastered")),
        "wrong": wrong,
        "review": review,
    }
