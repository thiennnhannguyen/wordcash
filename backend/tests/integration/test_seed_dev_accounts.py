"""
seeds/seed_dev_accounts.py: 3 tài khoản mẫu qua dữ liệu thật; chạy lại an toàn (xóa rồi tạo lại, không trùng);
số liệu đọc qua service thật khớp từng biến thể (bình thường, lung lay, người mới).
"""

from datetime import UTC, datetime

from sqlalchemy import func, select

from app.models import User, UserEntryProgress
from app.services import leaderboard_service, me_service, profile_service
from seeds import seed_dev_accounts

NOW = datetime(2026, 10, 8, 3, 0, tzinfo=UTC)


async def test_seed_dev_accounts_variants_and_rerun(db_session, clock_at):
    clock_at(NOW)
    await seed_dev_accounts.seed(db_session, NOW)
    users = await seed_dev_accounts.seed(db_session, NOW)  # chạy lại: không trùng
    assert await db_session.scalar(select(func.count()).select_from(User).where(User.username.in_(seed_dev_accounts.USERNAMES))) == 3
    by = {u.username: u for u in users}

    normal = await me_service.get_stats(db_session, by["dev_normal"], NOW)
    assert normal["mastered_count"] == 150 and normal["rank"]["current"] == "dong" and not normal["rank"]["shaky"]
    assert normal["streak"]["current"] == 5 and normal["today"]["daily_check"] == "passed"
    mastered_rows = await db_session.scalar(select(func.count()).select_from(UserEntryProgress).where(
        UserEntryProgress.user_id == by["dev_normal"].id, UserEntryProgress.status == "mastered"))
    assert mastered_rows == 150  # bộ đếm khớp số dòng thật

    shaky = await me_service.get_stats(db_session, by["dev_shaky"], NOW)
    assert shaky["rank"]["current"] == "bac" and shaky["rank"]["shaky"] and shaky["rank"]["words_to_recover"] == 10
    assert shaky["position"]["step"] == "boss"

    new = await profile_service.get_my_profile(db_session, by["dev_new"], NOW)
    assert new["mastered_count"] == 0 and new["mascots_owned"] == 1 and new["most_forgotten"] == []

    board = await leaderboard_service.get_leaderboard(db_session, None, by["dev_new"], "weekly", 50, NOW)
    scores = {r["username"]: r["score"] for r in board["entries"]}
    assert scores["dev_normal"] == 30 and scores["dev_shaky"] == 12 and "dev_new" not in scores
