"""
Streak (chuỗi ngày) theo Cửa Ải Hôm Nay. Hàm thuần; ngày là ngày địa phương của người học (utils/time.py).

Luật:
- Cửa Ải đúng hết → streak +1.
- Có câu sai → streak giữ nguyên (không tăng, không mất).
- Ngày được miễn Cửa Ải (dưới 2 từ hệ thống đã học) → giữ nguyên, không làm mất streak.
- Ba trường hợp trên đều đánh dấu ngày đó là "còn sống" (`last_date`). Bỏ trọn một ngày (không có ngày "còn sống" nào giữa
  `last_date` và hôm nay) → streak về 0. Việc về 0 tính "lười": lúc đọc stats hoặc lúc làm Cửa Ải ngày kế tiếp.
- Streak chạm bội số của STREAK_SPIN_EVERY (7, 14, …) → +1 lượt quay thường (`milestone`).
"""

from dataclasses import dataclass
from datetime import date, timedelta
from enum import StrEnum

from app.core.config import settings


class DayOutcome(StrEnum):
    PASSED = "passed"
    PARTIAL = "partial"
    EXEMPT = "exempt"


@dataclass(frozen=True)
class StreakState:
    current: int = 0
    best: int = 0
    last_date: date | None = None


@dataclass(frozen=True)
class StreakChange:
    state: StreakState
    previous: int
    reset: bool = False  # bị về 0 vì bỏ một ngày
    milestone: int | None = None  # chạm bội số của STREAK_SPIN_EVERY


def is_broken(state: StreakState, today: date) -> bool:
    """Có ngày nào bị bỏ trọn giữa ngày "còn sống" gần nhất và hôm nay."""
    return state.last_date is not None and state.last_date < today - timedelta(days=1)


def decay(state: StreakState, today: date) -> StreakChange:
    """Đánh giá lười: đã bỏ một ngày thì streak về 0 (không đổi last_date)."""
    if is_broken(state, today) and state.current:
        return StreakChange(StreakState(0, state.best, state.last_date), state.current, reset=True)
    return StreakChange(state, state.current)


def apply_day(state: StreakState, today: date, outcome: DayOutcome) -> StreakChange:
    """Kết quả Cửa Ải (hoặc miễn) của ngày `today`. Gọi lại cùng ngày thì không đổi gì."""
    if state.last_date == today:
        return StreakChange(state, state.current)
    decayed = decay(state, today)
    current = decayed.state.current
    milestone = None
    if outcome == DayOutcome.PASSED:
        current += 1
        if current % settings.STREAK_SPIN_EVERY == 0:
            milestone = current
    new = StreakState(current=current, best=max(state.best, current), last_date=today)
    return StreakChange(new, state.current, reset=decayed.reset, milestone=milestone)


def week_days(today: date) -> list[date]:
    """7 ngày của tuần chứa `today`, Thứ Hai → Chủ Nhật."""
    monday = today - timedelta(days=today.weekday())
    return [monday + timedelta(days=i) for i in range(7)]
