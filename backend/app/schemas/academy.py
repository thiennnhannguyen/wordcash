"""
Schema API Học Viện, Cửa Ải Hôm Nay, Ôn tập, /me/stats.

Câu hỏi gửi xuống (`questions`) KHÔNG BAO GIỜ có đáp án hay entry_id; đáp án chỉ xuất hiện trong kết quả sau khi nộp.
Các khối lồng nhau phức tạp (sự kiện mở khóa, con dấu, phần thưởng) để dạng dict, mô tả trong docs/academy.md.
"""

import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models import DailyCheckStatus, ProgressStatus, SessionKind, StudyMode
from app.schemas.course import AnswerIn, AnswersOut, StudyCardOut


class UnitBriefOut(BaseModel):
    id: int
    position: int
    title: str
    status: ProgressStatus
    best_score: int | None
    attempts: int
    word_count: int


class TopicTestOut(BaseModel):
    status: str  # locked | available | passed
    best: int | None


class TopicOut(BaseModel):
    id: int
    order: int
    title: str
    status: ProgressStatus
    landmark_key: str | None
    landmark_name: str | None
    landmark_image: str | None
    stamped_at: datetime | None
    test: TopicTestOut
    units: list[UnitBriefOut]


class PassportOut(BaseModel):
    visited: int
    total: int


class BossOut(BaseModel):
    model_config = ConfigDict(extra="allow")

    level_id: int
    status: str  # locked | available | cooldown | won
    landmark_key: str | None
    landmark_name: str | None
    best: int | None
    won_at: datetime | None
    questions: int
    pass_rate: float
    can_retry: dict | None


class LevelOut(BaseModel):
    id: int
    code: str
    name: str
    order: int
    region_theme: str | None
    status: ProgressStatus
    topics: list[TopicOut]
    boss: BossOut
    passport: PassportOut


class RoadmapOut(BaseModel):
    branch: str
    available: bool
    branches: list[dict]
    levels: list[LevelOut]
    current: dict | None
    passport: PassportOut
    upcoming_levels: list[str]


class UnitDetailOut(BaseModel):
    id: int
    title: str
    position: int
    units_total: int
    status: ProgressStatus
    best_score: int | None
    attempts: int
    pass_rate: float
    topic: dict
    level: dict
    words: list[dict]


class AcademySessionOut(BaseModel):
    model_config = ConfigDict(extra="allow")  # unit_id / topic_id / level_id, pass_rate, reason…

    id: uuid.UUID
    kind: SessionKind
    mode: StudyMode
    cards: list[StudyCardOut]
    questions: list[dict]
    total: int
    expires_at: datetime


class StudyAnswersOut(AnswersOut):
    """Kết quả nộp bài dùng chung: từng câu, điểm (summary), phần vừa mở khóa / con dấu / Boss (outcome), lượt quay + rank (rewards)."""

    outcome: dict | None = None
    rewards: dict | None = None


class BossStatusOut(BossOut):
    level: dict
    level_status: ProgressStatus
    last_attempt: dict | None


class ReviewSessionIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    limit: int | None = Field(default=None, ge=1, le=50)


class ReviewDueOut(BaseModel):
    due_count: int
    status_counts: dict[str, int]
    schedule: list[dict]
    urgent: list[dict]
    due: list[dict]
    words: list[dict]


class DailyCheckOut(BaseModel):
    id: int
    local_date: date
    status: DailyCheckStatus
    questions: list[dict]
    total: int
    answered: list[dict]
    correct_count: int
    completed_at: datetime | None
    result: dict | None


class DailyCheckAnswersIn(BaseModel):
    answers: list[AnswerIn] = Field(min_length=1, max_length=10)


class DailyCheckAnswersOut(BaseModel):
    results: list[dict]
    answered: int
    total: int
    finished: bool
    status: DailyCheckStatus
    result: dict | None
    rewards: dict


class MeStatsOut(BaseModel):
    mastered_count: int
    custom_mastered_count: int
    rank: dict
    streak: dict
    spins: dict
    today: dict
    position: dict | None
    passport: PassportOut


class FastForwardIn(BaseModel):
    """Chỉ dev/e2e: đưa người dùng hiện tại tới Trận Boss của một cấp."""

    model_config = ConfigDict(extra="forbid")

    level_code: str = Field(pattern="^[ABC][12]$")
