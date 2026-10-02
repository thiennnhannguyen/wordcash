"""
Schema dùng chung.
"""

from pydantic import BaseModel


class HealthOut(BaseModel):
    status: str
    env: str
    database: bool
    redis: bool
