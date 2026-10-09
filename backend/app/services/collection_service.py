"""
Bộ Sưu Tập và vòng quay trên DB: danh mục, bộ sưu tập của người dùng, quay thẻ, đổi mảnh, chọn avatar / linh vật Đấu
Trường, đánh dấu đã xem, cấp linh vật khởi đầu. Luật quay thuần ở services/gacha.py.

- Thứ tự khóa thống nhất toàn backend: khởi tạo lộ trình (khóa advisory trong roadmap_service.ensure_initialized) →
  users → user_stats. Vì vậy mọi hàm ở đây đọc vùng đã mở (có thể khởi tạo lộ trình) TRƯỚC khi khóa user_stats.
- Quay (`spin`) và đổi mảnh (`exchange`) đều tiêu tài nguyên nên:
  1. khóa dòng user_stats (SELECT … FOR UPDATE, `stats_service.lock_stats`) trước khi tra idempotency: hai request của cùng người
     (kể cả cùng Idempotency-Key) chạy lần lượt, không tiêu trùng lượt / mảnh;
  2. tra `idempotency_keys` (user, key, endpoint): đã có cùng body → trả đúng kết quả cũ, không trừ thêm; khác body →
     IDEMPOTENCY_KEY_REUSED; bản ghi quá IDEMPOTENCY_TTL_HOURS bị dọn trước khi tra;
  3. làm toàn bộ thay đổi (lượt, pity, sở hữu, mảnh, lịch sử, bản ghi idempotency) trong MỘT transaction rồi commit.
- Pool quay / đổi mảnh: vùng = cấp người dùng đã mở (user_level_progress unlocked | completed); người mới được mở A1 ngay
  (roadmap_service.ensure_initialized). Ô coming_soon và linh vật achievement không bao giờ quay ra hay đổi được.
- Số ngẫu nhiên: `gacha.spin_rng()` (secrets.SystemRandom; riêng ENV=e2e có GACHA_SEED thì tất định); test truyền `rng` có seed.
- `force_next` (chỉ dev/e2e, qua POST /dev/force-next): ép độ hiếm / linh vật của lượt kế tiếp của một người để dựng hiệu
  ứng. Lưu trong bộ nhớ tiến trình, chỉ có tác dụng khi `settings.debug_time_enabled`, ép đúng MỘT lượt; lượt bị ép ghi
  `spin_history.forced = true` và `"forced": true` trong kết quả.
- Log (logger `wordclash.collection`, mức INFO, chỉ in ở dev/e2e — xem app/main.py): mỗi lần đặt / áp dụng lệnh ép, đặt
  pity, cộng lượt (route dev) và mỗi lần trả lại kết quả cũ theo Idempotency-Key (`replayed: true`). Không log key.
- Thời gian luôn do nơi gọi truyền vào (core/clock.now()).
"""

import hashlib
import json
import logging
import uuid
from datetime import datetime, timedelta

from fastapi.encoders import jsonable_encoder
from sqlalchemy import delete, select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.errors import AppError
from app.models import (
    IdempotencyKey,
    Level,
    Mascot,
    MascotSource,
    ProgressStatus,
    ShardExchange,
    SpinHistory,
    SpinKind,
    User,
    UserLevelProgress,
    UserMascot,
)
from app.services import gacha, roadmap_service, spins, stats_service
from app.services.mascot_catalog import PROFILE_FIELDS, RARITIES, REGIONS, SPECIAL

log = logging.getLogger("wordclash.collection")

TOTAL_SLOTS = 100
SPIN_ENDPOINT = "collection.spins"
EXCHANGE_ENDPOINT = "collection.exchange"

# Chỉ dev/e2e: {user_id: {"rarity": ..., "mascot_id": ...}} cho lượt quay kế tiếp
_forced: dict[uuid.UUID, dict] = {}


# ---------- Danh mục ----------

def mascot_out(m: Mascot) -> dict:
    """Thông tin công khai của một ô. Ô coming_soon chỉ có id, code, region, rarity, status (không lộ gì thêm)."""
    base = {"id": m.id, "code": m.code, "region": m.region.value, "rarity": m.rarity.value, "status": m.status.value}
    if m.status.value == "coming_soon":
        return base
    return {
        **base, "name": m.name, "obtain": m.obtain.value, "is_starter": m.is_starter, "shape": m.shape,
        "primary_color": m.primary_color, "accessory": m.accessory, "image_url": m.image_url, "lottie_url": m.lottie_url,
        "profile": {f: getattr(m, f) for f in PROFILE_FIELDS},
    }


async def load_catalog(session: AsyncSession) -> list[Mascot]:
    return list(await session.scalars(select(Mascot).order_by(Mascot.id)))


async def get_catalog(session: AsyncSession) -> list[dict]:
    return [mascot_out(m) for m in await load_catalog(session)]


async def get_mascot(session: AsyncSession, mascot_id: int) -> dict:
    m = await session.get(Mascot, mascot_id)
    if m is None:
        raise AppError("MASCOT_NOT_FOUND")
    return mascot_out(m)


# ---------- Bộ sưu tập ----------

async def unlocked_regions(session: AsyncSession, user: User, now: datetime) -> list[str]:
    """Vùng đã mở = mã các cấp có tiến độ unlocked | completed (chỉ A1…C2)."""
    await roadmap_service.ensure_initialized(session, user, now)
    codes = set(await session.scalars(
        select(Level.code).join(UserLevelProgress, UserLevelProgress.level_id == Level.id)
        .where(UserLevelProgress.user_id == user.id, UserLevelProgress.status.in_([ProgressStatus.UNLOCKED, ProgressStatus.COMPLETED]))
    ))
    return [c for c in REGIONS if c in codes]


async def owned_map(session: AsyncSession, user_id: uuid.UUID) -> dict[int, UserMascot]:
    rows = await session.scalars(select(UserMascot).where(UserMascot.user_id == user_id).execution_options(populate_existing=True))
    return {um.mascot_id: um for um in rows}


def _owned_out(um: UserMascot) -> dict:
    return {"mascot_id": um.mascot_id, "copies": um.copies, "is_new": um.is_new, "source": um.source.value,
            "first_obtained_at": um.first_obtained_at, "last_obtained_at": um.last_obtained_at}


async def get_collection(session: AsyncSession, user: User, now: datetime) -> dict:
    catalog = await load_catalog(session)
    owned = await owned_map(session, user.id)
    regions = await unlocked_regions(session, user, now)
    stats = await stats_service.lock_stats(session, user.id)
    mastered = await stats_service.mastered_count(session, user.id)
    by_rarity = {r: {"owned": 0, "total": 0} for r in RARITIES}
    by_region = {r: {"owned": 0, "total": 0, "unlocked": r in regions} for r in (*REGIONS, SPECIAL)}
    for m in catalog:
        has = m.id in owned
        for bucket in (by_rarity[m.rarity.value], by_region[m.region.value]):
            bucket["total"] += 1
            bucket["owned"] += has
    out = {
        "owned": [_owned_out(um) for um in sorted(owned.values(), key=lambda u: u.mascot_id)],
        "owned_count": len(owned),
        "total": TOTAL_SLOTS,
        "by_rarity": by_rarity,
        "by_region": by_region,
        "unlocked_regions": regions,
        "shards": stats.shards,
        "pity_counter": stats.pity_counter,
        "pity_epic": settings.PITY_EPIC,
        "spins": {"normal": stats.spins_normal, "special": stats.spins_special},
        "total_spins": stats.total_spins,
        "next_spin": spins.next_spin_progress(mastered, stats.max_spin_milestone),
        "avatar_mascot_id": user.avatar_mascot_id,
        "arena_mascot_id": user.arena_mascot_id,
        "new_count": sum(1 for um in owned.values() if um.is_new),
    }
    await session.commit()
    return out


async def get_rates(session: AsyncSession, user: User, now: datetime) -> dict:
    """Tỉ lệ công khai + số con có thể ra theo độ hiếm với vùng đã mở + bảng mảnh."""
    regions = await unlocked_regions(session, user, now)
    pool = gacha.build_pool(await load_catalog(session), regions)
    stats = await stats_service.lock_stats(session, user.id)
    out = {
        "rates": {"normal": settings.GACHA_RATES_NORMAL, "special": settings.GACHA_RATES_SPECIAL},
        "pity_epic": settings.PITY_EPIC,
        "pity_counter": stats.pity_counter,
        "unlocked_regions": regions,
        "pool_size": {r: len(pool[r]) for r in RARITIES},
        "shards_per_duplicate": settings.GACHA_SHARDS_PER_DUPLICATE,
        "exchange_cost": settings.GACHA_EXCHANGE_COST,
        "max_batch": settings.GACHA_MAX_BATCH,
    }
    await session.commit()
    return out


# ---------- Idempotency ----------

def request_hash(body: dict) -> str:
    return hashlib.sha256(json.dumps(body, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


async def cleanup_idempotency(session: AsyncSession, now: datetime) -> int:
    """Xóa bản ghi idempotency cũ hơn IDEMPOTENCY_TTL_HOURS (mọi người dùng). Trả số dòng đã xóa."""
    res = await session.execute(delete(IdempotencyKey).where(IdempotencyKey.created_at < now - timedelta(hours=settings.IDEMPOTENCY_TTL_HOURS)))
    return res.rowcount or 0


async def _replay(session: AsyncSession, user: User, key: str, endpoint: str, digest: str, now: datetime) -> dict | None:
    """Kết quả cũ của cùng key (đã khóa user_stats nên không có request song song cùng người)."""
    if not key:
        raise AppError("IDEMPOTENCY_KEY_REQUIRED")
    await cleanup_idempotency(session, now)
    row = await session.scalar(select(IdempotencyKey).where(
        IdempotencyKey.user_id == user.id, IdempotencyKey.key == key, IdempotencyKey.endpoint == endpoint))
    if row is None:
        return None
    if row.request_hash != digest:
        raise AppError("IDEMPOTENCY_KEY_REUSED")
    log.info("replayed endpoint=%s user=%s (gửi lại cùng Idempotency-Key, không tiêu thêm)", endpoint, user.id)
    return {**row.response_json, "replayed": True}


def _remember(session: AsyncSession, user: User, key: str, endpoint: str, digest: str, response: dict, now: datetime) -> dict:
    data = jsonable_encoder(response)
    session.add(IdempotencyKey(user_id=user.id, key=key, endpoint=endpoint, request_hash=digest, response_json=data, created_at=now))
    return {**data, "replayed": False}


# ---------- Quay ----------

def force_next(user_id: uuid.UUID, rarity: str, mascot_id: int | None = None) -> None:
    """Chỉ dev/e2e: ép lượt quay kế tiếp của người dùng (ghi đè lệnh ép chưa dùng trước đó)."""
    if user_id in _forced:
        log.info("force-next user=%s: ghi đè lệnh ép chưa dùng %s", user_id, _forced[user_id])
    _forced[user_id] = {"rarity": rarity, "mascot_id": mascot_id}
    log.info("force-next user=%s rarity=%s mascot_id=%s", user_id, rarity, mascot_id)


def _forced_result(user_id: uuid.UUID, kind: str, pity: int, pool: dict, by_id: dict[int, Mascot], rng) -> gacha.SpinResult | None:
    if not settings.debug_time_enabled or user_id not in _forced:
        return None
    wanted = _forced.pop(user_id)
    log.info("force-next áp dụng user=%s kind=%s %s", user_id, kind, wanted)
    if wanted["mascot_id"] is not None and wanted["mascot_id"] in by_id:
        mascot = by_id[wanted["mascot_id"]]
        rarity, fallback = mascot.rarity.value, False
    else:
        pick = gacha.pick_mascot(wanted["rarity"], pool, rng)
        mascot, rarity, fallback = pick.mascot, pick.rarity, pick.fallback
    return gacha.SpinResult(wanted["rarity"], rarity, False, fallback, mascot, pity, gacha.next_pity(pity, rarity))


async def spin(session: AsyncSession, user: User, kind: str, count: int, idempotency_key: str, now: datetime, rng: gacha.Rng | None = None) -> dict:
    if not 1 <= count <= settings.GACHA_MAX_BATCH:
        raise AppError("INVALID_SPIN_COUNT", details={"min": 1, "max": settings.GACHA_MAX_BATCH})
    kind = SpinKind(kind).value
    regions = await unlocked_regions(session, user, now)  # trước khi khóa user_stats (thứ tự khóa)
    stats = await stats_service.lock_stats(session, user.id)
    digest = request_hash({"kind": kind, "count": count})
    if (replay := await _replay(session, user, idempotency_key, SPIN_ENDPOINT, digest, now)) is not None:
        await session.commit()
        return replay
    available = stats.spins_special if kind == "special" else stats.spins_normal
    if available < count:
        raise AppError("NO_SPINS_LEFT", details={"kind": kind, "available": available, "requested": count})

    rng = rng or gacha.spin_rng(kind, stats.total_spins, stats.pity_counter)
    catalog = await load_catalog(session)
    by_id = {m.id: m for m in catalog}
    pool = gacha.build_pool(catalog, regions)
    owned = await owned_map(session, user.id)
    batch_id = uuid.uuid4()
    results = []
    pity = stats.pity_counter
    for index in range(count):
        forced_res = _forced_result(user.id, kind, pity, pool, by_id, rng)
        res = forced_res or gacha.spin_once(kind, pity, pool, rng)
        mascot: Mascot = res.mascot
        rarity = res.final_rarity
        um = owned.get(mascot.id)
        shards = 0
        if um is not None:
            um.copies += 1
            um.last_obtained_at = now
            shards = gacha.shards_for_duplicate(rarity)
            stats.shards += shards
        else:
            um = owned[mascot.id] = UserMascot(user_id=user.id, mascot_id=mascot.id, copies=1, source=MascotSource.GACHA,
                                                first_obtained_at=now, last_obtained_at=now, is_new=True)
            session.add(um)
        session.add(SpinHistory(user_id=user.id, batch_id=batch_id, kind=SpinKind(kind), rolled_rarity=res.rolled_rarity,
                                final_rarity=rarity, rarity_fallback=res.rarity_fallback, pity_triggered=res.pity_triggered, forced=forced_res is not None,
                                mascot_id=mascot.id, was_duplicate=shards > 0, shards_gained=shards, pity_before=res.pity_before,
                                pity_after=res.pity_after, created_at=now))
        results.append({
            "index": index, "mascot": mascot_out(mascot), "rarity": rarity, "hint": rarity,  # hint: màu ánh sáng trước khi lật
            "is_new_mascot": shards == 0, "was_duplicate": shards > 0, "shards_gained": shards, "copies": um.copies,
            "pity_triggered": res.pity_triggered, "rarity_fallback": res.rarity_fallback, "forced": forced_res is not None,
        })
        pity = res.pity_after

    if kind == "special":
        stats.spins_special -= count
    else:
        stats.spins_normal -= count
    stats.pity_counter = pity
    stats.total_spins += count
    response = {
        "batch_id": batch_id, "kind": kind, "count": count, "results": results,
        "spins": {"normal": stats.spins_normal, "special": stats.spins_special},
        "shards": stats.shards, "pity_counter": stats.pity_counter, "pity_epic": settings.PITY_EPIC,
    }
    out = _remember(session, user, idempotency_key, SPIN_ENDPOINT, digest, response, now)
    await session.commit()
    return out


# ---------- Đổi mảnh ----------

async def exchange(session: AsyncSession, user: User, mascot_id: int, idempotency_key: str, now: datetime) -> dict:
    regions = await unlocked_regions(session, user, now)  # trước khi khóa user_stats (thứ tự khóa)
    stats = await stats_service.lock_stats(session, user.id)
    digest = request_hash({"mascot_id": mascot_id})
    if (replay := await _replay(session, user, idempotency_key, EXCHANGE_ENDPOINT, digest, now)) is not None:
        await session.commit()
        return replay
    mascot = await session.get(Mascot, mascot_id)
    if mascot is None:
        raise AppError("MASCOT_NOT_FOUND")
    if not gacha.obtainable(mascot, regions):
        raise AppError("MASCOT_NOT_EXCHANGEABLE")
    if await session.scalar(select(UserMascot.id).where(UserMascot.user_id == user.id, UserMascot.mascot_id == mascot_id)):
        raise AppError("MASCOT_ALREADY_OWNED")
    cost = gacha.exchange_cost(mascot.rarity.value)
    if stats.shards < cost:
        raise AppError("NOT_ENOUGH_SHARDS", details={"shards": stats.shards, "cost": cost})
    stats.shards -= cost
    session.add(UserMascot(user_id=user.id, mascot_id=mascot.id, copies=1, source=MascotSource.EXCHANGE,
                           first_obtained_at=now, last_obtained_at=now, is_new=True))
    session.add(ShardExchange(user_id=user.id, mascot_id=mascot.id, cost=cost, created_at=now))
    response = {"mascot": mascot_out(mascot), "cost": cost, "shards": stats.shards}
    out = _remember(session, user, idempotency_key, EXCHANGE_ENDPOINT, digest, response, now)
    await session.commit()
    return out


# ---------- Chọn linh vật, đã xem, khởi đầu ----------

async def require_owned(session: AsyncSession, user: User, mascot_id: int, field: str) -> None:
    if not await session.scalar(select(UserMascot.id).where(UserMascot.user_id == user.id, UserMascot.mascot_id == mascot_id)):
        raise AppError("MASCOT_NOT_OWNED", details={"field": field})


async def set_avatar(session: AsyncSession, user: User, mascot_id: int | None) -> User:
    """null = bỏ ảnh đại diện. Không commit (nơi gọi commit cùng các thay đổi hồ sơ khác)."""
    if mascot_id is not None:
        await require_owned(session, user, mascot_id, "avatar_mascot_id")
    user.avatar_mascot_id = mascot_id
    return user


async def set_arena_mascot(session: AsyncSession, user: User, mascot_id: int | None) -> User:
    """null = dùng avatar ở Đấu Trường. Không commit."""
    if mascot_id is not None:
        await require_owned(session, user, mascot_id, "arena_mascot_id")
    user.arena_mascot_id = mascot_id
    return user


async def mark_seen(session: AsyncSession, user: User, mascot_ids: list[int]) -> int:
    res = await session.execute(update(UserMascot).where(UserMascot.user_id == user.id, UserMascot.mascot_id.in_(mascot_ids),
                                                         UserMascot.is_new.is_(True)).values(is_new=False))
    await session.commit()
    return res.rowcount or 0


async def grant_starter(session: AsyncSession, user: User, mascot_id: int, now: datetime) -> None:
    """Linh vật khởi đầu chọn ở onboarding: sở hữu ngay (source=starter). Chạy lại không tạo bản thứ hai. Không commit."""
    await session.execute(pg_insert(UserMascot).values(
        user_id=user.id, mascot_id=mascot_id, copies=1, source=MascotSource.STARTER, first_obtained_at=now, last_obtained_at=now,
        is_new=True).on_conflict_do_nothing(index_elements=["user_id", "mascot_id"]))
