"""
Kiểm tra server còn sống, kèm trạng thái kết nối PostgreSQL và Redis.
"""

from fastapi import APIRouter

from app.schemas.common import ApiResponse, HealthOut
from app.services.system import health_status
from app.utils.responses import success_response

router = APIRouter(tags=["Hệ thống"])


@router.get("/health", response_model=ApiResponse[HealthOut], summary="Kiểm tra trạng thái server")
async def health():
    return success_response(await health_status(), "WordClash API is running successfully!")
