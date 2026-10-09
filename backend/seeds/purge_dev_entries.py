"""
XÓA DỮ LIỆU MẪU DEV: mọi mục từ có nhãn `DEV_SAMPLE` (do seeds/seed_dev_entries.py tạo) cùng tiến độ liên quan.

Khóa ngoại tới `entries` đều ON DELETE CASCADE nên khi xóa mục từ, DB tự xóa: tiến độ từng từ (user_entry_progress),
nhật ký ôn (review_logs), liên kết trong khóa học (user_course_entries), hàng đợi phát âm (audio_jobs).
Script xử lý thêm hai thứ cascade không tự làm:
- `users.mastered_count`: trừ số từ DEV_SAMPLE người đó đang `mastered` (từ hệ thống nên đã được cộng vào bộ đếm);
  không để xuống dưới 0.
- Phiên học CHƯA kết thúc có câu hỏi về các từ này (đáp án lưu trong JSONB, không có khóa ngoại): xóa phiên.
- Cửa Ải đang chờ (pending) có hỏi các từ này: xóa (lần mở sau tạo lại từ từ thật).
- Học Viện (seeds/seed_dev_roadmap.py): xóa các bài có chứa mục DEV_SAMPLE (cascade unit_entries, user_unit_progress), cùng
  tiến độ chặng (user_topic_progress) và cấp (user_level_progress, boss_attempts → topic_practice_log) của các chặng/cấp có bài
  bị xóa. Địa danh (levels, topics) giữ nguyên. Người học được mở lại A1 từ đầu khi có kho thật. Riêng
  `keep_position=True` (dùng bởi seeds/refresh_dev_content.py ở dev): giữ tiến độ chặng / cấp, người học quay về bài đầu
  của chặng đang học.

Chạy lại nhiều lần vẫn an toàn (lần sau không còn gì để xóa). Tất cả trong một transaction.
Chạy trong backend/: `python -m seeds.purge_dev_entries` (ở production phải thêm `--yes`), `--dry-run` để chỉ đếm.
Trước khi ra mắt: database production phải có 0 mục DEV_SAMPLE (docs/deploy-checklist.md).
"""

import argparse
import asyncio
from dataclasses import asdict, dataclass

from sqlalchemy import delete, func, select, text, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import SessionLocal, engine
from app.models import (
    BossAttempt,
    DailyCheck,
    DailyCheckStatus,
    Entry,
    EntryState,
    StudySession,
    Topic,
    Unit,
    UnitEntry,
    User,
    UserEntryProgress,
    UserLevelProgress,
    UserTopicProgress,
)
from seeds.seed_dev_entries import DEV_TAG


@dataclass
class PurgeResult:
    entries: int = 0
    progress: int = 0
    users_adjusted: int = 0
    open_sessions: int = 0
    pending_daily_checks: int = 0
    units: int = 0
    topic_progress: int = 0
    level_progress: int = 0


async def purge(session: AsyncSession, *, dry_run: bool = False, keep_position: bool = False) -> PurgeResult:
    """`keep_position=True` (seeds/refresh_dev_content.py): giữ tiến độ chặng / cấp và lần đánh Boss, chỉ xóa bài mẫu và tiến
    độ bài; lần mở app sau roadmap_service.ensure_initialized đưa người học về bài đầu của chặng hiện tại."""
    ids = list(await session.scalars(select(Entry.id).where(Entry.exam_tags.contains([DEV_TAG]))))
    result = PurgeResult(entries=len(ids))
    if not ids:
        return result

    result.progress = await session.scalar(
        select(func.count()).select_from(UserEntryProgress).where(UserEntryProgress.entry_id.in_(ids))
    )
    mastered = (await session.execute(
        select(UserEntryProgress.user_id, func.count())
        .where(UserEntryProgress.entry_id.in_(ids), UserEntryProgress.status == EntryState.MASTERED)
        .group_by(UserEntryProgress.user_id)
    )).all()
    result.users_adjusted = len(mastered)
    open_sessions = list(await session.scalars(
        select(StudySession.id).where(
            StudySession.finished_at.is_(None),
            text("EXISTS (SELECT 1 FROM jsonb_array_elements(study_sessions.questions) q "
                 "WHERE (q->>'entry_id')::int = ANY(:ids))").bindparams(ids=ids),
        )
    ))
    result.open_sessions = len(open_sessions)
    pending_checks = list(await session.scalars(
        select(DailyCheck.id).where(
            DailyCheck.status == DailyCheckStatus.PENDING,
            text("EXISTS (SELECT 1 FROM jsonb_array_elements(daily_checks.questions) q "
                 "WHERE (q->>'entry_id')::int = ANY(:ids))").bindparams(ids=ids),
        )
    ))
    result.pending_daily_checks = len(pending_checks)
    unit_ids = list(await session.scalars(select(UnitEntry.unit_id).where(UnitEntry.entry_id.in_(ids)).distinct()))
    topic_ids = list(await session.scalars(select(Unit.topic_id).where(Unit.id.in_(unit_ids)).distinct())) if unit_ids else []
    level_ids = list(await session.scalars(select(Topic.level_id).where(Topic.id.in_(topic_ids)).distinct())) if topic_ids else []
    result.units = len(unit_ids)
    if keep_position:
        level_ids, topic_ids = [], []
    result.topic_progress = await session.scalar(
        select(func.count()).select_from(UserTopicProgress).where(UserTopicProgress.topic_id.in_(topic_ids))) if topic_ids else 0
    result.level_progress = await session.scalar(
        select(func.count()).select_from(UserLevelProgress).where(UserLevelProgress.level_id.in_(level_ids))) if level_ids else 0
    if dry_run:
        return result

    for user_id, n in mastered:
        await session.execute(
            update(User).where(User.id == user_id).values(mastered_count=func.greatest(User.mastered_count - n, 0))
        )
    if open_sessions:
        await session.execute(delete(StudySession).where(StudySession.id.in_(open_sessions)))
    if pending_checks:
        await session.execute(delete(DailyCheck).where(DailyCheck.id.in_(pending_checks)))
    if level_ids:
        await session.execute(delete(BossAttempt).where(BossAttempt.level_id.in_(level_ids)))  # cascade topic_practice_log
        await session.execute(delete(UserLevelProgress).where(UserLevelProgress.level_id.in_(level_ids)))
    if topic_ids:
        await session.execute(delete(UserTopicProgress).where(UserTopicProgress.topic_id.in_(topic_ids)))
    if unit_ids:
        await session.execute(delete(Unit).where(Unit.id.in_(unit_ids)))  # cascade unit_entries, user_unit_progress
    await session.execute(delete(Entry).where(Entry.id.in_(ids)))  # cascade: progress, review_logs, course entries, audio_jobs
    await session.commit()
    return result


async def main() -> None:
    parser = argparse.ArgumentParser(description="Xóa mục từ mẫu DEV_SAMPLE cùng tiến độ liên quan.")
    parser.add_argument("--dry-run", action="store_true", help="chỉ đếm, không xóa")
    parser.add_argument("--yes", action="store_true", help="xác nhận khi chạy với ENV=production")
    args = parser.parse_args()
    if settings.is_production and not args.dry_run and not args.yes:
        raise SystemExit("ENV=production: thêm --yes để xác nhận xóa (hoặc --dry-run để chỉ đếm).")
    async with SessionLocal() as session:
        result = await purge(session, dry_run=args.dry_run)
        remaining = await session.scalar(select(func.count()).select_from(Entry).where(Entry.exam_tags.contains([DEV_TAG])))
    await engine.dispose()
    label = "Sẽ xóa" if args.dry_run else "Đã xóa"
    print(f"{label}: {asdict(result)}. Còn lại {remaining} mục DEV_SAMPLE.")


if __name__ == "__main__":
    asyncio.run(main())
