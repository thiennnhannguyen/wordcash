"""Schema của công cụ duyệt nội dung (chỉ dev): sửa mục, duyệt / từ chối, nhờ AI viết lại một trường, sửa tên bài."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class EntryPatchIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    headword: str | None = None
    pos: str | None = None
    ipa: str | None = None
    meaning_vi: str | None = None
    definition_en: str | None = None
    example_en: str | None = None
    example_vi: str | None = None
    collocations: list[str] | None = None
    word_family: list[str] | None = None
    synonyms: list[str] | None = None
    mnemonic_vi: str | None = None
    image_keyword: str | None = None
    commonness: int | None = Field(default=None, ge=1, le=5)
    basic_communication: bool | None = None
    subgroup: str | None = None
    rank_in_topic: int | None = Field(default=None, ge=0)
    status: Literal["draft", "approved", "rejected"] | None = None
    review_note: str | None = Field(default=None, max_length=1000)
    reject_reason: str | None = Field(default=None, max_length=500)


class RewriteIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    field: str
    note: str = Field(default="", max_length=500)


class UnitPatchIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str | None = Field(default=None, max_length=128)
    title_status: Literal["draft", "approved", "rejected"] | None = None
