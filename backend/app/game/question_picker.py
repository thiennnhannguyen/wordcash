"""
Chọn câu hỏi từ các cấp độ mà cả hai người chơi đã mở khóa. Không gửi đáp án đúng xuống client.

Hiện mới có điều kiện lọc mục từ (`eligible_clause`); phần chọn câu cho trận làm cùng Đấu Trường.
- Chỉ kho hệ thống đã duyệt và CHƯA ngừng dùng (`Entry.teachable()`): mục retired không xuất hiện trong trận (người chơi
  vẫn ôn được ở ôn tập cá nhân, giữ mastered); không dùng từ tự tạo (trận xếp hạng).
- Chỉ các cấp mà cả hai người chơi đã mở khóa.
"""

from collections.abc import Iterable

from sqlalchemy import and_

from app.models import Entry


def eligible_clause(level_codes: Iterable[str]):
    """Điều kiện WHERE cho mục từ được hỏi trong trận: đã duyệt, chưa ngừng dùng, thuộc các cấp cả hai đã mở."""
    return and_(Entry.teachable(), Entry.cefr.in_(sorted(set(level_codes))))
