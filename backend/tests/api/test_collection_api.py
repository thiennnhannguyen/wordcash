"""
API Bộ Sưu Tập qua httpx (PostgreSQL test thật, Redis giả): danh mục có ETag / 304, ô coming_soon chỉ lộ thông tin tối thiểu,
bộ sưu tập sau onboarding, tỉ lệ công khai, quay (Idempotency-Key bắt buộc, gửi lại trả kết quả cũ), giới hạn 30 lượt/phút,
đổi mảnh, đã xem. Luật chi tiết ở tests/integration/test_collection_service.py.
"""

import uuid

from app.core.config import settings
from app.services import stats_service
from tests import academy_helpers as H

API = "/api/v1"
MINIMAL = {"id", "code", "region", "rarity", "status"}


def idem() -> dict:
    return {"Idempotency-Key": str(uuid.uuid4())}


async def onboard(client, auth_user, starter=1):
    payload = {"goal": "general", "daily_minutes": 10, "start_mode": "a1", "starter_mascot_id": starter}
    assert (await client.patch(f"{API}/users/me/onboarding", headers=auth_user["headers"], json=payload)).status_code == 200


async def test_catalog_etag_and_coming_soon_minimal(client, auth_user):
    h = auth_user["headers"]
    res = await client.get(f"{API}/mascots", headers=h)
    assert res.status_code == 200 and res.json()["total"] == 100 and len(res.json()["mascots"]) == 100
    etag = res.headers["etag"]
    assert (await client.get(f"{API}/mascots", headers={**h, "If-None-Match": etag})).status_code == 304
    assert (await client.get(f"{API}/mascots", headers={**h, "If-None-Match": '"khac"'})).status_code == 200
    slots = {m["id"]: m for m in res.json()["mascots"]}
    assert set(slots[31]) == MINIMAL and slots[31]["status"] == "coming_soon"
    assert slots[1]["name"] == "Bông Tím" and slots[1]["profile"]["catchphrase"] and "power" not in str(slots[1]).lower()
    assert set((await client.get(f"{API}/mascots/31", headers=h)).json()) == MINIMAL
    assert (await client.get(f"{API}/mascots/2", headers=h)).json()["name"] == "Bé Thính"
    res = await client.get(f"{API}/mascots/999", headers=h)
    assert res.status_code == 404 and res.json()["error"]["code"] == "MASCOT_NOT_FOUND"
    assert (await client.get(f"{API}/mascots")).status_code == 401


async def test_collection_after_onboarding_and_rates(client, db_session, auth_user):
    await H.seeded(db_session)
    await onboard(client, auth_user, starter=2)
    col = (await client.get(f"{API}/collection", headers=auth_user["headers"])).json()
    assert (col["owned_count"], col["total"], col["avatar_mascot_id"], col["arena_mascot_id"]) == (1, 100, 2, None)
    assert col["owned"][0]["source"] == "starter" and col["unlocked_regions"] == ["A1"] and col["spins"] == {"normal": 0, "special": 0}
    rates = (await client.get(f"{API}/collection/rates", headers=auth_user["headers"])).json()
    assert rates["rates"]["normal"] == {"common": 0.6, "rare": 0.28, "epic": 0.1, "legendary": 0.02}
    assert rates["rates"]["special"] == {"common": 0.0, "rare": 0.7, "epic": 0.24, "legendary": 0.06}
    assert rates["pity_epic"] == 20 and rates["pool_size"] == {"common": 8, "rare": 5, "epic": 3, "legendary": 1}
    assert rates["exchange_cost"] == {"common": 20, "rare": 40, "epic": 60, "legendary": 150}
    assert rates["shards_per_duplicate"] == {"common": 2, "rare": 4, "epic": 8, "legendary": 20} and rates["max_batch"] == 10


async def test_spin_flow_and_errors(client, db_session, auth_user):
    await H.seeded(db_session)
    h = auth_user["headers"]
    res = await client.post(f"{API}/collection/spins", headers=h, json={"kind": "normal", "count": 1})
    assert res.status_code == 400 and res.json()["error"]["code"] == "IDEMPOTENCY_KEY_REQUIRED"
    res = await client.post(f"{API}/collection/spins", headers={**h, "Idempotency-Key": "abc"}, json={"kind": "normal", "count": 1})
    assert res.json()["error"]["code"] == "IDEMPOTENCY_KEY_REQUIRED"
    res = await client.post(f"{API}/collection/spins", headers={**h, **idem()}, json={"kind": "normal", "count": 1})
    assert res.status_code == 409 and res.json()["error"]["code"] == "NO_SPINS_LEFT"
    res = await client.post(f"{API}/collection/spins", headers={**h, **idem()}, json={"kind": "normal", "count": 11})
    assert res.status_code == 422 and res.json()["error"]["code"] == "INVALID_SPIN_COUNT"
    res = await client.post(f"{API}/collection/spins", headers={**h, **idem()}, json={"kind": "gold", "count": 1})
    assert res.json()["error"]["code"] == "VALIDATION_ERROR"

    from app.models import User
    user = await db_session.get(User, uuid.UUID(auth_user["user"]["id"]))
    stats = await stats_service.lock_stats(db_session, user.id)
    stats.spins_normal = 2
    await db_session.commit()
    key = idem()
    first = await client.post(f"{API}/collection/spins", headers={**h, **key}, json={"kind": "normal", "count": 2})
    assert first.status_code == 200 and first.json()["spins"]["normal"] == 0 and len(first.json()["results"]) == 2
    result = first.json()["results"][0]
    assert {"mascot", "rarity", "hint", "is_new_mascot", "was_duplicate", "shards_gained"} <= set(result)
    again = await client.post(f"{API}/collection/spins", headers={**h, **key}, json={"kind": "normal", "count": 2})
    assert again.status_code == 200 and again.json()["replayed"] is True and again.json()["results"] == first.json()["results"]
    reused = await client.post(f"{API}/collection/spins", headers={**h, **key}, json={"kind": "normal", "count": 1})
    assert reused.status_code == 409 and reused.json()["error"]["code"] == "IDEMPOTENCY_KEY_REUSED"

    won = result["mascot"]["id"]
    res = await client.patch(f"{API}/users/me", headers=h, json={"avatar_mascot_id": won})
    assert res.status_code == 200 and res.json()["avatar_mascot_id"] == won
    col = (await client.get(f"{API}/collection", headers=h)).json()
    assert col["new_count"] >= 1
    assert (await client.post(f"{API}/collection/seen", headers=h, json={"mascot_ids": [won]})).json()["updated"] == 1


async def test_spin_rate_limit(client, auth_user):
    h = auth_user["headers"]
    for _ in range(settings.SPIN_RATE_LIMIT_PER_MINUTE):
        res = await client.post(f"{API}/collection/spins", headers={**h, **idem()}, json={"kind": "normal", "count": 1})
        assert res.json()["error"]["code"] == "NO_SPINS_LEFT"
    res = await client.post(f"{API}/collection/spins", headers={**h, **idem()}, json={"kind": "normal", "count": 1})
    assert res.status_code == 429 and res.json()["error"]["code"] == "TOO_MANY_ATTEMPTS" and "retry-after" in res.headers


async def test_exchange_route(client, db_session, auth_user):
    await H.seeded(db_session)
    h = auth_user["headers"]
    res = await client.post(f"{API}/collection/exchange", headers=h, json={"mascot_id": 5})
    assert res.json()["error"]["code"] == "IDEMPOTENCY_KEY_REQUIRED"
    res = await client.post(f"{API}/collection/exchange", headers={**h, **idem()}, json={"mascot_id": 5})
    assert res.status_code == 409 and res.json()["error"]["code"] == "NOT_ENOUGH_SHARDS"
    from app.models import User
    stats = await stats_service.lock_stats(db_session, (await db_session.get(User, uuid.UUID(auth_user["user"]["id"]))).id)
    stats.shards = 20
    await db_session.commit()
    res = await client.post(f"{API}/collection/exchange", headers={**h, **idem()}, json={"mascot_id": 5})
    assert res.status_code == 200 and (res.json()["cost"], res.json()["shards"]) == (20, 0)
    res = await client.post(f"{API}/collection/exchange", headers={**h, **idem()}, json={"mascot_id": 31})
    assert res.json()["error"]["code"] == "MASCOT_NOT_EXCHANGEABLE"
