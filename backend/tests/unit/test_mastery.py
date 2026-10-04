"""
Kiểm thử quy tắc "đã thuộc" và bộ đếm: đúng ở mức ≥ 3 vào ≥ 3 ngày khác nhau; từ tự tạo không làm đổi mastered_count.
"""

from datetime import date, timedelta

from app.models import EntryState
from app.services import mastery

D1 = date(2026, 10, 1)


def _answer(state, level, correct, day):
    return mastery.apply_answer(state, level, correct, day)


def test_new_word_becomes_learning_on_any_answer():
    change = _answer(mastery.MasteryState(EntryState.NEW), 1, False, D1)
    assert change.state.status == EntryState.LEARNING and change.state.strong_days == 0


def test_three_different_days_at_level_3_masters():
    state = mastery.MasteryState(EntryState.NEW)
    for i in range(2):
        state = _answer(state, 3, True, D1 + timedelta(days=i)).state
        assert state.status == EntryState.LEARNING
    change = _answer(state, 4, True, D1 + timedelta(days=2))
    assert change.state.status == EntryState.MASTERED and change.became_mastered


def test_same_day_counts_once():
    state = mastery.MasteryState(EntryState.NEW)
    for _ in range(5):
        state = _answer(state, 3, True, D1).state
    assert state.strong_days == 1 and state.status == EntryState.LEARNING


def test_low_levels_do_not_count_towards_mastery():
    state = mastery.MasteryState(EntryState.NEW)
    for i in range(5):
        state = _answer(state, 2, True, D1 + timedelta(days=i)).state
    assert state.strong_days == 0 and state.status == EntryState.LEARNING


def test_wrong_answer_in_study_keeps_mastered():
    state = mastery.MasteryState(EntryState.MASTERED, 3, D1)
    change = _answer(state, 3, False, D1 + timedelta(days=5))
    assert change.state.status == EntryState.MASTERED and not change.lost_mastered


def test_forget_then_relearn_needs_full_days_again():
    change = mastery.forget(mastery.MasteryState(EntryState.MASTERED, 3, D1))
    assert change.state.status == EntryState.FORGOTTEN and change.lost_mastered and change.state.strong_days == 0
    again = _answer(change.state, 3, True, D1 + timedelta(days=1))
    assert again.state.status == EntryState.LEARNING


def test_counter_deltas_custom_never_touch_mastered_count():
    became = mastery.MasteryChange(mastery.MasteryState(EntryState.MASTERED, 3, D1), became_mastered=True)
    lost = mastery.MasteryChange(mastery.MasteryState(EntryState.FORGOTTEN), lost_mastered=True)
    assert mastery.counter_deltas(became, is_custom=False) == (1, 0)
    assert mastery.counter_deltas(became, is_custom=True) == (0, 1)
    assert mastery.counter_deltas(lost, is_custom=False) == (-1, 0)
    assert mastery.counter_deltas(lost, is_custom=True) == (0, -1)
