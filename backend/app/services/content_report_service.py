"""
Báo lỗi nội dung (nút "Báo lỗi" ở thẻ học và tấm phản hồi sau mỗi câu). Chỉ mục từ HỆ THỐNG; từ tự tạo không báo được.

- `create`: xác định mục + chụp lại nội dung NGƯỜI HỌC ĐÃ THẤY từ bản server đã lưu (câu hỏi: StudySession.questions /
  DailyCheck.questions có sẵn phần đề `public` + đáp án đúng; thẻ học: trường thẻ hiện tại của mục), kèm content_key +
  content_version. Không lưu đáp án người học đã chọn. Cùng người + mục + loại đã báo hôm nay (ngày địa phương) → trả
  `created = false`, không tạo dòng mới (chống trùng bằng unique + ON CONFLICT DO NOTHING); quá CONTENT_REPORT_DAILY_LIMIT
  báo cáo mới trong ngày → CONTENT_REPORT_LIMIT.
- `fields_for`: trường nội dung cần xem theo loại lỗi ("Đáp án gây nhầm" → cloze_en, cloze_distractors; câu Mức 1 thêm
  meaning_vi vì đáp án nhiễu Mức 1 là nghĩa).
- Quản trị: `list_groups` gom theo mục, sắp theo số báo cáo; `set_entry_status` đổi mọi báo cáo đang mở của một mục (sửa
  xong mục → resolved cả nhóm); `set_status` đổi một báo cáo.
"""

import uuid
from collections import Counter
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.errors import AppError
from app.models import (
    ContentReport,
    DailyCheck,
    Entry,
    EntrySource,
    ReportContext,
    ReportKind,
    ReportStatus,
    StudySession,
    User,
)
from app.schemas.content_report import ContentReportIn
from app.services import session_engine
from app.utils.time import local_date

KIND_FIELDS = {
    ReportKind.CONFUSING_ANSWER: ["cloze_en", "cloze_distractors"],
    ReportKind.WRONG_MEANING: ["meaning_vi"],
    ReportKind.WRONG_EXAMPLE: ["example_en", "example_vi"],
    ReportKind.WRONG_AUDIO: ["ipa"],
    ReportKind.OTHER: [],
}
CARD_SNAPSHOT_FIELDS = ("headword", "meaning_vi", "variant_note", "pos", "ipa", "example", "collocations", "word_family")


def fields_for(kind: ReportKind, level: int | None) -> list[str]:
    fields = list(KIND_FIELDS[kind])
    if kind == ReportKind.CONFUSING_ANSWER and level == 1:
        fields.append("meaning_vi")
    return fields


def question_snapshot(key: dict) -> dict:
    """Đề đúng như người học thấy (phần `public` đã lưu) + đáp án đúng; phiên cũ chưa lưu phần đề thì chỉ có mức + đáp án."""
    public = dict(key.get("public") or {"id": key.get("id"), "level": key.get("level")})
    return {**public, "correct_answer": key.get("answer")}


async def _from_question(session: AsyncSession, user: User, data: ContentReportIn) -> tuple[int, str, dict, int | None]:
    ref = data.question
    if ref.kind == "study":
        study = await session.scalar(select(StudySession).where(StudySession.id == ref.session_id, StudySession.user_id == user.id))
        if study is None:
            raise AppError("NOT_FOUND")
        questions, source = study.questions, study.kind.value
    else:
        check = await session.scalar(select(DailyCheck).where(DailyCheck.user_id == user.id).order_by(DailyCheck.local_date.desc()).limit(1))
        if check is None:
            raise AppError("NOT_FOUND")
        questions, source = check.questions, "daily_check"
    key = next((q for q in questions if q.get("id") == ref.question_id), None)
    if key is None:
        raise AppError("CONTENT_REPORT_NOT_ALLOWED")
    return key["entry_id"], source, question_snapshot(key), key.get("level")


async def create(session: AsyncSession, user: User, data: ContentReportIn, now: datetime) -> dict:
    if data.question is not None:
        entry_id, source, snapshot, level = await _from_question(session, user, data)
        context = ReportContext.QUESTION
    else:
        entry_id, source, snapshot, level = data.entry_id, data.source, None, None
        context = ReportContext.CARD
    entry = await session.scalar(select(Entry).where(Entry.id == entry_id, Entry.visible_to(user.id)))
    if entry is None or entry.source != EntrySource.SYSTEM:
        raise AppError("CONTENT_REPORT_NOT_ALLOWED")
    if snapshot is None:
        card = session_engine.card(entry)
        snapshot = {k: card[k] for k in CARD_SNAPSHOT_FIELDS}
    day = local_date(user, now)
    exists = await session.scalar(select(ContentReport.id).where(
        ContentReport.user_id == user.id, ContentReport.entry_id == entry.id, ContentReport.kind == data.kind,
        ContentReport.local_day == day))
    if exists is not None:
        return {"created": False}
    today_count = await session.scalar(select(func.count()).select_from(ContentReport).where(
        ContentReport.user_id == user.id, ContentReport.local_day == day)) or 0
    if today_count >= settings.CONTENT_REPORT_DAILY_LIMIT:
        raise AppError("CONTENT_REPORT_LIMIT", details={"limit": settings.CONTENT_REPORT_DAILY_LIMIT})
    inserted = await session.scalar(
        pg_insert(ContentReport).values(
            id=uuid.uuid4(), user_id=user.id, entry_id=entry.id, content_key=entry.content_key, content_version=entry.content_version,
            kind=data.kind, note=data.note.strip() or None, context=context, source=source, snapshot=snapshot,
            fields=fields_for(data.kind, level), status=ReportStatus.OPEN, local_day=day, created_at=now,
        ).on_conflict_do_nothing(index_elements=["user_id", "entry_id", "kind", "local_day"]).returning(ContentReport.id)
    )
    await session.commit()
    return {"created": inserted is not None}


# ---------- Quản trị ----------

async def list_groups(session: AsyncSession, status: str, limit: int = 2000) -> dict:
    stmt = select(ContentReport, Entry).join(Entry, Entry.id == ContentReport.entry_id).order_by(ContentReport.created_at.desc()).limit(limit)
    if status != "all":
        stmt = stmt.where(ContentReport.status == ReportStatus(status))
    groups: dict[int, dict] = {}
    for report, entry in (await session.execute(stmt)).all():
        g = groups.setdefault(entry.id, {
            "entry_id": entry.id, "content_key": entry.content_key, "headword": entry.headword, "cefr": entry.cefr,
            "current_version": entry.content_version, "fields": [], "count": 0, "kinds": Counter(), "last_at": report.created_at,
            "reports": [],
        })
        g["count"] += 1
        g["kinds"][report.kind.value] += 1
        g["fields"] += [f for f in report.fields if f not in g["fields"]]
        g["reports"].append(report)
    ordered = sorted(groups.values(), key=lambda g: (-g["count"], -g["last_at"].timestamp()))
    for g in ordered:
        g["kinds"] = dict(g["kinds"])
    return {"status": status, "groups": ordered}


async def set_entry_status(session: AsyncSession, admin: User, entry_id: int, status: ReportStatus, now: datetime) -> int:
    """resolved / dismissed: mọi báo cáo ĐANG MỞ của mục; open: mở lại mọi báo cáo đã đóng của mục."""
    current = [ReportStatus.OPEN] if status != ReportStatus.OPEN else [ReportStatus.RESOLVED, ReportStatus.DISMISSED]
    rows = list(await session.scalars(select(ContentReport).where(ContentReport.entry_id == entry_id, ContentReport.status.in_(current))))
    for r in rows:
        _apply(r, admin, status, now)
    await session.commit()
    return len(rows)


async def set_status(session: AsyncSession, admin: User, report_id: uuid.UUID, status: ReportStatus, now: datetime) -> int:
    report = await session.get(ContentReport, report_id)
    if report is None:
        raise AppError("NOT_FOUND")
    _apply(report, admin, status, now)
    await session.commit()
    return 1


def _apply(report: ContentReport, admin: User, status: ReportStatus, now: datetime) -> None:
    report.status = status
    report.resolved_at, report.resolved_by = (None, None) if status == ReportStatus.OPEN else (now, admin.id)
