"""
Danh mục linh vật (services/mascot_catalog.py): mascots.json hiện tại hợp lệ; phân bổ sai, id trùng, ô coming_soon có tên
đều bị chặn; lore ghép đúng trường, sai tên / khóa lạ / mã lạ thì báo lỗi.
"""

import copy

import pytest

from app.services import mascot_catalog as C


@pytest.fixture
def catalog():
    return C.load_catalog()


def test_current_catalog_and_lore_are_valid(catalog):
    full = C.load_with_lore()
    assert len(full) == 100
    by_id = {m["id"]: m for m in full}
    assert [by_id[i]["is_starter"] for i in (1, 2, 3, 4)] == [True, True, True, False]
    assert {by_id[i]["obtain"] for i in (1, 2, 3)} == {"gacha"}  # khởi đầu vẫn nằm trong vòng quay
    assert by_id[1]["catchphrase"] and by_id[30]["bio"]  # lore của #001–#030
    assert all(by_id[i]["bio"] is None for i in range(31, 101))


def test_wrong_distribution_fails(catalog):
    bad = copy.deepcopy(catalog)
    next(m for m in bad if m["region"] == "A1" and m["rarity"] == "common")["rarity"] = "rare"
    with pytest.raises(C.CatalogError, match="phân bổ A1"):
        C.validate(bad)


def test_duplicate_id_fails(catalog):
    bad = copy.deepcopy(catalog)
    bad[1]["id"] = 1
    with pytest.raises(C.CatalogError, match="id trùng"):
        C.validate(bad)


def test_coming_soon_with_name_and_bad_values_fail(catalog):
    bad = copy.deepcopy(catalog)
    bad[40]["name"] = "Lộ tên"
    bad[0]["status"] = "available"
    with pytest.raises(C.CatalogError) as exc:
        C.validate(bad)
    assert "coming_soon không có tên" in str(exc.value) and "status 'available'" in str(exc.value)


LORE = """# Hồ sơ

## #001 · Bông Tím
- hometown: Văn Miếu
- catchphrase: Khoan đã!

## #002 · Bé Thính
- bio: Nghe gió.
"""


def test_parse_and_merge_lore(catalog):
    lore = C.parse_lore(LORE)
    assert lore == {1: {"name": "Bông Tím", "hometown": "Văn Miếu", "catchphrase": "Khoan đã!"}, 2: {"name": "Bé Thính", "bio": "Nghe gió."}}
    merged = {m["id"]: m for m in C.merge_lore(catalog, lore)}
    assert merged[1]["hometown"] == "Văn Miếu" and merged[1]["bio"] is None and merged[2]["bio"] == "Nghe gió."
    assert merged[1]["name"] == "Bông Tím" and merged[1]["rarity"] == "common"


@pytest.mark.parametrize(
    ("text", "message"),
    [
        ("## #001 · Bông Tím\n- power: 9000\n", "khóa 'power'"),
        ("## #001 · Bông Tím\n## #001 · Bông Tím\n", "hai lần"),
        ("## Bông Tím\n", "tiêu đề"),
    ],
)
def test_bad_lore_fails(text, message):
    with pytest.raises(C.CatalogError, match=message):
        C.parse_lore(text)


@pytest.mark.parametrize(("text", "message"), [("## #001 · Tên Khác\n", "khác danh mục"), ("## #101 · Ai Đó\n", "không có linh vật")])
def test_lore_must_match_catalog(catalog, text, message):
    with pytest.raises(C.CatalogError, match=message):
        C.merge_lore(catalog, C.parse_lore(text))
