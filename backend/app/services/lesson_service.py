"""
Học bài trong Học Viện: phiên học bài, kiểm tra cuối bài, bài tổng hợp chặng, luyện chặng yếu. Dùng lại question_builder
và StudySession (services/session_engine.py); chấm ở server qua study_service.submit_answers.

- Học bài (`unit_learn`): thẻ học MỌI từ mới của bài (không giới hạn số từ mới mỗi ngày; mục tiêu ngày chỉ để hiển thị),
  rồi luyện: mỗi từ một câu mức 1–2 và một câu mức 3–4, cả phiên trộn đủ 4 mức (mức 2 cần audio). Đã học hết từ mới thì
  luyện lại các từ ĐÃ gặp của bài, không có thẻ (reason all_learned). Không mở khóa gì.
- Kiểm tra cuối bài (`unit_test`): UNIT_TEST_QUESTIONS câu (mỗi từ một câu; bài ít từ hơn thì hỏi hết), xoay vòng đủ mức.
  Không bắt buộc học bài trước (bài đã mở là làm được). Đạt ≥ UNIT_PASS_RATE → qua bài, mở bài kế / bài tổng hợp.
- Bài tổng hợp chặng (`topic_test`): TOPIC_TEST_QUESTIONS câu trộn đều các bài; chỉ mở khi mọi bài của chặng đã qua.
  Đạt ≥ TOPIC_PASS_RATE → đóng dấu địa danh, mở chặng kế (chặng cuối: mở Boss).
- Luyện chặng yếu (`topic_practice`): ≥ TOPIC_PRACTICE_QUESTIONS câu, ưu tiên từ sai nhiều; lộ đáp án từng câu. Trả lời hết
  là "hoàn thành" (không xét điểm), ghi topic_practice_log gắn với lần thua Boss gần nhất để xét quyền thử lại.
- `on_session_finished`: study_service gọi khi nộp câu cuối của mọi phiên; xử lý mở khóa / con dấu / Boss theo `kind`.
Thời gian luôn do nơi gọi truyền vào (core/clock.now()).
"""

import random
from datetime import datetime

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.errors import AppError
from app.models import (
    Entry,
    EntryState,
    ProgressStatus,
    SessionKind,
    StudyMode,
    StudySession,
    Topic,
    TopicPracticeLog,
    UnitEntry,
    User,
    UserEntryProgress,
    UserTopicProgress,
    UserUnitProgress,
)
from app.services import boss_service, course_service, roadmap_service, session_engine, unlock
from app.services.roadmap_service import Structure, UserProgress

S = ProgressStatus


async def unit_rows(session: AsyncSession, user: User, unit_ids: list[int]) -> list[tuple[Entry, UserEntryProgress | None, int]]:
    """(mục từ, tiến độ, unit_id) của các bài, theo thứ tự trong bài; chỉ mục người học được thấy."""
    stmt = (
        select(Entry, UserEntryProgress, UnitEntry.unit_id)
        .join(UnitEntry, UnitEntry.entry_id == Entry.id)
        .outerjoin(UserEntryProgress, and_(UserEntryProgress.entry_id == Entry.id, UserEntryProgress.user_id == user.id))
        .where(UnitEntry.unit_id.in_(unit_ids), Entry.visible_to(user.id))
        .order_by(UnitEntry.unit_id, UnitEntry.position)
    )
    return [tuple(r) for r in await session.execute(stmt)]


async def _context(session: AsyncSession, user: User, now: datetime) -> tuple[Structure, UserProgress]:
    st = await roadmap_service.load_structure(session)
    await roadmap_service.ensure_initialized(session, user, now, st)
    return st, await roadmap_service.load_progress(session, user.id)


def _require_unit(st: Structure, progress: UserProgress, unit_id: int):
    unit = st.unit(unit_id)
    if unit is None:
        raise AppError("NOT_FOUND", message="Không tìm thấy bài học.")
    if progress.unit_status(unit.id) == S.LOCKED:
        raise AppError("UNIT_LOCKED")
    return unit


def _require_topic(st: Structure, progress: UserProgress, topic_id: int) -> Topic:
    topic = st.topic(topic_id)
    if topic is None:
        raise AppError("NOT_FOUND", message="Không tìm thấy chặng.")
    if progress.topic_status(topic.id) == S.LOCKED:
        raise AppError("TOPIC_LOCKED")
    return topic


def _session_out(study: StudySession, public: list[dict], cards: list[dict], extra: dict) -> dict:
    return {"id": study.id, "kind": study.kind, "mode": study.mode, "cards": cards, "questions": public,
            "total": len(public), "expires_at": study.expires_at, **extra}


async def get_unit(session: AsyncSession, user: User, unit_id: int, now: datetime) -> dict:
    st, progress = await _context(session, user, now)
    unit = _require_unit(st, progress, unit_id)
    topic = st.topic(unit.topic_id)
    level = st.level_of_topic(topic.id)
    up = progress.units.get(unit.id)
    rows = await unit_rows(session, user, [unit.id])
    await session.commit()
    return {
        "id": unit.id, "title": unit.title, "position": unit.position, "units_total": len(st.units[topic.id]),
        "status": progress.unit_status(unit.id), "best_score": up.best_score if up else None, "attempts": up.attempts if up else 0,
        "pass_rate": settings.UNIT_PASS_RATE,
        "topic": {"id": topic.id, "order": topic.order, "title": topic.title, "landmark_key": topic.landmark_key,
                  "landmark_name": topic.landmark_name},
        "level": {"id": level.id, "code": level.code, "name": level.name},
        "words": [{**course_service.entry_brief(e), "status": (p.status if p else EntryState.NEW)} for e, p, _ in rows],
    }


async def start_learn(session: AsyncSession, user: User, unit_id: int, now: datetime, rng: random.Random | None = None) -> dict:
    rng = rng or random.Random()
    st, progress = await _context(session, user, now)
    unit = _require_unit(st, progress, unit_id)
    rows = await unit_rows(session, user, [unit.id])
    if not rows:
        raise AppError("NOTHING_TO_STUDY", details={"reason": "empty"})
    learn = [e for e, p, _ in rows if p is None or p.status == EntryState.NEW]
    reason = None if learn else "all_learned"
    # Hết từ mới: luyện lại các từ ĐÃ gặp của bài
    words = learn or [e for e, p, _ in rows if p is not None and p.status != EntryState.NEW]

    # Mỗi từ: một câu dễ (1–2) và một câu khó (3–4); câu dễ trước để vừa học xong thẻ là làm được
    easy = [(e, session_engine.easy_level(e, rng)) for e in words]
    hard = [(e, session_engine.strong_level(e, rng)) for e in words]
    rng.shuffle(hard)
    pool = await session_engine.distractor_pool(session, [e for e, _, _ in rows])
    public, keys = session_engine.build_questions(easy + hard, pool, rng)
    study = await session_engine.create_session(session, user, kind=SessionKind.UNIT_LEARN, mode=StudyMode.LEARN, keys=keys,
                                                now=now, ref_id=unit.id)
    await session.commit()
    return _session_out(study, public, [session_engine.card(e) for e in learn], {"unit_id": unit.id, "reason": reason})


async def start_unit_test(session: AsyncSession, user: User, unit_id: int, now: datetime, rng: random.Random | None = None) -> dict:
    rng = rng or random.Random()
    st, progress = await _context(session, user, now)
    unit = _require_unit(st, progress, unit_id)
    rows = await unit_rows(session, user, [unit.id])
    if not rows:
        raise AppError("NOTHING_TO_STUDY", details={"reason": "empty"})
    entries = [e for e, _, _ in rows]
    picked = rng.sample(entries, min(settings.UNIT_TEST_QUESTIONS, len(entries)))
    pool = await session_engine.distractor_pool(session, entries)
    public, keys = session_engine.build_questions(session_engine.spread_levels(picked, rng), pool, rng)
    study = await session_engine.create_session(session, user, kind=SessionKind.UNIT_TEST, mode=StudyMode.TEST, keys=keys,
                                                now=now, ref_id=unit.id)
    await session.commit()
    return _session_out(study, public, [], {"unit_id": unit.id, "pass_rate": settings.UNIT_PASS_RATE})


def _spread_across(groups: list[list[Entry]], total: int, rng: random.Random) -> list[Entry]:
    """Lấy `total` mục trộn đều giữa các nhóm (bài/chặng), mỗi mục tối đa một lần; nhóm thiếu thì nhóm khác bù."""
    pools = [rng.sample(g, len(g)) for g in groups if g]
    picked: list[Entry] = []
    while len(picked) < total and any(pools):
        for pool in pools:
            if pool and len(picked) < total:
                picked.append(pool.pop())
    return picked


async def start_topic_test(session: AsyncSession, user: User, topic_id: int, now: datetime, rng: random.Random | None = None) -> dict:
    rng = rng or random.Random()
    st, progress = await _context(session, user, now)
    topic = _require_topic(st, progress, topic_id)
    units = st.units[topic.id]
    if not unlock.topic_test_open([progress.unit_status(u.id) for u in units]):
        raise AppError("TOPIC_LOCKED", message="Hoàn thành mọi bài của chặng để mở bài tổng hợp.")
    rows = await unit_rows(session, user, [u.id for u in units])
    groups = [[e for e, _, uid in rows if uid == u.id] for u in units]
    picked = _spread_across(groups, settings.TOPIC_TEST_QUESTIONS, rng)
    pool = await session_engine.distractor_pool(session, [e for e, _, _ in rows])
    public, keys = session_engine.build_questions(session_engine.spread_levels(picked, rng), pool, rng)
    study = await session_engine.create_session(session, user, kind=SessionKind.TOPIC_TEST, mode=StudyMode.TEST, keys=keys,
                                                now=now, ref_id=topic.id)
    await session.commit()
    return _session_out(study, public, [], {"topic_id": topic.id, "pass_rate": settings.TOPIC_PASS_RATE})


async def start_topic_practice(session: AsyncSession, user: User, topic_id: int, now: datetime, rng: random.Random | None = None) -> dict:
    rng = rng or random.Random()
    st, progress = await _context(session, user, now)
    topic = _require_topic(st, progress, topic_id)
    rows = await unit_rows(session, user, [u.id for u in st.units[topic.id]])
    if not rows:
        raise AppError("NOTHING_TO_STUDY", details={"reason": "empty"})
    # Ưu tiên từ sai nhiều / đúng ít, rồi trộn ngẫu nhiên phần còn lại
    scored = sorted(rows, key=lambda r: (-((r[1].wrong_count - r[1].correct_count) if r[1] else 0), rng.random()))
    count = min(max(settings.TOPIC_PRACTICE_QUESTIONS, 1), len(scored))
    picked = [e for e, _, _ in scored[:count]]
    pairs = [(e, session_engine.strong_level(e, rng) if i % 2 else session_engine.any_level(e, rng)) for i, e in enumerate(picked)]
    rng.shuffle(pairs)
    pool = await session_engine.distractor_pool(session, [e for e, _, _ in rows])
    public, keys = session_engine.build_questions(pairs, pool, rng)
    study = await session_engine.create_session(session, user, kind=SessionKind.TOPIC_PRACTICE, mode=StudyMode.REVIEW, keys=keys,
                                                now=now, ref_id=topic.id)
    await session.commit()
    return _session_out(study, public, [], {"topic_id": topic.id})


# ---------- Khi nộp xong phiên ----------

async def _finish_unit_test(session, user, study, summary, now) -> dict:
    st = await roadmap_service.load_structure(session)
    unit = st.unit(study.ref_id)
    row, _ = await roadmap_service.raise_status(session, UserUnitProgress, user.id, S.UNLOCKED, now, unit_id=unit.id)
    row.attempts += 1
    row.best_score = max(row.best_score or 0, summary["score"])
    passed = unlock.unit_passed(summary["correct"], summary["total"])
    unlocked = await roadmap_service.complete_unit(session, user, st, unit, now) if passed else []
    return {"type": "unit_test", "passed": passed, "score": summary["score"], "pass_rate": settings.UNIT_PASS_RATE,
            "best_score": row.best_score, "unlocked": unlocked, "stamps": []}


async def _finish_topic_test(session, user, study, summary, now) -> dict:
    st = await roadmap_service.load_structure(session)
    topic = st.topic(study.ref_id)
    row, _ = await roadmap_service.raise_status(session, UserTopicProgress, user.id, S.UNLOCKED, now, topic_id=topic.id)
    row.topic_test_attempts += 1
    row.topic_test_best = max(row.topic_test_best or 0, summary["score"])
    passed = unlock.topic_passed(summary["correct"], summary["total"])
    unlocked, stamps = await roadmap_service.complete_topic(session, user, st, topic, now) if passed else ([], [])
    return {"type": "topic_test", "passed": passed, "score": summary["score"], "pass_rate": settings.TOPIC_PASS_RATE,
            "best_score": row.topic_test_best, "unlocked": unlocked, "stamps": stamps}


async def _finish_topic_practice(session, user, study, summary, now) -> dict:
    st = await roadmap_service.load_structure(session)
    level = st.level_of_topic(study.ref_id)
    attempt = await boss_service.last_attempt(session, user, level.id)
    attempt_id = attempt.id if attempt and not attempt.passed and study.ref_id in (attempt.weak_topic_ids or []) else None
    session.add(TopicPracticeLog(user_id=user.id, topic_id=study.ref_id, boss_attempt_id=attempt_id, session_id=study.id,
                                 score=summary["score"], completed_at=now))
    await session.flush()
    retry = await boss_service.can_retry(session, user, st, level, now)
    return {"type": "topic_practice", "topic_id": study.ref_id, "score": summary["score"], "boss_retry": retry}


async def on_session_finished(session: AsyncSession, user: User, study: StudySession, summary: dict, keys: dict, recorded: dict,
                              now: datetime) -> dict:
    """Xử lý riêng theo loại phiên khi nộp câu cuối. Trả dict lưu vào StudySession.result["outcome"] (khóa "rewards" tách riêng)."""
    if study.kind == SessionKind.UNIT_TEST:
        return await _finish_unit_test(session, user, study, summary, now)
    if study.kind == SessionKind.TOPIC_TEST:
        return await _finish_topic_test(session, user, study, summary, now)
    if study.kind == SessionKind.TOPIC_PRACTICE:
        return await _finish_topic_practice(session, user, study, summary, now)
    if study.kind == SessionKind.BOSS:
        return await boss_service.finish(session, user, study, summary, keys, recorded, now)
    return {"type": study.kind.value}
