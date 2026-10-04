"""
Rank theo số từ đã thuộc (`mastered_count`, chỉ từ hệ thống) và trạng thái "lung lay".

Hàm thuần, không phụ thuộc DB (services/stats_service.py gọi và lưu kết quả). Mốc lấy từ settings.RANK_THRESHOLDS:
Tân Binh 0 · Đồng 100 · Bạc 300 · Vàng 600 · Bạch Kim 1.000 · Kim Cương 2.000 · Cao Thủ 3.500 · Huyền Thoại 5.000.

Luật (`evaluate`):
- Số từ đủ cho rank cao hơn rank hiện tại → lên rank ngay, hết lung lay. Mỗi rank lần ĐẦU TIÊN đạt (cao hơn `highest`) được
  liệt kê trong `first_reached` để cấp lượt quay đặc biệt (lên lại rank cũ sau khi bị hạ thì không cấp lần nữa).
- Rơi dưới mốc rank hiện tại → "lung lay" RANK_GRACE_DAYS ngày (`shaky_deadline`), rank chưa đổi.
- Gỡ lại kịp (số từ ≥ mốc rank hiện tại) trước hạn → hết lung lay.
- Quá hạn mà vẫn dưới mốc → hạ xuống rank đúng theo số từ lúc đó (`demoted`).
"""

from dataclasses import dataclass, field, replace
from datetime import datetime, timedelta

from app.core.config import settings


def ranks() -> list[str]:
    return list(settings.RANK_THRESHOLDS)


def index_of(code: str) -> int:
    return ranks().index(code)


def threshold(code: str) -> int:
    return settings.RANK_THRESHOLDS[code]


def rank_for(mastered: int) -> str:
    """Rank cao nhất có mốc ≤ số từ đã thuộc."""
    best = ranks()[0]
    for code, minimum in settings.RANK_THRESHOLDS.items():
        if mastered >= minimum:
            best = code
    return best


def next_rank(code: str) -> str | None:
    order = ranks()
    i = order.index(code)
    return order[i + 1] if i + 1 < len(order) else None


def progress(code: str, mastered: int) -> dict:
    """Tiến độ tới rank kế tiếp: {next, current_min, next_min, remaining}."""
    nxt = next_rank(code)
    return {
        "next": nxt,
        "current_min": threshold(code),
        "next_min": threshold(nxt) if nxt else None,
        "remaining": max(threshold(nxt) - mastered, 0) if nxt else 0,
    }


@dataclass(frozen=True)
class RankState:
    current: str
    highest: str
    shaky_since: datetime | None = None
    shaky_deadline: datetime | None = None


@dataclass(frozen=True)
class RankChange:
    state: RankState
    previous: str
    first_reached: list[str] = field(default_factory=list)  # rank lần đầu đạt → lượt quay đặc biệt
    became_shaky: bool = False
    recovered: bool = False
    demoted: bool = False

    @property
    def changed(self) -> bool:
        return self.state.current != self.previous

    @property
    def ranked_up(self) -> bool:
        return index_of(self.state.current) > index_of(self.previous)


def evaluate(state: RankState, mastered: int, now: datetime) -> RankChange:
    target = rank_for(mastered)
    cur, top = index_of(state.current), index_of(state.highest)
    t = index_of(target)

    if t > cur:
        first = [code for code in ranks()[top + 1: t + 1]]
        new = RankState(current=target, highest=ranks()[max(top, t)])
        return RankChange(new, state.current, first_reached=first, recovered=state.shaky_deadline is not None)

    if t == cur:
        if state.shaky_deadline is not None:
            return RankChange(replace(state, shaky_since=None, shaky_deadline=None), state.current, recovered=True)
        return RankChange(state, state.current)

    # t < cur: dưới mốc rank hiện tại
    if state.shaky_deadline is None:
        shaky = replace(state, shaky_since=now, shaky_deadline=now + timedelta(days=settings.RANK_GRACE_DAYS))
        return RankChange(shaky, state.current, became_shaky=True)
    if now >= state.shaky_deadline:
        return RankChange(RankState(current=target, highest=state.highest), state.current, demoted=True)
    return RankChange(state, state.current)
