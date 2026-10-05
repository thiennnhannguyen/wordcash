"""
Công cụ CHỈ dành cho dev và e2e (router chỉ được gắn khi ENV development/e2e; production không có route này).

- POST /dev/academy/fast-forward: đánh dấu xong mọi bài và chặng của một cấp cho người dùng hiện tại để tới thẳng Trận Boss.
- GET /dev/study-sessions/{sid}/key, GET /dev/daily-check/key: khóa đáp án (theo thứ tự câu) của phiên / Cửa Ải hôm nay của
  chính người dùng, để e2e trả lời đúng hoặc sai có chủ đích qua giao diện. Ở production các route này không tồn tại (404),
  nên không thể dùng để lộ đáp án (có test).
- POST /dev/grant-spins {normal, special}: cộng lượt quay; POST /dev/set-pity {value}: đặt bộ đếm pity;
  POST /dev/force-next {rarity, mascot_id?}: ép kết quả lượt quay KẾ TIẾP của chính người dùng (dựng hiệu ứng trong e2e).
"""

import uuid

from fastapi import APIRouter
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession
from app.core import clock
from app.models import DailyCheck, ProgressStatus, StudySession, UserLevelProgress
from app.utils.time import local_date
from app.schemas.academy import FastForwardIn
from app.schemas.collection import ForceNextIn, GrantSpinsIn, SetPityIn
from app.services import collection_service, roadmap_service, stats_service

router = APIRouter(prefix="/dev", tags=["Dev"])


@router.post("/academy/fast-forward", summary="(dev) Tới thẳng Trận Boss của một cấp")
async def fast_forward(data: FastForwardIn, user: CurrentUser, session: DbSession):
    now = clock.now()
    st = await roadmap_service.load_structure(session)
    await roadmap_service.ensure_initialized(session, user, now, st)
    level = next((lv for lv in st.levels if lv.code == data.level_code), None)
    if level is None:
        return {"ok": False}
    await roadmap_service.raise_status(session, UserLevelProgress, user.id, ProgressStatus.UNLOCKED, now, level_id=level.id)
    for topic in st.topics[level.id]:
        for unit in st.units[topic.id]:
            await roadmap_service.complete_unit(session, user, st, unit, now)
        await roadmap_service.complete_topic(session, user, st, topic, now)
    await session.commit()
    return {"ok": True, "level_id": level.id}


@router.get("/study-sessions/{session_id}/key", summary="(dev) Khóa đáp án của một phiên")
async def session_key(session_id: uuid.UUID, user: CurrentUser, session: DbSession):
    study = await session.scalar(select(StudySession).where(StudySession.id == session_id, StudySession.user_id == user.id))
    return [{"id": q["id"], "answer": q["answer"], "level": q["level"], "topic_id": q.get("topic_id")} for q in study.questions] if study else []


@router.get("/daily-check/key", summary="(dev) Khóa đáp án Cửa Ải hôm nay")
async def daily_key(user: CurrentUser, session: DbSession):
    row = await session.scalar(select(DailyCheck).where(DailyCheck.user_id == user.id, DailyCheck.local_date == local_date(user, clock.now())))
    return [{"id": q["id"], "answer": q["answer"]} for q in row.questions] if row else []


@router.post("/grant-spins", summary="(dev) Cộng lượt quay")
async def grant_spins(data: GrantSpinsIn, user: CurrentUser, session: DbSession):
    stats = await stats_service.lock_stats(session, user.id)
    stats.spins_normal += data.normal
    stats.spins_special += data.special
    out = {"normal": stats.spins_normal, "special": stats.spins_special}
    await session.commit()
    return out


@router.post("/set-pity", summary="(dev) Đặt bộ đếm pity")
async def set_pity(data: SetPityIn, user: CurrentUser, session: DbSession):
    stats = await stats_service.lock_stats(session, user.id)
    stats.pity_counter = data.value
    await session.commit()
    return {"pity_counter": data.value}


@router.post("/force-next", summary="(dev) Ép kết quả lượt quay kế tiếp")
async def force_next(data: ForceNextIn, user: CurrentUser):
    collection_service.force_next(user.id, data.rarity, data.mascot_id)
    return {"ok": True}
