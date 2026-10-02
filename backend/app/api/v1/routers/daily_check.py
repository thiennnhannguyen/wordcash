"""
Cửa Ải Hôm Nay: kiểm tra đã làm hôm nay chưa, lấy 2–5 từ, nộp kết quả.

TODO: chưa có endpoint.
"""

from fastapi import APIRouter

router = APIRouter(prefix="/daily-check", tags=["Cửa Ải Hôm Nay"])
