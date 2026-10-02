"""
API phiên bản 1: gom router dưới prefix /api/v1.
"""

from fastapi import APIRouter

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

api_router = APIRouter(prefix="/api/v1")
for module in (health, academy, review, daily_check, placement, profile, mascots, leaderboard, arena):
    api_router.include_router(module.router)
