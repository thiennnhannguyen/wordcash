"""
Hàm thuần của lõi Học Viện: rank + lung lay (rank.py), streak (streak.py), mốc lượt quay (spins.py), mở khóa (unlock.py).
"""

from datetime import UTC, date, datetime, timedelta

import pytest

from app.models.academy import ProgressStatus as S
from app.models import UserStats
from app.services import rank, spins, stats_service, streak, unlock
from app.services.streak import DayOutcome, StreakState

NOW = datetime(2026, 10, 4, 9, 0, tzinfo=UTC)


# ---------- Rank ----------

@pytest.mark.parametrize(("mastered", "code"), [
    (0, "tan_binh"), (99, "tan_binh"), (100, "dong"), (299, "dong"), (300, "bac"), (600, "vang"),
    (1000, "bach_kim"), (2000, "kim_cuong"), (3500, "cao_thu"), (4999, "cao_thu"), (5000, "huyen_thoai"), (99999, "huyen_thoai"),
])
def test_rank_for(mastered, code):
    assert rank.rank_for(mastered) == code


def test_rank_up_lists_first_reached_ranks():
    change = rank.evaluate(rank.RankState("tan_binh", "tan_binh"), 100, NOW)
    assert change.state.current == "dong" and change.ranked_up and change.first_reached == ["dong"]
    jump = rank.evaluate(rank.RankState("tan_binh", "tan_binh"), 650, NOW)
    assert jump.state.current == "vang" and jump.first_reached == ["dong", "bac", "vang"]


def test_shaky_then_recover():
    state = rank.RankState("dong", "dong")
    shaky = rank.evaluate(state, 99, NOW)
    assert shaky.became_shaky and shaky.state.current == "dong"
    assert shaky.state.shaky_deadline == NOW + timedelta(days=3)
    # Vẫn dưới mốc nhưng chưa hết hạn: giữ nguyên
    still = rank.evaluate(shaky.state, 98, NOW + timedelta(days=2))
    assert still.state == shaky.state and not still.demoted
    recovered = rank.evaluate(shaky.state, 100, NOW + timedelta(days=2))
    assert recovered.recovered and recovered.state.shaky_deadline is None and recovered.state.current == "dong"


def test_shaky_past_deadline_demotes_to_rank_by_words():
    shaky = rank.evaluate(rank.RankState("bac", "bac"), 250, NOW).state
    demoted = rank.evaluate(shaky, 90, NOW + timedelta(days=3))
    assert demoted.demoted and demoted.state.current == "tan_binh" and demoted.state.highest == "bac"
    assert demoted.state.shaky_deadline is None


def test_reaching_old_rank_again_is_not_first_time():
    after_demotion = rank.RankState("tan_binh", "dong")
    again = rank.evaluate(after_demotion, 120, NOW)
    assert again.state.current == "dong" and again.first_reached == []
    higher = rank.evaluate(after_demotion, 300, NOW)
    assert higher.first_reached == ["bac"]


def test_rank_progress():
    assert rank.progress("dong", 140) == {"next": "bac", "current_min": 100, "next_min": 300, "remaining": 160}
    assert rank.progress("huyen_thoai", 6000)["next"] is None


# ---------- Mốc lượt quay ----------

@pytest.mark.parametrize(("max_milestone", "mastered", "expected"), [
    (0, 49, []), (0, 50, [50]), (50, 49, []), (50, 50, []), (50, 99, []), (50, 100, [100]),
    (50, 102, [100]), (0, 150, [50, 100, 150]),
])
def test_new_milestones(max_milestone, mastered, expected):
    assert spins.new_milestones(max_milestone, mastered) == expected


def test_spin_progress():
    assert spins.next_spin_progress(38, 0) == {"current": 38, "target": 50, "remaining": 12, "next_milestone": 50}
    lost = spins.next_spin_progress(95, 100)  # mất từ: mốc kế vẫn là 150, còn thiếu 55 (không phải 50)
    assert (lost["current"], lost["remaining"], lost["next_milestone"]) == (0, 55, 150)
    assert spins.next_spin_progress(130, 100)["current"] == 30


# ---------- Streak ----------

D = date(2026, 10, 4)


def test_streak_increments_when_all_correct():
    change = streak.apply_day(StreakState(2, 5, D - timedelta(days=1)), D, DayOutcome.PASSED)
    assert change.state == StreakState(3, 5, D)


def test_streak_kept_when_wrong_answer_or_exempt():
    for outcome in (DayOutcome.PARTIAL, DayOutcome.EXEMPT):
        change = streak.apply_day(StreakState(4, 4, D - timedelta(days=1)), D, outcome)
        assert change.state == StreakState(4, 4, D), outcome


def test_streak_resets_after_missed_day():
    state = StreakState(6, 6, D - timedelta(days=2))
    assert streak.is_broken(state, D)
    assert streak.decay(state, D).state.current == 0
    change = streak.apply_day(state, D, DayOutcome.PASSED)
    assert change.reset and change.state == StreakState(1, 6, D)
    # Ngày miễn giữ streak sống: không bị coi là bỏ ngày
    assert not streak.is_broken(StreakState(6, 6, D - timedelta(days=1)), D)


def test_streak_milestones_every_seven():
    assert streak.apply_day(StreakState(6, 6, D - timedelta(days=1)), D, DayOutcome.PASSED).milestone == 7
    assert streak.apply_day(StreakState(13, 13, D - timedelta(days=1)), D, DayOutcome.PASSED).milestone == 14
    assert streak.apply_day(StreakState(7, 7, D - timedelta(days=1)), D, DayOutcome.PASSED).milestone is None


def test_streak_same_day_twice_is_noop():
    state = StreakState(3, 3, D)
    assert streak.apply_day(state, D, DayOutcome.PASSED).state == state


@pytest.mark.parametrize(
    ("last", "expected"),
    [(date(2026, 10, 5), 4), (date(2026, 10, 4), 4), (date(2026, 10, 3), 0), (None, 4)],
)
def test_effective_streak(last, expected):
    """Hôm nay 05/10: làm hôm nay hoặc hôm qua thì còn hiệu lực; ngày cuối trước hôm qua (bỏ trọn 04/10) thì 0
    dù cột streak_current chưa được đặt lại."""
    stats = UserStats(streak_current=4, streak_best=9, streak_last_date=last)
    assert stats_service.effective_streak(stats, date(2026, 10, 5)) == expected
    assert stats_service.effective_streak(None, date(2026, 10, 5)) == 0


def test_week_days():
    days = streak.week_days(date(2026, 10, 4))  # Chủ Nhật
    assert days[0] == date(2026, 9, 28) and days[-1] == date(2026, 10, 4)


# ---------- Mở khóa ----------

def test_upgrade_never_relocks():
    assert unlock.upgrade(S.COMPLETED, S.UNLOCKED) == S.COMPLETED
    assert unlock.upgrade(S.UNLOCKED, S.LOCKED) == S.UNLOCKED
    assert unlock.upgrade(None, S.UNLOCKED) == S.UNLOCKED
    assert unlock.upgrade(S.UNLOCKED, S.COMPLETED) == S.COMPLETED


def test_pass_thresholds():
    assert unlock.unit_passed(16, 20) and not unlock.unit_passed(15, 20)
    assert unlock.unit_passed(12, 15) and not unlock.unit_passed(11, 15)
    assert unlock.topic_passed(16, 20)
    assert unlock.boss_passed(43, 50) and not unlock.boss_passed(42, 50)  # 86% / 84%
    assert not unlock.unit_passed(0, 0)


def test_next_in_and_gates():
    assert unlock.next_in([3, 7, 9], 7) == 9 and unlock.next_in([3, 7, 9], 9) is None
    assert unlock.topic_test_open([S.COMPLETED, S.COMPLETED])
    assert not unlock.topic_test_open([S.COMPLETED, S.UNLOCKED]) and not unlock.topic_test_open([])
    assert unlock.boss_open([S.COMPLETED] * 10) and not unlock.boss_open([S.COMPLETED] * 9 + [None])


def test_weak_topics_lowest_accuracy():
    acc = {1: (5, 5), 2: (1, 5), 3: (3, 5), 4: (1, 5), 5: (0, 0)}
    assert unlock.weak_topics(acc, [1, 2, 3, 4, 5]) == [2, 4]  # hòa thì chặng trước đứng trước; chặng không được hỏi bỏ qua
