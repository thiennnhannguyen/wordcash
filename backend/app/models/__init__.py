"""
Gom import tất cả model để Alembic (alembic/env.py) thấy đủ bảng. Model mới phải được import ở đây.
"""

from app.core.database import Base
from app.models.academy import BossAttempt, ProgressStatus, TopicPracticeLog, UserLevelProgress, UserTopicProgress, UserUnitProgress
from app.models.course import CourseVisibility, SessionKind, StudyMode, StudySession, UserCourse, UserCourseEntry
from app.models.daily_check import DailyCheck, DailyCheckStatus
from app.models.progress import EntryState, ReviewLog, UserEntryProgress
from app.models.refresh_token import RefreshToken
from app.models.stats import SpinGrant, SpinKind, SpinReason, UserDailyActivity, UserStats
from app.models.user import Goal, Role, User
from app.models.vocabulary import AudioJob, AudioJobStatus, Entry, EntrySource, EntryStatus, EntryType, Level, Topic, Unit, UnitEntry

__all__ = [
    "AudioJob",
    "AudioJobStatus",
    "Base",
    "BossAttempt",
    "CourseVisibility",
    "DailyCheck",
    "DailyCheckStatus",
    "Entry",
    "EntrySource",
    "EntryState",
    "EntryStatus",
    "EntryType",
    "Goal",
    "Level",
    "ProgressStatus",
    "RefreshToken",
    "ReviewLog",
    "Role",
    "SessionKind",
    "SpinGrant",
    "SpinKind",
    "SpinReason",
    "StudyMode",
    "StudySession",
    "Topic",
    "TopicPracticeLog",
    "Unit",
    "UnitEntry",
    "User",
    "UserCourse",
    "UserCourseEntry",
    "UserDailyActivity",
    "UserEntryProgress",
    "UserLevelProgress",
    "UserStats",
    "UserTopicProgress",
    "UserUnitProgress",
]
