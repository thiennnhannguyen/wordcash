"""
Hồ sơ: rank, số từ đã thuộc, streak, thẻ chứng nhận.

TODO: chưa có endpoint.
"""

from fastapi import APIRouter

router = APIRouter(prefix="/profile", tags=["Hồ sơ"])
