"""
Bước 07 — nạp nội dung đã duyệt từ backend/content/<cấp>/*.json vào PostgreSQL (gọi từ data_pipeline/07_load_to_db.py và
seeds/refresh_dev_content.py).

- Chỉ nạp mục `approved`. Upsert theo `content_key` (entries) và bài theo `content_key` (units); chạy lại nhiều lần vẫn an
  toàn (lần sau không đổi gì). Nội dung một mục đổi → cập nhật và `content_version` + 1.
- KHÔNG xóa mục từ: mục của cấp có trong DB mà không còn approved trong file (bị bỏ, bị từ chối) → đặt `retired_at` (không
  dạy mới vì không còn trong bài nào, vẫn ôn được, giữ mastered đã có). Mục approved trở lại → bỏ `retired_at`.
- Bài: cập nhật tên, vị trí, danh sách mục (unit_entries thay mới). Bài có trong DB mà không còn trong file: xóa nếu chưa ai
  có tiến độ, có tiến độ thì dừng với lỗi (không làm mất tiến độ của người học).
- Kiểm tra trước khi nạp (LoadError, không ghi gì): đủ file cho mọi chủ đề của cấp, chủ đề có trong DB (landmark_key), mỗi
  chủ đề có bài hợp lệ (lib/units.check_units: 16–20 mục, không mục nào thuộc 2 bài), tên bài đã duyệt, cấp không còn bài mẫu
  DEV_SAMPLE (chạy seeds.refresh_dev_content ở dev / seeds.purge_dev_entries trước).
- Mỗi cấp một transaction. `dry_run`: làm hết rồi rollback, trả bảng khác biệt.
"""

from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import clock
from app.models import Entry, EntrySource, EntryStatus, EntryType, Level, Topic, Unit, UnitEntry, UserUnitProgress
from data_pipeline import config
from data_pipeline.lib import content, units
from data_pipeline.lib.schemas import ContentEntry, TopicFile

DEV_TAG = "DEV_SAMPLE"
# Trường nội dung so sánh để biết mục có đổi không (tên cột DB ← trường file)
FIELD_MAP = {
    "headword": "headword", "pos": "pos", "ipa": "ipa", "ipa_unverified": "ipa_unverified", "meaning_vi": "meaning_vi",
    "definition_en": "definition_en", "example": "example_en", "example_vi": "example_vi", "collocations": "collocations",
    "word_family": "word_family", "synonyms": "synonyms", "mnemonic_vi": "mnemonic_vi", "image_keyword": "image_keyword",
}


class LoadError(ValueError):
    def __init__(self, problems: list[str]):
        super().__init__("; ".join(problems))
        self.problems = problems


@dataclass
class LoadDiff:
    level: str
    added: list[str] = field(default_factory=list)
    updated: dict[str, list[str]] = field(default_factory=dict)  # content_key → các trường đổi
    retired: list[str] = field(default_factory=list)
    unretired: list[str] = field(default_factory=list)
    units_added: list[str] = field(default_factory=list)
    units_updated: list[str] = field(default_factory=list)
    units_removed: list[str] = field(default_factory=list)
    dry_run: bool = False

    @property
    def changed(self) -> bool:
        return any([self.added, self.updated, self.retired, self.unretired, self.units_added, self.units_updated, self.units_removed])

    def summary(self) -> dict:
        return {"level": self.level, "dry_run": self.dry_run, "added": len(self.added), "updated": len(self.updated),
                "retired": len(self.retired), "unretired": len(self.unretired), "units_added": len(self.units_added),
                "units_updated": len(self.units_updated), "units_removed": len(self.units_removed)}

    def table(self) -> str:
        rows = [f"+ {k}" for k in self.added] + [f"~ {k} ({', '.join(f)})" for k, f in self.updated.items()]
        rows += [f"- {k} (ngừng dùng)" for k in self.retired] + [f"↺ {k} (dùng lại)" for k in self.unretired]
        rows += [f"+ bài {k}" for k in self.units_added] + [f"~ bài {k}" for k in self.units_updated]
        rows += [f"- bài {k}" for k in self.units_removed]
        return "\n".join(rows) or "(không có thay đổi)"


def desired_values(level: str, topic: TopicFile, e: ContentEntry) -> dict:
    values = {col: getattr(e, attr) for col, attr in FIELD_MAP.items()}
    values["entry_type"] = EntryType(e.entry_type)
    values["cefr"] = level
    values["topic"] = topic.topic_title
    for col in ("definition_en", "example", "example_vi", "mnemonic_vi", "image_keyword"):
        values[col] = values[col] or None
    return values


def _current(entry: Entry, col: str):
    value = getattr(entry, col)
    return value.value if hasattr(value, "value") else value


async def precheck(session: AsyncSession, level: str, topics: list[TopicFile]) -> dict[str, Topic]:
    problems: list[str] = []
    by_code = {t.topic_code: t for t in topics}
    db_level = await session.scalar(select(Level).where(Level.code == level))
    if db_level is None:
        raise LoadError([f"Cấp {level} chưa có trong DB (chạy python -m seeds.seed_landmarks)"])
    db_topics = {t.landmark_key: t for t in await session.scalars(select(Topic).where(Topic.level_id == db_level.id))}
    mapped: dict[str, Topic] = {}
    for cfg in config.topics(level):
        t = by_code.get(cfg.code)
        if t is None:
            problems.append(f"Thiếu file content/{level.lower()}/{cfg.code}.json")
            continue
        if t.landmark_key not in db_topics:
            problems.append(f"{cfg.code}: chặng {t.landmark_key} không có trong DB")
            continue
        mapped[cfg.code] = db_topics[t.landmark_key]
        problems += units.check_units(t)
        problems += [f"{u.content_key}: tên bài chưa duyệt" for u in t.units if u.title_status != "approved" or not u.title.strip()]
        problems += [f"{e.content_key}: mục từ nguồn DEV_SAMPLE" for e in t.entries if DEV_TAG in e.sources]
    dev_units = await session.scalar(
        select(func.count(func.distinct(Unit.id))).join(UnitEntry, UnitEntry.unit_id == Unit.id).join(Entry, Entry.id == UnitEntry.entry_id)
        .join(Topic, Topic.id == Unit.topic_id).where(Topic.level_id == db_level.id, Entry.exam_tags.contains([DEV_TAG])))
    if dev_units:
        problems.append(f"Cấp {level} còn {dev_units} bài mẫu DEV_SAMPLE (dev: python -m seeds.refresh_dev_content; "
                        "production: python -m seeds.purge_dev_entries --yes)")
    stray = await session.scalar(select(func.count()).select_from(Unit).join(Topic, Topic.id == Unit.topic_id)
                                 .where(Topic.level_id == db_level.id, Unit.content_key.is_(None)))
    if stray and not dev_units:
        problems.append(f"Cấp {level} có {stray} bài không có content_key (bài tạo tay?) — xử lý trước khi nạp")
    if problems:
        raise LoadError(problems)
    return mapped


async def load_level(session: AsyncSession, level: str, *, root: Path | None = None, dry_run: bool = False,
                     now: datetime | None = None) -> LoadDiff:
    level = level.upper()
    now = now or clock.real_now()
    topics = [content.load_topic(p) for p in content.level_files(level, root)]
    diff = LoadDiff(level, dry_run=dry_run)
    db_topics = await precheck(session, level, topics)
    prefix = f"{level.lower()}."
    existing = {e.content_key: e for e in await session.scalars(select(Entry).where(Entry.content_key.like(prefix + "%")))}
    approved_keys: set[str] = set()

    for t in topics:
        for e in t.entries:
            if e.status != "approved":
                continue
            approved_keys.add(e.content_key)
            values = desired_values(level, t, e)
            row = existing.get(e.content_key)
            if row is None:
                row = Entry(content_key=e.content_key, source=EntrySource.SYSTEM, status=EntryStatus.APPROVED, content_version=1,
                            exam_tags=[], **values)
                session.add(row)
                existing[e.content_key] = row
                diff.added.append(e.content_key)
                continue
            changed = [col for col, v in values.items() if _current(row, col) != (v.value if hasattr(v, "value") else v)]
            if changed:
                for col in changed:
                    setattr(row, col, values[col])
                row.content_version = (row.content_version or 0) + 1
                diff.updated[e.content_key] = changed
            if row.status != EntryStatus.APPROVED:
                row.status = EntryStatus.APPROVED
            if row.retired_at is not None:
                row.retired_at = None
                diff.unretired.append(e.content_key)
    for key, row in existing.items():
        if key not in approved_keys and row.retired_at is None:
            row.retired_at = now
            diff.retired.append(key)
    await session.flush()
    ids = {k: r.id for k, r in existing.items()}

    for t in topics:
        db_topic = db_topics[t.topic_code]
        wanted = {u.content_key: u for u in t.units if u.branch == config.DEFAULT_BRANCH}
        current = {u.content_key: u for u in await session.scalars(select(Unit).where(Unit.topic_id == db_topic.id))}
        for key, unit in current.items():
            if key not in wanted:
                if await session.scalar(select(func.count()).select_from(UserUnitProgress).where(UserUnitProgress.unit_id == unit.id)):
                    raise LoadError([f"Bài {key} đã có người học nhưng không còn trong file — không xóa để giữ tiến độ"])
                await session.delete(unit)
                diff.units_removed.append(key)
        await session.flush()
        for unit in current.values():  # dời vị trí tạm để đổi thứ tự không vướng ràng buộc (chặng, vị trí) duy nhất
            if unit.content_key in wanted:
                unit.position = -unit.position - 1000
        await session.flush()
        for key, u in wanted.items():
            row = current.get(key)
            entry_ids = [ids[k] for k in u.entries]
            if row is None:
                row = Unit(topic_id=db_topic.id, position=u.position, title=u.title.strip(), content_key=key)
                session.add(row)
                await session.flush()
                diff.units_added.append(key)
            else:
                old_ids = list(await session.scalars(select(UnitEntry.entry_id).where(UnitEntry.unit_id == row.id).order_by(UnitEntry.position)))
                if old_ids != entry_ids or row.title != u.title.strip() or -row.position - 1000 != u.position:
                    diff.units_updated.append(key)
                row.position, row.title = u.position, u.title.strip()
                if old_ids == entry_ids:
                    continue
                await session.execute(delete(UnitEntry).where(UnitEntry.unit_id == row.id))
            session.add_all(UnitEntry(unit_id=row.id, entry_id=eid, position=i) for i, eid in enumerate(entry_ids))
        await session.flush()

    if dry_run:
        await session.rollback()
    else:
        await session.commit()
    return diff
