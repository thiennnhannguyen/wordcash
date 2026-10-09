"""
TÀI KHOẢN MẪU CHO DEV / E2E: thay cho thanh "BIẾN THỂ (DEV)" cũ ở Sảnh. Mọi số liệu đi qua backend thật (API đọc DB như mọi
người dùng khác), nên Sảnh, Hồ Sơ, Bảng xếp hạng hiện đúng như với người dùng thật.

- `dev_normal`: đang học A1 (xong 5 chặng đầu), 150 từ đã thuộc (30 từ trong tuần này), rank Đồng, streak 5, vài linh vật,
  2 lượt quay, 20 từ đang học (có từ hay quên, đến hạn ôn), Cửa Ải hôm nay đã vượt.
- `dev_shaky`: xong 10 chặng A1 (tới Trận Boss), 290 từ đã thuộc nhưng rank Bạc (mốc 300) → lung lay, còn 2 ngày để gỡ;
  Cửa Ải hôm nay có câu sai.
- `dev_new`: vừa xong onboarding (linh vật khởi đầu #1), chưa học gì.
- `dev_admin`: role admin, chưa học gì, không hiện trên bảng xếp hạng — để xem tab "Báo lỗi" trên /dev/content (API
  /admin/content-reports chỉ cho admin).
Mật khẩu chung: DEV_PASSWORD (chỉ dev/e2e). Email `<username>@dev.wordclash.vn`, múi giờ Asia/Ho_Chi_Minh.

- Chạy lại an toàn: xóa 4 tài khoản này (kèm mọi dữ liệu liên quan, ON DELETE CASCADE) rồi tạo lại, nên số liệu luôn "tươi"
  theo ngày chạy (streak, Cửa Ải hôm nay, từ trong tuần). Không đụng tài khoản khác.
- Cần lộ trình A1 (kho thật hoặc lộ trình mẫu): chưa có bài nào thì tự chạy seeds/seed_dev_roadmap trước.
- Chỉ chạy khi ENV là development hoặc e2e (từ chối mọi môi trường khác). Chạy trong backend/: `python -m seeds.seed_dev_accounts`.
"""

import asyncio
import hashlib
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import SessionLocal, engine
from app.core.security import hash_password
from app.models import (
    DailyCheck,
    DailyCheckStatus,
    EntryState,
    Goal,
    Mascot,
    MascotObtain,
    MascotSource,
    MascotStatus,
    Role,
    SpinGrant,
    SpinKind,
    SpinReason,
    UnitEntry,
    User,
    UserDailyActivity,
    UserEntryProgress,
    UserMascot,
    UserStats,
)
from app.services import leaderboard_service, rank, roadmap_service
from app.utils.time import local_date

DEV_PASSWORD = "Wordclash2026"
ALLOWED_ENVS = ("development", "e2e")
USERNAMES = ("dev_normal", "dev_shaky", "dev_new", "dev_admin")


@dataclass(frozen=True)
class Plan:
    username: str
    display_name: str
    starter: int
    topics_done: int  # số chặng A1 đã xong (bài + bài tổng hợp)
    mastered: int
    mastered_this_week: int
    rank: str  # rank hiện tại lưu trong user_stats (có thể cao hơn rank theo số từ → lung lay)
    shaky_days_left: int | None
    streak: int
    streak_best: int
    extra_mascots: int  # số linh vật vòng quay (vùng A1) ngoài linh vật khởi đầu
    spins_normal: int
    learning: int
    today_check: DailyCheckStatus | None
    role: Role = Role.USER


PLANS = (
    Plan("dev_normal", "Dev Bình Thường", 2, 5, 150, 30, "dong", None, 5, 9, 5, 2, 20, DailyCheckStatus.PASSED),
    Plan("dev_shaky", "Dev Lung Lay", 3, 10, 290, 12, "bac", 2, 2, 14, 9, 0, 25, DailyCheckStatus.PARTIAL),
    Plan("dev_new", "Dev Người Mới", 1, 0, 0, 0, "tan_binh", None, 0, 0, 0, 0, 0, None),
    Plan("dev_admin", "Dev Quản Trị", 1, 0, 0, 0, "tan_binh", None, 0, 0, 0, 0, 0, None, Role.ADMIN),
)


def _noise(day: date, salt: str, top: int) -> int:
    """Số giả ngẫu nhiên nhưng cố định theo ngày (lịch hoạt động mẫu)."""
    return int(hashlib.sha256(f"{salt}|{day}".encode()).hexdigest(), 16) % (top + 1)


async def _a1_entries(session: AsyncSession, st: roadmap_service.Structure, topics: int) -> list[int]:
    """Id mục từ của `topics` chặng A1 đầu tiên, theo thứ tự chặng → bài → vị trí."""
    a1 = next((lv for lv in st.levels if lv.code == "A1"), None)
    if a1 is None:
        return []
    out: list[int] = []
    for topic in st.topics[a1.id][:topics]:
        for unit in st.units[topic.id]:
            out += list(await session.scalars(select(UnitEntry.entry_id).where(UnitEntry.unit_id == unit.id).order_by(UnitEntry.id)))
    return list(dict.fromkeys(out))


async def _create(session: AsyncSession, plan: Plan, now: datetime, st: roadmap_service.Structure) -> User:
    user = User(email=f"{plan.username}@dev.wordclash.vn", username=plan.username, display_name=plan.display_name,
                password_hash=hash_password(DEV_PASSWORD), timezone="Asia/Ho_Chi_Minh", goal=Goal.GENERAL, daily_minutes=15,
                onboarding_completed_at=now - timedelta(days=60 if plan.mastered else 0), avatar_mascot_id=plan.starter,
                role=plan.role, show_on_leaderboard=plan.role != Role.ADMIN)
    session.add(user)
    await session.flush()
    today = local_date(user, now)

    # Linh vật: khởi đầu + vài con vòng quay vùng A1 (đã ra mắt)
    session.add(UserMascot(user_id=user.id, mascot_id=plan.starter, copies=1, source=MascotSource.STARTER,
                           first_obtained_at=now - timedelta(days=60), last_obtained_at=now - timedelta(days=60), is_new=False))
    pool = list(await session.scalars(select(Mascot.id).where(
        Mascot.region == "A1", Mascot.status == MascotStatus.RELEASED, Mascot.obtain == MascotObtain.GACHA, Mascot.id.not_in([1, 2, 3])
    ).order_by(Mascot.id)))
    for i, mid in enumerate(pool[:plan.extra_mascots]):
        at = now - timedelta(days=50 - i * 4)
        session.add(UserMascot(user_id=user.id, mascot_id=mid, copies=1 + (i % 3 == 0), source=MascotSource.GACHA,
                               first_obtained_at=at, last_obtained_at=at, is_new=i == 0))

    # Lộ trình: mở A1 rồi đánh dấu xong các chặng đầu
    await roadmap_service.ensure_initialized(session, user, now, st)
    a1 = next((lv for lv in st.levels if lv.code == "A1"), None)
    if a1 is not None:
        for topic in st.topics[a1.id][:plan.topics_done]:
            for unit in st.units[topic.id]:
                await roadmap_service.complete_unit(session, user, st, unit, now - timedelta(days=3))
            await roadmap_service.complete_topic(session, user, st, topic, now - timedelta(days=3))

    # Tiến độ từng từ: `mastered` từ đầu danh sách (một phần trong tuần này), `learning` kế tiếp (có từ hay quên, đến hạn ôn)
    ids = await _a1_entries(session, st, max(plan.topics_done, 1) + 1)
    week_start = leaderboard_service.week_bounds(now)[0]
    for i, eid in enumerate(ids[:plan.mastered]):
        recent = i >= plan.mastered - plan.mastered_this_week
        at = min(max(week_start, now - timedelta(days=2)) + timedelta(minutes=i), now) if recent else now - timedelta(days=40 - (i % 30))
        session.add(UserEntryProgress(
            user_id=user.id, entry_id=eid, status=EntryState.MASTERED, strong_days=3, last_strong_day=at.date(), mastered_at=at, first_mastered_at=at,
            interval_days=16, repetitions=4, due_at=now + timedelta(days=1 + i % 14), correct_count=6, wrong_count=i % 3,
            lapse_count=i % 3, first_seen_at=at - timedelta(days=10), first_seen_day=(at - timedelta(days=10)).date(), last_seen_at=at))
    for j, eid in enumerate(ids[plan.mastered:plan.mastered + plan.learning]):
        session.add(UserEntryProgress(
            user_id=user.id, entry_id=eid, status=EntryState.LEARNING, strong_days=1, interval_days=1, repetitions=1,
            due_at=now - timedelta(hours=1) if j % 2 == 0 else now + timedelta(days=j % 5 + 1), correct_count=2, wrong_count=j % 6,
            lapse_count=(j * 7) % 6, first_seen_at=now - timedelta(days=5), first_seen_day=today - timedelta(days=5),
            last_seen_at=now - timedelta(days=1)))
    user.mastered_count = min(plan.mastered, len(ids))

    # Chỉ số game: rank (có thể lung lay), streak, lượt quay, sổ cấp lượt
    deadline = now + timedelta(days=plan.shaky_days_left) if plan.shaky_days_left else None
    session.add(UserStats(
        user_id=user.id, current_rank=plan.rank, highest_rank=plan.rank,
        rank_shaky_since=deadline - timedelta(days=settings.RANK_GRACE_DAYS) if deadline else None, rank_shaky_deadline=deadline,
        streak_current=plan.streak, streak_best=plan.streak_best,
        streak_last_date=(today if plan.today_check else today - timedelta(days=1)) if plan.streak else None,
        max_spin_milestone=user.mastered_count // settings.SPIN_EVERY_N_WORDS * settings.SPIN_EVERY_N_WORDS,
        spins_normal=plan.spins_normal, total_spins=plan.extra_mascots))
    for m in range(settings.SPIN_EVERY_N_WORDS, user.mastered_count + 1, settings.SPIN_EVERY_N_WORDS):
        session.add(SpinGrant(user_id=user.id, kind=SpinKind.NORMAL, reason=SpinReason.MILESTONE, ref=str(m),
                              created_at=now - timedelta(days=40 - m // 10)))
    for code in rank.ranks()[1:rank.index_of(plan.rank) + 1]:
        session.add(SpinGrant(user_id=user.id, kind=SpinKind.SPECIAL, reason=SpinReason.RANK_UP, ref=code,
                              created_at=now - timedelta(days=30 - 10 * rank.index_of(code))))

    # Lịch hoạt động 12 tuần, Cửa Ải 30 ngày gần nhất (ngày nghỉ cố định theo ngày)
    if plan.mastered:
        for back in range(84):
            day = today - timedelta(days=back)
            if _noise(day, plan.username, 6) == 0 and back > 0:
                continue
            new, rev = _noise(day, plan.username + "n", 15), _noise(day, plan.username + "r", 20)
            session.add(UserDailyActivity(user_id=user.id, local_date=day, new_words=new, reviews=rev, correct=new + rev - rev // 5, total=new + rev))
        for back in range(1, 30):
            day = today - timedelta(days=back)
            wrong = _noise(day, plan.username + "c", 4) == 0
            session.add(DailyCheck(user_id=user.id, local_date=day, status=DailyCheckStatus.PARTIAL if wrong else DailyCheckStatus.PASSED,
                                   correct_count=3 if wrong else 4, total=4, completed_at=now - timedelta(days=back)))
    if plan.today_check:
        partial = plan.today_check == DailyCheckStatus.PARTIAL
        session.add(DailyCheck(user_id=user.id, local_date=today, status=plan.today_check, correct_count=3 if partial else 4, total=4,
                               completed_at=now))
    await session.flush()
    return user


async def seed(session: AsyncSession, now: datetime | None = None) -> list[User]:
    """Xóa rồi tạo lại 4 tài khoản mẫu. Không kiểm tra ENV (main() kiểm tra); test gọi thẳng."""
    now = now or datetime.now(UTC)
    st = await roadmap_service.load_structure(session)
    if not any(st.units.values()):
        from seeds.seed_dev_roadmap import seed as seed_roadmap

        await seed_roadmap(session)
        st = await roadmap_service.load_structure(session)
    await session.execute(delete(User).where(User.username.in_(USERNAMES)))
    users = [await _create(session, plan, now, st) for plan in PLANS]
    await session.commit()
    return users


async def main() -> None:
    if settings.ENV not in ALLOWED_ENVS:
        raise SystemExit(f"Từ chối chạy: seed_dev_accounts chỉ dành cho {', '.join(ALLOWED_ENVS)} (ENV hiện tại: {settings.ENV}).")
    async with SessionLocal() as session:
        users = await seed(session)
    await engine.dispose()
    for u in users:
        print(f"{u.username:12} {u.email:32} mật khẩu: {DEV_PASSWORD}  ({u.mastered_count} từ đã thuộc{', admin' if u.role == Role.ADMIN else ''})")


if __name__ == "__main__":
    asyncio.run(main())
