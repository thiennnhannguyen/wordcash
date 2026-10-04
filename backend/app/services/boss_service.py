"""
Trận Boss cuối cấp: mở khi mọi chặng của cấp đã qua bài tổng hợp; khoảng BOSS_QUESTIONS câu trộn đều mọi chặng và đủ mức;
thắng khi đạt ≥ BOSS_PASS_RATE.

- Thắng: cấp completed, đóng dấu địa danh Boss, mở cấp kế (chặng 1, bài 1), lần ĐẦU thắng mỗi cấp +1 lượt quay đặc biệt.
- Thua: BOSS_WEAK_TOPICS chặng có tỉ lệ đúng thấp nhất thành "chặng yếu" (`boss_attempts.weak_topic_ids`).
- Thử lại (`can_retry`): được ngay nếu đã HOÀN THÀNH một phiên luyện chặng yếu cho MỖI chặng yếu của lần thua gần nhất
  (topic_practice_log gắn với lần thua đó); nếu chưa thì chờ BOSS_RETRY_COOLDOWN_HOURS giờ kể từ lần thua. Đã thắng thì
  được đánh lại bất cứ lúc nào (không có thêm phần thưởng).
- Câu hỏi chỉ lộ đúng/sai từng câu (để trừ máu Boss); đáp án đúng chỉ trả về khi nộp hết.
"""

import random
from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.errors import AppError
from app.models import BossAttempt, Level, ProgressStatus, SessionKind, StudyMode, StudySession, TopicPracticeLog, User, UserLevelProgress
from app.services import roadmap_service, session_engine, stats_service, unlock
from app.services.roadmap_service import Structure, UserProgress

S = ProgressStatus


async def last_attempt(session: AsyncSession, user: User, level_id: int) -> BossAttempt | None:
    return await session.scalar(
        select(BossAttempt).where(BossAttempt.user_id == user.id, BossAttempt.level_id == level_id)
        .order_by(BossAttempt.created_at.desc(), BossAttempt.id.desc()).limit(1)
    )


async def can_retry(session: AsyncSession, user: User, st: Structure, level: Level, now: datetime) -> dict:
    """{allowed, reason, retry_at, retry_in_seconds, weak_topics: [{id, title, practiced}], practiced}.

    `retry_in_seconds` tính theo giờ server để client đếm ngược đúng cả khi giờ máy người dùng lệch.
    """
    attempt = await last_attempt(session, user, level.id)
    if attempt is None or attempt.passed:
        return {"allowed": True, "reason": "ok", "retry_at": None, "retry_in_seconds": 0, "weak_topics": [], "practiced": True}
    done = set(await session.scalars(
        select(TopicPracticeLog.topic_id).where(TopicPracticeLog.user_id == user.id, TopicPracticeLog.boss_attempt_id == attempt.id)
    ))
    weak = [{"id": tid, "title": st.topic(tid).title if st.topic(tid) else None, "practiced": tid in done}
            for tid in attempt.weak_topic_ids or []]
    practiced = all(w["practiced"] for w in weak)
    retry_at = attempt.created_at + timedelta(hours=settings.BOSS_RETRY_COOLDOWN_HOURS)
    base = {"retry_at": retry_at, "retry_in_seconds": max(int((retry_at - now).total_seconds()), 0), "weak_topics": weak}
    if practiced:
        return {"allowed": True, "reason": "practiced", **base, "practiced": True}
    if now >= retry_at:
        return {"allowed": True, "reason": "cooldown_over", **base, "practiced": False}
    return {"allowed": False, "reason": "cooldown", **base, "practiced": False}


async def boss_summary(session: AsyncSession, user: User, st: Structure, progress: UserProgress, level: Level, now: datetime) -> dict:
    """Trạng thái Boss của một cấp: locked | available | cooldown | won."""
    lp = progress.levels.get(level.id)
    base = {"level_id": level.id, "landmark_key": level.boss_landmark_key, "landmark_name": level.boss_landmark_name,
            "best": lp.boss_best if lp else None, "won_at": lp.boss_won_at if lp else None,
            "questions": settings.BOSS_QUESTIONS, "pass_rate": settings.BOSS_PASS_RATE}
    if lp and lp.boss_won_at:
        return {**base, "status": "won", "can_retry": None}
    open_ = progress.level_status(level.id) != S.LOCKED and unlock.boss_open([progress.topic_status(t.id) for t in st.topics[level.id]])
    if not open_:
        return {**base, "status": "locked", "can_retry": None}
    retry = await can_retry(session, user, st, level, now)
    return {**base, "status": "available" if retry["allowed"] else "cooldown", "can_retry": retry}


async def get_boss(session: AsyncSession, user: User, level_id: int, now: datetime) -> dict:
    st = await roadmap_service.load_structure(session)
    await roadmap_service.ensure_initialized(session, user, now, st)
    level = st.level(level_id)
    if level is None:
        raise AppError("NOT_FOUND", message="Không tìm thấy cấp.")
    progress = await roadmap_service.load_progress(session, user.id)
    out = await boss_summary(session, user, st, progress, level, now)
    attempt = await last_attempt(session, user, level.id)
    await session.commit()
    return {**out, "level": {"id": level.id, "code": level.code, "name": level.name},
            "level_status": progress.level_status(level.id),
            "last_attempt": {"score": attempt.score, "passed": attempt.passed, "created_at": attempt.created_at,
                             "weak_topic_ids": attempt.weak_topic_ids} if attempt else None}


async def start_boss(session: AsyncSession, user: User, level_id: int, now: datetime, rng: random.Random | None = None) -> dict:
    rng = rng or random.Random()
    from app.services.lesson_service import unit_rows  # tránh import vòng

    st = await roadmap_service.load_structure(session)
    await roadmap_service.ensure_initialized(session, user, now, st)
    level = st.level(level_id)
    if level is None:
        raise AppError("NOT_FOUND", message="Không tìm thấy cấp.")
    progress = await roadmap_service.load_progress(session, user.id)
    if progress.level_status(level.id) == S.LOCKED:
        raise AppError("LEVEL_LOCKED")
    topics = st.topics[level.id]
    if not unlock.boss_open([progress.topic_status(t.id) for t in topics]):
        raise AppError("BOSS_LOCKED")
    retry = await can_retry(session, user, st, level, now)
    if not retry["allowed"]:
        raise AppError("BOSS_COOLDOWN", details={"retry_at": retry["retry_at"].isoformat(), "retry_in_seconds": retry["retry_in_seconds"],
                                                 "weak_topics": retry["weak_topics"]})

    # Chia đều số câu cho các chặng, mỗi mục từ tối đa một câu; xoay vòng đủ mức
    groups = []
    for topic in topics:
        rows = await unit_rows(session, user, [u.id for u in st.units[topic.id]])
        groups.append((topic.id, [e for e, _, _ in rows]))
    total = settings.BOSS_QUESTIONS
    quota = {tid: total // len(groups) + (1 if i < total % len(groups) else 0) for i, (tid, _) in enumerate(groups)}
    picked: list[tuple] = []
    for tid, entries in groups:
        picked += [(e, tid) for e in rng.sample(entries, min(quota[tid], len(entries)))]
    topic_of = {e.id: tid for e, tid in picked}
    pool = await session_engine.distractor_pool(session, [e for _, es in groups for e in es])
    public, keys = session_engine.build_questions(session_engine.spread_levels([e for e, _ in picked], rng), pool, rng)
    for key in keys:
        key["topic_id"] = topic_of[key["entry_id"]]  # để tính độ chính xác từng chặng (chỉ ở server)
    study = await session_engine.create_session(session, user, kind=SessionKind.BOSS, mode=StudyMode.TEST, keys=keys, now=now,
                                                ref_id=level.id)
    await session.commit()
    return {"id": study.id, "kind": study.kind, "mode": study.mode, "cards": [], "questions": public, "total": len(public),
            "expires_at": study.expires_at, "level_id": level.id, "pass_rate": settings.BOSS_PASS_RATE,
            "landmark_name": level.boss_landmark_name}


async def finish(session: AsyncSession, user: User, study: StudySession, summary: dict, keys: dict, recorded: dict,
                 now: datetime) -> dict:
    st = await roadmap_service.load_structure(session)
    level = st.level(study.ref_id)
    accuracy: dict[int, list[int]] = {}
    for qid, key in keys.items():
        tid = key.get("topic_id")
        acc = accuracy.setdefault(tid, [0, 0])
        acc[0] += 1 if recorded[qid]["correct"] else 0
        acc[1] += 1
    passed = unlock.boss_passed(summary["correct"], summary["total"])
    order = [t.id for t in st.topics[level.id]]
    weak = [] if passed else unlock.weak_topics({k: tuple(v) for k, v in accuracy.items()}, order)
    attempt = BossAttempt(user_id=user.id, level_id=level.id, session_id=study.id, score=summary["score"], passed=passed,
                          weak_topic_ids=weak, topic_accuracy={str(k): v for k, v in accuracy.items()}, created_at=now)
    session.add(attempt)
    lp, _ = await roadmap_service.raise_status(session, UserLevelProgress, user.id, S.UNLOCKED, now, level_id=level.id)
    lp.boss_best = max(lp.boss_best or 0, summary["score"])

    out = {"type": "boss", "passed": passed, "score": summary["score"], "pass_rate": settings.BOSS_PASS_RATE,
           "best_score": lp.boss_best, "unlocked": [], "stamps": [], "weak_topics": [], "retry_at": None, "retry_in_seconds": 0,
           "level": {"id": level.id, "code": level.code, "name": level.name},
           "topic_accuracy": [{"topic_id": tid, "title": st.topic(tid).title, "correct": a[0], "total": a[1]}
                              for tid, a in accuracy.items() if st.topic(tid)]}
    if passed:
        unlocked, stamps, first_win = await roadmap_service.complete_level(session, user, st, level, now)
        out.update(unlocked=unlocked, stamps=stamps, first_win=first_win)
        if first_win:
            out["rewards"] = await stats_service.grant_boss(session, user, level.code, now)
    else:
        out["weak_topics"] = [{"id": tid, "title": st.topic(tid).title} for tid in weak]
        out["retry_at"] = (now + timedelta(hours=settings.BOSS_RETRY_COOLDOWN_HOURS)).isoformat()
        out["retry_in_seconds"] = settings.BOSS_RETRY_COOLDOWN_HOURS * 3600
    await session.flush()
    return out
