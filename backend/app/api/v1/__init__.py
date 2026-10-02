"""
API phiên bản 1: gom router dưới prefix /api/v1.
"""

from fastapi import APIRouter

from app.schemas.common import ErrorResponse

from app.api.v1.routers import (
    academy,
    arena,
    auth,
    daily_check,
    health,
    leaderboard,
    mascots,
    placement,
    profile,
    review,
)

# 422 dùng cùng định dạng lỗi chung thay cho mẫu mặc định của FastAPI
api_router = APIRouter(prefix="/api/v1", responses={422: {"model": ErrorResponse, "description": "Dữ liệu không hợp lệ"}})
for module in (health, auth, academy, review, daily_check, placement, profile, mascots, leaderboard, arena):
    api_router.include_router(module.router)
