"""
Hàm tạo dữ liệu mẫu cho test (ghi thẳng vào DB, không qua API): người dùng, mục từ hệ thống, từ tự tạo.
Mục từ mẫu là nội dung nháp tự viết, chỉ dùng trong test.
"""

import uuid

from app.models import Entry, EntrySource, EntryStatus, User


async def make_user(db, name: str = "an") -> User:
    user = User(
        email=f"{name}-{uuid.uuid4().hex[:6]}@wordclash.vn",
        username=f"{name}{uuid.uuid4().hex[:6]}",
        display_name=name.title(),
        password_hash="khong-dung-de-dang-nhap",
    )
    db.add(user)
    await db.flush()
    return user


async def make_entry(db, headword: str, meaning_vi: str, *, pos: str | None = "noun", cefr: str | None = "B1",
                     example: str | None = None, status: EntryStatus = EntryStatus.APPROVED, **extra) -> Entry:
    entry = Entry(headword=headword, meaning_vi=meaning_vi, pos=pos, cefr=cefr, example=example, status=status,
                  source=EntrySource.SYSTEM, **extra)
    db.add(entry)
    await db.flush()
    return entry


async def make_custom(db, owner: User, headword: str, meaning_vi: str, **extra) -> Entry:
    entry = Entry(headword=headword, meaning_vi=meaning_vi, source=EntrySource.USER, owner_user_id=owner.id,
                  status=EntryStatus.APPROVED, cefr=None, **extra)
    db.add(entry)
    await db.flush()
    return entry
