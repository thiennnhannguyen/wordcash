"""
Lượt quay được cấp theo số từ đã thuộc (hàm thuần). Ghi sổ và cộng lượt nằm ở services/stats_service.py.

- Lượt thường theo mốc: mỗi SPIN_EVERY_N_WORDS (50) từ thuộc, nhưng chỉ khi VƯỢT mốc cao nhất từng đạt
  (`max_spin_milestone`): mất từ (Cửa Ải) rồi thuộc lại không cấp thêm. Nhảy qua nhiều mốc một lúc thì cấp đủ từng mốc.
- Lượt đặc biệt: lần đầu lên mỗi rank (services/rank.py), lần đầu thắng Boss mỗi cấp. Lượt streak: services/streak.py.
"""

from app.core.config import settings


def new_milestones(max_milestone: int, mastered: int, step: int | None = None) -> list[int]:
    """Các mốc (bội số của step) trong khoảng (max_milestone, mastered]."""
    step = step or settings.SPIN_EVERY_N_WORDS
    reached = (mastered // step) * step
    return list(range(max_milestone + step, reached + 1, step)) if reached > max_milestone else []


def next_spin_progress(mastered: int, max_milestone: int, step: int | None = None) -> dict:
    """Tiến độ tới lượt quay kế tiếp ("x/50"): mốc kế = mốc cao nhất từng đạt + step.

    `remaining` = số từ thuộc còn thiếu tới mốc kế (đã mất từ thì có thể lớn hơn step); `current` = step − remaining (≥ 0).
    """
    step = step or settings.SPIN_EVERY_N_WORDS
    nxt = max_milestone + step
    remaining = max(nxt - mastered, 0)
    return {"current": max(step - remaining, 0), "target": step, "remaining": remaining, "next_milestone": nxt}
