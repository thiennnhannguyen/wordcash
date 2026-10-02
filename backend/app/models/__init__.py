"""
Gom import tất cả model để Alembic (alembic/env.py) thấy đủ bảng. Model mới phải được import ở đây.
"""

from app.core.database import Base
from app.models.vocabulary import Level, Topic

__all__ = ["Base", "Level", "Topic"]
