"""
Kiểm thử service "Khóa học của tôi" trên PostgreSQL thật: phân quyền, giới hạn, thêm từ từ kho / tự tạo,
nhập hàng loạt, thống kê, tìm trong kho. Mỗi test rollback sau khi chạy.
"""

import pytest
from sqlalchemy import func, select

from app.core.config import settings
from app.core.errors import AppError
from app.models import AudioJob, Entry, EntryStatus, UserCourseEntry
from app.schemas.course import CourseEntryUpdateIn, CourseIn, CustomEntryIn
from app.services import course_service as svc
from tests.factories import make_custom, make_entry, make_user


async def _course(db, user, title="Từ vựng IT"):
    return await svc.create_course(db, user, CourseIn(title=title, icon="code", color="sky"))


def _code(exc_info) -> str:
    return exc_info.value.code


async def test_create_and_list_courses(db_session):
    user = await make_user(db_session)
    course = await _course(db_session, user)
    assert course.visibility.value == "private" and course.word_count == 0
    listing = await svc.list_courses(db_session, user)
    assert [c["id"] for c in listing["items"]] == [course.id]
    assert listing["limits"]["courses"] == settings.COURSE_MAX_PER_USER


async def test_other_users_course_is_not_found(db_session):
    an, binh = await make_user(db_session, "an"), await make_user(db_session, "binh")
    course = await _course(db_session, an)
    for call in (
        svc.get_course(db_session, binh, course.id),
        svc.course_stats(db_session, binh, course.id),
        svc.list_entries(db_session, binh, course.id, q=None, status="all", sort="added", page=1, page_size=10),
        svc.delete_course(db_session, binh, course.id, confirm=True),
    ):
        with pytest.raises(AppError) as exc:
            await call
        assert _code(exc) == "COURSE_NOT_FOUND" and exc.value.status_code == 404


async def test_course_limit_counts_archived(db_session, monkeypatch):
    monkeypatch.setattr(settings, "COURSE_MAX_PER_USER", 2)
    user = await make_user(db_session)
    first = await _course(db_session, user, "Một")
    await svc.set_archived(db_session, user, first.id, True)
    await _course(db_session, user, "Hai")
    with pytest.raises(AppError) as exc:
        await _course(db_session, user, "Ba")
    assert _code(exc) == "COURSE_LIMIT_REACHED"
    assert [c["title"] for c in (await svc.list_courses(db_session, user, archived=True))["items"]] == ["Một"]


async def test_delete_requires_confirm(db_session):
    user = await make_user(db_session)
    course = await _course(db_session, user)
    with pytest.raises(AppError) as exc:
        await svc.delete_course(db_session, user, course.id, confirm=False)
    assert _code(exc) == "CONFIRM_REQUIRED"
    await svc.delete_course(db_session, user, course.id, confirm=True)
    with pytest.raises(AppError):
        await svc.get_course(db_session, user, course.id)


async def test_add_from_bank_links_without_copy(db_session):
    user = await make_user(db_session)
    course = await _course(db_session, user)
    entry = await make_entry(db_session, "deadline", "hạn chót")
    before = await db_session.scalar(select(func.count()).select_from(Entry))
    row = await svc.add_from_bank(db_session, user, course.id, entry.id, "nhớ deadline đồ án")
    assert row["entry_id"] == entry.id and row["source"] == "system" and row["cefr"] == "B1"
    assert row["personal_note"] == "nhớ deadline đồ án" and row["progress"]["status"] == "new"
    assert await db_session.scalar(select(func.count()).select_from(Entry)) == before
    assert course.word_count == 1
    with pytest.raises(AppError) as exc:
        await svc.add_from_bank(db_session, user, course.id, entry.id)
    assert _code(exc) == "DUPLICATE_IN_COURSE"


async def test_add_from_bank_hides_drafts_and_others_custom(db_session):
    an, binh = await make_user(db_session, "an"), await make_user(db_session, "binh")
    course = await _course(db_session, an)
    draft = await make_entry(db_session, "draft", "nháp", status=EntryStatus.DRAFT)
    secret = await make_custom(db_session, binh, "standup", "họp đứng")
    for entry_id in (draft.id, secret.id, 999_999):
        with pytest.raises(AppError) as exc:
            await svc.add_from_bank(db_session, an, course.id, entry_id)
        assert _code(exc) == "ENTRY_NOT_FOUND"


async def test_word_limit_per_course(db_session, monkeypatch):
    monkeypatch.setattr(settings, "COURSE_MAX_WORDS", 1)
    user = await make_user(db_session)
    course = await _course(db_session, user)
    await svc.add_from_bank(db_session, user, course.id, (await make_entry(db_session, "a", "một")).id)
    with pytest.raises(AppError) as exc:
        await svc.add_from_bank(db_session, user, course.id, (await make_entry(db_session, "b", "hai")).id)
    assert _code(exc) == "WORD_LIMIT_REACHED" and exc.value.details["scope"] == "course"


async def test_custom_entry_suggests_system_word(db_session):
    user = await make_user(db_session)
    course = await _course(db_session, user)
    system = await make_entry(db_session, "bug", "con bọ", cefr="A2")
    with pytest.raises(AppError) as exc:
        await svc.create_custom_entry(db_session, user, course.id, CustomEntryIn(headword="Bug", meaning_vi="lỗi phần mềm"))
    assert _code(exc) == "SYSTEM_ENTRY_EXISTS"
    assert exc.value.details["suggestions"][0]["id"] == system.id
    row = await svc.create_custom_entry(db_session, user, course.id, CustomEntryIn(headword="Bug", meaning_vi="lỗi phần mềm", force=True))
    assert row["source"] == "user" and row["cefr"] is None and row["headword"] == "Bug"


async def test_custom_entry_duplicates_and_audio_job(db_session):
    user = await make_user(db_session)
    course, other = await _course(db_session, user), await _course(db_session, user, "Phim")
    row = await svc.create_custom_entry(db_session, user, course.id, CustomEntryIn(headword="refactor", meaning_vi="tái cấu trúc", note="ghi chú"))
    assert row["personal_note"] == "ghi chú"
    jobs = list(await db_session.scalars(select(AudioJob).where(AudioJob.entry_id == row["entry_id"])))
    assert len(jobs) == 1 and jobs[0].status.value == "pending"

    with pytest.raises(AppError) as exc:
        await svc.create_custom_entry(db_session, user, course.id, CustomEntryIn(headword="REFACTOR", meaning_vi="x"))
    assert _code(exc) == "DUPLICATE_IN_COURSE"
    with pytest.raises(AppError) as exc:
        await svc.create_custom_entry(db_session, user, other.id, CustomEntryIn(headword="Refactor", meaning_vi="x"))
    assert _code(exc) == "CUSTOM_ENTRY_EXISTS" and exc.value.details["entry"]["id"] == row["entry_id"]
    # Thêm lại từ tự tạo của mình vào khóa khác bằng liên kết
    await svc.add_from_bank(db_session, user, other.id, row["entry_id"])


async def test_custom_entry_limit(db_session, monkeypatch):
    monkeypatch.setattr(settings, "CUSTOM_ENTRY_MAX_PER_USER", 1)
    user = await make_user(db_session)
    course = await _course(db_session, user)
    await svc.create_custom_entry(db_session, user, course.id, CustomEntryIn(headword="one", meaning_vi="một"))
    with pytest.raises(AppError) as exc:
        await svc.create_custom_entry(db_session, user, course.id, CustomEntryIn(headword="two", meaning_vi="hai"))
    assert _code(exc) == "WORD_LIMIT_REACHED" and exc.value.details["scope"] == "custom"


async def test_update_entry_rules(db_session):
    user = await make_user(db_session)
    course = await _course(db_session, user)
    system = await make_entry(db_session, "deadline", "hạn chót")
    await svc.add_from_bank(db_session, user, course.id, system.id)
    custom = await svc.create_custom_entry(db_session, user, course.id, CustomEntryIn(headword="deploy", meaning_vi="triển khai"))

    row = await svc.update_course_entry(db_session, user, course.id, system.id, CourseEntryUpdateIn(is_starred=True, personal_note="hay quên"))
    assert row["is_starred"] and row["personal_note"] == "hay quên"
    with pytest.raises(AppError) as exc:
        await svc.update_course_entry(db_session, user, course.id, system.id, CourseEntryUpdateIn(meaning_vi="sửa nghĩa kho"))
    assert _code(exc) == "ENTRY_NOT_OWNED"

    row = await svc.update_course_entry(db_session, user, course.id, custom["entry_id"], CourseEntryUpdateIn(headword="Deploys", meaning_vi="triển khai (số nhiều)"))
    assert row["headword"] == "Deploys" and row["meaning_vi"] == "triển khai (số nhiều)"
    jobs = await db_session.scalar(select(func.count()).select_from(AudioJob).where(AudioJob.entry_id == custom["entry_id"]))
    assert jobs == 2  # đổi chữ thì xếp hàng tạo lại phát âm


async def test_remove_from_course_keeps_entry_and_delete_custom_updates_counts(db_session):
    user = await make_user(db_session)
    a, b = await _course(db_session, user, "A"), await _course(db_session, user, "B")
    row = await svc.create_custom_entry(db_session, user, a.id, CustomEntryIn(headword="merge", meaning_vi="gộp"))
    await svc.add_from_bank(db_session, user, b.id, row["entry_id"])

    await svc.remove_from_course(db_session, user, a.id, row["entry_id"])
    assert a.word_count == 0 and await db_session.get(Entry, row["entry_id"]) is not None

    await svc.delete_custom_entry(db_session, user, row["entry_id"])
    await db_session.refresh(b)
    assert b.word_count == 0
    assert await db_session.scalar(select(func.count()).select_from(UserCourseEntry).where(UserCourseEntry.course_id == b.id)) == 0


async def test_cannot_delete_system_or_others_custom(db_session):
    an, binh = await make_user(db_session, "an"), await make_user(db_session, "binh")
    system = await make_entry(db_session, "deadline", "hạn chót")
    theirs = await make_custom(db_session, binh, "standup", "họp đứng")
    with pytest.raises(AppError) as exc:
        await svc.delete_custom_entry(db_session, an, system.id)
    assert _code(exc) == "ENTRY_NOT_OWNED"
    with pytest.raises(AppError) as exc:
        await svc.delete_custom_entry(db_session, an, theirs.id)
    assert _code(exc) == "ENTRY_NOT_FOUND"


async def test_import_preview_classifies_rows(db_session):
    user = await make_user(db_session)
    course = await _course(db_session, user)
    system = await make_entry(db_session, "deadline", "hạn chót")
    await make_entry(db_session, "secret", "bí mật", status=EntryStatus.DRAFT)
    own = await make_custom(db_session, user, "standup", "họp đứng")
    already = await make_entry(db_session, "salary", "lương")
    await svc.add_from_bank(db_session, user, course.id, already.id)

    text = "\n".join([
        "deploy - triển khai",      # 1 new_custom
        "Deadline - hạn nộp",       # 2 match_system
        "standup: họp đầu ngày",    # 3 match_own
        "salary - lương",           # 4 đã có trong khóa
        "deploy - triển khai lại",  # 5 lặp dòng 1
        "không có dấu ngăn",        # 6 invalid
        "secret - bí mật",          # 7 nháp không hiện → new_custom
    ])
    preview = await svc.import_preview(db_session, user, course.id, text, "lines")
    statuses = [(r["line"], r["status"]) for r in preview["rows"]]
    assert statuses == [
        (1, "new_custom"), (2, "match_system"), (3, "match_own"), (4, "duplicate_in_course"),
        (5, "duplicate_in_course"), (6, "invalid"), (7, "new_custom"),
    ]
    assert preview["rows"][1]["entry_id"] == system.id and preview["rows"][1]["cefr"] == "B1"
    assert preview["rows"][2]["entry_id"] == own.id
    assert preview["rows"][4]["reason"] == "Lặp lại dòng 1"
    assert preview["to_add"] == 4 and preview["counts"]["invalid"] == 1

    result = await svc.import_commit(db_session, user, course.id, text, "lines", skip_lines=[7])
    assert (result["added"], result["created_custom"], result["linked"]) == (3, 1, 2)
    assert result["course"].word_count == 4


async def test_import_rejects_too_many_rows(db_session, monkeypatch):
    monkeypatch.setattr(settings, "IMPORT_MAX_ROWS", 2)
    user = await make_user(db_session)
    course = await _course(db_session, user)
    with pytest.raises(AppError) as exc:
        await svc.import_preview(db_session, user, course.id, "a - 1\nb - 2\nc - 3", "lines")
    assert _code(exc) == "IMPORT_INVALID"
    with pytest.raises(AppError) as exc:
        await svc.import_preview(db_session, user, course.id, "word,example\nx,y", "csv")
    assert _code(exc) == "IMPORT_INVALID"


async def test_import_respects_course_room(db_session, monkeypatch):
    monkeypatch.setattr(settings, "COURSE_MAX_WORDS", 2)
    user = await make_user(db_session)
    course = await _course(db_session, user)
    preview = await svc.import_preview(db_session, user, course.id, "a - 1\nb - 2\nc - 3", "lines")
    assert [r["status"] for r in preview["rows"]] == ["new_custom", "new_custom", "invalid"]
    assert "đã đủ" in preview["rows"][2]["reason"]


async def test_bank_search(db_session):
    user = await make_user(db_session)
    course = await _course(db_session, user)
    exact = await make_entry(db_session, "apply", "nộp đơn", cefr="B1")
    longer = await make_entry(db_session, "application", "đơn xin", cefr="B1")
    await make_entry(db_session, "applause", "tràng pháo tay", status=EntryStatus.DRAFT)
    await make_custom(db_session, user, "app store", "chợ ứng dụng")
    await svc.add_from_bank(db_session, user, course.id, longer.id)

    results = await svc.bank_search(db_session, user, "APP", course.id)
    assert [r["id"] for r in results] == [exact.id, longer.id]
    assert [r["in_course"] for r in results] == [False, True]
    assert await svc.bank_search(db_session, user, "a%") == []


async def test_list_entries_filters_and_search(db_session):
    user = await make_user(db_session)
    course = await _course(db_session, user)
    for word, meaning in (("deadline", "hạn chót"), ("salary", "lương"), ("hire", "thuê")):
        await svc.add_from_bank(db_session, user, course.id, (await make_entry(db_session, word, meaning)).id)
    hire = await db_session.scalar(select(Entry).where(Entry.headword == "hire"))
    await svc.update_course_entry(db_session, user, course.id, hire.id, CourseEntryUpdateIn(is_starred=True))

    page = await svc.list_entries(db_session, user, course.id, q=None, status="all", sort="alpha", page=1, page_size=2)
    assert page["total"] == 3 and [i["headword"] for i in page["items"]] == ["deadline", "hire"]
    starred = await svc.list_entries(db_session, user, course.id, q=None, status="starred", sort="added", page=1, page_size=10)
    assert [i["headword"] for i in starred["items"]] == ["hire"]
    found = await svc.list_entries(db_session, user, course.id, q="LƯƠ", status="new", sort="added", page=1, page_size=10)
    assert [i["headword"] for i in found["items"]] == ["salary"]
