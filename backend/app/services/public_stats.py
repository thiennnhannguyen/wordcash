"""
Số liệu công khai cho Landing (GET /public/stats, không cần đăng nhập), lưu cache PUBLIC_STATS_CACHE_SECONDS giây.

- `learners`: số người học (tài khoản đang hoạt động, đã xong onboarding). Chỉ trả khi ≥ PUBLIC_LEARNERS_MIN; ít hơn → null
  (Landing thay bằng câu không có số).
- `mastered_total`: tổng số từ HỆ THỐNG đã thuộc trên toàn hệ thống (Σ users.mastered_count).
- `entries_by_level`: số mục dạy được (`Entry.teachable()`: approved, chưa retired) theo từng cấp có trong `levels`.
- Linh vật: số đã ra mắt / tổng ô, theo độ hiếm; `featured_mascots`: tối đa 5 linh vật đã ra mắt (nhận qua vòng quay) để Landing
  vẽ bộ thẻ xòe, mỗi độ hiếm ít nhất một con (con có số nhỏ nhất), thêm con Thường kế tiếp cho đủ 5. Thông tin như GET /mascots.
- `rules`: luật game công khai đọc thẳng từ settings (mốc rank, tỉ lệ quay, pity, mảnh, ngưỡng qua bài, Cửa Ải, streak,
  cỡ bài thật trong DB). Frontend không giữ bản sao các con số này.
Không có thông tin cá nhân nào trong phản hồi.
"""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models import Entry, Level, Mascot, MascotObtain, MascotStatus, User, UnitEntry
from app.services import collection_service
from app.services.mascot_catalog import RARITIES

FEATURED = 5


def rules() -> dict:
    return {
        "ranks": [{"key": k, "min": v} for k, v in settings.RANK_THRESHOLDS.items()],
        "rank_grace_days": settings.RANK_GRACE_DAYS,
        "spin_every_n_words": settings.SPIN_EVERY_N_WORDS,
        "streak_spin_every": settings.STREAK_SPIN_EVERY,
        "pity_epic": settings.PITY_EPIC,
        "rates": {"normal": settings.GACHA_RATES_NORMAL, "special": settings.GACHA_RATES_SPECIAL},
        "shards_per_duplicate": settings.GACHA_SHARDS_PER_DUPLICATE,
        "exchange_cost": settings.GACHA_EXCHANGE_COST,
        "max_batch": settings.GACHA_MAX_BATCH,
        "unit_pass_rate": settings.UNIT_PASS_RATE,
        "topic_pass_rate": settings.TOPIC_PASS_RATE,
        "boss_pass_rate": settings.BOSS_PASS_RATE,
        "boss_questions": settings.BOSS_QUESTIONS,
        "daily_check_min_words": settings.DAILY_CHECK_MIN_WORDS,
        "daily_check_max_words": settings.DAILY_CHECK_MAX_WORDS,
    }


async def _unit_size(session: AsyncSession) -> dict | None:
    sizes = select(func.count().label("n")).select_from(UnitEntry).group_by(UnitEntry.unit_id).subquery()
    low, high = (await session.execute(select(func.min(sizes.c.n), func.max(sizes.c.n)))).one()
    return {"min": low, "max": high} if low else None


def _featured(catalog: list[Mascot]) -> list[Mascot]:
    pool = [m for m in catalog if m.status == MascotStatus.RELEASED and m.obtain == MascotObtain.GACHA]
    picked = [m for r in RARITIES if (m := next((x for x in pool if x.rarity.value == r), None))]
    for m in pool:
        if len(picked) >= FEATURED:
            break
        if m not in picked:
            picked.append(m)
    return sorted(picked[:FEATURED], key=lambda m: (RARITIES.index(m.rarity.value), m.id))


async def compute(session: AsyncSession) -> dict:
    learners = await session.scalar(select(func.count()).select_from(User).where(
        User.is_active.is_(True), User.onboarding_completed_at.is_not(None)
    )) or 0
    mastered = await session.scalar(select(func.coalesce(func.sum(User.mastered_count), 0)).where(User.is_active.is_(True))) or 0
    counts = dict((await session.execute(select(Entry.cefr, func.count()).where(Entry.teachable()).group_by(Entry.cefr))).all())
    levels = [{"code": lv.code, "name": lv.name, "count": counts.get(lv.code, 0)}
              for lv in await session.scalars(select(Level).order_by(Level.order))]
    catalog = await collection_service.load_catalog(session)
    by_rarity = {r: {"total": 0, "released": 0} for r in RARITIES}
    for m in catalog:
        by_rarity[m.rarity.value]["total"] += 1
        by_rarity[m.rarity.value]["released"] += m.status == MascotStatus.RELEASED
    return {
        "learners": learners if learners >= settings.PUBLIC_LEARNERS_MIN else None,
        "mastered_total": int(mastered),
        "entries_total": sum(lv["count"] for lv in levels),
        "entries_by_level": levels,
        "mascots_released": sum(b["released"] for b in by_rarity.values()),
        "mascots_total": len(catalog),
        "mascots_by_rarity": by_rarity,
        "featured_mascots": [collection_service.mascot_out(m) for m in _featured(catalog)],
        "rules": {**rules(), "unit_size": await _unit_size(session)},
    }
