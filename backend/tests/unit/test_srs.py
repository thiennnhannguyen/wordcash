"""
Kiểm thử thuật toán lặp lại ngắt quãng.
"""

from datetime import UTC, datetime, timedelta

from app.services import srs

NOW = datetime(2026, 10, 3, 9, 0, tzinfo=UTC)


def _review_chain(n: int) -> srs.SrsState:
    state, now = srs.initial_state(), NOW
    for _ in range(n):
        state = srs.schedule(state, 5, now)
        now = state.due_at
    return state


def test_quality_from_answer():
    assert srs.quality_from(False, 4) == 2
    assert srs.quality_from(True, 1) == 4
    assert srs.quality_from(True, 3) == 5


def test_first_five_reviews_follow_reference_ladder():
    intervals = [_review_chain(n).interval_days for n in range(1, 6)]
    assert intervals == [1, 3, 7, 16, 35]


def test_after_ladder_interval_grows_with_ease():
    state = _review_chain(6)
    assert state.repetitions == 6
    assert state.interval_days > 35


def test_wrong_answer_resets_and_lowers_ease():
    state = _review_chain(3)
    lapsed = srs.schedule(state, srs.quality_from(False, 3), state.due_at)
    assert lapsed.repetitions == 0 and lapsed.interval_days == 1
    assert lapsed.ease < state.ease
    assert lapsed.due_at == state.due_at + timedelta(days=1)


def test_early_correct_review_does_not_push_schedule():
    state = srs.schedule(srs.initial_state(), 5, NOW)
    again = srs.schedule(state, 5, NOW + timedelta(hours=1))
    assert again == state


def test_ease_never_below_minimum():
    state = srs.initial_state()
    for _ in range(20):
        state = srs.schedule(state, 0, NOW)
    assert state.ease == 1.3


def test_wrong_answer_resets_to_shortest_interval_and_counts_lapse():
    state = _review_chain(4)
    assert state.lapses == 0
    lapsed = srs.schedule(state, srs.quality_from(False, 1), state.due_at)
    assert lapsed.interval_days == 1 and lapsed.lapses == 1
    again = srs.schedule(lapsed, srs.quality_from(False, 1), lapsed.due_at)
    assert again.lapses == 2
