"""
Danh mục 100 linh vật (hàm thuần, không phụ thuộc DB): đọc nguồn chính `seeds/data/mascots.json`, ghép hồ sơ từ
`docs/mascots-lore.md` (nếu có) và kiểm tra danh mục trước khi seed.

- `mascots.json` là NGUỒN CHÍNH (sinh một lần từ frontend/src/data/mascots.js; từ nay sửa ở đây). Frontend chỉ còn bản mock.
- Ba linh vật khởi đầu (#001–#003) lưu `obtain = "gacha"` + `is_starter = true`: vẫn quay ra / đổi mảnh được như mọi
  linh vật gacha, cờ `is_starter` chỉ đánh dấu được chọn ở onboarding.
- Lore: mỗi linh vật một mục `## #001 · Tên`, bên dưới là các dòng `- khóa: giá trị` (khóa thuộc PROFILE_FIELDS).
  Tên ở tiêu đề phải khớp danh mục; khóa lạ, mã lạ, trùng mã đều báo lỗi để không seed nhầm.
- `validate`: id 1–100 không trùng, code khớp id, phân bổ vùng × độ hiếm đúng settings.MASCOT_DISTRIBUTION
  (tổng 45/30/18/7), ô coming_soon không có tên, ô released có tên, giá trị status/obtain/rarity/region hợp lệ.
"""

import json
import re
from collections import Counter
from pathlib import Path

from app.core.config import settings

RARITIES = ("common", "rare", "epic", "legendary")  # thấp → cao
REGIONS = ("A1", "A2", "B1", "B2", "C1", "C2")  # vùng = cấp; SPECIAL không thuộc cấp nào
SPECIAL = "SPECIAL"
STATUSES = ("released", "coming_soon")
OBTAINS = ("gacha", "achievement")
PROFILE_FIELDS = ("birthday_text", "hometown", "personality", "likes", "dislikes", "favorite_word", "catchphrase", "bio")

BACKEND_DIR = Path(__file__).resolve().parents[2]
CATALOG_PATH = BACKEND_DIR / "seeds" / "data" / "mascots.json"
LORE_PATH = BACKEND_DIR.parent / "docs" / "mascots-lore.md"


class CatalogError(ValueError):
    """Danh mục hoặc file lore sai: seed phải dừng."""


def load_catalog(path: Path = CATALOG_PATH) -> list[dict]:
    return json.loads(path.read_text(encoding="utf-8"))


HEADING = re.compile(r"^##\s+#(\d{3})\s+·\s+(.+?)\s*$")
FIELD = re.compile(r"^-\s+([a-z_]+):\s*(.*?)\s*$")


def parse_lore(text: str) -> dict[int, dict]:
    """{id: {"name": tên ở tiêu đề, khóa hồ sơ: giá trị}}. Dòng ngoài các mục (lời dẫn, ---) bị bỏ qua."""
    out: dict[int, dict] = {}
    current: dict | None = None
    for no, line in enumerate(text.splitlines(), start=1):
        if m := HEADING.match(line):
            mid = int(m.group(1))
            if mid in out:
                raise CatalogError(f"Lore dòng {no}: #{m.group(1)} xuất hiện hai lần")
            current = out[mid] = {"name": m.group(2)}
        elif line.startswith("## "):
            raise CatalogError(f"Lore dòng {no}: tiêu đề phải có dạng '## #001 · Tên'")
        elif current is not None and (m := FIELD.match(line)):
            key, value = m.groups()
            if key not in PROFILE_FIELDS:
                raise CatalogError(f"Lore dòng {no}: khóa '{key}' không hợp lệ (chỉ {', '.join(PROFILE_FIELDS)})")
            current[key] = value or None
    return out


def merge_lore(catalog: list[dict], lore: dict[int, dict]) -> list[dict]:
    """Điền trường hồ sơ từ lore (trường không có trong lore giữ nguyên giá trị của JSON)."""
    by_id = {m["id"]: m for m in catalog}
    for mid, profile in lore.items():
        mascot = by_id.get(mid)
        if mascot is None:
            raise CatalogError(f"Lore có #{mid:03d} nhưng danh mục không có linh vật này")
        if mascot["name"] != profile["name"]:
            raise CatalogError(f"Lore #{mid:03d}: tên '{profile['name']}' khác danh mục '{mascot['name']}'")
    return [{**m, **{k: v for k, v in lore.get(m["id"], {}).items() if k != "name"}} for m in catalog]


def load_with_lore(catalog_path: Path = CATALOG_PATH, lore_path: Path = LORE_PATH) -> list[dict]:
    catalog = load_catalog(catalog_path)
    if lore_path.exists():
        catalog = merge_lore(catalog, parse_lore(lore_path.read_text(encoding="utf-8")))
    validate(catalog)
    return catalog


def validate(catalog: list[dict]) -> None:
    errors = []
    ids = [m["id"] for m in catalog]
    if dupes := sorted(i for i, n in Counter(ids).items() if n > 1):
        errors.append(f"id trùng: {dupes}")
    if sorted(set(ids)) != list(range(1, 101)):
        errors.append("id phải đủ 1–100")
    for m in catalog:
        tag = f"#{m.get('id')}"
        if m.get("code") != f"{m.get('id', 0):03d}":
            errors.append(f"{tag}: code phải là '{m.get('id', 0):03d}'")
        if m.get("rarity") not in RARITIES:
            errors.append(f"{tag}: rarity '{m.get('rarity')}' không hợp lệ")
        if m.get("region") not in (*REGIONS, SPECIAL):
            errors.append(f"{tag}: region '{m.get('region')}' không hợp lệ")
        if m.get("status") not in STATUSES:
            errors.append(f"{tag}: status '{m.get('status')}' không hợp lệ")
        if m.get("obtain") not in OBTAINS:
            errors.append(f"{tag}: obtain '{m.get('obtain')}' không hợp lệ")
        if (m.get("region") == SPECIAL) != (m.get("obtain") == "achievement"):
            errors.append(f"{tag}: linh vật Đặc biệt (và chỉ chúng) nhận qua thành tích")
        if m.get("status") == "released" and not m.get("name"):
            errors.append(f"{tag}: linh vật released phải có tên")
        if m.get("status") == "coming_soon" and m.get("name"):
            errors.append(f"{tag}: ô coming_soon không có tên")
    counts = Counter((m.get("region"), m.get("rarity")) for m in catalog)
    for region, expected in settings.MASCOT_DISTRIBUTION.items():
        actual = [counts.get((region, r), 0) for r in RARITIES]
        if actual != expected:
            errors.append(f"phân bổ {region}: {actual} ≠ {expected}")
    totals = [sum(counts.get((reg, r), 0) for reg in (*REGIONS, SPECIAL)) for r in RARITIES]
    if totals != [45, 30, 18, 7]:
        errors.append(f"tổng theo độ hiếm {totals} ≠ [45, 30, 18, 7]")
    if errors:
        raise CatalogError("Danh mục linh vật sai:\n- " + "\n- ".join(errors))
