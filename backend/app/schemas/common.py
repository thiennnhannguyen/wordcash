"""
Schema dùng chung.
"""

from pydantic import BaseModel


class HealthOut(BaseModel):
    status: str
    env: str
    database: bool
    redis: bool


class ErrorBody(BaseModel):
    code: str
    message: str
    details: list[dict[str, str]] | dict | None = None


class ErrorOut(BaseModel):
    """Dạng chung của mọi lỗi: {"error": {code, message, details}}."""

    error: ErrorBody
