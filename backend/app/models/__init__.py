"""
Gom import tất cả model để Alembic (alembic/env.py) thấy đủ bảng. Model mới phải được import ở đây.
"""

from app.core.database import Base
from app.models.refresh_token import RefreshToken
from app.models.user import Goal, Role, User
from app.models.vocabulary import Level, Topic

__all__ = ["Base", "Goal", "Level", "RefreshToken", "Role", "Topic", "User"]
