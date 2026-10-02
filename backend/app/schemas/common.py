"""
Khung phản hồi chung `ApiResponse[T]` khớp utils/responses.py: {success, message, data}.
"""

from pydantic import BaseModel


class ApiResponse[T](BaseModel):
    success: bool = True
    message: str = "Thành công"
    data: T | None = None


class ErrorResponse(BaseModel):
    success: bool = False
    message: str
    errors: dict[str, str] | list | None = None


class HealthOut(BaseModel):
    status: str
    env: str
    database: bool
    redis: bool
