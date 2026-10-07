"""
Schema Pydantic của quy trình kho từ: câu trả lời AI (phân loại, cụm từ, gợi ý thêm từ, soạn nháp, đặt tên bài) và file
nội dung content/<cấp>/<chủ-đề>.json (nguồn chính của nội dung đã duyệt; CI kiểm mọi file theo `TopicFile`).
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

POS = Literal["noun", "verb", "adjective", "adverb", "preposition", "determiner", "pronoun", "conjunction", "interjection",
              "number", "modal", "auxiliary", "phrase"]


class _Model(BaseModel):
    model_config = ConfigDict(extra="forbid")


# ---------- Câu trả lời AI ----------

class ClassifyItem(_Model):
    headword: str
    pos: str
    topic_code: str
    confidence: float = Field(ge=0, le=1)
    reason: str = ""
    commonness: int = Field(ge=1, le=5)
    basic_communication: bool = False
    subgroup: str = ""


class PhraseItem(_Model):
    headword: str
    commonness: int = Field(ge=1, le=5)
    basic_communication: bool = False
    subgroup: str = ""


class SuggestItem(_Model):
    headword: str
    pos: str
    commonness: int = Field(ge=1, le=5)
    subgroup: str = ""
    reason: str = ""


class EnrichItem(_Model):
    """Một mục AI soạn nháp (prompts/enrich_v2.md). IPA KHÔNG lấy từ đây trừ khi cmudict không có (ipa_suggestion)."""

    headword: str
    pos: str
    meaning_vi: str
    definition_en: str
    example_en: str
    example_vi: str
    collocations: list[str] = Field(default_factory=list, max_length=3)
    word_family: list[str] = Field(default_factory=list, max_length=3)
    synonyms: list[str] = Field(default_factory=list, max_length=2)
    mnemonic_vi: str = ""
    image_keyword: str
    ipa_suggestion: str = ""


class UnitTitleItem(_Model):
    position: int
    title: str


class RewriteItem(_Model):
    value: str | list[str]


# ---------- File nội dung content/<cấp>/<chủ-đề>.json ----------

STATUS = Literal["draft", "approved", "rejected"]
ENTRY_TYPE = Literal["word", "phrase", "collocation", "phrasal_verb", "idiom"]


class ContentEntry(_Model):
    content_key: str = Field(pattern=r"^[a-c][12]\.[a-z0-9_]+\.[a-z0-9_]+\.[a-z]+$")
    headword: str = Field(min_length=1, max_length=100)
    pos: POS
    entry_type: ENTRY_TYPE = "word"
    ipa: str | None = None
    ipa_unverified: bool = False
    meaning_vi: str = ""
    definition_en: str = ""
    example_en: str = ""
    example_vi: str = ""
    collocations: list[str] = Field(default_factory=list)
    word_family: list[str] = Field(default_factory=list)
    synonyms: list[str] = Field(default_factory=list)
    mnemonic_vi: str = ""
    image_keyword: str = ""
    # Chọn từ (bước 02) — người duyệt chỉnh được
    commonness: int = Field(default=3, ge=1, le=5)
    basic_communication: bool = False
    subgroup: str = ""
    rank_in_topic: int = 0
    origin: Literal["source", "ai_phrase", "ai_suggested", "manual"] = "source"
    sources: list[str] = Field(default_factory=list)
    origin_flags: list[str] = Field(default_factory=list)  # cờ từ bước 02 (phrase, needs_topic_review, ai_suggested_headword)
    # Kiểm tra tự động (bước 04, tính lại mỗi lần chạy): origin_flags ∪ cờ vi phạm; chi tiết theo từng cờ
    flags: list[str] = Field(default_factory=list)
    flag_details: dict[str, str] = Field(default_factory=dict)
    # Duyệt
    status: STATUS = "draft"
    reviewed_at: datetime | None = None
    review_note: str = ""
    reject_reason: str = ""
    ai_prompt: str = ""  # vd. "enrich_v1#<mã băm>" — prompt đã soạn bản nháp

    @field_validator("headword")
    @classmethod
    def _clean(cls, v: str) -> str:
        # Giữ chữ hoa hiển thị ("I'm hungry", "Tet" — lib/casing.py); content_key luôn viết thường
        if v != " ".join(v.split()):
            raise ValueError("headword không được có khoảng trắng thừa")
        return v


class ContentUnit(_Model):
    content_key: str = Field(pattern=r"^[a-c][12]\.[a-z0-9_]+\.u\d+$")
    branch: Literal["foundation", "ielts", "toeic"] = "foundation"
    position: int = Field(ge=1)
    title: str = ""
    title_status: STATUS = "draft"
    entries: list[str] = Field(default_factory=list)  # content_key của mục, theo thứ tự dạy


class TopicFile(_Model):
    schema_version: Literal[1] = 1
    level: Literal["A1", "A2", "B1", "B2", "C1", "C2"]
    topic_code: str
    topic_title: str  # tên chủ đề; KHÔNG có địa danh (địa danh chỉ là trang trí ở bảng topics)
    entries: list[ContentEntry] = Field(default_factory=list)
    units: list[ContentUnit] = Field(default_factory=list)
