"""
Kiểm thử xóa dữ liệu mẫu dev (seeds/purge_dev_entries.py): chỉ xóa mục DEV_SAMPLE cùng tiến độ, nhật ký, liên kết khóa học,
phiên học đang mở; trừ đúng mastered_count; mục từ khác không bị đụng; chạy lại vẫn an toàn.
"""

from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select

from app.models import (
    Entry,
    EntryState,
    ReviewLog,
    StudyMode,
    StudySession,
    User,
    UserCourse,
    UserCourseEntry,
    UserEntryProgress,
)
from seeds.purge_dev_entries import purge
from seeds.seed_dev_entries import DEV_TAG, seed
from tests.factories import make_entry, make_user

NOW = datetime(2026, 10, 4, 9, 0, tzinfo=UTC)


async def _count(db, model, *where):
    return await db.scalar(select(func.count()).select_from(model).where(*where))


def _session(user, course, entry_ids, finished=False):
    return StudySession(
        user_id=user.id, course_id=course.id, mode=StudyMode.REVIEW,
        questions=[{"id": f"q{i}", "entry_id": eid, "level": 1, "answer": "x"} for i, eid in enumerate(entry_ids)],
        expires_at=NOW + timedelta(hours=1), finished_at=NOW if finished else None,
    )


async def test_purge_removes_dev_entries_and_related_progress(db_session):
    await seed(db_session)
    dev = list(await db_session.scalars(select(Entry).where(Entry.exam_tags.contains([DEV_TAG])).order_by(Entry.id).limit(3)))
    real = await make_entry(db_session, "deadline", "hạn chót")
    user = await make_user(db_session)

    # 2 từ DEV đã thuộc + 1 từ thật đã thuộc → mastered_count 3; 1 từ DEV đang học
    for entry, status in [(dev[0], EntryState.MASTERED), (dev[1], EntryState.MASTERED), (dev[2], EntryState.LEARNING),
                          (real, EntryState.MASTERED)]:
        db_session.add(UserEntryProgress(user_id=user.id, entry_id=entry.id, status=status, due_at=NOW))
        db_session.add(ReviewLog(user_id=user.id, entry_id=entry.id, level=3, correct=True, source="course"))
    await db_session.execute(User.__table__.update().where(User.id == user.id).values(mastered_count=3))
    course = UserCourse(user_id=user.id, title="Thử", icon="book-open", color="primary")
    db_session.add(course)
    await db_session.flush()
    db_session.add_all([UserCourseEntry(course_id=course.id, entry_id=dev[0].id), UserCourseEntry(course_id=course.id, entry_id=real.id)])
    open_dev, finished_dev, open_real = _session(user, course, [dev[0].id, real.id]), _session(user, course, [dev[1].id], True), _session(user, course, [real.id])
    db_session.add_all([open_dev, finished_dev, open_real])
    await db_session.flush()

    result = await purge(db_session)
    assert (result.entries, result.progress, result.users_adjusted, result.open_sessions) == (60, 3, 1, 1)

    assert await _count(db_session, Entry, Entry.exam_tags.contains([DEV_TAG])) == 0
    assert await _count(db_session, Entry) == 1
    assert await _count(db_session, UserEntryProgress) == 1
    assert await _count(db_session, ReviewLog) == 1
    assert await _count(db_session, UserCourseEntry) == 1
    remaining_sessions = set(await db_session.scalars(select(StudySession.id)))
    assert remaining_sessions == {finished_dev.id, open_real.id}
    await db_session.refresh(user)
    assert user.mastered_count == 1

    # Chạy lại: không còn gì để xóa, bộ đếm không bị trừ thêm
    again = await purge(db_session)
    assert (again.entries, again.progress, again.users_adjusted, again.open_sessions) == (0, 0, 0, 0)
    await db_session.refresh(user)
    assert user.mastered_count == 1


async def test_dry_run_counts_without_deleting(db_session):
    await seed(db_session)
    result = await purge(db_session, dry_run=True)
    assert result.entries == 60
    assert await _count(db_session, Entry, Entry.exam_tags.contains([DEV_TAG])) == 60


async def test_mastered_count_never_goes_negative(db_session):
    await seed(db_session)
    entry = await db_session.scalar(select(Entry).where(Entry.exam_tags.contains([DEV_TAG])).limit(1))
    user = await make_user(db_session)
    db_session.add(UserEntryProgress(user_id=user.id, entry_id=entry.id, status=EntryState.MASTERED, due_at=NOW))
    await db_session.flush()  # bộ đếm đang 0 (vd. đã bị Cửa Ải trừ trước đó)
    await purge(db_session)
    await db_session.refresh(user)
    assert user.mastered_count == 0
