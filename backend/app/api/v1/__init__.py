"""
API phiên bản 1: gom router dưới prefix /api/v1.
"""

from fastapi import APIRouter

from app.core.config import settings
from app.schemas.common import ErrorOut

from app.api.v1.routers import (
    academy,
    arena,
    auth,
    bank,
    collection,
    courses,
    daily_check,
    dev,
    health,
    leaderboard,
    mascots,
    me,
    placement,
    profile,
    review,
    study,
    users,
)

# 422 dùng định dạng lỗi chung {"error": {...}} thay cho mẫu mặc định của FastAPI
api_router = APIRouter(prefix="/api/v1", responses={422: {"model": ErrorOut, "description": "VALIDATION_ERROR"}})
for module in (health, auth, users, me, academy, review, daily_check, placement, profile, mascots, collection, leaderboard, arena, courses, study, bank):
    api_router.include_router(module.router)
# Công cụ dev/e2e (tới thẳng Trận Boss, khóa đáp án, cấp lượt quay, ép kết quả quay): KHÔNG có ở production
if settings.debug_time_enabled:
    api_router.include_router(dev.router)
