"""
Linh vật: danh mục Mascot (100 ô), sở hữu UserMascot, lịch sử quay SpinHistory, đổi mảnh ShardExchange,
khóa chống gửi lặp IdempotencyKey. Số mảnh, bộ đếm pity, tổng số lượt đã quay nằm ở user_stats (models/stats.py).

- Mascot: nguồn dữ liệu là seeds/data/mascots.json (+ docs/mascots-lore.md), nạp bằng `python -m seeds.seed_mascots`.
  `id` cố định 1–100 (không tự tăng). Ba linh vật khởi đầu: `obtain = gacha` + `is_starter = true` (vẫn quay ra được).
  Ô `coming_soon` và linh vật `achievement` không bao giờ quay ra hay đổi mảnh được. Không có chỉ số sức mạnh.
- UserMascot: duy nhất theo (user_id, mascot_id); `copies` ≥ 1 đếm mọi bản đã nhận (bản trùng vẫn cộng copies, đồng
  thời đổi thành mảnh); `is_new` tắt khi người dùng xem (POST /collection/seen).
- SpinHistory: mỗi lượt quay một dòng, các lượt của cùng một lần bấm chung `batch_id`; lưu cả độ hiếm quay được
  (`rolled_rarity`) và độ hiếm cuối (`final_rarity`, sau pity / hạ bậc khi pool thiếu).
- IdempotencyKey: kết quả của thao tác tiêu tài nguyên (quay, đổi mảnh) theo (user_id, key, endpoint); gửi lại cùng key
  trả đúng kết quả cũ, cùng key mà body khác (`request_hash`) thì IDEMPOTENCY_KEY_REUSED. Bản ghi quá 24 giờ bị dọn.
"""

import enum
import uuid
from datetime import datetime

from sqlalchemy import BigInteger, Boolean, CheckConstraint, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base, str_enum
from app.models.stats import SpinKind


class MascotRarity(enum.StrEnum):
    COMMON = "common"
    RARE = "rare"
    EPIC = "epic"
    LEGENDARY = "legendary"


class MascotRegion(enum.StrEnum):
    A1 = "A1"
    A2 = "A2"
    B1 = "B1"
    B2 = "B2"
    C1 = "C1"
    C2 = "C2"
    SPECIAL = "SPECIAL"


class MascotStatus(enum.StrEnum):
    RELEASED = "released"
    COMING_SOON = "coming_soon"


class MascotObtain(enum.StrEnum):
    GACHA = "gacha"
    ACHIEVEMENT = "achievement"


class MascotSource(enum.StrEnum):
    STARTER = "starter"
    GACHA = "gacha"
    EXCHANGE = "exchange"
    ACHIEVEMENT = "achievement"


class Mascot(Base):
    __tablename__ = "mascots"
    __mapper_args__ = {"eager_defaults": True}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=False)
    code: Mapped[str] = mapped_column(String(3), unique=True)
    name: Mapped[str | None] = mapped_column(String(40))
    rarity: Mapped[MascotRarity] = mapped_column(str_enum(MascotRarity, "mascot_rarity"))
    region: Mapped[MascotRegion] = mapped_column(str_enum(MascotRegion, "mascot_region"))
    status: Mapped[MascotStatus] = mapped_column(str_enum(MascotStatus, "mascot_status"))
    obtain: Mapped[MascotObtain] = mapped_column(str_enum(MascotObtain, "mascot_obtain"))
    is_starter: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    shape: Mapped[str | None] = mapped_column(String(16))
    primary_color: Mapped[str | None] = mapped_column(String(32))  # tên token màu trong frontend/src/styles/tokens.css
    accessory: Mapped[dict | None] = mapped_column(JSONB)  # phụ kiện để vẽ tạm: {top, eyes, belly}
    image_url: Mapped[str | None] = mapped_column(String(500))
    lottie_url: Mapped[str | None] = mapped_column(String(500))
    birthday_text: Mapped[str | None] = mapped_column(String(120))
    hometown: Mapped[str | None] = mapped_column(String(120))
    personality: Mapped[str | None] = mapped_column(Text)
    likes: Mapped[str | None] = mapped_column(Text)
    dislikes: Mapped[str | None] = mapped_column(Text)
    favorite_word: Mapped[str | None] = mapped_column(String(64))
    catchphrase: Mapped[str | None] = mapped_column(Text)
    bio: Mapped[str | None] = mapped_column(Text)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class UserMascot(Base):
    __tablename__ = "user_mascots"
    __table_args__ = (UniqueConstraint("user_id", "mascot_id"), CheckConstraint("copies >= 1", name="copies_positive"))

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    mascot_id: Mapped[int] = mapped_column(ForeignKey("mascots.id"))
    copies: Mapped[int] = mapped_column(Integer, default=1, server_default="1")
    source: Mapped[MascotSource] = mapped_column(str_enum(MascotSource, "mascot_source"))  # nguồn của bản ĐẦU TIÊN
    first_obtained_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    last_obtained_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    is_new: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")


class SpinHistory(Base):
    __tablename__ = "spin_history"
    __table_args__ = (Index("ix_spin_history_user_created", "user_id", "created_at"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    batch_id: Mapped[uuid.UUID] = mapped_column(index=True)
    kind: Mapped[SpinKind] = mapped_column(str_enum(SpinKind, "spin_history_kind"))
    rolled_rarity: Mapped[MascotRarity] = mapped_column(str_enum(MascotRarity, "spin_rolled_rarity"))
    final_rarity: Mapped[MascotRarity] = mapped_column(str_enum(MascotRarity, "spin_final_rarity"))
    rarity_fallback: Mapped[bool] = mapped_column(Boolean, default=False)
    pity_triggered: Mapped[bool] = mapped_column(Boolean, default=False)
    mascot_id: Mapped[int] = mapped_column(ForeignKey("mascots.id"))
    was_duplicate: Mapped[bool] = mapped_column(Boolean)
    shards_gained: Mapped[int] = mapped_column(Integer, default=0)
    pity_before: Mapped[int] = mapped_column(Integer)
    pity_after: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class ShardExchange(Base):
    __tablename__ = "shard_exchanges"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    mascot_id: Mapped[int] = mapped_column(ForeignKey("mascots.id"))
    cost: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class IdempotencyKey(Base):
    __tablename__ = "idempotency_keys"
    __table_args__ = (UniqueConstraint("user_id", "key", "endpoint"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    key: Mapped[str] = mapped_column(String(64))
    endpoint: Mapped[str] = mapped_column(String(64))
    request_hash: Mapped[str] = mapped_column(String(64))  # SHA-256 của body: cùng key mà body khác → IDEMPOTENCY_KEY_REUSED
    response_json: Mapped[dict] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
