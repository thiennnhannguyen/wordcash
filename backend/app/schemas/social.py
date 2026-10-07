"""
Schema cho Từ của ngày (/words/daily), Hồ sơ (/me/profile, /users/{username}/profile), Bảng xếp hạng (/leaderboard) và
số liệu công khai (/public/stats).

Hồ sơ người khác (`PublicProfileOut`) CHỈ có các trường công khai; email, khóa học, từ hay quên, lịch hoạt động không bao giờ
nằm trong schema này (response_model lọc bỏ mọi trường thừa).
"""

from datetime import date, datetime

from pydantic import BaseModel


class DailyWordEntryOut(BaseModel):
    id: int
    headword: str
    entry_type: str
    pos: str | None
    ipa: str | None
    audio_url: str | None
    meaning_vi: str
    example: str | None
    example_vi: str | None
    mnemonic_vi: str | None
    variant_note: str | None
    cefr: str | None


class DailyWordOut(BaseModel):
    date: date
    level: str | None  # cấp dùng để chọn từ; null khi chưa có mục nào
    entry: DailyWordEntryOut | None
    status: str | None  # new | learning | mastered


class ShowcaseItemOut(BaseModel):
    mascot_id: int
    copies: int


class PublicProfileOut(BaseModel):
    display_name: str
    username: str
    avatar_mascot_id: int | None
    rank: str
    mastered_count: int
    streak_current: int
    streak_best: int
    current_level: str | None
    mascots_owned: int
    showcase: list[ShowcaseItemOut]


class LevelProgressOut(BaseModel):
    code: str
    name: str
    mastered: int
    total: int
    unlocked: bool


class ActivityDayOut(BaseModel):
    date: date
    new_words: int
    reviews: int
    answers: int


class DailyCheckAccuracyOut(BaseModel):
    days: int
    correct: int
    total: int
    rate: float | None  # null khi chưa làm câu nào trong khoảng


class ForgottenWordOut(BaseModel):
    entry_id: int
    headword: str
    meaning_vi: str
    lapse_count: int


class MyProfileOut(PublicProfileOut):
    rank_progress: dict  # {next, current_min, next_min, remaining}
    rank_shaky: bool
    shaky_seconds_left: int | None
    words_to_recover: int
    custom_mastered_count: int
    courses_count: int
    show_on_leaderboard: bool
    showcase_mascot_ids: list[int] | None  # null = đang dùng mặc định (3 con hiếm nhất)
    levels: list[LevelProgressOut]
    activity: list[ActivityDayOut]  # 84 ngày (12 tuần) kết thúc hôm nay, theo múi giờ người dùng
    daily_check_accuracy: DailyCheckAccuracyOut
    most_forgotten: list[ForgottenWordOut]
    rank_first_reached_at: datetime | None  # "Ngày đạt lần đầu" rank hiện tại (sổ spin_grants); null với Tân Binh
    created_at: datetime


class LeaderboardRowOut(BaseModel):
    rank: int
    display_name: str
    username: str
    avatar_mascot_id: int | None
    tier: str  # rank (Tân Binh…)
    score: int


class LeaderboardMeOut(BaseModel):
    rank: int | None  # null khi điểm = 0 (chưa có hạng)
    score: int
    hidden: bool  # đã tắt show_on_leaderboard


class LeaderboardOut(BaseModel):
    board: str
    week_start: datetime | None
    week_end: datetime | None
    seconds_left: int | None  # tới hết tuần (chỉ bảng weekly)
    entries: list[LeaderboardRowOut]
    my_entry: LeaderboardMeOut


class PublicStatsOut(BaseModel):
    learners: int | None  # null khi dưới PUBLIC_LEARNERS_MIN
    mastered_total: int
    entries_total: int
    entries_by_level: list[dict]  # [{code, name, count}]
    mascots_released: int
    mascots_total: int
    mascots_by_rarity: dict  # {rarity: {total, released}}
    featured_mascots: list[dict]
    rules: dict
