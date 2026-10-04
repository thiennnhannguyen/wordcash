"""
Nộp câu trả lời của mọi phiên học (Khóa học của tôi, Học Viện, Ôn tập). Server chấm, cập nhật SRS, trạng thái thuộc từ, mở khóa,
con dấu, lượt quay, rank. Cần đã vượt Cửa Ải hôm nay. Idempotent: nộp lại trả kết quả cũ.
"""

import uuid

from fastapi import APIRouter

from app.api.deps import CurrentUser, DailyCheckDone, DbSession
from app.api.responses import error_responses
from app.schemas.academy import StudyAnswersOut
from app.schemas.course import AnswersIn
from app.services import study_service

router = APIRouter(prefix="/study-sessions", tags=["Phiên học"])


@router.post(
    "/{session_id}/answers",
    response_model=StudyAnswersOut,
    dependencies=[DailyCheckDone],
    summary="Nộp câu trả lời",
    description="Gửi một hoặc nhiều câu. Đáp án đúng trả về ngay sau khi chấm, trừ chế độ test (kiểm tra, Boss: chỉ trả khi đã nộp hết). "
    "Nộp câu cuối: `summary` (điểm), `outcome` (mở khóa, con dấu, Boss), `rewards` (lượt quay, rank). Gửi lại thì nhận kết quả cũ.",
    responses=error_responses("TOKEN_INVALID", "TOKEN_EXPIRED", "VALIDATION_ERROR", "STUDY_SESSION_NOT_FOUND",
                              "STUDY_SESSION_EXPIRED", "SESSION_FINISHED", "DAILY_CHECK_REQUIRED"),
)
async def submit_answers(session_id: uuid.UUID, data: AnswersIn, user: CurrentUser, session: DbSession):
    return await study_service.submit_answers(session, user, session_id, data.answers)
