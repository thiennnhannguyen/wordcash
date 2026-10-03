"""
Kiểm tra server còn sống, kèm trạng thái kết nối PostgreSQL và Redis.
"""

from fastapi import APIRouter

from app.schemas.common import HealthOut
from app.services.system import health_status

router = APIRouter(tags=["Hệ thống"])


@router.get("/health", response_model=HealthOut, summary="Kiểm tra trạng thái server")
async def health():
    return await health_status()
