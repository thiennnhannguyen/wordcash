"""
Bộ sưu tập của tôi và vòng quay: xem bộ sưu tập, tỉ lệ công khai, quay thẻ, đổi mảnh, đánh dấu đã xem.

- POST /collection/spins và /collection/exchange bắt buộc header `Idempotency-Key` (UUID do client sinh cho mỗi lần bấm,
  giữ nguyên khi thử lại vì lỗi mạng): gửi lại cùng key trả đúng kết quả cũ, không tiêu thêm; cùng key khác body →
  IDEMPOTENCY_KEY_REUSED. Quay thẻ giới hạn SPIN_RATE_LIMIT_PER_MINUTE request mỗi phút mỗi người.
- Kết quả quay do server quyết định (secrets.SystemRandom) và đã ghi DB trước khi trả về.
- Không có bất kỳ route mua lượt quay hay mảnh nào. Nghiệp vụ: services/collection_service.py, services/gacha.py.
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Header

from app.api.deps import CurrentUser, DbSession, RedisClient
from app.api.responses import error_responses
from app.core import clock
from app.core.errors import AppError
from app.schemas.collection import CollectionOut, ExchangeIn, ExchangeOut, RatesOut, SeenIn, SeenOut, SpinIn, SpinOut
from app.services import collection_service, rate_limit

router = APIRouter(prefix="/collection", tags=["Bộ Sưu Tập"])

AUTH = ("TOKEN_INVALID", "TOKEN_EXPIRED")
IDEMPOTENCY = ("IDEMPOTENCY_KEY_REQUIRED", "IDEMPOTENCY_KEY_REUSED")
IdempotencyKey = Annotated[str | None, Header(alias="Idempotency-Key", description="UUID do client sinh cho mỗi lần bấm")]


def _key(value: str | None) -> str:
    if not value:
        raise AppError("IDEMPOTENCY_KEY_REQUIRED")
    try:
        return str(uuid.UUID(value))
    except ValueError:
        raise AppError("IDEMPOTENCY_KEY_REQUIRED", message="Idempotency-Key phải là một UUID.") from None


@router.get("", response_model=CollectionOut, summary="Bộ sưu tập của tôi", responses=error_responses(*AUTH))
async def my_collection(user: CurrentUser, session: DbSession):
    return await collection_service.get_collection(session, user, clock.now())


@router.get("/rates", response_model=RatesOut, summary="Tỉ lệ quay công khai",
            description="Tỉ lệ cả hai loại lượt, PITY_EPIC, bộ đếm pity hiện tại, số con có thể ra theo độ hiếm với vùng đã mở, "
            "bảng mảnh nhận khi trùng và giá đổi mảnh.", responses=error_responses(*AUTH))
async def rates(user: CurrentUser, session: DbSession):
    return await collection_service.get_rates(session, user, clock.now())


@router.post("/spins", response_model=SpinOut, summary="Mở thẻ (1–10 lượt cùng loại)",
             responses=error_responses(*AUTH, *IDEMPOTENCY, "NO_SPINS_LEFT", "INVALID_SPIN_COUNT", "TOO_MANY_ATTEMPTS", "VALIDATION_ERROR"))
async def spin(data: SpinIn, user: CurrentUser, session: DbSession, redis: RedisClient, idempotency_key: IdempotencyKey = None):
    key = _key(idempotency_key)
    await rate_limit.hit_spin(redis, user.id)
    return await collection_service.spin(session, user, data.kind, data.count, key, clock.now())


@router.post("/exchange", response_model=ExchangeOut, summary="Đổi mảnh lấy linh vật chưa có",
             responses=error_responses(*AUTH, *IDEMPOTENCY, "MASCOT_NOT_FOUND", "MASCOT_NOT_EXCHANGEABLE", "MASCOT_ALREADY_OWNED",
                                       "NOT_ENOUGH_SHARDS", "VALIDATION_ERROR"))
async def exchange(data: ExchangeIn, user: CurrentUser, session: DbSession, idempotency_key: IdempotencyKey = None):
    return await collection_service.exchange(session, user, data.mascot_id, _key(idempotency_key), clock.now())


@router.post("/seen", response_model=SeenOut, summary="Đánh dấu đã xem (tắt nhãn MỚI)", responses=error_responses(*AUTH, "VALIDATION_ERROR"))
async def seen(data: SeenIn, user: CurrentUser, session: DbSession):
    return {"updated": await collection_service.mark_seen(session, user, data.mascot_ids)}
