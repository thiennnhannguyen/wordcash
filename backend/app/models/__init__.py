"""
Gom import tất cả model để Alembic (alembic/env.py) thấy đủ bảng. Model mới phải được import ở đây.
"""

from app.core.database import Base
from app.models.course import CourseVisibility, StudyMode, StudySession, UserCourse, UserCourseEntry
from app.models.progress import EntryState, ReviewLog, UserEntryProgress
from app.models.refresh_token import RefreshToken
from app.models.user import Goal, Role, User
from app.models.vocabulary import AudioJob, AudioJobStatus, Entry, EntrySource, EntryStatus, EntryType, Level, Topic

__all__ = [
    "AudioJob",
    "AudioJobStatus",
    "Base",
    "CourseVisibility",
    "Entry",
    "EntrySource",
    "EntryState",
    "EntryStatus",
    "EntryType",
    "Goal",
    "Level",
    "RefreshToken",
    "ReviewLog",
    "Role",
    "StudyMode",
    "StudySession",
    "Topic",
    "User",
    "UserCourse",
    "UserCourseEntry",
    "UserEntryProgress",
]
