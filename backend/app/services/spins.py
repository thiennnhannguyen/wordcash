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
    """Tiến độ tới lượt quay kế tiếp ("x/50"): tính từ mốc cao nhất từng đạt."""
    step = step or settings.SPIN_EVERY_N_WORDS
    return {"current": min(max(mastered - max_milestone, 0), step), "target": step, "next_milestone": max_milestone + step}
