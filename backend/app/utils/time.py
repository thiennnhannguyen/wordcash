"""
Xử lý ngày giờ theo múi giờ người dùng (quan trọng cho Cửa Ải và streak).

"Ngày" của người học bắt đầu từ 0 giờ (nửa đêm) theo `users.timezone` (IANA, vd. Asia/Ho_Chi_Minh), tính bằng zoneinfo nên
đúng cả ngày đổi giờ mùa hè (ngày đó có thể dài 23 hoặc 25 giờ).
"""

from datetime import UTC, date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from app.core import clock
from app.core.config import settings


def _zone(user_or_tz) -> ZoneInfo:
    name = user_or_tz if isinstance(user_or_tz, str) else (getattr(user_or_tz, "timezone", None) or settings.DEFAULT_TIMEZONE)
    return ZoneInfo(name)


def local_date(user, at: datetime | None = None) -> date:
    """Ngày theo múi giờ của người học tại thời điểm `at` (mặc định clock.now())."""
    return (at or clock.now()).astimezone(_zone(user)).date()


def day_bounds(user, day: date) -> tuple[datetime, datetime]:
    """[bắt đầu, kết thúc) của ngày `day` theo giờ địa phương, đổi sang UTC."""
    zone = _zone(user)
    start = datetime.combine(day, time.min, tzinfo=zone)
    end = datetime.combine(day + timedelta(days=1), time.min, tzinfo=zone)
    return start.astimezone(UTC), end.astimezone(UTC)
