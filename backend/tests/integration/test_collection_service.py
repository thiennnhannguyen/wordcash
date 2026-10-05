"""
Bộ Sưu Tập và vòng quay trên PostgreSQL thật (services/collection_service.py):
- Quay: trừ đúng lượt; thiếu lượt NO_SPINS_LEFT; 0 / 11 lượt INVALID_SPIN_COUNT; batch 10 lượt ghi 10 dòng lịch sử.
- Trùng: cộng đúng mảnh, tăng copies; mới: sở hữu is_new = true.
- Pool: người mới (chỉ A1) không bao giờ ra A2; thắng Boss A1 thì pool có A2.
- Pity xuyên nhiều batch và cả hai loại lượt.
- Idempotency: gửi lại cùng key → kết quả giống hệt, không trừ thêm; cùng key khác body → IDEMPOTENCY_KEY_REUSED; bản ghi cũ bị dọn.
- Song song: còn 1 lượt, 2 request cùng lúc → chỉ 1 thành công.
- Đổi mảnh: thành công; NOT_ENOUGH_SHARDS; MASCOT_ALREADY_OWNED; MASCOT_NOT_EXCHANGEABLE (coming_soon, achievement, vùng chưa mở).
- Avatar / Đấu Trường: linh vật không sở hữu → MASCOT_NOT_OWNED; linh vật vừa quay ra thì chọn được.
- Onboarding cấp linh vật khởi đầu; câu SQL bù sở hữu của migration.
"""

import asyncio
import importlib.util
import random
import uuid
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest
from sqlalchemy import delete, func, select, text, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.models import IdempotencyKey, Mascot, MascotSource, MascotStatus, ShardExchange, SpinHistory, User, UserMascot, UserStats
from app.schemas.user import OnboardingIn, UserUpdateIn
from app.services import auth_service, collection_service as svc, roadmap_service, stats_service
from tests import academy_helpers as H
from tests.factories import make_user

NOW = datetime(2026, 10, 5, 3, 0, tzinfo=UTC)
A1_COMMON = [1, 5, 11, 12, 13, 21, 22, 23]  # theo id tăng dần
A2_COMMON = [2, 3, 4, 6, 16, 17, 28]


class Rng:
    """random() luôn trả `value`; choice() lấy phần tử đầu (first) hoặc cuối của nhóm."""

    def __init__(self, value=0.0, last=False):
        self.value, self.last = value, last

    def random(self):
        return self.value

    def choice(self, seq):
        return seq[-1] if self.last else seq[0]


@pytest.fixture
async def world(db_session):
    await H.seeded(db_session)
    user = await make_user(db_session)
    return db_session, user


async def give(db, user, normal=0, special=0, shards=0, pity=None):
    stats = await stats_service.lock_stats(db, user.id)
    stats.spins_normal += normal
    stats.spins_special += special
    stats.shards += shards
    if pity is not None:
        stats.pity_counter = pity
    await db.flush()
    return stats


async def stats_of(db, user) -> UserStats:
    return await db.scalar(select(UserStats).where(UserStats.user_id == user.id).execution_options(populate_existing=True))


def key() -> str:
    return str(uuid.uuid4())


async def test_spin_deducts_and_validates_count(world):
    db, user = world
    await give(db, user, normal=3)
    out = await svc.spin(db, user, "normal", 1, key(), NOW, rng=random.Random(1))
    assert out["spins"] == {"normal": 2, "special": 0} and len(out["results"]) == 1 and out["replayed"] is False
    for bad in (0, 11):
        with pytest.raises(AppError) as exc:
            await svc.spin(db, user, "normal", bad, key(), NOW)
        assert exc.value.code == "INVALID_SPIN_COUNT"
    with pytest.raises(AppError) as exc:
        await svc.spin(db, user, "normal", 3, key(), NOW)
    assert exc.value.code == "NO_SPINS_LEFT" and exc.value.details == {"kind": "normal", "available": 2, "requested": 3}
    with pytest.raises(AppError) as exc:
        await svc.spin(db, user, "special", 1, key(), NOW)
    assert exc.value.code == "NO_SPINS_LEFT"
    assert (await stats_of(db, user)).spins_normal == 2


async def test_batch_of_ten_writes_ten_history_rows(world):
    db, user = world
    await give(db, user, special=10)
    out = await svc.spin(db, user, "special", 10, key(), NOW, rng=random.Random(5))
    assert [r["index"] for r in out["results"]] == list(range(10)) and out["spins"]["special"] == 0
    rows = list(await db.scalars(select(SpinHistory).where(SpinHistory.user_id == user.id)))
    assert len(rows) == 10 and {r.batch_id for r in rows} == {uuid.UUID(str(out["batch_id"]))}
    assert all(r.kind.value == "special" and r.final_rarity.value != "common" for r in rows)  # lượt đặc biệt không ra Thường
    stats = await stats_of(db, user)
    assert stats.total_spins == 10


async def test_duplicate_gives_shards_and_copies(world):
    db, user = world
    await give(db, user, normal=3)
    first = (await svc.spin(db, user, "normal", 1, key(), NOW, rng=Rng(0.0)))["results"][0]
    assert (first["mascot"]["id"], first["is_new_mascot"], first["was_duplicate"], first["shards_gained"]) == (1, True, False, 0)
    um = await db.scalar(select(UserMascot).where(UserMascot.user_id == user.id, UserMascot.mascot_id == 1))
    assert (um.copies, um.is_new, um.source) == (1, True, MascotSource.GACHA)
    out = await svc.spin(db, user, "normal", 2, key(), NOW, rng=Rng(0.0))  # trùng hai lần trong cùng batch
    assert [(r["was_duplicate"], r["shards_gained"], r["copies"]) for r in out["results"]] == [(True, 2, 2), (True, 2, 3)]
    assert out["shards"] == 4
    history = list(await db.scalars(select(SpinHistory).where(SpinHistory.user_id == user.id).order_by(SpinHistory.id)))
    assert [(h.was_duplicate, h.shards_gained) for h in history] == [(False, 0), (True, 2), (True, 2)]


async def test_new_user_pool_is_a1_only_until_boss_a1_won(world):
    db, user = world
    await give(db, user, normal=40)
    regions = {m.id: m.region.value for m in await svc.load_catalog(db)}
    out = await svc.spin(db, user, "normal", 10, key(), NOW, rng=Rng(0.0, last=True))
    assert {r["mascot"]["id"] for r in out["results"]} == {A1_COMMON[-1]}
    for _ in range(3):
        out = await svc.spin(db, user, "normal", 10, key(), NOW, rng=random.Random())
        assert {regions[r["mascot"]["id"]] for r in out["results"]} == {"A1"}
    assert (await svc.get_rates(db, user, NOW))["unlocked_regions"] == ["A1"]

    st = await roadmap_service.load_structure(db)
    await roadmap_service.complete_level(db, user, st, await H.level(db, "A1"), NOW)  # thắng Boss A1 → mở A2
    rates = await svc.get_rates(db, user, NOW)
    assert rates["unlocked_regions"] == ["A1", "A2"] and rates["pool_size"]["common"] == len(A1_COMMON) + len(A2_COMMON)
    await give(db, user, normal=1)
    out = await svc.spin(db, user, "normal", 1, key(), NOW, rng=Rng(0.0, last=True))
    assert out["results"][0]["mascot"]["id"] == 28 and regions[28] == "A2"


async def test_pity_carries_across_batches_and_kinds(world):
    db, user = world
    await give(db, user, normal=5, special=2, pity=18)
    a = await svc.spin(db, user, "normal", 1, key(), NOW, rng=Rng(0.0))  # Thường → 19
    b = await svc.spin(db, user, "special", 1, key(), NOW, rng=Rng(0.0))  # Hiếm (đặc biệt) → 20
    assert (a["pity_counter"], b["pity_counter"]) == (19, 20)
    c = await svc.spin(db, user, "normal", 2, key(), NOW, rng=Rng(0.0))  # lượt 1: pity ép Sử Thi → 0; lượt 2: Thường → 1
    assert [(r["rarity"], r["pity_triggered"]) for r in c["results"]] == [("epic", True), ("common", False)]
    assert c["pity_counter"] == 1
    d = await svc.spin(db, user, "special", 1, key(), NOW, rng=Rng(0.95))  # Huyền Thoại tự nhiên → về 0
    assert (d["results"][0]["rarity"], d["pity_counter"]) == ("legendary", 0)
    rows = list(await db.scalars(select(SpinHistory).where(SpinHistory.user_id == user.id).order_by(SpinHistory.id)))
    assert [(r.pity_before, r.pity_after) for r in rows] == [(18, 19), (19, 20), (20, 0), (0, 1), (1, 0)]


async def test_idempotent_replay_and_reuse(world):
    db, user = world
    await give(db, user, normal=5)
    k = key()
    first = await svc.spin(db, user, "normal", 2, k, NOW, rng=random.Random(3))
    again = await svc.spin(db, user, "normal", 2, k, NOW + timedelta(seconds=5), rng=random.Random(99))
    assert again["replayed"] is True
    assert {**again, "replayed": False} == first
    assert (await stats_of(db, user)).spins_normal == 3
    assert await db.scalar(select(func.count()).select_from(SpinHistory).where(SpinHistory.user_id == user.id)) == 2
    with pytest.raises(AppError) as exc:
        await svc.spin(db, user, "normal", 1, k, NOW)
    assert exc.value.code == "IDEMPOTENCY_KEY_REUSED"
    with pytest.raises(AppError) as exc:
        await svc.spin(db, user, "normal", 1, "", NOW)
    assert exc.value.code == "IDEMPOTENCY_KEY_REQUIRED"


async def test_old_idempotency_records_are_cleaned(world):
    db, user = world
    await give(db, user, normal=2)
    k = key()
    await svc.spin(db, user, "normal", 1, k, NOW, rng=random.Random(1))
    later = NOW + timedelta(hours=25)
    assert await svc.cleanup_idempotency(db, later) == 1
    out = await svc.spin(db, user, "normal", 1, k, later, rng=random.Random(1))  # key cũ đã hết hạn → lượt mới
    assert out["replayed"] is False and out["spins"]["normal"] == 0


async def test_exchange_rules(world):
    db, user = world
    await give(db, user, shards=25)
    out = await svc.exchange(db, user, 5, key(), NOW)  # Nấm Nón (A1, Thường, 20 mảnh)
    assert (out["mascot"]["id"], out["cost"], out["shards"]) == (5, 20, 5)
    um = await db.scalar(select(UserMascot).where(UserMascot.user_id == user.id, UserMascot.mascot_id == 5))
    assert (um.source, um.is_new) == (MascotSource.EXCHANGE, True)
    assert await db.scalar(select(func.count()).select_from(ShardExchange).where(ShardExchange.user_id == user.id)) == 1

    async def code(mascot_id):
        with pytest.raises(AppError) as exc:
            await svc.exchange(db, user, mascot_id, key(), NOW)
        return exc.value.code

    assert await code(5) == "MASCOT_ALREADY_OWNED"
    assert await code(7) == "NOT_ENOUGH_SHARDS"  # Tò He (Hiếm, 40)
    assert await code(4) == "MASCOT_NOT_EXCHANGEABLE"  # Bánh Mì Bé thuộc A2, chưa mở
    assert await code(31) == "MASCOT_NOT_EXCHANGEABLE"  # coming_soon
    await db.execute(update(Mascot).where(Mascot.id == 100).values(status=MascotStatus.RELEASED, name="Thử"))  # achievement đã ra mắt
    assert await code(100) == "MASCOT_NOT_EXCHANGEABLE"
    assert await code(999) == "MASCOT_NOT_FOUND"
    assert (await stats_of(db, user)).shards == 5


async def test_avatar_and_arena_require_ownership(world):
    db, user = world
    for field in ("avatar_mascot_id", "arena_mascot_id"):
        with pytest.raises(AppError) as exc:
            await auth_service.update_profile(db, user, UserUpdateIn(**{field: 7}))
        assert (exc.value.code, exc.value.details) == ("MASCOT_NOT_OWNED", {"field": field})
    await give(db, user, normal=1)
    won = (await svc.spin(db, user, "normal", 1, key(), NOW, rng=Rng(0.0)))["results"][0]["mascot"]["id"]
    user = await auth_service.update_profile(db, user, UserUpdateIn(avatar_mascot_id=won, arena_mascot_id=won))
    assert (user.avatar_mascot_id, user.arena_mascot_id) == (won, won)
    user = await auth_service.update_profile(db, user, UserUpdateIn(arena_mascot_id=None))
    assert user.arena_mascot_id is None and user.avatar_mascot_id == won


async def test_onboarding_grants_starter_and_collection_view(world):
    db, user = world
    await auth_service.complete_onboarding(db, user, OnboardingIn(goal="general", daily_minutes=10, start_mode="a1", starter_mascot_id=2))
    await auth_service.complete_onboarding(db, user, OnboardingIn(goal="general", daily_minutes=10, start_mode="a1", starter_mascot_id=2))
    col = await svc.get_collection(db, user, NOW)
    assert col["owned_count"] == 1 and col["total"] == 100 and col["avatar_mascot_id"] == 2
    assert col["owned"][0] | {"first_obtained_at": None, "last_obtained_at": None} == {
        "mascot_id": 2, "copies": 1, "is_new": True, "source": "starter", "first_obtained_at": None, "last_obtained_at": None}
    assert col["by_rarity"]["common"] == {"owned": 1, "total": 45} and col["by_region"]["A2"]["owned"] == 1
    assert col["by_region"]["A2"]["unlocked"] is False and col["new_count"] == 1
    assert await svc.mark_seen(db, user, [2, 3]) == 1
    assert (await svc.get_collection(db, user, NOW))["new_count"] == 0


async def test_migration_backfills_starters_for_existing_users(db_session):
    path = next(Path(__file__).resolve().parents[2].glob("alembic/versions/*_collection_mascots_gacha.py"))
    spec = importlib.util.spec_from_file_location("collection_migration", path)
    migration = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration)
    with_avatar, without = await make_user(db_session, "co"), await make_user(db_session, "khong")
    with_avatar.avatar_mascot_id = 3
    await db_session.flush()
    await db_session.execute(text(migration.BACKFILL_STARTERS_SQL))
    await db_session.execute(text(migration.BACKFILL_STARTERS_SQL))  # chạy lại không tạo thêm
    rows = (await db_session.execute(select(UserMascot.user_id, UserMascot.mascot_id, UserMascot.source)
                                     .where(UserMascot.user_id.in_([with_avatar.id, without.id])))).all()
    assert rows == [(with_avatar.id, 3, MascotSource.STARTER)]


async def test_two_parallel_spins_with_one_left_only_one_succeeds(test_engine, monkeypatch):
    """Kết nối riêng, commit thật: khóa dòng user_stats nên chỉ một request tiêu được lượt cuối."""

    async def only_a1(*_args):
        return ["A1"]

    monkeypatch.setattr(svc, "unlocked_regions", only_a1)
    async with AsyncSession(test_engine, expire_on_commit=False) as s:
        user = User(email=f"spin-{uuid.uuid4().hex[:6]}@wordclash.vn", username=f"spin{uuid.uuid4().hex[:6]}", display_name="Spin",
                    password_hash="x")
        s.add(user)
        await s.commit()
        await give(s, user, normal=1)
        await s.commit()

    async def attempt():
        async with AsyncSession(test_engine, expire_on_commit=False) as s:
            try:
                return await svc.spin(s, user, "normal", 1, key(), NOW, rng=random.Random())
            except AppError as exc:
                return exc.code

    try:
        results = await asyncio.gather(attempt(), attempt())
        assert sorted(r if isinstance(r, str) else "ok" for r in results) == ["NO_SPINS_LEFT", "ok"]
        async with AsyncSession(test_engine) as s:
            stats = await s.scalar(select(UserStats).where(UserStats.user_id == user.id))
            count = await s.scalar(select(func.count()).select_from(SpinHistory).where(SpinHistory.user_id == user.id))
            assert (stats.spins_normal, stats.total_spins, count) == (0, 1, 1)
    finally:
        async with AsyncSession(test_engine) as s:
            for model in (SpinHistory, UserMascot, IdempotencyKey):
                await s.execute(delete(model).where(model.user_id == user.id))
            await s.execute(delete(User).where(User.id == user.id))
            await s.commit()


async def test_dev_force_next_applies_to_exactly_one_spin_and_only_in_dev(world, monkeypatch):
    """POST /dev/force-next chỉ ép ĐÚNG lượt kế tiếp (các lượt sau quay ngẫu nhiên bình thường) và chỉ có tác dụng ở dev/e2e."""
    from app.core.config import settings

    db, user = world
    await give(db, user, normal=12)
    svc.force_next(user.id, "legendary", 10)
    out = await svc.spin(db, user, "normal", 1, key(), NOW, rng=Rng(0.0))  # ENV testing: lệnh ép bị bỏ qua
    assert out["results"][0]["mascot"]["id"] == 1 and user.id in svc._forced
    monkeypatch.setattr(settings, "ENV", "development")
    out = await svc.spin(db, user, "normal", 1, key(), NOW, rng=Rng(0.0))
    assert out["results"][0]["mascot"]["id"] == 10 and user.id not in svc._forced
    out = await svc.spin(db, user, "normal", 10, key(), NOW, rng=Rng(0.0))  # không còn ép: tỉ lệ gốc (0.0 → Thường)
    assert {r["rarity"] for r in out["results"]} == {"common"}
