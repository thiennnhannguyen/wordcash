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
