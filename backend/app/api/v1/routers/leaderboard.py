"""
Bảng xếp hạng theo số từ thuộc và theo thành tích đấu.

TODO: chưa có endpoint.
"""

from fastapi import APIRouter

router = APIRouter(prefix="/leaderboard", tags=["Bảng xếp hạng"])
