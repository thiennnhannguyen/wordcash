"""
Schema API Bộ Sưu Tập và vòng quay. Kết quả quay chỉ có SAU khi server đã quay và ghi DB; client không gửi gì ảnh hưởng kết quả
(chỉ loại lượt và số lượt). Các khối lồng nhau (linh vật, tiến độ) để dạng dict, mô tả trong docs/collection.md.
"""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class MascotListOut(BaseModel):
    total: int
    mascots: list[dict]


class CollectionOut(BaseModel):
    owned: list[dict]
    owned_count: int
    total: int
    by_rarity: dict
    by_region: dict
    unlocked_regions: list[str]
    shards: int
    pity_counter: int
    pity_epic: int
    spins: dict
    total_spins: int
    next_spin: dict
    avatar_mascot_id: int | None
    arena_mascot_id: int | None
    new_count: int


class RatesOut(BaseModel):
    rates: dict
    pity_epic: int
    pity_counter: int
    unlocked_regions: list[str]
    pool_size: dict
    shards_per_duplicate: dict
    exchange_cost: dict
    max_batch: int


class SpinIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    kind: Literal["normal", "special"]
    count: int  # 1..GACHA_MAX_BATCH, kiểm tra ở service (INVALID_SPIN_COUNT)


class SpinOut(BaseModel):
    batch_id: str
    kind: str
    count: int
    results: list[dict]
    spins: dict
    shards: int
    pity_counter: int
    pity_epic: int
    replayed: bool  # true = gửi lại cùng Idempotency-Key, trả kết quả cũ (không trừ lượt thêm)


class ExchangeIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    mascot_id: int = Field(ge=1)


class ExchangeOut(BaseModel):
    mascot: dict
    cost: int
    shards: int
    replayed: bool


class SeenIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    mascot_ids: list[int] = Field(min_length=1, max_length=100)


class SeenOut(BaseModel):
    updated: int


# ---------- Chỉ dev/e2e ----------

class GrantSpinsIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    normal: int = Field(default=0, ge=0, le=1000)
    special: int = Field(default=0, ge=0, le=1000)


class SetPityIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    value: int = Field(ge=0, le=1000)


class ForceNextIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    rarity: Literal["common", "rare", "epic", "legendary"]
    mascot_id: int | None = Field(default=None, ge=1, le=100)

