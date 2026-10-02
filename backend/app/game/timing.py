"""
Ghi thời điểm gửi/nhận trên server; sau này thêm đo ping để bù trễ.
Dùng time.monotonic() (không bị ảnh hưởng khi đổi giờ hệ thống); client không bao giờ tự báo thời gian trả lời.
"""

import time


def server_now() -> float:
    """Mốc thời gian đơn điệu của server (giây)."""
    return time.monotonic()


def elapsed_ms(started_at: float, now: float | None = None) -> int:
    """Số mili giây từ lúc gửi câu (`started_at` = server_now() khi phát round_start) tới lúc server nhận đáp án."""
    return int(((server_now() if now is None else now) - started_at) * 1000)
