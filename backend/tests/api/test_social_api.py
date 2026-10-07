"""
API Từ của ngày, Hồ sơ, Bảng xếp hạng, số liệu công khai (PostgreSQL test thật, clock cố định).

- /words/daily: tất định theo (ngày theo múi giờ người dùng, cấp), đúng cấp đã mở, bỏ qua mục retired / draft, trạng thái học.
- /me/profile, /users/{username}/profile: hồ sơ người khác không lộ email, khóa học, từ hay quên, lịch hoạt động; username không
  tồn tại → 404; tủ trưng bày (mặc định 3 con hiếm nhất, PATCH kiểm tra sở hữu).
- /leaderboard: tuần ISO theo giờ Việt Nam (ranh giới thứ Hai 00:00), bỏ từ tự tạo, show_on_leaderboard, my_entry, cache.
- /public/stats: không cần đăng nhập, ngưỡng hiện số người học, đếm mục dạy được theo cấp, luật game.
"""

from datetime import UTC, date, datetime, timedelta

from sqlalchemy import func, select

from app.core.config import settings
from app.core.security import create_access_token
from app.models import (
    DailyCheck,
    DailyCheckStatus,
    Entry,
    EntryState,
    Mascot,
    MascotSource,
    SpinGrant,
    SpinKind,
    SpinReason,
    UserCourse,
    UserDailyActivity,
    UserEntryProgress,
    UserMascot,
    UserStats,
)
from app.services import cache, leaderboard_service, word_of_day
from tests import academy_helpers as H
from tests.factories import make_custom, make_entry, make_user

API = "/api/v1"
NOW = datetime(2026, 10, 8, 3, 0, tzinfo=UTC)  # thứ Năm 10:00 giờ Việt Nam


async def _player(db, name: str, *, mastered: int = 0, show: bool = True):
    user = await make_user(db, name)
    user.onboarding_completed_at = NOW - timedelta(days=30)
    user.mastered_count = mastered
    user.show_on_leaderboard = show
    db.add(UserStats(user_id=user.id))
    await db.flush()
    return user, {"Authorization": f"Bearer {create_access_token(user.id, user.role.value)[0]}"}


async def _master(db, user, entry, at):
    db.add(UserEntryProgress(user_id=user.id, entry_id=entry.id, status=EntryState.MASTERED, mastered_at=at))
    await db.flush()


async def _own(db, user, mascot_id, copies=1):
    db.add(UserMascot(user_id=user.id, mascot_id=mascot_id, copies=copies, source=MascotSource.GACHA, first_obtained_at=NOW, last_obtained_at=NOW, is_new=False))
    await db.flush()


# ---------- Từ của ngày ----------

async def _teachable_ids(db, level):
    return list(await db.scalars(select(Entry.id).where(Entry.teachable(), Entry.cefr == level).order_by(Entry.id)))


async def test_daily_word_deterministic_by_day_and_level(client, db_session, clock_at):
    clock_at(NOW)
    await H.seeded(db_session)  # A1, A2 + mục DEV_SAMPLE đã duyệt
    b1 = await make_entry(db_session, "zebra-b1", "ngựa vằn", cefr="B1")  # cấp chưa mở: không bao giờ được chọn
    _, h1 = await _player(db_session, "an")
    _, h2 = await _player(db_session, "binh")

    first = (await client.get(f"{API}/words/daily", headers=h1)).json()
    second = (await client.get(f"{API}/words/daily", headers=h2)).json()
    ids = await _teachable_ids(db_session, "A1")
    assert first["level"] == "A1" and first["date"] == "2026-10-08"
    assert first["entry"]["id"] == ids[word_of_day.pick_index(date(2026, 10, 8), "A1", len(ids))]
    assert second["entry"]["id"] == first["entry"]["id"] and first["status"] == "new"  # cùng ngày, cùng cấp → cùng từ
    assert first["entry"]["id"] != b1.id

    # Ngày tính theo múi giờ người dùng: 17:30 UTC = 00:30 ngày 9 ở Việt Nam
    clock_at(datetime(2026, 10, 8, 17, 30, tzinfo=UTC))
    nxt = (await client.get(f"{API}/words/daily", headers=h1)).json()
    assert nxt["date"] == "2026-10-09"
    assert nxt["entry"]["id"] == ids[word_of_day.pick_index(date(2026, 10, 9), "A1", len(ids))]


async def test_daily_word_skips_retired_and_draft_and_reports_status(client, db_session, clock_at):
    clock_at(NOW)
    await H.seeded(db_session)
    await db_session.execute(Entry.__table__.update().where(Entry.cefr == "A1").values(retired_at=NOW))  # mọi mục A1 ngừng dùng
    await make_entry(db_session, "draft-a1", "nháp", cefr="A1", status="draft")
    user, h = await _player(db_session, "an")
    assert (await client.get(f"{API}/words/daily", headers=h)).json()["entry"] is None  # chỉ còn mục retired / draft

    keep = await make_entry(db_session, "apple", "quả táo", cefr="A1")
    body = (await client.get(f"{API}/words/daily", headers=h)).json()
    assert body["entry"]["id"] == keep.id and body["status"] == "new"
    await _master(db_session, user, keep, NOW)
    assert (await client.get(f"{API}/words/daily", headers=h)).json()["status"] == "mastered"


def test_pick_index_is_pure_and_stable():
    assert word_of_day.pick_index(date(2026, 10, 8), "A1", 97) == word_of_day.pick_index(date(2026, 10, 8), "A1", 97)
    picks = {word_of_day.pick_index(date(2026, 10, 8) + timedelta(days=i), "A1", 97) for i in range(30)}
    assert len(picks) > 10  # đổi theo ngày


# ---------- Hồ sơ ----------

async def test_public_profile_hides_private_fields(client, db_session, clock_at):
    clock_at(NOW)
    await H.seeded(db_session)
    me, h = await _player(db_session, "an")
    other, _ = await _player(db_session, "binh", mastered=120)
    by_rarity = {r: list(await db_session.scalars(select(Mascot.id).where(Mascot.rarity == r).order_by(Mascot.id)))
                 for r in ("common", "epic", "legendary")}
    common1, common2, epic, legend = *by_rarity["common"][:2], by_rarity["epic"][0], by_rarity["legendary"][0]
    for mid in (common2, common1, epic, legend):
        await _own(db_session, other, mid)
    entry = await make_entry(db_session, "lost", "mất", cefr="A1")
    db_session.add(UserEntryProgress(user_id=other.id, entry_id=entry.id, status=EntryState.LEARNING, lapse_count=4))
    db_session.add(UserCourse(user_id=other.id, title="Bí mật", icon="book", color="primary"))
    await db_session.flush()

    res = await client.get(f"{API}/users/{other.username.upper()}/profile", headers=h)
    assert res.status_code == 200, res.text
    body = res.json()
    assert set(body) == {"display_name", "username", "avatar_mascot_id", "rank", "mastered_count", "streak_current", "streak_best",
                         "current_level", "mascots_owned", "showcase"}
    assert body["mastered_count"] == 120 and body["rank"] == "dong" and body["mascots_owned"] == 4
    assert [s["mascot_id"] for s in body["showcase"]] == [legend, epic, common1]  # mặc định: 3 con hiếm nhất
    text = res.text
    assert other.email not in text and "Bí mật" not in text and "lost" not in text

    missing = await client.get(f"{API}/users/khong-ton-tai/profile", headers=h)
    assert missing.status_code == 404 and missing.json()["error"]["code"] == "USER_NOT_FOUND"
    assert (await client.get(f"{API}/users/{other.username}/profile")).status_code == 401


async def test_my_profile_private_sections(client, db_session, clock_at):
    clock_at(NOW)
    await H.seeded(db_session)
    me, h = await _player(db_session, "an", mastered=105)
    custom = await make_custom(db_session, me, "my-word", "từ riêng")
    a1 = (await _teachable_ids(db_session, "A1"))[:2]
    for i, eid in enumerate(a1):
        db_session.add(UserEntryProgress(user_id=me.id, entry_id=eid, status=EntryState.MASTERED, mastered_at=NOW, lapse_count=i + 1))
    db_session.add(UserEntryProgress(user_id=me.id, entry_id=custom.id, status=EntryState.LEARNING, lapse_count=7))
    db_session.add(UserDailyActivity(user_id=me.id, local_date=date(2026, 10, 7), new_words=12, reviews=3, correct=10, total=15))
    db_session.add(DailyCheck(user_id=me.id, local_date=date(2026, 10, 7), status=DailyCheckStatus.PARTIAL, correct_count=3, total=4))
    db_session.add(DailyCheck(user_id=me.id, local_date=date(2026, 8, 1), status=DailyCheckStatus.PASSED, correct_count=5, total=5))  # ngoài 30 ngày
    db_session.add(SpinGrant(user_id=me.id, kind=SpinKind.SPECIAL, reason=SpinReason.RANK_UP, ref="dong", created_at=NOW - timedelta(days=2)))
    db_session.add(UserCourse(user_id=me.id, title="IT", icon="book", color="primary"))
    db_session.add(UserCourse(user_id=me.id, title="Cũ", icon="book", color="primary", archived_at=NOW))
    await db_session.flush()

    res = await client.get(f"{API}/me/profile", headers=h)
    assert res.status_code == 200, res.text
    p = res.json()
    assert p["rank"] == "dong" and p["rank_first_reached_at"].startswith("2026-10-06")
    assert p["courses_count"] == 1 and p["show_on_leaderboard"] is True and p["showcase_mascot_ids"] is None
    a1_level = next(lv for lv in p["levels"] if lv["code"] == "A1")
    assert a1_level["mastered"] == 2 and a1_level["total"] == len(await _teachable_ids(db_session, "A1")) and a1_level["unlocked"]
    assert len(p["activity"]) == 84 and p["activity"][-1]["date"] == "2026-10-08"
    assert next(d for d in p["activity"] if d["date"] == "2026-10-07") == {"date": "2026-10-07", "new_words": 12, "reviews": 3, "answers": 15}
    assert p["daily_check_accuracy"] == {"days": 30, "correct": 3, "total": 4, "rate": 0.75}
    assert [w["lapse_count"] for w in p["most_forgotten"]] == [7, 2, 1] and p["most_forgotten"][0]["headword"] == "my-word"


async def test_showcase_patch_checks_ownership(client, db_session, clock_at):
    clock_at(NOW)
    me, h = await _player(db_session, "an")
    await _own(db_session, me, 5)
    await _own(db_session, me, 50)
    bad = await client.patch(f"{API}/users/me", json={"showcase_mascot_ids": [5, 99]}, headers=h)
    assert bad.status_code == 403 and bad.json()["error"]["code"] == "MASCOT_NOT_OWNED"
    assert (await client.patch(f"{API}/users/me", json={"showcase_mascot_ids": [5, 50, 5]}, headers=h)).status_code == 422
    assert (await client.patch(f"{API}/users/me", json={"showcase_mascot_ids": [1, 2, 3, 4]}, headers=h)).status_code == 422
    ok = await client.patch(f"{API}/users/me", json={"showcase_mascot_ids": [5, 50], "show_on_leaderboard": False}, headers=h)
    assert ok.status_code == 200 and ok.json()["showcase_mascot_ids"] == [5, 50] and ok.json()["show_on_leaderboard"] is False
    pub = (await client.get(f"{API}/users/{me.username}/profile", headers=h)).json()
    assert [s["mascot_id"] for s in pub["showcase"]] == [5, 50]
    reset = await client.patch(f"{API}/users/me", json={"showcase_mascot_ids": None}, headers=h)
    assert reset.json()["showcase_mascot_ids"] is None


# ---------- Bảng xếp hạng ----------

def test_week_bounds_monday_midnight_vietnam():
    # Chủ nhật 23:59 giờ VN (16:59 UTC) vẫn thuộc tuần cũ; thứ Hai 00:00 VN (CN 17:00 UTC) sang tuần mới
    sunday = datetime(2026, 10, 11, 16, 59, tzinfo=UTC)
    start, end = leaderboard_service.week_bounds(sunday)
    assert start == datetime(2026, 10, 4, 17, 0, tzinfo=UTC) and end == datetime(2026, 10, 11, 17, 0, tzinfo=UTC)
    start2, _ = leaderboard_service.week_bounds(datetime(2026, 10, 11, 17, 0, tzinfo=UTC))
    assert start2 == end


async def test_weekly_leaderboard_rules(client, db_session, clock_at):
    clock_at(NOW)
    cache.memory.clear()
    entries = [await make_entry(db_session, f"w{i}", f"nghĩa {i}", cefr="A1") for i in range(6)]
    monday = datetime(2026, 10, 4, 17, 0, tzinfo=UTC)  # thứ Hai 05/10 00:00 giờ VN
    a, ha = await _player(db_session, "an")
    b, _ = await _player(db_session, "binh")
    c, _ = await _player(db_session, "cuong", show=False)
    d, _ = await _player(db_session, "dung")
    for e in entries[:3]:
        await _master(db_session, a, e, monday + timedelta(hours=1))
    await _master(db_session, a, entries[3], monday - timedelta(seconds=1))  # Chủ nhật 23:59:59 tuần trước: không tính
    for e in entries[:3]:
        await _master(db_session, b, e, NOW - timedelta(hours=1))
    for e in entries[:5]:
        await _master(db_session, c, e, NOW)  # điểm cao nhất nhưng đã tắt hiện trên bảng
    custom = await make_custom(db_session, d, "mine", "của tôi")
    await _master(db_session, d, custom, NOW)  # từ tự tạo: không tính
    db_session.add(UserEntryProgress(user_id=d.id, entry_id=entries[5].id, status=EntryState.FORGOTTEN, mastered_at=NOW))  # đã quên
    await db_session.flush()

    res = await client.get(f"{API}/leaderboard", params={"board": "weekly"}, headers=ha)
    assert res.status_code == 200, res.text
    body = res.json()
    rows = [(r["rank"], r["username"], r["score"]) for r in body["entries"]]
    assert rows == [(1, a.username, 3), (1, b.username, 3)]  # bằng điểm cùng hạng; c ẩn, d không có điểm
    assert body["my_entry"] == {"rank": 1, "score": 3, "hidden": False}
    assert body["seconds_left"] == int((datetime(2026, 10, 11, 17, 0, tzinfo=UTC) - NOW).total_seconds())
    assert "email" not in res.text

    _, hc = await _player(db_session, "xem")
    c_token = {"Authorization": f"Bearer {create_access_token(c.id, c.role.value)[0]}"}
    hidden = (await client.get(f"{API}/leaderboard", params={"board": "weekly"}, headers=c_token)).json()
    assert hidden["my_entry"] == {"rank": 1, "score": 5, "hidden": True}  # vẫn thấy hạng của mình
    none = (await client.get(f"{API}/leaderboard", params={"board": "weekly"}, headers=hc)).json()
    assert none["my_entry"] == {"rank": None, "score": 0, "hidden": False}

    # Thứ Hai tuần sau 00:00 giờ VN: bảng tuần về trống
    clock_at(datetime(2026, 10, 11, 17, 0, tzinfo=UTC))
    assert (await client.get(f"{API}/leaderboard", params={"board": "weekly"}, headers=ha)).json()["entries"] == []


async def test_alltime_leaderboard_and_cache(client, db_session, clock_at, fake_redis):
    clock_at(NOW)
    cache.memory.clear()
    a, ha = await _player(db_session, "an", mastered=50)
    b, _ = await _player(db_session, "binh", mastered=320)
    await _player(db_session, "zero")
    body = (await client.get(f"{API}/leaderboard", params={"board": "alltime", "limit": 1}, headers=ha)).json()
    assert [(r["rank"], r["username"], r["tier"]) for r in body["entries"]] == [(1, b.username, "bac")]
    assert body["my_entry"]["rank"] == 2 and body["seconds_left"] is None
    assert await fake_redis.get("lb:alltime:all:1") is not None  # danh sách top đã vào cache Redis
    b.mastered_count = 10
    await db_session.flush()
    cached = (await client.get(f"{API}/leaderboard", params={"board": "alltime", "limit": 1}, headers=ha)).json()
    assert cached["entries"][0]["username"] == b.username  # danh sách lấy từ cache (60 giây)
    assert cached["my_entry"]["rank"] == 1  # my_entry luôn tính lại
    assert (await client.get(f"{API}/leaderboard", params={"board": "x"}, headers=ha)).status_code == 422


# ---------- Số liệu công khai ----------

async def test_public_stats_anonymous(client, db_session, clock_at, monkeypatch, fake_redis):
    clock_at(NOW)
    cache.memory.clear()
    await H.seeded(db_session)
    await make_entry(db_session, "retired-a1", "cũ", cefr="A1", retired_at=NOW)
    await make_entry(db_session, "draft-a1", "nháp", cefr="A1", status="draft")
    await _player(db_session, "an", mastered=40)
    await _player(db_session, "binh", mastered=2)
    res = await client.get(f"{API}/public/stats")  # không cần đăng nhập
    assert res.status_code == 200, res.text
    s = res.json()
    a1 = await db_session.scalar(select(func.count()).select_from(Entry).where(Entry.teachable(), Entry.cefr == "A1"))
    assert next(lv for lv in s["entries_by_level"] if lv["code"] == "A1")["count"] == a1
    assert s["learners"] is None  # 2 < PUBLIC_LEARNERS_MIN
    assert s["mastered_total"] >= 42 and s["mascots_total"] == 100
    assert s["mascots_by_rarity"]["legendary"]["total"] == 7
    assert {m["rarity"] for m in s["featured_mascots"]} == {"common", "rare", "epic", "legendary"} and len(s["featured_mascots"]) == 5
    assert s["rules"]["spin_every_n_words"] == settings.SPIN_EVERY_N_WORDS and s["rules"]["ranks"][1] == {"key": "dong", "min": 100}
    assert s["rules"]["rates"]["special"] == settings.GACHA_RATES_SPECIAL and s["rules"]["unit_size"] == {"min": 15, "max": 15}
    assert "email" not in res.text and "username" not in res.text

    cache.memory.clear()
    await fake_redis.flushall()  # bỏ cache 10 phút để đọc lại
    monkeypatch.setattr(settings, "PUBLIC_LEARNERS_MIN", 2)
    assert (await client.get(f"{API}/public/stats")).json()["learners"] >= 2


async def test_cache_falls_back_to_memory_when_redis_fails():
    from redis.exceptions import ConnectionError as RedisConnectionError

    class Broken:
        async def get(self, key):
            raise RedisConnectionError("down")

        async def set(self, *a, **k):
            raise RedisConnectionError("down")

    cache.memory.clear()
    calls = []

    async def compute():
        calls.append(1)
        return {"n": len(calls)}

    assert await cache.get_or_compute(Broken(), "k", 60, compute) == {"n": 1}
    assert await cache.get_or_compute(Broken(), "k", 60, compute) == {"n": 1}  # lần hai lấy từ bộ nhớ dự phòng
    assert len(calls) == 1
