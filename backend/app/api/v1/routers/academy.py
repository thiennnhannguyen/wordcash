"""
Học Viện: bản đồ lộ trình, nội dung một bài, bắt đầu phiên học bài / kiểm tra cuối bài / bài tổng hợp chặng / luyện chặng yếu /
Trận Boss. Nộp bài dùng chung POST /study-sessions/{sid}/answers (router study.py).

Route bắt đầu phiên cần đã vượt Cửa Ải hôm nay (DAILY_CHECK_REQUIRED). Câu hỏi không bao giờ kèm đáp án.
Nghiệp vụ: services/roadmap_service.py, lesson_service.py, boss_service.py.
"""

from fastapi import APIRouter, Query, status

from app.api.deps import CurrentUser, DailyCheckDone, DbSession
from app.api.responses import error_responses
from app.core import clock
from app.schemas.academy import AcademySessionOut, BossStatusOut, RoadmapOut, UnitDetailOut
from app.services import boss_service, lesson_service, roadmap_service

router = APIRouter(prefix="/academy", tags=["Học Viện"])

AUTH = ("TOKEN_INVALID", "TOKEN_EXPIRED")
GATE = (*AUTH, "DAILY_CHECK_REQUIRED", "NOT_FOUND")


@router.get("/roadmap", response_model=RoadmapOut, summary="Bản đồ lộ trình",
            description="Cấp → chặng → bài kèm trạng thái, điểm cao nhất, địa danh, con dấu, vị trí hiện tại, Hộ chiếu "
            "(địa danh = chặng + Boss, chỉ đếm cấp đang có). Người mới được mở A1 · chặng 1 · bài 1. "
            "Chỉ có nhánh `foundation`; `ielts`, `toeic` trả `available: false`.",
            responses=error_responses(*AUTH, "VALIDATION_ERROR"))
async def get_roadmap(user: CurrentUser, session: DbSession, branch: str = Query("foundation")):
    out = await roadmap_service.get_roadmap(session, user, clock.now(), branch)
    await session.commit()
    return out


@router.get("/units/{unit_id}", response_model=UnitDetailOut, summary="Nội dung một bài",
            responses=error_responses(*AUTH, "UNIT_LOCKED", "NOT_FOUND"))
async def get_unit(unit_id: int, user: CurrentUser, session: DbSession):
    return await lesson_service.get_unit(session, user, unit_id, clock.now())


@router.post("/units/{unit_id}/learn-sessions", response_model=AcademySessionOut, status_code=status.HTTP_201_CREATED,
             summary="Bắt đầu học bài", dependencies=[DailyCheckDone],
             description="Thẻ học các từ mới (giới hạn từ mới mỗi ngày) rồi luyện đủ các mức. Hết từ mới thì luyện lại cả bài (`reason`).",
             responses=error_responses(*GATE, "UNIT_LOCKED", "NOTHING_TO_STUDY"))
async def start_learn(unit_id: int, user: CurrentUser, session: DbSession):
    return await lesson_service.start_learn(session, user, unit_id, clock.now())


@router.post("/units/{unit_id}/test-sessions", response_model=AcademySessionOut, status_code=status.HTTP_201_CREATED,
             summary="Bắt đầu kiểm tra cuối bài", dependencies=[DailyCheckDone],
             description="20 câu (bài ít từ hơn thì hỏi hết). Đạt ≥ 80% thì qua bài và mở bài kế / bài tổng hợp chặng.",
             responses=error_responses(*GATE, "UNIT_LOCKED", "NOTHING_TO_STUDY"))
async def start_unit_test(unit_id: int, user: CurrentUser, session: DbSession):
    return await lesson_service.start_unit_test(session, user, unit_id, clock.now())


@router.post("/topics/{topic_id}/test-sessions", response_model=AcademySessionOut, status_code=status.HTTP_201_CREATED,
             summary="Bắt đầu bài tổng hợp chặng", dependencies=[DailyCheckDone],
             description="20 câu trộn các bài; mở khi mọi bài của chặng đã qua. Đạt ≥ 80%: đóng dấu địa danh, mở chặng kế (chặng cuối: mở Boss).",
             responses=error_responses(*GATE, "TOPIC_LOCKED"))
async def start_topic_test(topic_id: int, user: CurrentUser, session: DbSession):
    return await lesson_service.start_topic_test(session, user, topic_id, clock.now())


@router.post("/topics/{topic_id}/practice-sessions", response_model=AcademySessionOut, status_code=status.HTTP_201_CREATED,
             summary="Luyện chặng (yếu)", dependencies=[DailyCheckDone],
             description="≥ 10 câu, lộ đáp án từng câu. Trả lời hết là hoàn thành; luyện đủ các chặng yếu sau lần thua Boss thì được đánh lại ngay.",
             responses=error_responses(*GATE, "TOPIC_LOCKED", "NOTHING_TO_STUDY"))
async def start_topic_practice(topic_id: int, user: CurrentUser, session: DbSession):
    return await lesson_service.start_topic_practice(session, user, topic_id, clock.now())


@router.get("/levels/{level_id}/boss", response_model=BossStatusOut, summary="Trạng thái Trận Boss",
            description="`status`: locked | available | cooldown | won; `can_retry`: {allowed, reason, retry_at, weak_topics, practiced}.",
            responses=error_responses(*AUTH, "NOT_FOUND"))
async def get_boss(level_id: int, user: CurrentUser, session: DbSession):
    return await boss_service.get_boss(session, user, level_id, clock.now())


@router.post("/levels/{level_id}/boss-sessions", response_model=AcademySessionOut, status_code=status.HTTP_201_CREATED,
             summary="Bắt đầu Trận Boss", dependencies=[DailyCheckDone],
             description="Khoảng 50 câu chia đều các chặng. Mỗi câu chỉ biết đúng/sai; đạt ≥ 85% thì thắng.",
             responses=error_responses(*GATE, "LEVEL_LOCKED", "BOSS_LOCKED", "BOSS_COOLDOWN"))
async def start_boss(level_id: int, user: CurrentUser, session: DbSession):
    return await boss_service.start_boss(session, user, level_id, clock.now())
