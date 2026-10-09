"""
Logic quay thuần (services/gacha.py) với seed cố định:
- Thống kê 200.000 lượt: tỉ lệ từng độ hiếm trong ±0,5 điểm % so với bảng, cả lượt thường và đặc biệt.
- Cùng độ hiếm ngang xác suất (chi-square).
- Pity: 20 lượt không ra Sử Thi thì lượt 21 là Sử Thi; Huyền Thoại giữ nguyên và đặt lại bộ đếm; lượt đặc biệt cũng tăng / đặt lại.
- Hạ bậc khi pool thiếu độ hiếm; không bao giờ ra coming_soon, achievement, vùng chưa mở.
- GACHA_SEED: chỉ ENV=e2e mới tất định; production / development / testing bỏ qua, dùng SystemRandom.
"""

import random
import secrets
from collections import Counter

import pytest

from app.core.config import settings
from app.services import gacha, mascot_catalog

CATALOG = mascot_catalog.load_catalog()
N = 200_000


class FixedRng:
    """rng giả: random() trả lần lượt các giá trị cho trước, choice() lấy phần tử đầu."""

    def __init__(self, *values):
        self.values = list(values)

    def random(self):
        return self.values.pop(0)

    def choice(self, seq):
        return seq[0]


@pytest.mark.parametrize("kind", ["normal", "special"])
def test_rarity_rates_match_table(kind):
    rng = random.Random(20261005)
    counts = Counter(gacha.roll_rarity(kind, rng) for _ in range(N))
    table = gacha.rates(kind)
    for rarity in gacha.RARITIES:
        actual = counts[rarity] / N
        assert abs(actual - table[rarity]) <= 0.005, (rarity, actual, table[rarity])
    if kind == "special":
        assert counts["common"] == 0  # lượt đặc biệt không ra Thường


def test_rates_sum_to_one():
    for kind in ("normal", "special"):
        assert sum(gacha.rates(kind).values()) == pytest.approx(1.0)


def test_same_rarity_is_uniform_chi_square():
    pool = gacha.build_pool(CATALOG, ["A1"])
    group = pool["common"]
    rng = random.Random(7)
    counts = Counter(gacha.pick_mascot("common", pool, rng).mascot["id"] for _ in range(N))
    expected = N / len(group)
    chi2 = sum((counts[m["id"]] - expected) ** 2 / expected for m in group)
    assert set(counts) == {m["id"] for m in group}
    assert chi2 < 24.32  # 7 bậc tự do, mức ý nghĩa 0,001


def test_pity_guarantees_epic_on_21st_spin():
    """20 lượt liên tiếp chỉ ra Thường → bộ đếm 20 → lượt 21 chắc chắn Sử Thi rồi đặt lại."""
    pool = gacha.build_pool(CATALOG, ["A1"])
    rng = random.Random(1)
    pity = 0
    for _ in range(20):
        res = gacha.spin_once("normal", pity, pool, _always(0.0, rng))
        assert res.final_rarity == "common" and not res.pity_triggered
        pity = res.pity_after
    assert pity == settings.PITY_EPIC
    res = gacha.spin_once("normal", pity, pool, _always(0.0, rng))  # tỉ lệ gốc vẫn ra Thường
    assert (res.rolled_rarity, res.final_rarity, res.pity_triggered, res.pity_after) == ("common", "epic", True, 0)


def _always(value, rng):
    """random() luôn trả `value`, choice() dùng rng thật."""

    class _R:
        def random(self):
            return value

        def choice(self, seq):
            return rng.choice(seq)

    return _R()


def test_legendary_kept_under_pity_and_resets():
    assert gacha.apply_pity("legendary", 20) == ("legendary", False)
    assert gacha.apply_pity("rare", 20) == ("epic", True)
    assert gacha.apply_pity("rare", 19) == ("rare", False)
    assert gacha.next_pity(13, "legendary") == 0 and gacha.next_pity(13, "epic") == 0 and gacha.next_pity(13, "rare") == 14


def test_special_spins_also_count_and_reset_pity():
    pool = gacha.build_pool(CATALOG, ["A1"])
    rare = gacha.spin_once("special", 5, pool, _always(0.0, random.Random(2)))  # 0.0 → Hiếm (đặc biệt không có Thường)
    assert (rare.final_rarity, rare.pity_after) == ("rare", 6)
    epic = gacha.spin_once("special", 6, pool, _always(0.75, random.Random(2)))  # 0.70 ≤ 0.75 < 0.94 → Sử Thi
    assert (epic.final_rarity, epic.pity_after) == ("epic", 0)
    forced = gacha.spin_once("special", 20, pool, _always(0.0, random.Random(2)))
    assert (forced.final_rarity, forced.pity_triggered, forced.pity_after) == ("epic", True, 0)


def test_fallback_goes_down_then_up():
    assert gacha.fallback_order("epic") == ["epic", "rare", "common", "legendary"]
    assert gacha.fallback_order("common") == ["common", "rare", "epic", "legendary"]
    a, b, c = ({"id": i, "rarity": r} for i, r in ((1, "common"), (2, "rare"), (3, "legendary")))
    pick = gacha.pick_mascot("epic", {"common": [a], "rare": [b], "epic": [], "legendary": [c]}, FixedRng())
    assert (pick.mascot, pick.rarity, pick.fallback) == (b, "rare", True)
    pick = gacha.pick_mascot("common", {"common": [], "rare": [], "epic": [], "legendary": [c]}, FixedRng())
    assert (pick.mascot, pick.rarity, pick.fallback) == (c, "legendary", True)
    assert gacha.pick_mascot("rare", {"common": [a], "rare": [b], "epic": [], "legendary": []}, FixedRng()).fallback is False
    with pytest.raises(gacha.EmptyPoolError):
        gacha.pick_mascot("rare", {r: [] for r in gacha.RARITIES}, FixedRng())


def test_fallback_counts_actual_rarity_for_pity():
    """Pool không có Sử Thi: pity ép Sử Thi nhưng nhận Hiếm → bộ đếm KHÔNG về 0."""
    b = {"id": 2, "rarity": "rare"}
    res = gacha.spin_once("normal", 20, {"common": [], "rare": [b], "epic": [], "legendary": []}, _always(0.0, random.Random(3)))
    assert (res.final_rarity, res.pity_triggered, res.rarity_fallback, res.pity_after) == ("rare", True, True, 21)


def test_pool_excludes_coming_soon_achievement_and_locked_regions():
    pool = gacha.build_pool(CATALOG, ["A1"])
    members = [m for group in pool.values() for m in group]
    assert members and all(m["region"] == "A1" and m["status"] == "released" and m["obtain"] == "gacha" for m in members)
    assert {m["id"] for m in members} >= {1}  # Bông Tím (khởi đầu, A1) vẫn trong vòng quay
    everything = gacha.build_pool(CATALOG, [*mascot_catalog.REGIONS, "SPECIAL"])
    every = [m for group in everything.values() for m in group]
    assert len(every) == 30 and not any(m["status"] == "coming_soon" or m["obtain"] == "achievement" for m in every)
    assert {2, 3} <= {m["id"] for m in every}  # Bé Thính, Ớt Hiểm (A2) chỉ vào pool khi mở A2


def test_many_spins_never_leave_the_pool():
    pool = gacha.build_pool(CATALOG, ["A1"])
    allowed = {m["id"] for group in pool.values() for m in group}
    rng = random.Random(99)
    pity = 0
    for i in range(20_000):
        res = gacha.spin_once("special" if i % 7 == 0 else "normal", pity, pool, rng)
        assert res.mascot["id"] in allowed
        pity = res.pity_after
        assert pity <= settings.PITY_EPIC


def test_shards_and_costs():
    assert [gacha.shards_for_duplicate(r) for r in gacha.RARITIES] == [2, 4, 8, 20]
    assert [gacha.exchange_cost(r) for r in gacha.RARITIES] == [20, 40, 60, 150]


def test_system_rng_is_secrets():
    import secrets

    assert isinstance(gacha.system_rng(), secrets.SystemRandom)


# ---------- GACHA_SEED (chỉ e2e) ----------

@pytest.mark.parametrize("env", ["production", "development", "testing"])
def test_gacha_seed_ignored_outside_e2e(monkeypatch, env):
    monkeypatch.setattr(settings, "ENV", env)
    monkeypatch.setattr(settings, "GACHA_SEED", 2026)
    assert settings.gacha_seed is None
    assert isinstance(gacha.spin_rng("normal", 0, 20), secrets.SystemRandom)


def test_gacha_seed_deterministic_in_e2e(monkeypatch):
    monkeypatch.setattr(settings, "ENV", "e2e")
    monkeypatch.setattr(settings, "GACHA_SEED", 2026)
    a, b = gacha.spin_rng("normal", 0, 20), gacha.spin_rng("normal", 0, 20)
    assert not isinstance(a, secrets.SystemRandom)
    assert [a.random() for _ in range(5)] == [b.random() for _ in range(5)]
    assert gacha.spin_rng("normal", 1, 20).random() != gacha.spin_rng("normal", 0, 20).random()  # đổi theo trạng thái
    # Hạt giống của e2e (start-backend.sh): người mới, pity 20 → lượt thường gốc chưa tới Sử Thi, nên pity thật sự kích hoạt
    res = gacha.spin_once("normal", 20, gacha.build_pool(CATALOG, {"A1"}), gacha.spin_rng("normal", 0, 20))
    assert res.pity_triggered and res.final_rarity == "epic"


def test_gacha_seed_unset_in_e2e_uses_system_random(monkeypatch):
    monkeypatch.setattr(settings, "ENV", "e2e")
    monkeypatch.setattr(settings, "GACHA_SEED", None)
    assert isinstance(gacha.spin_rng("normal", 0, 0), secrets.SystemRandom)
