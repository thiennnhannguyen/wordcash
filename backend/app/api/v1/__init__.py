"""
API phiên bản 1: gom router dưới prefix /api/v1.
"""

from fastapi import APIRouter

from app.schemas.common import ErrorOut

from app.api.v1.routers import (
    academy,
    arena,
    daily_check,
    health,
    leaderboard,
    mascots,
    placement,
    profile,
    review,
)

# 422 dùng định dạng lỗi chung {"error": {...}} thay cho mẫu mặc định của FastAPI
api_router = APIRouter(prefix="/api/v1", responses={422: {"model": ErrorOut, "description": "VALIDATION_ERROR"}})
for module in (health, academy, review, daily_check, placement, profile, mascots, leaderboard, arena):
    api_router.include_router(module.router)
