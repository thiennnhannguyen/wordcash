"""
Số liệu công khai cho Landing: GET /public/stats (KHÔNG cần đăng nhập, cache 10 phút). Không chứa thông tin cá nhân.
Nghiệp vụ: services/public_stats.py.
"""

from fastapi import APIRouter

from app.api.deps import DbSession, RedisClient
from app.core.config import settings
from app.schemas.social import PublicStatsOut
from app.services import cache, public_stats

router = APIRouter(prefix="/public", tags=["Công khai"])


@router.get("/stats", response_model=PublicStatsOut, summary="Số liệu công khai (Landing)")
async def stats(session: DbSession, redis: RedisClient):
    return await cache.get_or_compute(redis, "public:stats", settings.PUBLIC_STATS_CACHE_SECONDS, lambda: public_stats.compute(session))
