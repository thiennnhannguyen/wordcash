"""
Nộp câu trả lời của phiên học (Khóa học của tôi). Server chấm, cập nhật SRS và trạng thái thuộc từ.
"""

import uuid

from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.api.responses import error_responses
from app.schemas.course import AnswersIn, AnswersOut
from app.services import study_service

router = APIRouter(prefix="/study-sessions", tags=["Khóa học của tôi"])


@router.post(
    "/{session_id}/answers",
    response_model=AnswersOut,
    summary="Nộp câu trả lời",
    description="Gửi một hoặc nhiều câu. Đáp án đúng trả về ngay sau khi chấm, trừ chế độ test (chỉ trả khi đã nộp hết). "
    "Gửi lại câu đã chấm thì nhận lại kết quả cũ.",
    responses=error_responses("TOKEN_INVALID", "TOKEN_EXPIRED", "VALIDATION_ERROR", "STUDY_SESSION_NOT_FOUND",
                              "STUDY_SESSION_EXPIRED", "STUDY_SESSION_FINISHED"),
)
async def submit_answers(session_id: uuid.UUID, data: AnswersIn, user: CurrentUser, session: DbSession):
    return await study_service.submit_answers(session, user, session_id, data.answers)
