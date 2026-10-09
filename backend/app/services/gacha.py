"""
Vòng quay linh vật (hàm thuần, không phụ thuộc DB): quay độ hiếm theo tỉ lệ công khai, pity, chọn linh vật trong pool
(kèm hạ bậc khi pool thiếu độ hiếm), mảnh khi trùng, giá đổi mảnh. Ghi DB ở services/collection_service.py.

- Số ngẫu nhiên lấy từ đối tượng `rng` truyền vào (cần `random()` và `choice()`): production dùng `secrets.SystemRandom()`
  (`system_rng`), test truyền `random.Random(seed)`. Client không bao giờ quyết định hay biết trước kết quả.
  Riêng ENV=e2e có GACHA_SEED: `spin_rng` trả `random.Random` tất định theo (hạt giống, loại lượt, tổng lượt đã quay, pity)
  để kịch bản e2e ổn định; ở mọi ENV khác GACHA_SEED bị bỏ qua.
- Tỉ lệ: settings.GACHA_RATES_NORMAL / GACHA_RATES_SPECIAL (Thường 60 · Hiếm 28 · Sử Thi 10 · Huyền Thoại 2;
  đặc biệt 0 · 70 · 24 · 6).
- Pity: `pity_counter` đếm số lượt LIÊN TIẾP (mọi loại lượt) chưa ra Sử Thi trở lên. Đạt PITY_EPIC (20) thì lượt kế chắc
  chắn Sử Thi; nếu tỉ lệ gốc đã ra Huyền Thoại thì giữ Huyền Thoại. Ra Sử Thi / Huyền Thoại thì bộ đếm về 0.
  Bộ đếm tính theo độ hiếm THỰC NHẬN (sau hạ bậc khi pool thiếu).
- Pool: chỉ linh vật `released`, `obtain = gacha` (gồm ba con khởi đầu), thuộc vùng đã mở. Ô `coming_soon` và linh vật
  `achievement` không bao giờ vào pool. Cùng độ hiếm thì các con ngang xác suất.
- Hạ bậc (quyết định 5): độ hiếm rơi trúng không có con nào trong pool → thử lần lượt độ hiếm THẤP hơn tới Thường; vẫn trống
  thì thử lần lượt các độ hiếm CAO hơn. `rarity_fallback = True` để ghi lịch sử.
"""

import random
import secrets
from collections.abc import Iterable, Mapping
from dataclasses import dataclass
from typing import Any, Protocol

from app.core.config import settings

RARITIES = ("common", "rare", "epic", "legendary")  # thấp → cao
HIGH = frozenset({"epic", "legendary"})  # đặt lại pity


class Rng(Protocol):
    def random(self) -> float: ...

    def choice(self, seq: Any) -> Any: ...


def system_rng() -> Rng:
    return secrets.SystemRandom()


def spin_rng(kind: str, total_spins: int, pity_counter: int) -> Rng:
    """Bộ sinh số cho một yêu cầu quay. Chỉ ENV=e2e có GACHA_SEED mới tất định (theo trạng thái người dùng, không theo
    thứ tự chạy test); còn lại là SystemRandom."""
    seed = settings.gacha_seed
    if seed is None:
        return system_rng()
    return random.Random(f"{seed}|{kind}|{total_spins}|{pity_counter}")


class EmptyPoolError(ValueError):
    """Pool không có linh vật nào (không xảy ra khi A1 luôn mở; phòng hờ)."""


def rates(kind: str) -> dict[str, float]:
    return settings.GACHA_RATES_SPECIAL if kind == "special" else settings.GACHA_RATES_NORMAL


def roll_rarity(kind: str, rng: Rng) -> str:
    """Độ hiếm theo bảng tỉ lệ của loại lượt (`normal` | `special`)."""
    r = rng.random()
    acc = 0.0
    table = rates(kind)
    for rarity in RARITIES:
        acc += table[rarity]
        if r < acc:
            return rarity
    return next(rarity for rarity in reversed(RARITIES) if table[rarity] > 0)  # phần dư làm tròn số thực


def apply_pity(rolled: str, pity_counter: int) -> tuple[str, bool]:
    """(độ hiếm sau pity, pity có kích hoạt không)."""
    if pity_counter >= settings.PITY_EPIC and rolled not in HIGH:
        return "epic", True
    return rolled, False


def next_pity(pity_counter: int, final_rarity: str) -> int:
    return 0 if final_rarity in HIGH else pity_counter + 1


def shards_for_duplicate(rarity: str) -> int:
    return settings.GACHA_SHARDS_PER_DUPLICATE[rarity]


def exchange_cost(rarity: str) -> int:
    return settings.GACHA_EXCHANGE_COST[rarity]


def _get(mascot: Any, field: str) -> Any:
    value = mascot[field] if isinstance(mascot, Mapping) else getattr(mascot, field)
    return getattr(value, "value", value)  # enum → chuỗi


def obtainable(mascot: Any, unlocked_regions: Iterable[str]) -> bool:
    """Quay ra / đổi mảnh được: released, nhận qua gacha, thuộc vùng đã mở."""
    return _get(mascot, "status") == "released" and _get(mascot, "obtain") == "gacha" and _get(mascot, "region") in set(unlocked_regions)


def build_pool(catalog: Iterable[Any], unlocked_regions: Iterable[str]) -> dict[str, list[Any]]:
    """Nhóm linh vật quay ra được theo độ hiếm (đủ 4 khóa, có thể rỗng)."""
    regions = set(unlocked_regions)
    pool: dict[str, list[Any]] = {r: [] for r in RARITIES}
    for mascot in catalog:
        if obtainable(mascot, regions):
            pool[_get(mascot, "rarity")].append(mascot)
    for group in pool.values():
        group.sort(key=lambda m: _get(m, "id"))  # thứ tự cố định để seed của test cho kết quả lặp lại được
    return pool


def fallback_order(rarity: str) -> list[str]:
    """Độ hiếm cần thử: chính nó → thấp dần tới Thường → cao dần từ trên nó."""
    i = RARITIES.index(rarity)
    return [*reversed(RARITIES[: i + 1]), *RARITIES[i + 1:]]


@dataclass(frozen=True)
class Pick:
    mascot: Any
    rarity: str  # độ hiếm thực nhận
    fallback: bool


def pick_mascot(final_rarity: str, pool: Mapping[str, list[Any]], rng: Rng) -> Pick:
    for rarity in fallback_order(final_rarity):
        if group := pool.get(rarity):
            return Pick(rng.choice(group), rarity, rarity != final_rarity)
    raise EmptyPoolError("Không có linh vật nào để quay")


@dataclass(frozen=True)
class SpinResult:
    rolled_rarity: str
    final_rarity: str
    pity_triggered: bool
    rarity_fallback: bool
    mascot: Any
    pity_before: int
    pity_after: int


def spin_once(kind: str, pity_counter: int, pool: Mapping[str, list[Any]], rng: Rng) -> SpinResult:
    """Một lượt hoàn chỉnh: roll → pity → chọn (hạ bậc nếu cần) → bộ đếm pity mới."""
    rolled = roll_rarity(kind, rng)
    wanted, triggered = apply_pity(rolled, pity_counter)
    pick = pick_mascot(wanted, pool, rng)
    return SpinResult(rolled, pick.rarity, triggered, pick.fallback, pick.mascot, pity_counter, next_pity(pity_counter, pick.rarity))
