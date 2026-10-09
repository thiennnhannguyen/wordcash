"""
Lộ trình Học Viện của một người: cấp → chặng → bài kèm trạng thái, điểm cao nhất, địa danh, con dấu, vị trí hiện tại, Hộ chiếu.
Áp luật mở khóa (services/unlock.py) vào DB.

- `ensure_initialized`: người mới được mở cấp đầu tiên, chặng 1, bài 1 (chạy lại an toàn).
- `get_roadmap`: chỉ nhánh Nền tảng (`foundation`); IELTS/TOEIC trả `available: false` ("Sắp ra mắt").
- Hộ chiếu: địa danh = mỗi chặng + Boss của cấp; chỉ đếm các cấp đang có trong DB. Chặng có dấu khi qua bài tổng hợp
  (`stamped_at`), Boss có dấu khi đã thắng (`boss_won_at`).
- Các hàm `complete_*` / `unlock_*` chỉ nâng trạng thái (không bao giờ khóa lại) và trả về danh sách sự kiện mở khóa,
  con dấu để API gửi cho client diễn hiệu ứng.
- Số bài mỗi chặng, số chặng mỗi cấp KHÔNG cố định.
"""

import uuid
from dataclasses import dataclass, field
from datetime import datetime

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.models import (
    Level,
    ProgressStatus,
    Topic,
    Unit,
    UnitEntry,
    User,
    UserLevelProgress,
    UserTopicProgress,
    UserUnitProgress,
)
from app.services import unlock

S = ProgressStatus
CEFR = ["A1", "A2", "B1", "B2", "C1", "C2"]
BRANCHES = {"foundation": True, "ielts": False, "toeic": False}


@dataclass
class Structure:
    """Khung lộ trình (dùng chung mọi người): cấp có ít nhất một chặng, theo thứ tự."""

    levels: list[Level]
    topics: dict[int, list[Topic]]  # level_id → chặng theo thứ tự
    units: dict[int, list[Unit]]  # topic_id → bài theo vị trí
    words: dict[int, int] = field(default_factory=dict)  # unit_id → số mục từ

    def level_of_topic(self, topic_id: int) -> Level:
        return next(lv for lv in self.levels if any(t.id == topic_id for t in self.topics[lv.id]))

    def topic(self, topic_id: int) -> Topic | None:
        return next((t for ts in self.topics.values() for t in ts if t.id == topic_id), None)

    def unit(self, unit_id: int) -> Unit | None:
        return next((u for us in self.units.values() for u in us if u.id == unit_id), None)

    def level(self, level_id: int) -> Level | None:
        return next((lv for lv in self.levels if lv.id == level_id), None)


async def load_structure(session: AsyncSession) -> Structure:
    levels = list(await session.scalars(select(Level).order_by(Level.order)))
    topics: dict[int, list[Topic]] = {lv.id: [] for lv in levels}
    for t in await session.scalars(select(Topic).order_by(Topic.level_id, Topic.order)):
        topics.setdefault(t.level_id, []).append(t)
    units: dict[int, list[Unit]] = {t.id: [] for ts in topics.values() for t in ts}
    for u in await session.scalars(select(Unit).order_by(Unit.topic_id, Unit.position)):
        units.setdefault(u.topic_id, []).append(u)
    words = dict((await session.execute(select(UnitEntry.unit_id, func.count()).group_by(UnitEntry.unit_id))).all())
    levels = [lv for lv in levels if topics.get(lv.id)]
    return Structure(levels, topics, units, words)


@dataclass
class UserProgress:
    levels: dict[int, UserLevelProgress]
    topics: dict[int, UserTopicProgress]
    units: dict[int, UserUnitProgress]

    def level_status(self, level_id: int) -> ProgressStatus:
        row = self.levels.get(level_id)
        return row.status if row else S.LOCKED

    def topic_status(self, topic_id: int) -> ProgressStatus:
        row = self.topics.get(topic_id)
        return row.status if row else S.LOCKED

    def unit_status(self, unit_id: int) -> ProgressStatus:
        row = self.units.get(unit_id)
        return row.status if row else S.LOCKED


async def load_progress(session: AsyncSession, user_id: uuid.UUID) -> UserProgress:
    return UserProgress(
        {r.level_id: r for r in await session.scalars(select(UserLevelProgress).where(UserLevelProgress.user_id == user_id))},
        {r.topic_id: r for r in await session.scalars(select(UserTopicProgress).where(UserTopicProgress.user_id == user_id))},
        {r.unit_id: r for r in await session.scalars(select(UserUnitProgress).where(UserUnitProgress.user_id == user_id))},
    )


# ---------- Ghi trạng thái (chỉ đi lên) ----------

async def _row(session: AsyncSession, model, user_id: uuid.UUID, **key):
    stmt = select(model).where(model.user_id == user_id, *[getattr(model, k) == v for k, v in key.items()]).with_for_update()
    return await session.scalar(stmt)


async def raise_status(session: AsyncSession, model, user_id: uuid.UUID, wanted: ProgressStatus, now: datetime, **key):
    """Tạo hoặc nâng trạng thái; trả (dòng, đã thay đổi?)."""
    row = await _row(session, model, user_id, **key)
    if row is None:
        row = model(user_id=user_id, status=wanted, unlocked_at=now, **key)
        if wanted == S.COMPLETED and hasattr(model, "completed_at"):
            row.completed_at = now
        session.add(row)
        await session.flush()
        return row, True
    new = unlock.upgrade(row.status, wanted)
    changed = new != row.status
    row.status = new
    return row, changed


async def unlock_unit(session, user, unit: Unit, now) -> list[dict]:
    _, changed = await raise_status(session, UserUnitProgress, user.id, S.UNLOCKED, now, unit_id=unit.id)
    return [{"type": "unit", "id": unit.id, "topic_id": unit.topic_id, "position": unit.position, "title": unit.title}] if changed else []


async def unlock_topic(session, user, st: Structure, topic: Topic, now) -> list[dict]:
    _, changed = await raise_status(session, UserTopicProgress, user.id, S.UNLOCKED, now, topic_id=topic.id)
    events = [{"type": "topic", "id": topic.id, "order": topic.order, "title": topic.title,
               "landmark_key": topic.landmark_key, "landmark_name": topic.landmark_name}] if changed else []
    if st.units.get(topic.id):
        events += await unlock_unit(session, user, st.units[topic.id][0], now)
    return events


async def unlock_level(session, user, st: Structure, level: Level, now) -> list[dict]:
    _, changed = await raise_status(session, UserLevelProgress, user.id, S.UNLOCKED, now, level_id=level.id)
    events = [{"type": "level", "id": level.id, "code": level.code, "name": level.name}] if changed else []
    if st.topics.get(level.id):
        events += await unlock_topic(session, user, st, st.topics[level.id][0], now)
    return events


async def _has_progress(session: AsyncSession, user_id: uuid.UUID) -> bool:
    return bool(await session.scalar(select(func.count()).select_from(UserLevelProgress).where(UserLevelProgress.user_id == user_id)))


# Chặng đang mở mà chưa mở bài nào (bài cũ bị thay khi nạp kho thật), cấp đang mở mà chưa mở chặng nào
_HOLES = text("""
    SELECT 'topic' AS kind, tp.topic_id AS id FROM user_topic_progress tp
    WHERE tp.user_id = :u AND tp.status = :unlocked
      AND EXISTS (SELECT 1 FROM units x WHERE x.topic_id = tp.topic_id)
      AND NOT EXISTS (SELECT 1 FROM user_unit_progress up JOIN units x ON x.id = up.unit_id
                      WHERE up.user_id = :u AND x.topic_id = tp.topic_id)
    UNION ALL
    SELECT 'level', lp.level_id FROM user_level_progress lp
    WHERE lp.user_id = :u AND lp.status = :unlocked
      AND EXISTS (SELECT 1 FROM topics t WHERE t.level_id = lp.level_id)
      AND NOT EXISTS (SELECT 1 FROM user_topic_progress tp JOIN topics t ON t.id = tp.topic_id
                      WHERE tp.user_id = :u AND t.level_id = lp.level_id)
""")


async def _holes(session: AsyncSession, user_id: uuid.UUID) -> list[tuple[str, int]]:
    return [tuple(r) for r in (await session.execute(_HOLES, {"u": user_id, "unlocked": S.UNLOCKED.value})).all()]


async def _lock(session: AsyncSession, user_id: uuid.UUID) -> None:
    await session.execute(text("SELECT pg_advisory_xact_lock(hashtextextended(:key, 0))"), {"key": f"roadmap-init:{user_id}"})


async def ensure_initialized(session: AsyncSession, user: User, now: datetime, st: Structure | None = None) -> None:
    """Người mới: mở cấp đầu, chặng 1, bài 1. Đã có tiến độ thì chỉ vá chỗ hổng: chặng đang mở mà chưa có bài nào mở (vd. dev
    vừa thay bài mẫu bằng kho thật, seeds/refresh_dev_content.py) → mở bài đầu của chặng đó; cấp đang mở mà chưa có chặng nào
    → mở chặng đầu. Người đang học dở vì vậy quay về đúng bài đầu tiên của chặng hiện tại, không lỗi.

    Nhiều request đầu tiên của cùng một người có thể chạy song song (Sảnh gọi /me/stats, menu gọi /collection…): khóa
    advisory theo người dùng (tới hết transaction) để chỉ một request khởi tạo / vá, các request khác chờ rồi thấy đã xong.
    Không khóa dòng users nên không ảnh hưởng thứ tự khóa users → user_stats ở nơi khác (tránh deadlock).
    """
    if await _has_progress(session, user.id):
        if not await _holes(session, user.id):
            return
        await _lock(session, user.id)
        holes = await _holes(session, user.id)
        if not holes:
            return
        st = st or await load_structure(session)
        for kind, ident in holes:
            if kind == "topic" and st.units.get(ident):
                await unlock_unit(session, user, st.units[ident][0], now)
            elif kind == "level" and st.topics.get(ident):
                await unlock_topic(session, user, st, st.topics[ident][0], now)
        await session.flush()
        return
    await _lock(session, user.id)
    if await _has_progress(session, user.id):
        return
    st = st or await load_structure(session)
    if st.levels:
        await unlock_level(session, user, st, st.levels[0], now)
        await session.flush()


async def complete_unit(session, user, st: Structure, unit: Unit, now) -> list[dict]:
    """Qua bài: completed, mở bài kế; bài cuối của chặng thì bài tổng hợp chặng mở (sự kiện topic_test)."""
    row, changed = await raise_status(session, UserUnitProgress, user.id, S.COMPLETED, now, unit_id=unit.id)
    if changed:
        row.completed_at = now
    siblings = st.units[unit.topic_id]
    next_id = unlock.next_in([u.id for u in siblings], unit.id)
    if next_id is not None:
        return await unlock_unit(session, user, st.unit(next_id), now)
    progress = await load_progress(session, user.id)
    if changed and unlock.topic_test_open([progress.unit_status(u.id) for u in siblings]):
        topic = st.topic(unit.topic_id)
        return [{"type": "topic_test", "topic_id": topic.id, "title": topic.title}]
    return []


async def complete_topic(session, user, st: Structure, topic: Topic, now) -> tuple[list[dict], list[dict]]:
    """Qua bài tổng hợp: chặng completed + đóng dấu địa danh, mở chặng kế; chặng cuối thì mở Boss. Trả (mở khóa, con dấu)."""
    row, changed = await raise_status(session, UserTopicProgress, user.id, S.COMPLETED, now, topic_id=topic.id)
    stamps = []
    if row.completed_at is None:
        row.completed_at = now
    if row.stamped_at is None:
        row.stamped_at = now
        stamps.append({"type": "topic", "topic_id": topic.id, "landmark_key": topic.landmark_key,
                       "landmark_name": topic.landmark_name, "stamped_at": now.isoformat()})
    level = st.level_of_topic(topic.id)
    topics = st.topics[level.id]
    next_id = unlock.next_in([t.id for t in topics], topic.id)
    if next_id is not None:
        return await unlock_topic(session, user, st, st.topic(next_id), now), stamps
    events = [{"type": "boss", "level_id": level.id, "code": level.code, "landmark_name": level.boss_landmark_name}] if changed else []
    return events, stamps


async def complete_level(session, user, st: Structure, level: Level, now) -> tuple[list[dict], list[dict], bool]:
    """Thắng Boss: cấp completed, đóng dấu Boss, mở cấp kế. Trả (mở khóa, con dấu, lần thắng đầu tiên?)."""
    row, _ = await raise_status(session, UserLevelProgress, user.id, S.COMPLETED, now, level_id=level.id)
    first_win = row.boss_won_at is None
    stamps = []
    if first_win:
        row.boss_won_at = now
        stamps.append({"type": "boss", "level_id": level.id, "landmark_key": level.boss_landmark_key,
                       "landmark_name": level.boss_landmark_name, "stamped_at": now.isoformat()})
    next_id = unlock.next_in([lv.id for lv in st.levels], level.id)
    events = await unlock_level(session, user, st, st.level(next_id), now) if next_id is not None else []
    return events, stamps, first_win


# ---------- Đọc ----------

def passport(st: Structure, progress: UserProgress) -> dict:
    visited = total = 0
    for level in st.levels:
        topics = st.topics[level.id]
        total += len(topics) + 1
        visited += sum(1 for t in topics if progress.topics.get(t.id) and progress.topics[t.id].stamped_at)
        lp = progress.levels.get(level.id)
        visited += 1 if lp and lp.boss_won_at else 0
    return {"visited": visited, "total": total}


def current_position(st: Structure, progress: UserProgress) -> dict | None:
    """Việc tiếp theo nên làm: bài chưa xong đầu tiên → bài tổng hợp → Boss, ở cấp đã mở chưa hoàn thành đầu tiên."""
    last = None
    for level in st.levels:
        if progress.level_status(level.id) == S.LOCKED:
            break
        last = level
        if progress.level_status(level.id) == S.COMPLETED:
            continue
        for topic in st.topics[level.id]:
            if progress.topic_status(topic.id) == S.COMPLETED:
                continue
            units = st.units[topic.id]
            base = {"level_id": level.id, "level_code": level.code, "topic_id": topic.id, "topic_order": topic.order,
                    "topic_title": topic.title, "stages_total": len(st.topics[level.id]), "units_total": len(units),
                    "landmark_key": topic.landmark_key, "landmark_name": topic.landmark_name}
            for unit in units:
                if progress.unit_status(unit.id) != S.COMPLETED:
                    return {**base, "step": "unit", "unit_id": unit.id, "unit_position": unit.position, "unit_title": unit.title}
            return {**base, "step": "topic_test", "unit_id": None, "unit_position": None, "unit_title": None}
        return {"level_id": level.id, "level_code": level.code, "step": "boss", "stages_total": len(st.topics[level.id]),
                "landmark_name": level.boss_landmark_name, "landmark_key": level.boss_landmark_key}
    if last is None:
        return None
    return {"level_id": last.id, "level_code": last.code, "step": "done"}


async def get_roadmap(session: AsyncSession, user: User, now: datetime, branch: str = "foundation") -> dict:
    if branch not in BRANCHES:
        raise AppError("VALIDATION_ERROR", details=[{"field": "branch", "message": "Nhánh không hợp lệ"}])
    branches = [{"code": code, "available": available} for code, available in BRANCHES.items()]
    if not BRANCHES[branch]:
        return {"branch": branch, "available": False, "branches": branches, "levels": [], "current": None,
                "passport": {"visited": 0, "total": 0}, "upcoming_levels": CEFR}

    st = await load_structure(session)
    await ensure_initialized(session, user, now, st)
    progress = await load_progress(session, user.id)
    from app.services import boss_service  # tránh import vòng

    levels = []
    for level in st.levels:
        lstatus = progress.level_status(level.id)
        topics_out = []
        for topic in st.topics[level.id]:
            tp = progress.topics.get(topic.id)
            units = st.units[topic.id]
            unit_statuses = [progress.unit_status(u.id) for u in units]
            test_status = "passed" if tp and tp.status == S.COMPLETED else ("available" if unlock.topic_test_open(unit_statuses) else "locked")
            topics_out.append({
                "id": topic.id, "order": topic.order, "title": topic.title, "status": progress.topic_status(topic.id),
                "landmark_key": topic.landmark_key, "landmark_name": topic.landmark_name, "landmark_image": topic.landmark_image,
                "stamped_at": tp.stamped_at if tp else None,
                "test": {"status": test_status, "best": tp.topic_test_best if tp else None},
                "units": [{
                    "id": u.id, "position": u.position, "title": u.title, "status": progress.unit_status(u.id),
                    "best_score": progress.units[u.id].best_score if u.id in progress.units else None,
                    "attempts": progress.units[u.id].attempts if u.id in progress.units else 0,
                    "word_count": st.words.get(u.id, 0),
                } for u in units],
            })
        lp = progress.levels.get(level.id)
        boss = await boss_service.boss_summary(session, user, st, progress, level, now)
        level_topics = st.topics[level.id]
        levels.append({
            "id": level.id, "code": level.code, "name": level.name, "order": level.order, "region_theme": level.region_theme,
            "status": lstatus, "topics": topics_out, "boss": boss,
            "passport": {
                "visited": sum(1 for t in level_topics if progress.topics.get(t.id) and progress.topics[t.id].stamped_at)
                + (1 if lp and lp.boss_won_at else 0),
                "total": len(level_topics) + 1,
            },
        })
    have = {lv.code for lv in st.levels}
    return {
        "branch": branch, "available": True, "branches": branches, "levels": levels,
        "current": current_position(st, progress), "passport": passport(st, progress),
        "upcoming_levels": [code for code in CEFR if code not in have],
    }
