"""
Phiên học trong "Khóa học của tôi": chọn từ theo chế độ, sinh câu hỏi 4 mức, chấm ở server, cập nhật SRS và mastery.

Chế độ (StudyMode):
- learn: thẻ học các từ `new` (tối đa `limit` và số từ mới còn lại trong ngày), rồi luyện ngay: mỗi từ một câu mức 1 và một câu mức 3/4.
- review: các từ đến hạn ôn theo SRS, mỗi từ một câu (từ mới học dùng mức 1–2, còn lại mức 3–4).
- quick: STUDY_QUICK_QUESTIONS câu trộn ngẫu nhiên từ cả khóa (vẫn cập nhật SRS).
- hard: từ gắn sao hoặc sai nhiều nhất, mức 3–4.
- test: STUDY_TEST_QUESTIONS câu, có điểm; không mở khóa gì. Đáp án đúng chỉ trả về khi đã nộp hết.

Câu hỏi kèm đáp án lưu trong StudySession.questions (chỉ ở server). Client chỉ nhận phần đề (`public`).
Đáp án nhiễu: ưu tiên nghĩa/từ của các mục khác trong cùng khóa; khóa có dưới 4 từ thì lấy thêm từ kho hệ thống cùng loại từ.
Nộp lại một câu đã chấm trả lại đúng kết quả cũ, không ghi tiến độ lần hai (an toàn khi mạng chập chờn gửi lại).
"""

import random
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.errors import AppError
from app.models import Entry, EntryState, StudyMode, StudySession, User, UserCourseEntry, UserEntryProgress
from app.services import course_service, question_builder
from app.services.progress_service import record_answer

QB = question_builder


def _now() -> datetime:
    return datetime.now(UTC)


def _data(entry: Entry) -> QB.EntryData:
    return QB.EntryData(entry.id, entry.headword, entry.meaning_vi, entry.pos, entry.ipa, entry.example, entry.audio_url)


def _is_new(progress: UserEntryProgress | None) -> bool:
    return progress is None or progress.status == EntryState.NEW


def _card(link: UserCourseEntry, entry: Entry) -> dict:
    return {
        "entry_id": entry.id,
        "headword": entry.headword,
        "meaning_vi": entry.meaning_vi,
        "pos": entry.pos,
        "ipa": entry.ipa,
        "audio_url": entry.audio_url,
        "example": entry.example,
        "image_url": entry.image_url,
        "cefr": entry.cefr,
        "source": entry.source.value,
        "collocations": entry.collocations or [],
        "word_family": entry.word_family or [],
        "personal_note": link.personal_note,
    }


async def _extra_pool(session: AsyncSession, exclude_ids: list[int], pos_values: set[str | None], need: int) -> list[Entry]:
    """Đáp án nhiễu bổ sung từ kho hệ thống: ưu tiên cùng loại từ, thiếu thì lấy loại khác."""
    picked: list[Entry] = []
    poses = [p for p in pos_values if p]
    stmts = []
    if poses:
        stmts.append(select(Entry).where(Entry.system_approved(), Entry.pos.in_(poses)))
    stmts.append(select(Entry).where(Entry.system_approved()))
    for stmt in stmts:
        if len(picked) >= need:
            break
        ids = exclude_ids + [e.id for e in picked]
        picked += list(await session.scalars(stmt.where(Entry.id.not_in(ids)).order_by(func.random()).limit(need - len(picked))))
    return picked


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

    reason = "empty"
    if mode == StudyMode.LEARN:
        left = await course_service.new_words_left_today(session, user, now)
        chosen = [r for r in rows if _is_new(r[2])][: min(limit, left)]
        if not chosen and left == 0 and any(_is_new(r[2]) for r in rows):
            reason = "daily_limit"
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
        raise AppError("NOTHING_TO_STUDY", details={"mode": mode.value, "reason": reason})

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
        pool_entries += await _extra_pool(session, [e.id for e in pool_entries], {e.pos for e in pool_entries}, QB.OPTION_COUNT * 2)

    questions_public, questions_key = [], []
    for i, ((link, entry, _progress), level) in enumerate(pairs, start=1):
        others = [e for e in pool_entries if e.id != entry.id]
        same_pos = [e for e in others if entry.pos and e.pos == entry.pos]
        ordered = same_pos if len(same_pos) >= QB.OPTION_COUNT - 1 else others
        q = QB.build_question(
            f"q{i}", _data(entry), level,
            meaning_pool=[e.meaning_vi for e in ordered], word_pool=[e.headword for e in ordered], rng=rng,
        )
        questions_public.append(q.public)
        questions_key.append({"id": q.public["id"], **q.key})

    cards = [_card(link, entry) for link, entry, _ in chosen] if mode == StudyMode.LEARN else []
    study = StudySession(user_id=user.id, course_id=course.id, mode=mode, questions=questions_key, answers={},
                         expires_at=now + timedelta(hours=settings.STUDY_SESSION_TTL_HOURS))
    session.add(study)
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


async def submit_answers(session: AsyncSession, user: User, session_id: uuid.UUID, answers: list) -> dict:
    study = await session.scalar(
        select(StudySession).where(StudySession.id == session_id, StudySession.user_id == user.id).with_for_update()
    )
    if study is None:
        raise AppError("STUDY_SESSION_NOT_FOUND")
    now = _now()
    keys = {q["id"]: q for q in study.questions}
    recorded = dict(study.answers or {})
    if study.finished_at is not None and all(a.question_id in recorded for a in answers):
        pass  # gửi lại câu đã chấm: trả kết quả cũ bên dưới
    elif study.finished_at is not None:
        raise AppError("STUDY_SESSION_FINISHED")
    elif now >= study.expires_at:
        raise AppError("STUDY_SESSION_EXPIRED")

    is_test = study.mode == StudyMode.TEST
    entry_ids = {keys[a.question_id]["entry_id"] for a in answers if a.question_id in keys}
    entries = {e.id: e for e in await session.scalars(select(Entry).where(Entry.id.in_(entry_ids), Entry.visible_to(user.id)))}

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
                outcome = await record_answer(session, user, entry, key["level"], correct, now, source="course")
                status, became = outcome.status, outcome.became_mastered
            recorded[item.question_id] = {"answer": item.answer, "correct": correct, "status": status, "became_mastered": became}
            result = {"question_id": item.question_id, "correct": correct, "status": status, "became_mastered": became}
        if not is_test:
            result.update(_reveal(key, entry))
        results.append(result)

    finished = len(recorded) == len(keys)
    study.answers = recorded
    if finished and study.finished_at is None:
        study.finished_at = now
    await session.commit()

    out = {"results": results, "answered": len(recorded), "total": len(keys), "finished": finished, "summary": None}
    if finished:
        out["summary"] = await _summary(session, user, study, keys, recorded, is_test)
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
