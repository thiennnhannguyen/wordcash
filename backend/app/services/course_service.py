"""
Nghiệp vụ "Khóa học của tôi": khóa học, mục từ trong khóa, từ tự tạo, nhập hàng loạt, thống kê, tìm trong kho.

Quy tắc:
- Người dùng chỉ thấy khóa học của chính mình. Khóa của người khác trả COURSE_NOT_FOUND (404), không phải 403,
  để không lộ việc khóa học đó có tồn tại.
- Mọi truy vấn entries lọc qua `Entry.visible_to(user.id)`; từ tự tạo của người khác coi như không tồn tại (404).
- Từ hệ thống chỉ được LIÊN KẾT (không sao chép). Từ tự tạo: source=user, status=approved, chỉ chủ sở hữu thấy,
  không tính rank/lượt quay/Cửa Ải (xem services/mastery.py).
- Giới hạn: COURSE_MAX_ACTIVE khóa đang học, COURSE_MAX_ARCHIVED khóa đã lưu trữ, COURSE_MAX_WORDS từ/khóa, IMPORT_MAX_ROWS dòng/lần nhập,
  CUSTOM_ENTRY_MAX_PER_USER từ tự tạo/người.
- `word_count` của khóa là bộ đếm cache, cập nhật trong cùng transaction với thao tác thêm/bớt.
Phiên học (chọn từ, sinh câu hỏi, chấm) nằm ở services/study_service.py.
"""

import uuid
from collections import Counter
from datetime import UTC, datetime, timedelta

from sqlalchemy import Select, and_, case, func, or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.errors import AppError
from app.models import (
    AudioJob,
    Entry,
    EntrySource,
    EntryState,
    EntryStatus,
    ReviewLog,
    User,
    UserCourse,
    UserCourseEntry,
    UserEntryProgress,
)
from app.schemas.course import (
    CONTENT_FIELDS,
    CourseEntryUpdateIn,
    CourseIn,
    CourseUpdateIn,
    CustomEntryIn,
)
from app.services import course_import
from app.services.progress_service import local_day


def _now() -> datetime:
    return datetime.now(UTC)


def limits() -> dict[str, int]:
    return {
        "courses": settings.COURSE_MAX_ACTIVE,
        "archived_courses": settings.COURSE_MAX_ARCHIVED,
        "words_per_course": settings.COURSE_MAX_WORDS,
        "import_rows": settings.IMPORT_MAX_ROWS,
        "custom_entries": settings.CUSTOM_ENTRY_MAX_PER_USER,
    }


def entry_brief(entry: Entry) -> dict:
    return {
        "id": entry.id,
        "headword": entry.headword,
        "meaning_vi": entry.meaning_vi,
        "pos": entry.pos,
        "ipa": entry.ipa,
        "cefr": entry.cefr,
        "example": entry.example,
        "audio_url": entry.audio_url,
        "source": entry.source.value,
    }


# ---------- Khóa học ----------


async def get_course(session: AsyncSession, user: User, course_id: uuid.UUID) -> UserCourse:
    course = await session.scalar(select(UserCourse).where(UserCourse.id == course_id, UserCourse.user_id == user.id))
    if course is None:
        raise AppError("COURSE_NOT_FOUND")
    return course


async def _ensure_room(session: AsyncSession, user: User, *, archived: bool) -> None:
    """Tối đa COURSE_MAX_ACTIVE khóa đang học và COURSE_MAX_ARCHIVED khóa đã lưu trữ (đếm riêng)."""
    limit = settings.COURSE_MAX_ARCHIVED if archived else settings.COURSE_MAX_ACTIVE
    state = UserCourse.archived_at.is_not(None) if archived else UserCourse.archived_at.is_(None)
    count = await session.scalar(select(func.count()).select_from(UserCourse).where(UserCourse.user_id == user.id, state))
    if count >= limit:
        message = (
            f"Bạn đã lưu trữ tối đa {limit} khóa học. Xóa bớt một khóa đã lưu trữ nhé."
            if archived
            else f"Bạn đang học tối đa {limit} khóa học. Lưu trữ hoặc xóa bớt một khóa nhé."
        )
        raise AppError("COURSE_LIMIT_REACHED", message, details={"limit": limit, "scope": "archived" if archived else "active"})


async def create_course(session: AsyncSession, user: User, data: CourseIn) -> UserCourse:
    await _ensure_room(session, user, archived=False)
    course = UserCourse(user_id=user.id, **data.model_dump())
    session.add(course)
    await session.commit()
    return course


async def update_course(session: AsyncSession, user: User, course_id: uuid.UUID, data: CourseUpdateIn) -> UserCourse:
    course = await get_course(session, user, course_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(course, field, value)
    await session.commit()
    await session.refresh(course)
    return course


async def set_archived(session: AsyncSession, user: User, course_id: uuid.UUID, archived: bool) -> UserCourse:
    course = await get_course(session, user, course_id)
    if archived == (course.archived_at is not None):
        return course  # đã đúng trạng thái
    await _ensure_room(session, user, archived=archived)
    course.archived_at = _now() if archived else None
    await session.commit()
    await session.refresh(course)
    return course


async def delete_course(session: AsyncSession, user: User, course_id: uuid.UUID, confirm: bool) -> None:
    """Xóa hẳn khóa học (cần xác nhận). Mục từ gốc và tiến độ học giữ nguyên; từ tự tạo vẫn nằm trong danh sách ôn chung."""
    course = await get_course(session, user, course_id)
    if not confirm:
        raise AppError("CONFIRM_REQUIRED")
    await session.delete(course)
    await session.commit()


def _due_condition(now: datetime):
    return and_(UserEntryProgress.due_at.is_not(None), UserEntryProgress.due_at <= now)


def _course_rows(user: User) -> Select:
    """Mục từ trong khóa (đã lọc hiển thị) kèm tiến độ của người dùng (có thể rỗng = `new`)."""
    return (
        select(UserCourseEntry, Entry, UserEntryProgress)
        .join(Entry, Entry.id == UserCourseEntry.entry_id)
        .outerjoin(UserEntryProgress, and_(UserEntryProgress.entry_id == Entry.id, UserEntryProgress.user_id == user.id))
        .where(Entry.visible_to(user.id))
    )


async def list_courses(session: AsyncSession, user: User, archived: bool = False) -> dict:
    now = _now()
    filters = [UserCourse.user_id == user.id, UserCourse.archived_at.is_not(None) if archived else UserCourse.archived_at.is_(None)]
    courses = list(await session.scalars(select(UserCourse).where(*filters).order_by(UserCourse.updated_at.desc())))

    stats = {}
    if courses:
        rows = await session.execute(
            select(
                UserCourseEntry.course_id,
                func.count().filter(UserEntryProgress.status == EntryState.MASTERED),
                func.count().filter(_due_condition(now)),
            )
            .join(Entry, Entry.id == UserCourseEntry.entry_id)
            .outerjoin(UserEntryProgress, and_(UserEntryProgress.entry_id == Entry.id, UserEntryProgress.user_id == user.id))
            .where(UserCourseEntry.course_id.in_([c.id for c in courses]), Entry.visible_to(user.id))
            .group_by(UserCourseEntry.course_id)
        )
        stats = {course_id: (mastered, due) for course_id, mastered, due in rows}

    mastered_total = await session.scalar(
        select(func.count(func.distinct(UserCourseEntry.entry_id)))
        .join(UserCourse, UserCourse.id == UserCourseEntry.course_id)
        .join(Entry, Entry.id == UserCourseEntry.entry_id)
        .join(UserEntryProgress, and_(UserEntryProgress.entry_id == Entry.id, UserEntryProgress.user_id == user.id))
        .where(UserCourse.user_id == user.id, UserCourse.archived_at.is_(None), Entry.visible_to(user.id),
               UserEntryProgress.status == EntryState.MASTERED)
    )
    items = []
    for course in courses:
        mastered, due = stats.get(course.id, (0, 0))
        items.append({**_course_dict(course), "mastered_count": mastered, "due_count": due})
    return {"items": items, "mastered_total": mastered_total or 0, "custom_mastered_count": user.custom_mastered_count, "limits": limits()}


def _course_dict(course: UserCourse) -> dict:
    return {
        "id": course.id,
        "title": course.title,
        "description": course.description,
        "icon": course.icon,
        "color": course.color,
        "visibility": course.visibility.value,
        "word_count": course.word_count,
        "created_at": course.created_at,
        "updated_at": course.updated_at,
        "archived_at": course.archived_at,
    }


async def new_words_left_today(session: AsyncSession, user: User, now: datetime) -> int:
    today = local_day(user, now)
    started = await session.scalar(
        select(func.count()).select_from(UserEntryProgress).where(UserEntryProgress.user_id == user.id, UserEntryProgress.first_seen_day == today)
    )
    return max(settings.DAILY_NEW_WORDS_LIMIT - (started or 0), 0)


async def course_stats(session: AsyncSession, user: User, course_id: uuid.UUID) -> dict:
    course = await get_course(session, user, course_id)
    now = _now()
    status_col = func.coalesce(UserEntryProgress.status, EntryState.NEW)
    base = (
        select(status_col, func.count(), func.count().filter(_due_condition(now)),
               func.count().filter(or_(UserCourseEntry.is_starred, UserEntryProgress.wrong_count > 0)))
        .select_from(UserCourseEntry)
        .join(Entry, Entry.id == UserCourseEntry.entry_id)
        .outerjoin(UserEntryProgress, and_(UserEntryProgress.entry_id == Entry.id, UserEntryProgress.user_id == user.id))
        .where(UserCourseEntry.course_id == course.id, Entry.visible_to(user.id))
        .group_by(status_col)
    )
    by_status = {s.value: 0 for s in EntryState}
    due = hard = total = 0
    for status, count, due_count, hard_count in await session.execute(base):
        by_status[EntryState(status).value] = count
        due += due_count
        hard += hard_count
        total += count

    since = now - timedelta(days=7)
    answered, correct = (
        await session.execute(
            select(func.count(), func.count().filter(ReviewLog.correct))
            .where(
                ReviewLog.user_id == user.id,
                ReviewLog.answered_at >= since,
                ReviewLog.entry_id.in_(select(UserCourseEntry.entry_id).where(UserCourseEntry.course_id == course.id)),
            )
        )
    ).one()
    left_today = await new_words_left_today(session, user, now)
    return {
        "word_count": total,
        "by_status": by_status,
        "due_count": due,
        "accuracy_7d": round(correct / answered, 3) if answered else None,
        "answers_7d": answered,
        "new_words_left_today": left_today,
        "modes": {
            "learn": min(by_status["new"], left_today),
            "review": due,
            "quick": total,
            "hard": hard,
            "test": total,
        },
    }


# ---------- Mục từ trong khóa ----------


async def list_entries(session: AsyncSession, user: User, course_id: uuid.UUID, *, q: str | None, status: str, sort: str,
                       page: int, page_size: int) -> dict:
    course = await get_course(session, user, course_id)
    now = _now()
    stmt = _course_rows(user).where(UserCourseEntry.course_id == course.id)
    if q and q.strip():
        like = f"%{_escape_like(q.strip().lower())}%"
        stmt = stmt.where(or_(func.lower(Entry.headword).like(like, escape="\\"), func.lower(Entry.meaning_vi).like(like, escape="\\")))
    if status == "starred":
        stmt = stmt.where(UserCourseEntry.is_starred)
    elif status == "due":
        stmt = stmt.where(_due_condition(now))
    elif status == "new":
        stmt = stmt.where(or_(UserEntryProgress.status.is_(None), UserEntryProgress.status == EntryState.NEW))
    elif status != "all":
        stmt = stmt.where(UserEntryProgress.status == EntryState(status))

    total = await session.scalar(select(func.count()).select_from(stmt.subquery()))
    order = {
        "alpha": [func.lower(Entry.headword), UserCourseEntry.id],
        "due": [UserEntryProgress.due_at.asc().nulls_last(), UserCourseEntry.position],
        "added": [UserCourseEntry.added_at.desc(), UserCourseEntry.id.desc()],
    }[sort]
    rows = await session.execute(stmt.order_by(*order).offset((page - 1) * page_size).limit(page_size))
    return {"items": [_entry_row(link, entry, progress) for link, entry, progress in rows], "total": total, "page": page, "page_size": page_size}


def _escape_like(value: str) -> str:
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _entry_row(link: UserCourseEntry, entry: Entry, progress: UserEntryProgress | None) -> dict:
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
        "personal_note": link.personal_note,
        "is_starred": link.is_starred,
        "position": link.position,
        "added_at": link.added_at,
        "progress": {"status": progress.status if progress else EntryState.NEW, "due_at": progress.due_at if progress else None},
    }


async def _course_entry_row(session: AsyncSession, user: User, course: UserCourse, entry_id: int) -> dict:
    link, entry, progress = (
        await session.execute(_course_rows(user).where(UserCourseEntry.course_id == course.id, UserCourseEntry.entry_id == entry_id))
    ).one()
    return _entry_row(link, entry, progress)


async def _visible_entry(session: AsyncSession, user: User, entry_id: int) -> Entry:
    entry = await session.scalar(select(Entry).where(Entry.id == entry_id, Entry.visible_to(user.id)))
    if entry is None:
        raise AppError("ENTRY_NOT_FOUND")
    return entry


def _ensure_course_room(course: UserCourse, adding: int = 1) -> None:
    if course.word_count + adding > settings.COURSE_MAX_WORDS:
        raise AppError(
            "WORD_LIMIT_REACHED",
            f"Mỗi khóa học có tối đa {settings.COURSE_MAX_WORDS} từ.",
            details={"limit": settings.COURSE_MAX_WORDS, "scope": "course"},
        )


async def _custom_count(session: AsyncSession, user: User) -> int:
    return await session.scalar(
        select(func.count()).select_from(Entry).where(Entry.owner_user_id == user.id, Entry.source == EntrySource.USER)
    ) or 0


async def _ensure_custom_room(session: AsyncSession, user: User, adding: int = 1) -> None:
    if await _custom_count(session, user) + adding > settings.CUSTOM_ENTRY_MAX_PER_USER:
        raise AppError(
            "WORD_LIMIT_REACHED",
            f"Mỗi người tạo được tối đa {settings.CUSTOM_ENTRY_MAX_PER_USER} từ riêng.",
            details={"limit": settings.CUSTOM_ENTRY_MAX_PER_USER, "scope": "custom"},
        )


async def _in_course(session: AsyncSession, course: UserCourse, entry_id: int) -> UserCourseEntry | None:
    return await session.scalar(select(UserCourseEntry).where(UserCourseEntry.course_id == course.id, UserCourseEntry.entry_id == entry_id))


async def _next_position(session: AsyncSession, course: UserCourse) -> int:
    current = await session.scalar(select(func.max(UserCourseEntry.position)).where(UserCourseEntry.course_id == course.id))
    return (current or 0) + 1


async def _link(session: AsyncSession, course: UserCourse, entry: Entry, position: int, note: str | None = None) -> None:
    session.add(UserCourseEntry(course_id=course.id, entry_id=entry.id, position=position, personal_note=note))
    course.word_count += 1
    course.updated_at = _now()


async def add_from_bank(session: AsyncSession, user: User, course_id: uuid.UUID, entry_id: int, note: str | None = None) -> dict:
    """Liên kết một mục từ có sẵn (từ hệ thống đã duyệt, hoặc từ tự tạo của chính mình) vào khóa học."""
    course = await get_course(session, user, course_id)
    entry = await _visible_entry(session, user, entry_id)
    if await _in_course(session, course, entry.id):
        raise AppError("DUPLICATE_IN_COURSE")
    _ensure_course_room(course)
    await _link(session, course, entry, await _next_position(session, course), note)
    await session.commit()
    return await _course_entry_row(session, user, course, entry.id)


async def find_system_matches(session: AsyncSession, headword: str, limit: int = 3) -> list[Entry]:
    key = course_import.headword_key(headword)
    return list(
        await session.scalars(
            select(Entry).where(Entry.system_approved(), func.lower(Entry.headword) == key).order_by(Entry.cefr.nulls_last(), Entry.id).limit(limit)
        )
    )


async def find_own_custom(session: AsyncSession, user: User, headword: str, exclude_id: int | None = None) -> Entry | None:
    stmt = select(Entry).where(
        Entry.source == EntrySource.USER, Entry.owner_user_id == user.id, func.lower(Entry.headword) == course_import.headword_key(headword)
    )
    if exclude_id is not None:
        stmt = stmt.where(Entry.id != exclude_id)
    return await session.scalar(stmt)


async def create_custom_entry(session: AsyncSession, user: User, course_id: uuid.UUID, data: CustomEntryIn) -> dict:
    """Tạo từ riêng rồi thêm vào khóa học.

    - Đã tự tạo từ cùng chữ: có trong khóa → DUPLICATE_IN_COURSE; chưa có → CUSTOM_ENTRY_EXISTS (kèm mục từ để thêm lại).
    - Kho hệ thống đã có từ cùng chữ và không gửi `force` → SYSTEM_ENTRY_EXISTS kèm gợi ý dùng bản trong kho.
    """
    course = await get_course(session, user, course_id)
    headword = course_import.clean_text(data.headword)

    own = await find_own_custom(session, user, headword)
    if own is not None:
        if await _in_course(session, course, own.id):
            raise AppError("DUPLICATE_IN_COURSE")
        raise AppError("CUSTOM_ENTRY_EXISTS", details={"entry": entry_brief(own)})
    if not data.force:
        matches = await find_system_matches(session, headword)
        if matches:
            if any([await _in_course(session, course, m.id) for m in matches]):
                raise AppError("DUPLICATE_IN_COURSE")
            raise AppError("SYSTEM_ENTRY_EXISTS", details={"suggestions": [entry_brief(m) for m in matches]})

    _ensure_course_room(course)
    await _ensure_custom_room(session, user)
    entry = Entry(
        headword=headword,
        meaning_vi=data.meaning_vi,
        pos=data.pos,
        ipa=data.ipa,
        example=data.example,
        image_url=data.image_url,
        source=EntrySource.USER,
        status=EntryStatus.APPROVED,
        owner_user_id=user.id,
    )
    session.add(entry)
    await session.flush()
    session.add(AudioJob(entry_id=entry.id))
    await _link(session, course, entry, await _next_position(session, course), data.note)
    await session.commit()
    return await _course_entry_row(session, user, course, entry.id)


async def _owned_custom(session: AsyncSession, user: User, entry_id: int) -> Entry:
    entry = await _visible_entry(session, user, entry_id)
    if not entry.is_custom or entry.owner_user_id != user.id:
        raise AppError("ENTRY_NOT_OWNED")
    return entry


async def _apply_custom_update(session: AsyncSession, user: User, entry: Entry, changes: dict) -> None:
    if "headword" in changes:
        changes["headword"] = course_import.clean_text(changes["headword"])
        if await find_own_custom(session, user, changes["headword"], exclude_id=entry.id):
            raise AppError("CUSTOM_ENTRY_EXISTS")
        if course_import.headword_key(changes["headword"]) != course_import.headword_key(entry.headword):
            # Đổi chữ thì phát âm cũ không còn đúng: xếp hàng tạo lại
            entry.audio_url = None
            session.add(AudioJob(entry_id=entry.id))
    for field, value in changes.items():
        setattr(entry, field, value)


async def update_course_entry(session: AsyncSession, user: User, course_id: uuid.UUID, entry_id: int, data: CourseEntryUpdateIn) -> dict:
    course = await get_course(session, user, course_id)
    await _visible_entry(session, user, entry_id)
    link = await _in_course(session, course, entry_id)
    if link is None:
        raise AppError("ENTRY_NOT_FOUND")
    changes = data.model_dump(exclude_unset=True)
    content = {k: changes.pop(k) for k in CONTENT_FIELDS if k in changes}
    if content:
        entry = await _owned_custom(session, user, entry_id)
        await _apply_custom_update(session, user, entry, content)
    for field, value in changes.items():
        setattr(link, field, value)
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise AppError("CUSTOM_ENTRY_EXISTS") from None
    return await _course_entry_row(session, user, course, entry_id)


async def remove_from_course(session: AsyncSession, user: User, course_id: uuid.UUID, entry_id: int) -> None:
    """Bỏ từ khỏi khóa học. Mục từ gốc (kể cả từ tự tạo) và tiến độ học giữ nguyên."""
    course = await get_course(session, user, course_id)
    link = await _in_course(session, course, entry_id)
    if link is None:
        raise AppError("ENTRY_NOT_FOUND")
    await session.delete(link)
    course.word_count = max(course.word_count - 1, 0)
    course.updated_at = _now()
    await session.commit()


async def delete_custom_entry(session: AsyncSession, user: User, entry_id: int) -> None:
    """Xóa hẳn một từ tự tạo: gỡ khỏi mọi khóa học, xóa tiến độ; trừ custom_mastered_count nếu đang thuộc."""
    entry = await _owned_custom(session, user, entry_id)
    progress = await session.get(UserEntryProgress, (user.id, entry.id))
    if progress is not None and progress.status == EntryState.MASTERED:
        await session.execute(update(User).where(User.id == user.id).values(custom_mastered_count=User.custom_mastered_count - 1))
    course_ids = list(await session.scalars(select(UserCourseEntry.course_id).where(UserCourseEntry.entry_id == entry.id)))
    if course_ids:
        await session.execute(
            update(UserCourse).where(UserCourse.id.in_(course_ids)).values(word_count=func.greatest(UserCourse.word_count - 1, 0))
        )
    await session.delete(entry)
    await session.commit()


async def reorder(session: AsyncSession, user: User, course_id: uuid.UUID, entry_ids: list[int]) -> None:
    """Đặt lại thứ tự theo danh sách gửi lên; từ không có trong danh sách giữ thứ tự cũ, xếp sau."""
    course = await get_course(session, user, course_id)
    links = {link.entry_id: link for link in await session.scalars(select(UserCourseEntry).where(UserCourseEntry.course_id == course.id))}
    if len(set(entry_ids)) != len(entry_ids) or any(i not in links for i in entry_ids):
        raise AppError("VALIDATION_ERROR", details=[{"field": "entry_ids", "message": "Danh sách có từ không thuộc khóa học hoặc bị lặp"}])
    rest = sorted((link for i, link in links.items() if i not in set(entry_ids)), key=lambda link: link.position)
    for position, link in enumerate([links[i] for i in entry_ids] + rest, start=1):
        link.position = position
    await session.commit()


# ---------- Nhập hàng loạt ----------


async def _classify(session: AsyncSession, user: User, course: UserCourse, text: str, fmt: str) -> list[dict]:
    try:
        parsed = course_import.parse(text, fmt)
    except course_import.ImportFormatError as exc:
        raise AppError("IMPORT_INVALID", str(exc)) from None
    if not parsed:
        raise AppError("IMPORT_INVALID", "Chưa có dòng nào để nhập.")
    if len(parsed) > settings.IMPORT_MAX_ROWS:
        raise AppError("IMPORT_INVALID", f"Mỗi lần nhập tối đa {settings.IMPORT_MAX_ROWS} dòng (bạn đang có {len(parsed)} dòng).",
                       details={"limit": settings.IMPORT_MAX_ROWS, "rows": len(parsed)})

    keys = {course_import.headword_key(r.headword) for r in parsed if r.headword}
    in_course = set(
        await session.scalars(
            select(func.lower(Entry.headword))
            .join(UserCourseEntry, UserCourseEntry.entry_id == Entry.id)
            .where(UserCourseEntry.course_id == course.id, Entry.visible_to(user.id))
        )
    )
    own = {
        e.headword.lower(): e
        for e in await session.scalars(
            select(Entry).where(Entry.source == EntrySource.USER, Entry.owner_user_id == user.id, func.lower(Entry.headword).in_(keys))
        )
    }
    system: dict[str, Entry] = {}
    for e in await session.scalars(
        select(Entry).where(Entry.system_approved(), func.lower(Entry.headword).in_(keys)).order_by(Entry.cefr.nulls_last(), Entry.id)
    ):
        system.setdefault(e.headword.lower(), e)

    course_room = settings.COURSE_MAX_WORDS - course.word_count
    custom_room = settings.CUSTOM_ENTRY_MAX_PER_USER - await _custom_count(session, user)
    seen: dict[str, int] = {}
    rows = []
    for r in parsed:
        row = {"line": r.line, "headword": r.headword, "meaning": r.meaning, "example": r.example, "note": r.note,
               "status": "invalid", "reason": r.error, "entry_id": None, "cefr": None, "system_meaning": None}
        rows.append(row)
        if r.error:
            continue
        key = course_import.headword_key(r.headword)
        if key in seen:
            row.update(status="duplicate_in_course", reason=f"Lặp lại dòng {seen[key]}")
            continue
        seen[key] = r.line
        if key in in_course:
            row.update(status="duplicate_in_course", reason="Đã có trong khóa học")
            continue
        if course_room <= 0:
            row.update(reason=f"Khóa học đã đủ {settings.COURSE_MAX_WORDS} từ")
            continue
        if key in own:
            row.update(status="match_own", reason=None, entry_id=own[key].id)
        elif key in system:
            match = system[key]
            row.update(status="match_system", reason=None, entry_id=match.id, cefr=match.cefr, system_meaning=match.meaning_vi)
        elif custom_room <= 0:
            row.update(reason=f"Bạn đã tạo đủ {settings.CUSTOM_ENTRY_MAX_PER_USER} từ riêng")
            continue
        else:
            row.update(status="new_custom", reason=None)
            custom_room -= 1
        course_room -= 1
    return rows


ADDABLE = ("new_custom", "match_system", "match_own")


async def import_preview(session: AsyncSession, user: User, course_id: uuid.UUID, text: str, fmt: str) -> dict:
    course = await get_course(session, user, course_id)
    rows = await _classify(session, user, course, text, fmt)
    counts = Counter(r["status"] for r in rows)
    return {
        "rows": rows,
        "counts": {s: counts.get(s, 0) for s in (*ADDABLE, "duplicate_in_course", "invalid")},
        "to_add": sum(counts[s] for s in ADDABLE),
    }


async def import_commit(session: AsyncSession, user: User, course_id: uuid.UUID, text: str, fmt: str, skip_lines: list[int]) -> dict:
    """Phân loại lại ở server (không tin bảng xem trước của client) rồi lưu mọi dòng hợp lệ trong MỘT transaction."""
    course = await get_course(session, user, course_id)
    rows = await _classify(session, user, course, text, fmt)
    skip = set(skip_lines)
    position = await _next_position(session, course)
    created = linked = 0
    for row in rows:
        if row["status"] not in ADDABLE or row["line"] in skip:
            continue
        if row["status"] == "new_custom":
            entry = Entry(headword=row["headword"], meaning_vi=row["meaning"], example=row["example"], source=EntrySource.USER,
                          status=EntryStatus.APPROVED, owner_user_id=user.id)
            session.add(entry)
            await session.flush()
            session.add(AudioJob(entry_id=entry.id))
            created += 1
        else:
            entry = await session.get(Entry, row["entry_id"])
            linked += 1
        await _link(session, course, entry, position, row["note"])
        position += 1
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise AppError("IMPORT_INVALID", "Dữ liệu vừa thay đổi trong lúc nhập. Bạn bấm Xem trước lại nhé.") from None
    await session.refresh(course)
    return {"added": created + linked, "created_custom": created, "linked": linked, "skipped": len(rows) - created - linked, "course": course}


# ---------- Tìm trong kho ----------


async def bank_search(session: AsyncSession, user: User, q: str, course_id: uuid.UUID | None = None, limit: int = 10) -> list[dict]:
    """Gợi ý khi gõ: từ hệ thống đã duyệt, bắt đầu bằng chuỗi gõ vào (khớp nguyên từ xếp trước)."""
    key = course_import.headword_key(q)
    if not key:
        return []
    lowered = func.lower(Entry.headword)
    stmt = (
        select(Entry)
        .where(Entry.system_approved(), lowered.like(f"{_escape_like(key)}%", escape="\\"))
        .order_by(case((lowered == key, 0), else_=1), func.length(Entry.headword), lowered, Entry.id)
        .limit(limit)
    )
    entries = list(await session.scalars(stmt))
    in_course: set[int] | None = None
    if course_id is not None:
        course = await get_course(session, user, course_id)
        in_course = set(
            await session.scalars(
                select(UserCourseEntry.entry_id).where(UserCourseEntry.course_id == course.id, UserCourseEntry.entry_id.in_([e.id for e in entries]))
            )
        )
    return [
        {"id": e.id, "headword": e.headword, "cefr": e.cefr, "pos": e.pos, "ipa": e.ipa, "meaning_vi": e.meaning_vi,
         "entry_type": e.entry_type.value, "in_course": (e.id in in_course) if in_course is not None else None}
        for e in entries
    ]

