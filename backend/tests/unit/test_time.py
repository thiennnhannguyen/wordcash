"""
Ngày theo múi giờ người học (utils/time.py) và đồng hồ dùng chung (core/clock.py).
Kiểm tra cả múi giờ có giờ mùa hè (America/New_York): ngày đổi giờ dài 23 hoặc 25 giờ.
"""

from datetime import UTC, date, datetime, timedelta
from types import SimpleNamespace

import pytest

from app.core import clock
from app.utils.time import day_bounds, local_date

HCM = SimpleNamespace(timezone="Asia/Ho_Chi_Minh")
NY = SimpleNamespace(timezone="America/New_York")


def test_local_date_ho_chi_minh_midnight_boundary():
    # 23:59 và 00:01 giờ Việt Nam (UTC+7)
    assert local_date(HCM, datetime(2026, 10, 4, 16, 59, tzinfo=UTC)) == date(2026, 10, 4)
    assert local_date(HCM, datetime(2026, 10, 4, 17, 1, tzinfo=UTC)) == date(2026, 10, 5)


def test_local_date_new_york_summer_and_winter():
    # Tháng 7 (EDT, UTC-4) và tháng 12 (EST, UTC-5)
    assert local_date(NY, datetime(2026, 7, 2, 3, 59, tzinfo=UTC)) == date(2026, 7, 1)
    assert local_date(NY, datetime(2026, 7, 2, 4, 1, tzinfo=UTC)) == date(2026, 7, 2)
    assert local_date(NY, datetime(2026, 12, 2, 4, 59, tzinfo=UTC)) == date(2026, 12, 1)
    assert local_date(NY, datetime(2026, 12, 2, 5, 1, tzinfo=UTC)) == date(2026, 12, 2)


def test_day_bounds_ho_chi_minh():
    start, end = day_bounds(HCM, date(2026, 10, 4))
    assert start == datetime(2026, 10, 3, 17, 0, tzinfo=UTC)
    assert end == datetime(2026, 10, 4, 17, 0, tzinfo=UTC)


@pytest.mark.parametrize(("day", "hours"), [(date(2026, 3, 8), 23), (date(2026, 11, 1), 25), (date(2026, 7, 1), 24)])
def test_day_bounds_new_york_dst(day, hours):
    start, end = day_bounds(NY, day)
    assert end - start == timedelta(hours=hours)
    assert local_date(NY, start) == day and local_date(NY, end - timedelta(seconds=1)) == day and local_date(NY, end) == day + timedelta(days=1)


def test_missing_timezone_uses_default():
    assert local_date(SimpleNamespace(timezone=None), datetime(2026, 10, 4, 17, 1, tzinfo=UTC)) == date(2026, 10, 5)


def test_clock_freeze_and_request_override():
    fixed = datetime(2026, 1, 2, 3, 4, tzinfo=UTC)
    with clock.frozen(fixed):
        assert clock.now() == fixed
        override = datetime(2027, 5, 6, tzinfo=UTC)
        token = clock.set_request_now(override)
        try:
            assert clock.now() == override  # header của request được ưu tiên
            assert clock.real_now() != override  # bảo mật luôn dùng giờ thật
        finally:
            clock.reset_request_now(token)
        assert clock.now() == fixed
    assert clock.now() != fixed


def test_parse_iso():
    assert clock.parse_iso("2026-10-05T00:01:00+07:00") == datetime(2026, 10, 4, 17, 1, tzinfo=UTC)
    assert clock.parse_iso("2026-10-05T00:01:00Z") == datetime(2026, 10, 5, 0, 1, tzinfo=UTC)
    assert clock.parse_iso("2026-10-05T00:01:00") == datetime(2026, 10, 5, 0, 1, tzinfo=UTC)
    with pytest.raises(ValueError):
        clock.parse_iso("hôm qua")
