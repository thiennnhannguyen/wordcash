"""
Schema "Khóa học của tôi": khóa học, mục từ trong khóa, từ tự tạo, nhập hàng loạt, tìm trong kho, phiên học.

Icon là tên icon Phosphor (kebab-case) trong COURSE_ICONS; màu là tên token màu trong COURSE_COLORS (frontend tô theo token,
không nhận mã màu tự do).
"""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models import EntryState, StudyMode

COURSE_ICONS = (
    "book-open", "code", "film-slate", "airplane-tilt", "briefcase", "graduation-cap", "music-notes", "game-controller",
    "heartbeat", "flask", "chart-line", "globe-hemisphere-east", "fork-knife", "soccer-ball", "paint-brush", "camera",
    "newspaper", "lightbulb", "rocket-launch", "leaf", "coffee", "chats-circle", "trophy", "star",
)
COURSE_COLORS = ("primary", "sky", "accent", "gold", "orange", "danger")

ImportFormat = Literal["lines", "csv"]
EntryFilter = Literal["all", "new", "learning", "mastered", "forgotten", "starred", "due"]
EntrySort = Literal["added", "alpha", "due"]


def _strip(value):
    return value.strip() if isinstance(value, str) else value


def _blank_to_none(value):
    value = _strip(value)
    return value or None


class CourseIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=60)
    description: str | None = Field(default=None, max_length=300)
    icon: Literal[COURSE_ICONS] = "book-open"  # type: ignore[valid-type]
    color: Literal[COURSE_COLORS] = "primary"  # type: ignore[valid-type]

    _clean_title = field_validator("title", mode="before")(_strip)
    _clean_description = field_validator("description", mode="before")(_blank_to_none)


class CourseUpdateIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str | None = Field(default=None, min_length=1, max_length=60)
    description: str | None = Field(default=None, max_length=300)
    icon: Literal[COURSE_ICONS] | None = None  # type: ignore[valid-type]
    color: Literal[COURSE_COLORS] | None = None  # type: ignore[valid-type]

    _clean_title = field_validator("title", mode="before")(_strip)
    _clean_description = field_validator("description", mode="before")(_blank_to_none)

    @field_validator("title", "icon", "color")
    @classmethod
    def _not_null(cls, value):
        if value is None:
            raise ValueError("Không được để trống")
        return value


class CourseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    description: str | None
    icon: str
    color: str
    visibility: str
    word_count: int
    created_at: datetime
    updated_at: datetime
    archived_at: datetime | None


class CourseSummaryOut(CourseOut):
    mastered_count: int
    due_count: int


class CourseListOut(BaseModel):
    items: list[CourseSummaryOut]
    # Số từ khác nhau đã thuộc trong các khóa đang học ("Từ của tôi đã thuộc")
    mastered_total: int
    custom_mastered_count: int
    limits: dict[str, int]


class StatusCounts(BaseModel):
    new: int = 0
    learning: int = 0
    mastered: int = 0
    forgotten: int = 0


class ModeCounts(BaseModel):
    learn: int
    review: int
    quick: int
    hard: int
    test: int


class CourseStatsOut(BaseModel):
    word_count: int
    by_status: StatusCounts
    due_count: int
    accuracy_7d: float | None  # 0–1; None khi 7 ngày qua chưa trả lời câu nào
    answers_7d: int
    new_words_left_today: int
    modes: ModeCounts


class CourseDetailOut(CourseOut):
    stats: CourseStatsOut


class EntryProgressOut(BaseModel):
    status: EntryState
    due_at: datetime | None


class CourseEntryOut(BaseModel):
    entry_id: int
    headword: str
    meaning_vi: str
    pos: str | None
    ipa: str | None
    audio_url: str | None
    example: str | None
    image_url: str | None
    cefr: str | None
    source: Literal["system", "user"]
    personal_note: str | None
    is_starred: bool
    position: int
    added_at: datetime
    progress: EntryProgressOut


class CourseEntryPage(BaseModel):
    items: list[CourseEntryOut]
    total: int
    page: int
    page_size: int


class FromBankIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    entry_id: int
    personal_note: str | None = Field(default=None, max_length=300)

    _clean_note = field_validator("personal_note", mode="before")(_blank_to_none)


class CustomEntryIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    headword: str = Field(min_length=1, max_length=100)
    meaning_vi: str = Field(min_length=1, max_length=300)
    pos: str | None = Field(default=None, max_length=32)
    ipa: str | None = Field(default=None, max_length=100)
    example: str | None = Field(default=None, max_length=500)
    note: str | None = Field(default=None, max_length=300)
    image_url: str | None = Field(default=None, max_length=512, pattern=r"^https://")
    # true: vẫn tạo từ riêng dù kho đã có từ cùng chữ (vd. "bug" nghĩa ngành IT)
    force: bool = False

    _clean_required = field_validator("headword", "meaning_vi", mode="before")(_strip)
    _clean_optional = field_validator("pos", "ipa", "example", "note", "image_url", mode="before")(_blank_to_none)


class CourseEntryUpdateIn(BaseModel):
    """Trường của riêng khóa học (ghi chú, gắn sao) sửa được với mọi từ. Trường nội dung chỉ sửa được với từ tự tạo của mình."""

    model_config = ConfigDict(extra="forbid")

    personal_note: str | None = Field(default=None, max_length=300)
    is_starred: bool | None = None
    headword: str | None = Field(default=None, min_length=1, max_length=100)
    meaning_vi: str | None = Field(default=None, min_length=1, max_length=300)
    pos: str | None = Field(default=None, max_length=32)
    ipa: str | None = Field(default=None, max_length=100)
    example: str | None = Field(default=None, max_length=500)
    image_url: str | None = Field(default=None, max_length=512, pattern=r"^https://")

    _clean_required = field_validator("headword", "meaning_vi", mode="before")(_strip)
    _clean_optional = field_validator("personal_note", "pos", "ipa", "example", "image_url", mode="before")(_blank_to_none)

    @field_validator("headword", "meaning_vi", "is_starred")
    @classmethod
    def _not_null(cls, value):
        if value is None:
            raise ValueError("Không được để trống")
        return value


CONTENT_FIELDS = ("headword", "meaning_vi", "pos", "ipa", "example", "image_url")


class ReorderIn(BaseModel):
    entry_ids: list[int] = Field(min_length=1, max_length=500)


class ImportIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    text: str = Field(min_length=1, max_length=100_000)
    format: ImportFormat = "lines"
    # Số dòng người dùng bỏ chọn ở bảng xem trước (chỉ dùng khi commit)
    skip_lines: list[int] = Field(default_factory=list, max_length=500)


class ImportRowOut(BaseModel):
    line: int
    headword: str
    meaning: str
    example: str | None
    note: str | None
    status: Literal["new_custom", "match_system", "match_own", "duplicate_in_course", "invalid"]
    reason: str | None = None
    entry_id: int | None = None
    cefr: str | None = None
    system_meaning: str | None = None


class ImportPreviewOut(BaseModel):
    rows: list[ImportRowOut]
    counts: dict[str, int]
    to_add: int


class ImportCommitOut(BaseModel):
    added: int
    created_custom: int
    linked: int
    skipped: int
    course: CourseOut


class BankEntryOut(BaseModel):
    id: int
    headword: str
    cefr: str | None
    pos: str | None
    ipa: str | None
    meaning_vi: str
    entry_type: str
    in_course: bool | None = None


class StudySessionIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    mode: StudyMode
    limit: int | None = Field(default=None, ge=1, le=50)
    # Chỉ học các từ này (vd. "Ôn lại từ sai"); phải thuộc khóa học
    entry_ids: list[int] | None = Field(default=None, max_length=100)


class StudyCardOut(BaseModel):
    """Thẻ học (chế độ learn): nội dung học đầy đủ, được phép gửi xuống client."""

    entry_id: int
    headword: str
    meaning_vi: str
    pos: str | None
    ipa: str | None
    audio_url: str | None
    example: str | None
    image_url: str | None
    cefr: str | None
    source: str
    collocations: list[str]
    word_family: list[str]
    personal_note: str | None


class StudySessionOut(BaseModel):
    id: uuid.UUID
    mode: StudyMode
    course: dict
    cards: list[StudyCardOut]
    questions: list[dict]
    total: int
    expires_at: datetime


class AnswerIn(BaseModel):
    question_id: str = Field(max_length=16)
    answer: str = Field(default="", max_length=200)


class AnswersIn(BaseModel):
    answers: list[AnswerIn] = Field(min_length=1, max_length=50)


class AnswerResultOut(BaseModel):
    question_id: str
    correct: bool
    # Chỉ có sau khi câu đã chấm; bài kiểm tra (test) chỉ lộ đáp án khi đã nộp hết
    correct_answer: str | None = None
    entry: dict | None = None
    status: EntryState | None = None
    became_mastered: bool = False


class SessionSummaryOut(BaseModel):
    total: int
    correct: int
    score: int  # phần trăm
    mastered_now: int
    wrong: list[dict]
    review: list[dict] | None = None  # bài kiểm tra: toàn bộ câu kèm đáp án


class AnswersOut(BaseModel):
    results: list[AnswerResultOut]
    answered: int
    total: int
    finished: bool
    summary: SessionSummaryOut | None = None
