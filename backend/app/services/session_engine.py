"""
Phần dùng chung của mọi phiên học có câu hỏi (Khóa học của tôi, Học Viện, Ôn tập): dựng câu hỏi 4 mức, nguồn đáp án nhiễu,
tạo StudySession, thẻ học.

- Câu hỏi tách `public` (gửi client, KHÔNG có đáp án) và `key` (chỉ lưu ở server trong StudySession.questions).
- Đáp án nhiễu: ưu tiên các mục trong cùng phạm vi (khóa học / bài / chặng / cấp), cùng loại từ; thiếu thì lấy thêm từ
  kho hệ thống đã duyệt.
- Không đọc giờ trực tiếp: nơi gọi truyền `now` (core/clock.now()).
"""

import random
import uuid
from datetime import datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models import Entry, SessionKind, StudyMode, StudySession, User
from app.services import question_builder as QB


def entry_data(entry: Entry) -> QB.EntryData:
    return QB.EntryData(entry.id, entry.headword, entry.meaning_vi, entry.pos, entry.ipa, entry.example, entry.audio_url)


def card(entry: Entry, personal_note: str | None = None) -> dict:
    """Thẻ học: nội dung đầy đủ của từ (được phép gửi xuống client vì đây là phần học, không phải câu hỏi)."""
    return {
        "entry_id": entry.id,
        "headword": entry.headword,
        "meaning_vi": entry.meaning_vi,
        "variant_note": entry.variant_note,
        "pos": entry.pos,
        "ipa": entry.ipa,
        "audio_url": entry.audio_url,
        "example": entry.example,
        "image_url": entry.image_url,
        "cefr": entry.cefr,
        "source": entry.source.value,
        "collocations": entry.collocations or [],
        "word_family": entry.word_family or [],
        "personal_note": personal_note,
    }


async def extra_pool(session: AsyncSession, exclude_ids: list[int], pos_values: set[str | None], need: int) -> list[Entry]:
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


async def distractor_pool(session: AsyncSession, scope: list[Entry]) -> list[Entry]:
    pool = list({e.id: e for e in scope}.values())
    if len(pool) < QB.OPTION_COUNT * 2:
        pool += await extra_pool(session, [e.id for e in pool], {e.pos for e in pool}, QB.OPTION_COUNT * 2)
    return pool


def build_questions(pairs: list[tuple[Entry, int]], pool: list[Entry], rng: random.Random) -> tuple[list[dict], list[dict]]:
    """(phần đề gửi client, phần khóa lưu server) cho danh sách (mục từ, mức)."""
    public, keys = [], []
    for i, (entry, level) in enumerate(pairs, start=1):
        others = [e for e in pool if e.id != entry.id]
        same_pos = [e for e in others if entry.pos and e.pos == entry.pos]
        ordered = same_pos if len(same_pos) >= QB.OPTION_COUNT - 1 else others
        q = QB.build_question(f"q{i}", entry_data(entry), level,
                              meaning_pool=[e.meaning_vi for e in ordered], word_pool=[e.headword for e in ordered], rng=rng)
        public.append(q.public)
        keys.append({"id": q.public["id"], **q.key})
    return public, keys


def easy_level(entry: Entry, rng: random.Random) -> int:
    """Mức 1 hoặc 2 (2 chỉ khi có audio)."""
    return rng.choice([lvl for lvl in QB.available_levels(entry_data(entry)) if lvl <= 2])


def strong_level(entry: Entry, rng: random.Random) -> int:
    """Mức 3 hoặc 4 (4 chỉ khi câu ví dụ chứa đúng từ)."""
    return rng.choice([lvl for lvl in QB.available_levels(entry_data(entry)) if lvl >= 3])


def any_level(entry: Entry, rng: random.Random) -> int:
    return rng.choice(QB.available_levels(entry_data(entry)))


def spread_levels(entries: list[Entry], rng: random.Random) -> list[tuple[Entry, int]]:
    """Mỗi từ một câu, xoay vòng mức 1 → 2 → 3 → 4 để bài trộn đủ các mức (mức không dùng được thì lùi về mức gần nhất)."""
    pairs = []
    for i, entry in enumerate(entries):
        wanted = (i % 4) + 1
        pairs.append((entry, QB.resolve_level(entry_data(entry), wanted)))
    rng.shuffle(pairs)
    return pairs


async def create_session(session: AsyncSession, user: User, *, kind: SessionKind, mode: StudyMode, keys: list[dict], now: datetime,
                         ref_id: int | None = None, course_id: uuid.UUID | None = None) -> StudySession:
    study = StudySession(user_id=user.id, course_id=course_id, kind=kind, ref_id=ref_id, mode=mode, questions=keys, answers={},
                         expires_at=now + timedelta(hours=settings.STUDY_SESSION_TTL_HOURS))
    session.add(study)
    await session.flush()
    return study
