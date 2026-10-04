"""
Công cụ CHỈ dành cho dev và e2e (router chỉ được gắn khi ENV development/e2e; production không có route này).

- POST /dev/academy/fast-forward: đánh dấu xong mọi bài và chặng của một cấp cho người dùng hiện tại để tới thẳng Trận Boss.
"""

from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.core import clock
from app.models import ProgressStatus, UserLevelProgress
from app.schemas.academy import FastForwardIn
from app.services import roadmap_service

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
