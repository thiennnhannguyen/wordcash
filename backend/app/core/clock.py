"""
Đồng hồ dùng chung: MỌI chỗ cần "bây giờ" trong luật game gọi `clock.now()`, không gọi `datetime.now()` trực tiếp.

- `now()`: thời điểm hiện tại (UTC, có múi giờ). Thứ tự ưu tiên: giờ ghi đè của request (header `X-Debug-Now`, chỉ khi
  `settings.debug_time_enabled`, tức ENV development/e2e) → giờ cố định trong test (`freeze`) → giờ thật.
- `real_now()`: luôn là giờ thật. CHỈ dùng cho bảo mật (ký/kiểm tra JWT, hạn refresh token, phiên đăng nhập), để header
  ghi đè giờ không bao giờ làm lệch hạn token.
- Ở production header `X-Debug-Now` bị bỏ qua hoàn toàn (`DebugNowMiddleware` không đọc header).
"""

from collections.abc import Iterator
from contextlib import contextmanager
from contextvars import ContextVar
from datetime import UTC, datetime

_request_now: ContextVar[datetime | None] = ContextVar("wc_request_now", default=None)
_frozen: datetime | None = None


def real_now() -> datetime:
    return datetime.now(UTC)


def now() -> datetime:
    return _request_now.get() or _frozen or real_now()


def parse_iso(value: str) -> datetime:
    """ISO 8601; thiếu múi giờ thì hiểu là UTC. Sai định dạng → ValueError."""
    at = datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
    return at if at.tzinfo else at.replace(tzinfo=UTC)


def set_request_now(at: datetime | None):
    """Đặt giờ cho request hiện tại (middleware). Trả token để `reset_request_now`."""
    return _request_now.set(at)


def reset_request_now(token) -> None:
    _request_now.reset(token)


def freeze(at: datetime | None) -> None:
    """Chỉ dùng trong test: cố định giờ toàn cục (None = bỏ cố định)."""
    global _frozen
    _frozen = at.astimezone(UTC) if at else None


@contextmanager
def frozen(at: datetime) -> Iterator[None]:
    previous = _frozen
    freeze(at)
    try:
        yield
    finally:
        freeze(previous)
