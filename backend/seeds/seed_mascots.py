"""
Nạp danh mục 100 linh vật vào bảng mascots từ nguồn chính `seeds/data/mascots.json`, kèm hồ sơ từ `docs/mascots-lore.md`
(nếu có; xem services/mascot_catalog.py).

- Kiểm tra trước khi ghi: phân bổ vùng × độ hiếm khớp settings.MASCOT_DISTRIBUTION, tổng 45/30/18/7, id không trùng,
  lore khớp tên. Sai thì dừng, không ghi gì.
- Chạy lại nhiều lần vẫn an toàn: upsert theo `id` (không bao giờ đổi id), cập nhật mọi trường hiển thị và hồ sơ.
- Chạy (sau `alembic upgrade head`): `python -m seeds.seed_mascots` trong backend/. Dùng được ở production (danh mục thật).
"""

import asyncio

from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import SessionLocal, engine
from app.models import Mascot
from app.services import mascot_catalog

COLUMNS = (
    "code", "name", "rarity", "region", "status", "obtain", "is_starter", "shape", "primary_color", "accessory", "image_url",
    "lottie_url", *mascot_catalog.PROFILE_FIELDS,
)


async def seed(session: AsyncSession, catalog: list[dict] | None = None) -> int:
    """Upsert danh mục (đã kiểm tra) vào bảng mascots; trả số dòng."""
    catalog = catalog if catalog is not None else mascot_catalog.load_with_lore()
    mascot_catalog.validate(catalog)
    rows = [{"id": m["id"], **{c: m.get(c) for c in COLUMNS}} for m in catalog]
    stmt = pg_insert(Mascot).values(rows)
    await session.execute(stmt.on_conflict_do_update(index_elements=[Mascot.id], set_={c: stmt.excluded[c] for c in COLUMNS}))
    await session.commit()
    return len(rows)


async def main() -> None:
    async with SessionLocal() as session:
        count = await seed(session)
    await engine.dispose()
    print(f"Đã nạp {count} linh vật.")


if __name__ == "__main__":
    asyncio.run(main())
