"""
Cửa Ải Hôm Nay: lấy Cửa Ải của ngày (tạo ở lần gọi đầu tiên trong ngày theo múi giờ người dùng), nộp câu trả lời.

Câu hỏi không kèm đáp án; câu đã chấm mới lộ đáp án, phiên âm, ví dụ. Nghiệp vụ: services/daily_check_service.py.
"""

from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.api.responses import error_responses
from app.core import clock
from app.schemas.academy import DailyCheckAnswersIn, DailyCheckAnswersOut, DailyCheckOut
from app.services import daily_check_service

router = APIRouter(prefix="/daily-check", tags=["Cửa Ải Hôm Nay"])


@router.get("/today", response_model=DailyCheckOut, summary="Cửa Ải hôm nay",
            description="`status`: pending | passed | partial | exempt (dưới 2 từ hệ thống đã học: được miễn, không tính streak).",
            responses=error_responses("TOKEN_INVALID", "TOKEN_EXPIRED"))
async def today(user: CurrentUser, session: DbSession):
    return await daily_check_service.today(session, user, clock.now())


@router.post("/today/answers", response_model=DailyCheckAnswersOut, summary="Nộp câu trả lời Cửa Ải",
             description="Gửi từng câu hoặc cả lượt. Sai: từ thành `forgotten`, trừ số từ đã thuộc. Xong câu cuối: cập nhật streak. "
             "Nộp lại câu đã chấm trả kết quả cũ.",
             responses=error_responses("TOKEN_INVALID", "TOKEN_EXPIRED", "VALIDATION_ERROR", "DAILY_CHECK_DONE"))
async def submit(data: DailyCheckAnswersIn, user: CurrentUser, session: DbSession):
    return await daily_check_service.submit(session, user, data.answers, clock.now())
