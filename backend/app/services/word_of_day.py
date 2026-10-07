"""
Từ của ngày (GET /words/daily, Sảnh).

- Nguồn: kho hệ thống dạy được (`Entry.teachable()`: approved, chưa retired) có `cefr` thuộc một cấp người dùng đã mở.
- Cấp dùng để chọn: cấp đã mở CAO NHẤT có mục dạy được (người cùng cấp cao nhất thấy cùng một từ).
- Chọn tất định theo (ngày theo múi giờ người dùng, mã cấp): vị trí = sha256("ngày|cấp") mod số mục, sắp theo id. Cùng ngày,
  cùng cấp → cùng từ; qua ngày mới (giờ địa phương) → từ khác. Kho của cấp thay đổi trong ngày thì từ có thể đổi theo.
- Kèm trạng thái của người dùng với từ: new (chưa học) · learning (đang học, gồm cả forgotten) · mastered (đã thuộc).
- Không có mục nào → `entry = null` (giao diện hiện khối trống).
"""

import hashlib
from datetime import date, datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Entry, EntryState, User, UserEntryProgress
from app.services import collection_service
from app.utils.time import local_date

STATUS_OUT = {EntryState.NEW: "new", EntryState.LEARNING: "learning", EntryState.FORGOTTEN: "learning", EntryState.MASTERED: "mastered"}


def pick_index(day: date, level: str, count: int) -> int:
    """Vị trí tất định của từ trong danh sách `count` mục (sắp theo id) cho (ngày, cấp). Hàm thuần."""
    digest = hashlib.sha256(f"{day.isoformat()}|{level}".encode()).hexdigest()
    return int(digest, 16) % count


def entry_out(e: Entry) -> dict:
    return {
        "id": e.id, "headword": e.headword, "entry_type": e.entry_type.value, "pos": e.pos, "ipa": e.ipa, "audio_url": e.audio_url,
        "meaning_vi": e.meaning_vi, "example": e.example, "example_vi": e.example_vi, "mnemonic_vi": e.mnemonic_vi,
        "variant_note": e.variant_note, "cefr": e.cefr,
    }


async def get_daily(session: AsyncSession, user: User, now: datetime) -> dict:
    today = local_date(user, now)
    levels = await collection_service.unlocked_regions(session, user, now)  # mã cấp đã mở, A1 → C2
    counts = dict((await session.execute(
        select(Entry.cefr, func.count()).where(Entry.teachable(), Entry.cefr.in_(levels)).group_by(Entry.cefr)
    )).all()) if levels else {}
    level = next((code for code in reversed(levels) if counts.get(code)), None)
    out = {"date": today, "level": level, "entry": None, "status": None}
    if level is None:
        await session.commit()
        return out

    entry = await session.scalar(
        select(Entry).where(Entry.teachable(), Entry.cefr == level).order_by(Entry.id)
        .offset(pick_index(today, level, counts[level])).limit(1)
    )
    state = await session.scalar(
        select(UserEntryProgress.status).where(UserEntryProgress.user_id == user.id, UserEntryProgress.entry_id == entry.id)
    )
    await session.commit()
    return {**out, "entry": entry_out(entry), "status": STATUS_OUT[state or EntryState.NEW]}
