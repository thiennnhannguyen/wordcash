"""
Kiểm thử băm mật khẩu, JWT access token và refresh token.
"""

import uuid
from datetime import UTC, datetime, timedelta

import jwt
import pytest
from pwdlib import PasswordHash
from pwdlib.hashers.argon2 import Argon2Hasher

from app.core import security
from app.core.config import settings
from app.core.errors import AuthError


def _encode(**overrides) -> str:
    now = datetime.now(UTC)
    payload = {"sub": str(uuid.uuid4()), "role": "user", "type": "access", "iat": now, "exp": now + timedelta(minutes=5)}
    payload.update(overrides)
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def test_hash_and_verify_password():
    hashed = security.hash_password("Wordclash2026")
    assert hashed != "Wordclash2026" and hashed.startswith("$argon2id$")
    assert security.verify_password("Wordclash2026", hashed) == (True, None)
    assert security.verify_password("wordclash2026", hashed) == (False, None)


def test_verify_without_user_uses_dummy_hash():
    assert security.verify_password("bat-ky", None) == (False, None)


def test_verify_returns_new_hash_when_params_change():
    weak = PasswordHash((Argon2Hasher(time_cost=1, memory_cost=8192),)).hash("Wordclash2026")
    ok, new_hash = security.verify_password("Wordclash2026", weak)
    assert ok is True
    assert new_hash is not None and new_hash != weak
    assert security.verify_password("Wordclash2026", new_hash) == (True, None)


def test_verify_broken_hash_is_false():
    assert security.verify_password("abc", "khong-phai-hash") == (False, None)


def test_access_token_roundtrip():
    user_id = uuid.uuid4()
    token, expires_in = security.create_access_token(user_id, "admin")
    assert expires_in == settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60 == 900
    claims = security.decode_access_token(token)
    assert claims["sub"] == user_id
    assert claims["role"] == "admin"
    assert claims["type"] == "access"
    assert claims["jti"] and claims["exp"] - claims["iat"] == expires_in


def test_tokens_have_unique_jti():
    a, _ = security.create_access_token(uuid.uuid4(), "user")
    b, _ = security.create_access_token(uuid.uuid4(), "user")
    assert jwt.decode(a, options={"verify_signature": False})["jti"] != jwt.decode(b, options={"verify_signature": False})["jti"]


def test_expired_token():
    token = _encode(exp=datetime.now(UTC) - timedelta(seconds=30))
    with pytest.raises(AuthError) as err:
        security.decode_access_token(token)
    assert err.value.code == "TOKEN_EXPIRED" and err.value.status_code == 401


def test_expiry_leeway_10_seconds():
    token = _encode(exp=datetime.now(UTC) - timedelta(seconds=5))
    assert security.decode_access_token(token)["role"] == "user"


def test_tampered_token():
    token, _ = security.create_access_token(uuid.uuid4(), "user")
    header, payload, signature = token.split(".")
    tampered = ".".join([header, payload, signature[:-2] + ("AA" if signature[-2:] != "AA" else "BB")])
    with pytest.raises(AuthError) as err:
        security.decode_access_token(tampered)
    assert err.value.code == "TOKEN_INVALID"


def test_wrong_secret():
    token = jwt.encode({"sub": str(uuid.uuid4()), "type": "access", "iat": datetime.now(UTC), "exp": datetime.now(UTC) + timedelta(minutes=5)}, "khoa-khac-hoan-toan-dai-hon-32-ky-tu!!", algorithm="HS256")
    with pytest.raises(AuthError) as err:
        security.decode_access_token(token)
    assert err.value.code == "TOKEN_INVALID"


@pytest.mark.parametrize("overrides", [{"type": "refresh"}, {"sub": "khong-phai-uuid"}, {"type": None}])
def test_wrong_type_or_subject(overrides):
    with pytest.raises(AuthError) as err:
        security.decode_access_token(_encode(**overrides))
    assert err.value.code == "TOKEN_INVALID"


def test_garbage_and_none_algorithm():
    unsigned = jwt.encode({"sub": str(uuid.uuid4()), "type": "access", "iat": 1, "exp": 9999999999}, None, algorithm="none")
    for token in ("rac", "", unsigned):
        with pytest.raises(AuthError):
            security.decode_access_token(token)


def test_refresh_token_random_and_hashed():
    a, b = security.generate_refresh_token(), security.generate_refresh_token()
    assert a != b and len(a) >= 64
    assert security.hash_token(a) == security.hash_token(a)
    assert len(security.hash_token(a)) == 64 and security.hash_token(a) != a
