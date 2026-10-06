"""
LỘ TRÌNH MẪU CHO DEV: cấp A1 và A2, mỗi cấp 10 chặng (đúng tên chủ đề và địa danh của seeds/seed_landmarks.py),
mỗi chặng 2 bài × 15 mục từ (khoảng 600 mục).

- Mục từ: nội dung nháp trong seeds/dev_roadmap_words.py; A1 dùng lại 60 mục DEV_SAMPLE của seeds/seed_dev_entries.py
  (không tạo trùng). Mọi mục có `exam_tags = ["DEV_SAMPLE"]`, `status = approved` (ngoại lệ chỉ cho dev/e2e, giống
  seed_dev_entries) để Học Viện có dữ liệu. Xóa bằng `python -m seeds.purge_dev_entries` (xóa luôn bài và tiến độ liên quan).
- Code Học Viện KHÔNG giả định 2 bài mỗi chặng: kho thật sẽ có 4–5 bài.
- Cấp đã có nội dung thật (bài có `content_key`, nạp bằng data_pipeline/07_load_to_db.py) thì BỎ QUA cấp đó (A1 thật → bỏ
  luôn 60 mục mẫu của seed_dev_entries). Muốn quay lại dữ liệu mẫu phải xóa nội dung thật trước.
- Chạy lại nhiều lần vẫn an toàn: mục từ trùng chữ thì cập nhật; bài trùng (chặng, vị trí) thì cập nhật tên và danh sách từ.
  Tự nạp địa danh (seed_landmarks) trước nếu chưa có. Từ chối chạy khi ENV=production.
- Chạy trong backend/: `python -m seeds.seed_dev_roadmap`.
"""

import asyncio
import math
from dataclasses import dataclass, field

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import SessionLocal, engine
from app.models import Entry, EntrySource, EntryStatus, EntryType, Level, Topic, Unit, UnitEntry
from seeds import dev_roadmap_words as words
from seeds.seed_dev_entries import DEV_TAG, ENTRIES as A1_EXISTING
from seeds.seed_dev_entries import seed as seed_dev_entries
from seeds.seed_landmarks import seed_landmarks

TYPES = {"pv": EntryType.PHRASAL_VERB, "col": EntryType.COLLOCATION}


@dataclass
class RoadmapSeedResult:
    entries_created: int = 0
    entries_updated: int = 0
    units: int = 0
    unit_entries: int = 0
    skipped_levels: list[str] = field(default_factory=list)


def roadmap_plan() -> dict[str, dict[str, tuple[list[str], list[tuple]]]]:
    """{cấp: {chủ đề: (tên các bài, danh sách mục từ theo thứ tự)}}. A1: 6 mục cũ đứng đầu + 24 mục mới."""
    a1 = {}
    for topic, (titles, rows) in words.A1.items():
        old = [(h, pos, ipa, meaning, example) for h, pos, ipa, meaning, _definition, example in A1_EXISTING[topic]]
        a1[topic] = (titles, old + rows)
    return {"A1": a1, "A2": dict(words.A2)}


async def levels_with_real_content(session: AsyncSession) -> set[str]:
    rows = await session.scalars(select(Level.code).join(Topic, Topic.level_id == Level.id).join(Unit, Unit.topic_id == Topic.id)
                                 .where(Unit.content_key.is_not(None)).distinct())
    return set(rows)


async def seed(session: AsyncSession) -> RoadmapSeedResult:
    await seed_landmarks(session)
    result = RoadmapSeedResult()
    real = await levels_with_real_content(session)
    result.skipped_levels = sorted(real)
    if "A1" not in real:
        await seed_dev_entries(session)  # 60 mục A1 có sẵn (kèm định nghĩa tiếng Anh)

    existing = {
        e.headword.lower(): e
        for e in await session.scalars(select(Entry).where(Entry.source == EntrySource.SYSTEM, Entry.exam_tags.contains([DEV_TAG])))
    }
    for code, topics in roadmap_plan().items():
        if code in real:
            continue
        level = await session.scalar(select(Level).where(Level.code == code))
        topic_rows = {t.title: t for t in await session.scalars(select(Topic).where(Topic.level_id == level.id))}
        for title, (unit_titles, rows) in topics.items():
            topic = topic_rows[title]
            entries: list[Entry] = []
            for row in rows:
                headword, pos, ipa, meaning, example = row[:5]
                kind = TYPES.get(row[5]) if len(row) > 5 else EntryType.WORD
                entry = existing.get(headword.lower())
                values = {"headword": headword, "pos": pos, "ipa": ipa, "meaning_vi": meaning, "example": example,
                          "cefr": code, "topic": title, "entry_type": kind, "exam_tags": [DEV_TAG],
                          "status": EntryStatus.APPROVED, "source": EntrySource.SYSTEM, "owner_user_id": None}
                if entry is None:
                    entry = Entry(**values)
                    session.add(entry)
                    existing[headword.lower()] = entry
                    result.entries_created += 1
                else:
                    for field, value in values.items():
                        setattr(entry, field, value)
                    result.entries_updated += 1
                entries.append(entry)
            await session.flush()

            size = math.ceil(len(entries) / len(unit_titles))
            for position, unit_title in enumerate(unit_titles, start=1):
                unit = await session.scalar(select(Unit).where(Unit.topic_id == topic.id, Unit.position == position))
                if unit is None:
                    unit = Unit(topic_id=topic.id, position=position, title=unit_title)
                    session.add(unit)
                    await session.flush()
                unit.title = unit_title
                chunk = entries[(position - 1) * size: position * size]
                wanted = {e.id: i for i, e in enumerate(chunk, start=1)}
                await session.execute(delete(UnitEntry).where(UnitEntry.unit_id == unit.id, UnitEntry.entry_id.not_in(list(wanted))))
                links = {link.entry_id: link for link in await session.scalars(select(UnitEntry).where(UnitEntry.unit_id == unit.id))}
                for entry_id, pos_in_unit in wanted.items():
                    link = links.get(entry_id)
                    if link is None:
                        session.add(UnitEntry(unit_id=unit.id, entry_id=entry_id, position=pos_in_unit))
                    else:
                        link.position = pos_in_unit
                result.units += 1
                result.unit_entries += len(chunk)
    await session.commit()
    return result


async def main() -> None:
    if settings.is_production:
        raise SystemExit("seed_dev_roadmap chỉ dành cho dev/e2e, không chạy ở production.")
    async with SessionLocal() as session:
        result = await seed(session)
    await engine.dispose()
    print(f"Lộ trình mẫu A1–A2: tạo {result.entries_created} mục từ, cập nhật {result.entries_updated}; "
          f"{result.units} bài, {result.unit_entries} liên kết bài–mục từ."
          + (f" Bỏ qua (đã có nội dung thật): {', '.join(result.skipped_levels)}." if result.skipped_levels else ""))


if __name__ == "__main__":
    asyncio.run(main())
