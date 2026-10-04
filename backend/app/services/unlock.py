"""
Luật mở khóa Học Viện (hàm thuần). Áp dụng vào DB ở services/roadmap_service.py.

Thứ tự đã chốt: bài trong chặng và chặng trong cấp đều MỞ TUẦN TỰ; cấp sau chỉ mở khi thắng Boss cấp trước.
- Qua bài (≥ UNIT_PASS_RATE) → mở bài kế; qua bài cuối của chặng → mở bài tổng hợp chặng.
- Qua bài tổng hợp (≥ TOPIC_PASS_RATE) → chặng completed, đóng dấu địa danh, mở chặng kế (và bài đầu của chặng đó);
  xong chặng cuối → mở Trận Boss.
- Thắng Boss (≥ BOSS_PASS_RATE) → cấp completed, đóng dấu địa danh Boss, mở cấp kế (chặng 1, bài 1), +1 lượt quay đặc biệt.
- KHÔNG BAO GIỜ khóa lại: trạng thái chỉ đi lên locked → unlocked → completed (`upgrade`).
Số bài mỗi chặng không cố định.
"""

from app.core.config import settings
from app.models.academy import ProgressStatus

ORDER = [ProgressStatus.LOCKED, ProgressStatus.UNLOCKED, ProgressStatus.COMPLETED]


def upgrade(current: ProgressStatus | None, wanted: ProgressStatus) -> ProgressStatus:
    """Trạng thái mới không bao giờ thấp hơn trạng thái cũ."""
    if current is None:
        return wanted
    return max(current, wanted, key=ORDER.index)


def passed(correct: int, total: int, rate: float) -> bool:
    return total > 0 and correct / total >= rate - 1e-9


def unit_passed(correct: int, total: int) -> bool:
    return passed(correct, total, settings.UNIT_PASS_RATE)


def topic_passed(correct: int, total: int) -> bool:
    return passed(correct, total, settings.TOPIC_PASS_RATE)


def boss_passed(correct: int, total: int) -> bool:
    return passed(correct, total, settings.BOSS_PASS_RATE)


def next_in(ordered_ids: list[int], current_id: int) -> int | None:
    """Phần tử kế tiếp trong danh sách đã sắp thứ tự (bài trong chặng, chặng trong cấp, cấp trong lộ trình)."""
    i = ordered_ids.index(current_id)
    return ordered_ids[i + 1] if i + 1 < len(ordered_ids) else None


def topic_test_open(unit_statuses: list[ProgressStatus | None]) -> bool:
    """Bài tổng hợp chặng mở khi mọi bài của chặng đã completed (chặng phải có ít nhất một bài)."""
    return bool(unit_statuses) and all(s == ProgressStatus.COMPLETED for s in unit_statuses)


def boss_open(topic_statuses: list[ProgressStatus | None]) -> bool:
    return bool(topic_statuses) and all(s == ProgressStatus.COMPLETED for s in topic_statuses)


def weak_topics(accuracy: dict[int, tuple[int, int]], topic_order: list[int], count: int | None = None) -> list[int]:
    """Các chặng có tỉ lệ đúng thấp nhất trong Trận Boss. `accuracy`: {topic_id: (đúng, tổng)}. Hòa thì chặng trước đứng trước."""
    count = count or settings.BOSS_WEAK_TOPICS
    asked = [t for t in topic_order if accuracy.get(t, (0, 0))[1] > 0]
    asked.sort(key=lambda t: (accuracy[t][0] / accuracy[t][1], topic_order.index(t)))
    return asked[:count]
