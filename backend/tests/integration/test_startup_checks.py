"""
Kiểm tra lúc khởi động (services/startup_checks.py): ENV=production mà database còn tài khoản mẫu `dev_` thì log ERROR.
- Chỉ khớp username bắt đầu đúng bằng `dev_` (`_` được thoát trong LIKE: `devx…` không khớp).
- ENV khác production: bỏ qua, không truy vấn.
- Truy vấn lỗi: chỉ cảnh báo, không chặn khởi động.
"""

import logging
from contextlib import asynccontextmanager

from app.core.config import settings
from app.services import startup_checks
from tests.factories import make_user


def _factory(session):
    @asynccontextmanager
    async def factory():
        yield session
    return factory


async def test_production_logs_error_when_dev_accounts_exist(db_session, monkeypatch, caplog):
    await make_user(db_session, "dev_normal")
    await make_user(db_session, "devxyz")  # không có dấu gạch dưới: không phải tài khoản mẫu
    await make_user(db_session, "an_dev_")
    monkeypatch.setattr(settings, "ENV", "production")

    with caplog.at_level(logging.ERROR, logger="wordclash.startup"):
        found = await startup_checks.check_no_dev_accounts(_factory(db_session))
    assert found == 1
    errors = [r for r in caplog.records if r.levelno == logging.ERROR]
    assert len(errors) == 1 and "dev_normal" in errors[0].getMessage()
    assert "devxyz" not in errors[0].getMessage() and "@" not in errors[0].getMessage()  # không log email


async def test_production_clean_database_logs_nothing(db_session, monkeypatch, caplog):
    await make_user(db_session, "devxyz")
    monkeypatch.setattr(settings, "ENV", "production")
    with caplog.at_level(logging.DEBUG, logger="wordclash.startup"):
        assert await startup_checks.check_no_dev_accounts(_factory(db_session)) == 0
    assert not [r for r in caplog.records if r.name == "wordclash.startup"]


async def test_skipped_outside_production(db_session, monkeypatch, caplog):
    await make_user(db_session, "dev_shaky")
    for env in ("development", "e2e", "testing"):
        monkeypatch.setattr(settings, "ENV", env)
        with caplog.at_level(logging.DEBUG, logger="wordclash.startup"):
            assert await startup_checks.check_no_dev_accounts(_factory(db_session)) is None
    assert not [r for r in caplog.records if r.name == "wordclash.startup"]


async def test_query_failure_only_warns(monkeypatch, caplog):
    monkeypatch.setattr(settings, "ENV", "production")

    @asynccontextmanager
    async def broken():
        raise ConnectionError("db down")
        yield

    with caplog.at_level(logging.WARNING, logger="wordclash.startup"):
        assert await startup_checks.check_no_dev_accounts(broken) is None
    assert [r.levelno for r in caplog.records if r.name == "wordclash.startup"] == [logging.WARNING]


async def test_production_catches_every_seeded_dev_account_including_admin(db_session, monkeypatch, caplog):
    """Mọi tài khoản do seeds.seed_dev_accounts tạo, kể cả dev_admin (role admin), đều bị phát hiện."""
    from app.models.user import Role
    from seeds.seed_dev_accounts import USERNAMES

    assert "dev_admin" in USERNAMES
    for name in USERNAMES:
        user = await make_user(db_session, name)
        user.username = name  # đúng tên seed, không hậu tố ngẫu nhiên
        if name == "dev_admin":
            user.role = Role.ADMIN
    await db_session.flush()
    monkeypatch.setattr(settings, "ENV", "production")

    with caplog.at_level(logging.ERROR, logger="wordclash.startup"):
        found = await startup_checks.check_no_dev_accounts(_factory(db_session))
    assert found == len(USERNAMES)
    message = [r for r in caplog.records if r.levelno == logging.ERROR][0].getMessage()
    assert all(name in message for name in USERNAMES)
