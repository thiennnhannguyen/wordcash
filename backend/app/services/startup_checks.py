"""
Kiểm tra lúc khởi động backend (gọi trong `lifespan` của app/main.py).

- Chỉ khi ENV=production: database không được có tài khoản mẫu dev (username bắt đầu bằng `dev_`, do
  `seeds.seed_dev_accounts` tạo). Phát hiện thì ghi log ERROR kèm số lượng và vài username, KHÔNG dừng app.
  Lỗi khi truy vấn (DB chưa sẵn sàng…) chỉ ghi cảnh báo. Không log email hay dữ liệu cá nhân khác.
- Cùng câu kiểm tra ở `docs/deploy-checklist.md`.
"""

import logging

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.config import settings
from app.models import User

logger = logging.getLogger("wordclash.startup")

DEV_PREFIX = "dev_"
SAMPLE_LIMIT = 10


def _is_dev_account():
    # `_` là ký tự đại diện của LIKE nên phải thoát
    return User.username.like(DEV_PREFIX.replace("_", r"\_") + "%", escape="\\")


async def find_dev_accounts(session: AsyncSession) -> tuple[int, list[str]]:
    """(số tài khoản có username bắt đầu bằng `dev_`, tối đa SAMPLE_LIMIT username đầu tiên)."""
    count = await session.scalar(select(func.count()).select_from(User).where(_is_dev_account())) or 0
    names = list(await session.scalars(select(User.username).where(_is_dev_account()).order_by(User.username).limit(SAMPLE_LIMIT)))
    return count, names


async def check_no_dev_accounts(session_factory: async_sessionmaker) -> int | None:
    """Production: log ERROR nếu có tài khoản `dev_`. Trả số tài khoản tìm thấy (None khi bỏ qua hoặc không truy vấn được)."""
    if not settings.is_production:
        return None
    try:
        async with session_factory() as session:
            count, names = await find_dev_accounts(session)
    except Exception as exc:  # noqa: BLE001 - kiểm tra phụ, không được chặn khởi động
        logger.warning("Không kiểm tra được tài khoản mẫu dev_ lúc khởi động: %s", type(exc).__name__)
        return None
    if count:
        logger.error(
            "Database production có %d tài khoản mẫu (username bắt đầu bằng %r): %s. Xóa trước khi mở cho người dùng "
            "(xem docs/deploy-checklist.md).", count, DEV_PREFIX, ", ".join(names),
        )
    return count
