"""
Xác định từ 'đã thuộc' (đúng ở mức 3+ trong 3 ngày khác nhau), xử lý khi quên từ.

Hàm thuần, không phụ thuộc DB. Ngày (`today`) tính theo múi giờ của người học, do nơi gọi truyền vào.
- Trả lời bất kỳ: `new` → `learning`; `forgotten` → `learning` (quay lại học khi ôn).
- Đúng ở mức ≥ MASTERY_MIN_LEVEL vào một ngày chưa được tính: `strong_days` +1.
- `learning` và `strong_days` ≥ MASTERY_MIN_DAYS → `mastered`.
- Sai khi đang `mastered` trong lúc học/ôn: giữ `mastered` (SRS tự đưa từ về ôn sớm). Chỉ Cửa Ải Hôm Nay chuyển từ sang
  `forgotten` qua `forget()`, và khi đó cần lại đủ số ngày đúng mới thuộc lại.
- Bộ đếm số từ đã thuộc: từ hệ thống cộng vào `mastered_count` (rank, lượt quay); từ tự tạo chỉ cộng `custom_mastered_count`.
"""

from dataclasses import dataclass, replace
from datetime import date

from app.core.config import settings
from app.models.progress import EntryState


@dataclass(frozen=True)
class MasteryState:
    status: EntryState
    strong_days: int = 0
    last_strong_day: date | None = None


@dataclass(frozen=True)
class MasteryChange:
    state: MasteryState
    became_mastered: bool = False
    lost_mastered: bool = False


def apply_answer(state: MasteryState, level: int, correct: bool, today: date) -> MasteryChange:
    status = state.status
    if status in (EntryState.NEW, EntryState.FORGOTTEN):
        status = EntryState.LEARNING

    strong_days, last_day = state.strong_days, state.last_strong_day
    if correct and level >= settings.MASTERY_MIN_LEVEL and last_day != today:
        strong_days, last_day = strong_days + 1, today

    became = False
    if status == EntryState.LEARNING and strong_days >= settings.MASTERY_MIN_DAYS:
        status, became = EntryState.MASTERED, True
    return MasteryChange(MasteryState(status, strong_days, last_day), became_mastered=became)


def forget(state: MasteryState) -> MasteryChange:
    """Cửa Ải Hôm Nay: trả lời sai → `forgotten`, phải thuộc lại từ đầu."""
    lost = state.status == EntryState.MASTERED
    return MasteryChange(replace(state, status=EntryState.FORGOTTEN, strong_days=0, last_strong_day=None), lost_mastered=lost)


def counter_deltas(change: MasteryChange, is_custom: bool) -> tuple[int, int]:
    """(thay đổi mastered_count, thay đổi custom_mastered_count). Từ tự tạo KHÔNG bao giờ làm đổi mastered_count."""
    delta = (1 if change.became_mastered else 0) - (1 if change.lost_mastered else 0)
    return (0, delta) if is_custom else (delta, 0)
