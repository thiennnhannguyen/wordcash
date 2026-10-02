"""
Bảng refresh_tokens: mỗi dòng là một refresh token đã phát (chỉ lưu SHA-256, không lưu chuỗi gốc).

- `family_id`: mọi token sinh ra từ cùng một lần đăng nhập (qua các lần xoay vòng) chung một family = một phiên/thiết bị.
- Xoay vòng: token cũ bị `revoked_at`, `replaced_by_id` trỏ tới token mới.
- Token đã bị thu hồi mà vẫn được dùng lại → coi là bị đánh cắp, hủy cả family.
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    family_id: Mapped[uuid.UUID] = mapped_column(index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    replaced_by_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("refresh_tokens.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    user_agent: Mapped[str | None] = mapped_column(String(255))
    ip: Mapped[str | None] = mapped_column(String(45))
