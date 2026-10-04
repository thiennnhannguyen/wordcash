"""
Ôn tập chung: danh sách từ đến hạn ôn (từ hệ thống + từ tự tạo của chính mình), bắt đầu phiên ôn.
Nộp bài qua POST /study-sessions/{sid}/answers. Nghiệp vụ: services/review_service.py.
"""

from fastapi import APIRouter, status

from app.api.deps import CurrentUser, DailyCheckDone, DbSession
from app.api.responses import error_responses
from app.core import clock
from app.schemas.academy import AcademySessionOut, ReviewDueOut, ReviewSessionIn
from app.services import review_service

router = APIRouter(prefix="/review", tags=["Ôn tập"])


@router.get("/due", response_model=ReviewDueOut, summary="Từ đến hạn ôn",
            responses=error_responses("TOKEN_INVALID", "TOKEN_EXPIRED"))
async def due(user: CurrentUser, session: DbSession):
    return await review_service.due_overview(session, user, clock.now())


@router.post("/sessions", response_model=AcademySessionOut, status_code=status.HTTP_201_CREATED, summary="Bắt đầu phiên ôn",
             dependencies=[DailyCheckDone],
             responses=error_responses("TOKEN_INVALID", "TOKEN_EXPIRED", "DAILY_CHECK_REQUIRED", "NOTHING_TO_STUDY"))
async def start(user: CurrentUser, session: DbSession, data: ReviewSessionIn | None = None):
    return await review_service.start_review(session, user, clock.now(), data.limit if data else None)
