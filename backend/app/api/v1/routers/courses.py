"""
"Khóa học của tôi": khóa học, mục từ trong khóa, nhập hàng loạt, thống kê, bắt đầu phiên học.

Mọi route cần đăng nhập. Khóa học của người khác trả COURSE_NOT_FOUND (404) để không lộ việc khóa học có tồn tại.
Nghiệp vụ nằm ở services/course_service.py và services/study_service.py.
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Query, status

from app.api.deps import CurrentUser, DailyCheckDone, DbSession
from app.api.responses import error_responses
from app.schemas.course import (
    CourseDetailOut,
    CourseEntryOut,
    CourseEntryPage,
    CourseEntryUpdateIn,
    CourseIn,
    CourseListOut,
    CourseOut,
    CourseStatsOut,
    CourseUpdateIn,
    CustomEntryIn,
    EntryFilter,
    EntrySort,
    FromBankIn,
    ImportCommitOut,
    ImportIn,
    ImportPreviewOut,
    ReorderIn,
    StudySessionIn,
    StudySessionOut,
)
from app.services import course_service, study_service

router = APIRouter(prefix="/courses", tags=["Khóa học của tôi"])

AUTH = ("TOKEN_INVALID", "TOKEN_EXPIRED", "ACCOUNT_DISABLED")
NF = (*AUTH, "COURSE_NOT_FOUND")


@router.get("", response_model=CourseListOut, summary="Danh sách khóa học kèm thống kê tóm tắt", responses=error_responses(*AUTH))
async def list_courses(user: CurrentUser, session: DbSession, archived: bool = False):
    return await course_service.list_courses(session, user, archived)


@router.post("", response_model=CourseOut, status_code=status.HTTP_201_CREATED, summary="Tạo khóa học",
             responses=error_responses(*AUTH, "VALIDATION_ERROR", "COURSE_LIMIT_REACHED"))
async def create_course(data: CourseIn, user: CurrentUser, session: DbSession):
    return await course_service.create_course(session, user, data)


@router.get("/{course_id}", response_model=CourseDetailOut, summary="Chi tiết khóa học", responses=error_responses(*NF))
async def get_course(course_id: uuid.UUID, user: CurrentUser, session: DbSession):
    course = await course_service.get_course(session, user, course_id)
    stats = await course_service.course_stats(session, user, course_id)
    return {**CourseOut.model_validate(course).model_dump(), "stats": stats}


@router.patch("/{course_id}", response_model=CourseOut, summary="Sửa khóa học", responses=error_responses(*NF, "VALIDATION_ERROR"))
async def update_course(course_id: uuid.UUID, data: CourseUpdateIn, user: CurrentUser, session: DbSession):
    return await course_service.update_course(session, user, course_id, data)


@router.delete("/{course_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Xóa hẳn khóa học",
               description="Cần `?confirm=true`. Mục từ gốc và tiến độ học không bị xóa.",
               responses=error_responses(*NF, "CONFIRM_REQUIRED"))
async def delete_course(course_id: uuid.UUID, user: CurrentUser, session: DbSession, confirm: bool = False):
    await course_service.delete_course(session, user, course_id, confirm)


@router.post("/{course_id}/archive", response_model=CourseOut, summary="Lưu trữ khóa học (ẩn khỏi danh sách đang học)",
             responses=error_responses(*NF, "COURSE_LIMIT_REACHED"))
async def archive_course(course_id: uuid.UUID, user: CurrentUser, session: DbSession):
    return await course_service.set_archived(session, user, course_id, True)


@router.post("/{course_id}/restore", response_model=CourseOut, summary="Bỏ lưu trữ khóa học",
             description="Đã có đủ số khóa đang học (COURSE_MAX_ACTIVE) thì trả COURSE_LIMIT_REACHED.",
             responses=error_responses(*NF, "COURSE_LIMIT_REACHED"))
async def restore_course(course_id: uuid.UUID, user: CurrentUser, session: DbSession):
    return await course_service.set_archived(session, user, course_id, False)


@router.get("/{course_id}/stats", response_model=CourseStatsOut, summary="Thống kê khóa học", responses=error_responses(*NF))
async def course_stats(course_id: uuid.UUID, user: CurrentUser, session: DbSession):
    return await course_service.course_stats(session, user, course_id)


@router.get("/{course_id}/entries", response_model=CourseEntryPage, summary="Danh sách từ trong khóa học",
            responses=error_responses(*NF, "VALIDATION_ERROR"))
async def list_entries(
    course_id: uuid.UUID,
    user: CurrentUser,
    session: DbSession,
    q: Annotated[str | None, Query(max_length=100)] = None,
    filter: EntryFilter = "all",
    sort: EntrySort = "added",
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 50,
):
    return await course_service.list_entries(session, user, course_id, q=q, status=filter, sort=sort, page=page, page_size=page_size)


@router.post("/{course_id}/entries/from-bank", response_model=CourseEntryOut, status_code=status.HTTP_201_CREATED,
             summary="Thêm từ có sẵn (kho hệ thống hoặc từ tự tạo của mình) vào khóa học",
             responses=error_responses(*NF, "ENTRY_NOT_FOUND", "DUPLICATE_IN_COURSE", "WORD_LIMIT_REACHED"))
async def add_from_bank(course_id: uuid.UUID, data: FromBankIn, user: CurrentUser, session: DbSession):
    return await course_service.add_from_bank(session, user, course_id, data.entry_id, data.personal_note)


@router.post("/{course_id}/entries/custom", response_model=CourseEntryOut, status_code=status.HTTP_201_CREATED,
             summary="Tự tạo từ mới và thêm vào khóa học",
             description="Kho đã có từ cùng chữ thì trả SYSTEM_ENTRY_EXISTS kèm `details.suggestions`; gửi `force: true` để vẫn tạo từ riêng.",
             responses=error_responses(*NF, "VALIDATION_ERROR", "SYSTEM_ENTRY_EXISTS", "CUSTOM_ENTRY_EXISTS", "DUPLICATE_IN_COURSE", "WORD_LIMIT_REACHED"))
async def create_custom(course_id: uuid.UUID, data: CustomEntryIn, user: CurrentUser, session: DbSession):
    return await course_service.create_custom_entry(session, user, course_id, data)


@router.post("/{course_id}/entries/reorder", status_code=status.HTTP_204_NO_CONTENT, summary="Sắp xếp lại thứ tự từ",
             responses=error_responses(*NF, "VALIDATION_ERROR"))
async def reorder(course_id: uuid.UUID, data: ReorderIn, user: CurrentUser, session: DbSession):
    await course_service.reorder(session, user, course_id, data.entry_ids)


@router.patch("/{course_id}/entries/{entry_id}", response_model=CourseEntryOut, summary="Sửa từ trong khóa học",
              description="Ghi chú, gắn sao sửa được với mọi từ. Nội dung (từ, nghĩa, phiên âm…) chỉ sửa được với từ tự tạo của mình.",
              responses=error_responses(*NF, "VALIDATION_ERROR", "ENTRY_NOT_FOUND", "ENTRY_NOT_OWNED", "CUSTOM_ENTRY_EXISTS"))
async def update_entry(course_id: uuid.UUID, entry_id: int, data: CourseEntryUpdateIn, user: CurrentUser, session: DbSession):
    return await course_service.update_course_entry(session, user, course_id, entry_id, data)


@router.delete("/{course_id}/entries/{entry_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Bỏ từ khỏi khóa học",
               description="Không xóa mục từ gốc và tiến độ học.", responses=error_responses(*NF, "ENTRY_NOT_FOUND"))
async def remove_entry(course_id: uuid.UUID, entry_id: int, user: CurrentUser, session: DbSession):
    await course_service.remove_from_course(session, user, course_id, entry_id)


@router.post("/{course_id}/import/preview", response_model=ImportPreviewOut, summary="Xem trước nhập hàng loạt (chưa lưu)",
             responses=error_responses(*NF, "VALIDATION_ERROR", "IMPORT_INVALID"))
async def import_preview(course_id: uuid.UUID, data: ImportIn, user: CurrentUser, session: DbSession):
    return await course_service.import_preview(session, user, course_id, data.text, data.format)


@router.post("/{course_id}/import/commit", response_model=ImportCommitOut, summary="Lưu nhập hàng loạt (một transaction)",
             description="Server phân loại lại văn bản, không dùng kết quả xem trước do client gửi. `skip_lines`: các dòng người dùng bỏ chọn.",
             responses=error_responses(*NF, "VALIDATION_ERROR", "IMPORT_INVALID"))
async def import_commit(course_id: uuid.UUID, data: ImportIn, user: CurrentUser, session: DbSession):
    return await course_service.import_commit(session, user, course_id, data.text, data.format, data.skip_lines)


@router.post("/{course_id}/study-sessions", response_model=StudySessionOut, status_code=status.HTTP_201_CREATED,
             summary="Bắt đầu phiên học", dependencies=[DailyCheckDone],
             description="Câu hỏi gửi xuống không kèm đáp án. Chế độ: learn, review, quick, hard, test.",
             responses=error_responses(*NF, "VALIDATION_ERROR", "NOTHING_TO_STUDY", "DAILY_CHECK_REQUIRED"))
async def start_session(course_id: uuid.UUID, data: StudySessionIn, user: CurrentUser, session: DbSession):
    return await study_service.build_study_session(session, user, course_id, data.mode, data.limit, data.entry_ids)
