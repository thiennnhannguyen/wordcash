"""
Dữ liệu địa danh cho bản đồ "Hộ chiếu vòng quanh thế giới" (cấp A1, A2).

Mỗi cấp có `region_theme` (cột mới của bảng levels); mỗi chặng (bảng topics) là một CHỦ ĐỀ từ vựng: `topic_code` (khóa nối
nội dung — content/<cấp>/<topic_code>.json, content_key) và tên chủ đề; `landmark_key`, `landmark_name`, `landmark_image`
(nullable: điền đường dẫn ảnh PNG thì frontend dùng ảnh thay tranh SVG) CHỈ là trang trí bản đồ — đổi địa danh không đổi từ
vựng, bài hay tiến độ. Mã chủ đề A2 đặt sẵn theo tên chặng (chưa có nội dung A2).
Thứ tự chặng khớp `order` của topics. Trận Boss không phải một chặng nên lưu ở bảng levels (`boss_landmark_key`,
`boss_landmark_name`), không nằm trong topics: mỗi cấp 10 chặng + 1 Boss = 11 địa danh, A1 + A2 = 22.
`guardian` (quái vật canh giữ) chưa có cột trong DB; hiện chỉ frontend dùng (roadmapMock.js).

Chạy (sau `alembic upgrade head`): `python -m seeds.seed_landmarks` trong backend/. Chạy lại nhiều lần vẫn an toàn:
cấp và chặng đã có thì cập nhật, chưa có thì tạo.
Frontend đang đọc cùng dữ liệu này qua `frontend/src/pages/Academy/roadmapMock.js`.
"""

import asyncio

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import SessionLocal, engine
from app.models import Level, Topic

# Tên tiếng Việt và thứ tự cấp, khớp LEVEL_NAMES ở frontend/src/utils/constants.js (tên đặt tạm)
LEVELS = {"A1": ("Mới bắt đầu", 1), "A2": ("Sơ cấp", 2)}

LANDMARKS = {
    "A1": {
        "region_theme": "vn-north",
        "topics": [
            {"topic_code": "greetings", "title": "Chào hỏi", "landmark_key": "a1_ho_guom", "landmark_name": "Hồ Gươm & Tháp Rùa", "landmark_image": None},
            {"topic_code": "family", "title": "Gia đình", "landmark_key": "a1_van_mieu", "landmark_name": "Văn Miếu – Khuê Văn Các", "landmark_image": None},
            {"topic_code": "numbers_time", "title": "Số đếm và thời gian", "landmark_key": "a1_chua_mot_cot", "landmark_name": "Chùa Một Cột", "landmark_image": None},
            {"topic_code": "food", "title": "Đồ ăn", "landmark_key": "a1_pho_co", "landmark_name": "Phố cổ Hà Nội & Ô Quan Chưởng", "landmark_image": None},
            {"topic_code": "home", "title": "Nhà cửa", "landmark_key": "a1_mu_cang_chai", "landmark_name": "Ruộng bậc thang Mù Cang Chải", "landmark_image": None},
            {"topic_code": "travel", "title": "Đi lại", "landmark_key": "a1_cau_long_bien", "landmark_name": "Cầu Long Biên", "landmark_image": None},
            {"topic_code": "shopping", "title": "Mua sắm", "landmark_key": "a1_cho_dong_xuan", "landmark_name": "Chợ Đồng Xuân", "landmark_image": None},
            {"topic_code": "weather", "title": "Thời tiết", "landmark_key": "a1_fansipan", "landmark_name": "Fansipan – Sa Pa", "landmark_image": None},
            {"topic_code": "nature", "title": "Thiên nhiên", "landmark_key": "a1_trang_an", "landmark_name": "Tràng An – Ninh Bình", "landmark_image": None},
            {"topic_code": "school", "title": "Trường học và học tập", "landmark_key": "a1_ma_pi_leng", "landmark_name": "Đèo Mã Pí Lèng – Hà Giang", "landmark_image": None},
        ],
        "boss": {"landmark_key": "a1_boss_ha_long", "landmark_name": "Vịnh Hạ Long", "guardian": "Rồng Vịnh"},
    },
    "A2": {
        "region_theme": "vn-central-south",
        "topics": [
            {"topic_code": "daily_routine", "title": "Công việc hằng ngày", "landmark_key": "a2_dai_noi_hue", "landmark_name": "Đại Nội Huế – Ngọ Môn", "landmark_image": None},
            {"topic_code": "feelings", "title": "Cảm xúc", "landmark_key": "a2_chua_thien_mu", "landmark_name": "Chùa Thiên Mụ", "landmark_image": None},
            {"topic_code": "festivals", "title": "Lễ hội", "landmark_key": "a2_hoi_an", "landmark_name": "Phố cổ Hội An – Chùa Cầu", "landmark_image": None},
            {"topic_code": "city", "title": "Thành phố", "landmark_key": "a2_cau_rong", "landmark_name": "Cầu Rồng – Đà Nẵng", "landmark_image": None},
            {"topic_code": "exploring", "title": "Khám phá", "landmark_key": "a2_phong_nha", "landmark_name": "Phong Nha – Kẻ Bàng", "landmark_image": None},
            {"topic_code": "beach_holidays", "title": "Biển và kỳ nghỉ", "landmark_key": "a2_mui_ne", "landmark_name": "Đồi cát Mũi Né", "landmark_image": None},
            {"topic_code": "free_time", "title": "Thời gian rảnh", "landmark_key": "a2_da_lat", "landmark_name": "Ga Đà Lạt", "landmark_image": None},
            {"topic_code": "money_prices", "title": "Tiền và giá cả", "landmark_key": "a2_ben_thanh", "landmark_name": "Chợ Bến Thành", "landmark_image": None},
            {"topic_code": "architecture", "title": "Kiến trúc", "landmark_key": "a2_nha_tho_duc_ba", "landmark_name": "Nhà thờ Đức Bà Sài Gòn", "landmark_image": None},
            {"topic_code": "farm_food", "title": "Nông sản và thực phẩm", "landmark_key": "a2_cho_noi_cai_rang", "landmark_name": "Chợ nổi Cái Răng – Cần Thơ", "landmark_image": None},
        ],
        "boss": {"landmark_key": "a2_boss_cau_vang", "landmark_name": "Cầu Vàng Bà Nà", "guardian": "Bàn Tay Núi"},
    },
}


async def seed_landmarks(session: AsyncSession) -> None:
    for code, data in LANDMARKS.items():
        name, order = LEVELS[code]
        level = await session.scalar(select(Level).where(Level.code == code))
        if level is None:
            level = Level(code=code, name=name, order=order)
            session.add(level)
            await session.flush()
        level.region_theme = data["region_theme"]
        level.boss_landmark_key = data["boss"]["landmark_key"]
        level.boss_landmark_name = data["boss"]["landmark_name"]
        for topic_order, topic in enumerate(data["topics"], start=1):
            row = await session.scalar(select(Topic).where(Topic.level_id == level.id, Topic.order == topic_order))
            if row is None:
                row = Topic(level_id=level.id, order=topic_order)
                session.add(row)
            row.topic_code = topic["topic_code"]
            row.title = topic["title"]
            row.landmark_key = topic["landmark_key"]
            row.landmark_name = topic["landmark_name"]
            row.landmark_image = topic["landmark_image"]
    await session.commit()


async def main() -> None:
    async with SessionLocal() as session:
        await seed_landmarks(session)
    await engine.dispose()
    print(f"Đã nạp địa danh cho {len(LANDMARKS)} cấp.")


if __name__ == "__main__":
    asyncio.run(main())
