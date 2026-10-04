"""
DỮ LIỆU MẪU CHO DEV: 60 mục từ hệ thống cấp A1 (10 chủ đề × 6 từ) để /bank/search, "Khóa học của tôi" và màn học có dữ liệu thật.

- KHÔNG phải kho từ chính thức. Nghĩa, định nghĩa tiếng Anh và câu ví dụ là nội dung nháp tự viết (không chép từ điển).
  Mỗi mục được đánh dấu `exam_tags = ["DEV_SAMPLE"]` để nhận ra và xóa khi nạp kho thật.
- Để hiện được trong /bank/search, các mục được đặt `status = approved`. Đây là ngoại lệ chỉ dành cho môi trường dev/e2e;
  script từ chối chạy khi ENV=production.
- Chạy (sau `alembic upgrade head`): `python -m seeds.seed_dev_entries` trong backend/. Chạy lại nhiều lần vẫn an toàn:
  mục DEV_SAMPLE trùng chữ thì cập nhật, chưa có thì tạo; không đụng tới mục từ khác.
"""

import asyncio

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import SessionLocal, engine
from app.models import Entry, EntrySource, EntryStatus, EntryType

DEV_TAG = "DEV_SAMPLE"

# chủ đề: [(từ, loại từ, phiên âm, nghĩa, định nghĩa tiếng Anh tự viết, câu ví dụ có chứa đúng từ đó)]
ENTRIES: dict[str, list[tuple[str, str, str, str, str, str]]] = {
    "Chào hỏi": [
        ("hello", "thán từ", "/həˈləʊ/", "xin chào", "A word you say when you meet someone.", "She says hello to everyone in the morning."),
        ("goodbye", "thán từ", "/ˌɡʊdˈbaɪ/", "tạm biệt", "A word you say when you leave.", "We said goodbye at the bus stop."),
        ("name", "danh từ", "/neɪm/", "tên", "The word people call you.", "My name is Lan."),
        ("friend", "danh từ", "/frend/", "bạn bè", "A person you like and trust.", "Minh is my best friend."),
        ("thank", "động từ", "/θæŋk/", "cảm ơn", "To tell someone you are happy about what they did.", "I want to thank you for the gift."),
        ("sorry", "tính từ", "/ˈsɒri/", "xin lỗi", "Feeling bad about something you did.", "I am sorry I am late."),
    ],
    "Gia đình": [
        ("mother", "danh từ", "/ˈmʌðə/", "mẹ", "Your female parent.", "My mother cooks very well."),
        ("father", "danh từ", "/ˈfɑːðə/", "bố", "Your male parent.", "His father works in a bank."),
        ("sister", "danh từ", "/ˈsɪstə/", "chị gái, em gái", "A girl who has the same parents as you.", "My sister is ten years old."),
        ("brother", "danh từ", "/ˈbrʌðə/", "anh trai, em trai", "A boy who has the same parents as you.", "Her brother plays football."),
        ("baby", "danh từ", "/ˈbeɪbi/", "em bé", "A very young child.", "The baby is sleeping now."),
        ("family", "danh từ", "/ˈfæməli/", "gia đình", "Parents and their children.", "I have a big family."),
    ],
    "Số đếm và thời gian": [
        ("hour", "danh từ", "/ˈaʊə/", "giờ, tiếng đồng hồ", "Sixty minutes.", "The film is one hour long."),
        ("minute", "danh từ", "/ˈmɪnɪt/", "phút", "Sixty seconds.", "Wait a minute, please."),
        ("morning", "danh từ", "/ˈmɔːnɪŋ/", "buổi sáng", "The early part of the day.", "I drink milk every morning."),
        ("week", "danh từ", "/wiːk/", "tuần", "Seven days.", "We have English class twice a week."),
        ("today", "trạng từ", "/təˈdeɪ/", "hôm nay", "On this day.", "It is my birthday today."),
        ("number", "danh từ", "/ˈnʌmbə/", "con số", "A word or sign like one, two or 3.", "What is your phone number?"),
    ],
    "Đồ ăn": [
        ("rice", "danh từ", "/raɪs/", "cơm, gạo", "Small white grains that people cook and eat.", "We eat rice every day."),
        ("bread", "danh từ", "/bred/", "bánh mì", "Food made from flour and baked.", "I buy bread for breakfast."),
        ("water", "danh từ", "/ˈwɔːtə/", "nước", "The clear drink that falls as rain.", "Please give me a glass of water."),
        ("apple", "danh từ", "/ˈæpl/", "quả táo", "A round fruit with red or green skin.", "She eats an apple after lunch."),
        ("hungry", "tính từ", "/ˈhʌŋɡri/", "đói", "Wanting to eat.", "I am hungry after school."),
        ("cook", "động từ", "/kʊk/", "nấu ăn", "To make food hot and ready to eat.", "My dad likes to cook on Sundays."),
    ],
    "Nhà cửa": [
        ("house", "danh từ", "/haʊs/", "ngôi nhà", "A building where people live.", "Their house has a red door."),
        ("room", "danh từ", "/ruːm/", "căn phòng", "A part of a house with walls.", "My room is small but clean."),
        ("kitchen", "danh từ", "/ˈkɪtʃɪn/", "nhà bếp", "The room where you cook.", "Mum is in the kitchen."),
        ("bed", "danh từ", "/bed/", "cái giường", "Furniture you sleep on.", "I go to bed at ten."),
        ("door", "danh từ", "/dɔː/", "cánh cửa", "You open it to go into a room.", "Please close the door."),
        ("window", "danh từ", "/ˈwɪndəʊ/", "cửa sổ", "A glass opening in a wall.", "Open the window, it is hot."),
    ],
    "Đi lại": [
        ("bus", "danh từ", "/bʌs/", "xe buýt", "A big vehicle that carries many people.", "I take the bus to school."),
        ("bike", "danh từ", "/baɪk/", "xe đạp", "A vehicle with two wheels that you ride.", "He rides his bike to the park."),
        ("street", "danh từ", "/striːt/", "đường phố", "A road in a town.", "There are many shops on this street."),
        ("ticket", "danh từ", "/ˈtɪkɪt/", "vé", "A paper that lets you travel or enter.", "I need a train ticket."),
        ("left", "danh từ", "/left/", "bên trái", "The side opposite to right.", "Turn left at the bank."),
        ("walk", "động từ", "/wɔːk/", "đi bộ", "To move on your feet.", "We walk to the market."),
    ],
    "Mua sắm": [
        ("shop", "danh từ", "/ʃɒp/", "cửa hàng", "A place where you buy things.", "The shop opens at eight."),
        ("money", "danh từ", "/ˈmʌni/", "tiền", "What you use to buy things.", "I do not have much money."),
        ("price", "danh từ", "/praɪs/", "giá", "How much something costs.", "The price is too high."),
        ("buy", "động từ", "/baɪ/", "mua", "To get something by paying money.", "I want to buy a new bag."),
        ("cheap", "tính từ", "/tʃiːp/", "rẻ", "Not costing much money.", "These shoes are cheap."),
        ("market", "danh từ", "/ˈmɑːkɪt/", "chợ", "A place where people sell food and things.", "Grandma goes to the market early."),
    ],
    "Thời tiết": [
        ("rain", "danh từ", "/reɪn/", "mưa", "Water that falls from clouds.", "The rain stopped at noon."),
        ("sun", "danh từ", "/sʌn/", "mặt trời", "The bright star in the sky during the day.", "The sun is very hot today."),
        ("cold", "tính từ", "/kəʊld/", "lạnh", "Having a low temperature.", "It is cold in December."),
        ("hot", "tính từ", "/hɒt/", "nóng", "Having a high temperature.", "Summer in Hanoi is hot."),
        ("wind", "danh từ", "/wɪnd/", "gió", "Air that moves fast.", "The wind is strong tonight."),
        ("cloud", "danh từ", "/klaʊd/", "đám mây", "A white or grey shape in the sky.", "There is not a cloud in the sky."),
    ],
    "Thiên nhiên": [
        ("tree", "danh từ", "/triː/", "cái cây", "A tall plant with a trunk and leaves.", "A bird is singing in the tree."),
        ("flower", "danh từ", "/ˈflaʊə/", "bông hoa", "The colourful part of a plant.", "She gave me a yellow flower."),
        ("river", "danh từ", "/ˈrɪvə/", "con sông", "A long line of water that flows.", "The river is very wide."),
        ("mountain", "danh từ", "/ˈmaʊntɪn/", "ngọn núi", "A very high hill.", "We climbed the mountain on Saturday."),
        ("sea", "danh từ", "/siː/", "biển", "The big salt water.", "I love swimming in the sea."),
        ("animal", "danh từ", "/ˈænɪml/", "động vật", "A living thing that can move, like a dog.", "The cat is my favourite animal."),
    ],
    "Trường học và học tập": [
        ("school", "danh từ", "/skuːl/", "trường học", "A place where children learn.", "Our school starts at seven."),
        ("teacher", "danh từ", "/ˈtiːtʃə/", "giáo viên", "A person who helps people learn.", "Our teacher is very kind."),
        ("book", "danh từ", "/bʊk/", "quyển sách", "Pages with words that you read.", "This book is about animals."),
        ("pen", "danh từ", "/pen/", "cái bút", "A thing you write with ink.", "Can I borrow your pen?"),
        ("learn", "động từ", "/lɜːn/", "học", "To get new knowledge.", "I learn ten new words every day."),
        ("homework", "danh từ", "/ˈhəʊmwɜːk/", "bài tập về nhà", "School work you do at home.", "I finish my homework before dinner."),
    ],
}


async def seed(session: AsyncSession) -> tuple[int, int]:
    existing = {
        e.headword.lower(): e
        for e in await session.scalars(
            select(Entry).where(Entry.source == EntrySource.SYSTEM, Entry.exam_tags.contains([DEV_TAG]))
        )
    }
    created = updated = 0
    for topic, rows in ENTRIES.items():
        for headword, pos, ipa, meaning, definition, example in rows:
            values = {
                "headword": headword, "pos": pos, "ipa": ipa, "meaning_vi": meaning, "definition_en": definition,
                "example": example, "cefr": "A1", "topic": topic, "entry_type": EntryType.WORD, "exam_tags": [DEV_TAG],
                "status": EntryStatus.APPROVED, "source": EntrySource.SYSTEM, "owner_user_id": None,
            }
            entry = existing.get(headword.lower())
            if entry is None:
                session.add(Entry(**values))
                created += 1
            else:
                for field, value in values.items():
                    setattr(entry, field, value)
                updated += 1
    await session.commit()
    return created, updated


async def main() -> None:
    if settings.is_production:
        raise SystemExit("seed_dev_entries chỉ dành cho dev/e2e, không chạy ở production.")
    async with SessionLocal() as session:
        created, updated = await seed(session)
        total = await session.scalar(select(func.count()).select_from(Entry).where(Entry.exam_tags.contains([DEV_TAG])))
    await engine.dispose()
    print(f"Mục từ mẫu DEV_SAMPLE: tạo {created}, cập nhật {updated}, tổng {total}.")


if __name__ == "__main__":
    asyncio.run(main())
