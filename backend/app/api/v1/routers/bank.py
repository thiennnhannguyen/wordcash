"""
Tìm trong kho từ hệ thống (gợi ý khi gõ ở "Khóa học của tôi") và xóa từ tự tạo.

Chỉ trả từ hệ thống đã duyệt; từ tự tạo không bao giờ xuất hiện trong kết quả tìm kiếm của người khác.
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Query, status

from app.api.deps import CurrentUser, DbSession
from app.api.responses import error_responses
from app.schemas.course import BankEntryOut
from app.services import course_service

router = APIRouter(tags=["Khóa học của tôi"])

AUTH = ("TOKEN_INVALID", "TOKEN_EXPIRED", "ACCOUNT_DISABLED")


@router.get("/bank/search", response_model=list[BankEntryOut], summary="Tìm trong kho từ (tối đa 10 kết quả, có cấp CEFR)",
            description="Truyền `course_id` để biết từ nào đã có trong khóa học (`in_course`).",
            responses=error_responses(*AUTH, "VALIDATION_ERROR", "COURSE_NOT_FOUND"))
async def bank_search(
    user: CurrentUser,
    session: DbSession,
    q: Annotated[str, Query(min_length=1, max_length=100)],
    course_id: uuid.UUID | None = None,
):
    return await course_service.bank_search(session, user, q, course_id)


@router.delete("/custom-entries/{entry_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Xóa hẳn một từ tự tạo",
               description="Gỡ khỏi mọi khóa học và xóa tiến độ học của từ đó. Chỉ chủ sở hữu được xóa.",
               responses=error_responses(*AUTH, "ENTRY_NOT_FOUND", "ENTRY_NOT_OWNED"))
async def delete_custom_entry(entry_id: int, user: CurrentUser, session: DbSession):
    await course_service.delete_custom_entry(session, user, entry_id)
