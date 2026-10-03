"""
Thuật toán lặp lại ngắt quãng (SM-2, sau nâng FSRS): tính ngày ôn tiếp theo cho từng từ.

Hàm thuần, không phụ thuộc DB. Biến thể SM-2 dùng ở WORDCLASH:
- Chất lượng câu trả lời `quality` 0–5 (SM-2): đúng ở mức 3–4 = 5, đúng ở mức 1–2 = 4, sai = 2.
- Nhớ được (quality ≥ 3): `repetitions` +1. Năm lần đầu dùng khoảng ôn tham khảo SRS_INTERVALS (1 → 3 → 7 → 16 → 35 ngày),
  sau đó khoảng ôn = khoảng trước × hệ số dễ `ease`.
- Ôn sớm (trả lời đúng khi chưa tới hạn, vd. ôn nhanh nhiều lần trong ngày): giữ nguyên lịch, chỉ lần ôn đúng hạn mới đẩy lịch.
- Quên (quality < 3): `repetitions` về 0, ôn lại sau 1 ngày (khoảng ngắn nhất), `lapses` +1.
- `ease` cập nhật theo công thức SM-2, không thấp hơn SRS_MIN_EASE.
"""

from dataclasses import dataclass
from datetime import datetime, timedelta

from app.core.config import settings


@dataclass(frozen=True)
class SrsState:
    ease: float
    interval_days: int
    repetitions: int
    due_at: datetime | None
    lapses: int = 0


def initial_state() -> SrsState:
    return SrsState(ease=settings.SRS_START_EASE, interval_days=0, repetitions=0, due_at=None)


def quality_from(correct: bool, level: int) -> int:
    if not correct:
        return 2
    return 5 if level >= 3 else 4


def _next_ease(ease: float, quality: int) -> float:
    delta = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
    return round(max(settings.SRS_MIN_EASE, ease + delta), 2)


def schedule(state: SrsState, quality: int, now: datetime) -> SrsState:
    """Trả trạng thái SRS mới sau một câu trả lời lúc `now`."""
    if quality < 3:
        return SrsState(
            ease=_next_ease(state.ease, quality), interval_days=settings.SRS_INTERVALS[0], repetitions=0,
            due_at=now + timedelta(days=settings.SRS_INTERVALS[0]), lapses=state.lapses + 1,
        )

    if state.due_at is not None and now < state.due_at:
        return state  # ôn sớm: không đẩy lịch

    repetitions = state.repetitions + 1
    ladder = settings.SRS_INTERVALS
    if repetitions <= len(ladder):
        interval = ladder[repetitions - 1]
    else:
        interval = max(state.interval_days + 1, round(state.interval_days * state.ease))
    return SrsState(
        ease=_next_ease(state.ease, quality), interval_days=interval, repetitions=repetitions,
        due_at=now + timedelta(days=interval), lapses=state.lapses,
    )
