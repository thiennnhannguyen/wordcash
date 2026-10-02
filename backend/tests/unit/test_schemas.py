"""
Kiểm thử quy tắc dữ liệu vào của auth (schema Pydantic).
"""

import pytest
from pydantic import ValidationError

from app.models import User
from app.schemas.auth import LoginIn, RegisterIn
from app.schemas.user import OnboardingIn, UserOut, UserUpdateIn

VALID = {"email": "Nhan@WordClash.vn", "username": "Nhan.Wc", "display_name": "  Nhân  ", "password": "Wordclash2026"}


def _fields(exc: ValidationError) -> set[str]:
    return {".".join(map(str, e["loc"])) or "_" for e in exc.errors()}


def test_register_normalizes():
    data = RegisterIn(**VALID)
    assert data.email == "nhan@wordclash.vn"
    assert data.username == "nhan.wc"
    assert data.display_name == "Nhân"
    assert data.timezone is None


@pytest.mark.parametrize("username", ["ab", "a" * 21, "nhan-wc", "nhân", ".nhan", "nhan.", "nhan wc"])
def test_register_bad_username(username):
    with pytest.raises(ValidationError) as err:
        RegisterIn(**{**VALID, "username": username})
    assert _fields(err.value) == {"username"}


@pytest.mark.parametrize(
    "overrides",
    [
        {"password": "ngan"},
        {"password": "x" * 129},
        {"password": "NHAN.wc"},  # trùng username
        {"password": "NHAN@wordclash.vn"},  # trùng email
        {"email": "nhan1234@wordclash.vn", "password": "Nhan1234"},  # trùng phần trước @
    ],
)
def test_register_bad_password(overrides):
    with pytest.raises(ValidationError):
        RegisterIn(**{**VALID, **overrides})


def test_register_bad_timezone_and_name():
    with pytest.raises(ValidationError) as err:
        RegisterIn(**{**VALID, "timezone": "Sao/Hoa", "display_name": "   "})
    assert _fields(err.value) == {"timezone", "display_name"}
    assert RegisterIn(**{**VALID, "timezone": "Europe/London"}).timezone == "Europe/London"


def test_login_identifier_lowercase():
    assert LoginIn(identifier="  Nhan.WC ", password="x").identifier == "nhan.wc"


def test_user_out_never_has_password_hash():
    import uuid
    from datetime import UTC, datetime

    user = User(id=uuid.uuid4(), email="a@b.vn", username="abc", display_name="A", password_hash="$argon2...", timezone="Asia/Ho_Chi_Minh", role="user", created_at=datetime.now(UTC))
    out = UserOut.model_validate(user).model_dump()
    assert "password_hash" not in out
    assert out["onboarding_completed"] is False and out["email_verified"] is False


def test_update_rejects_null_and_unknown_fields():
    assert UserUpdateIn(avatar_mascot_id=None).model_fields_set == {"avatar_mascot_id"}
    for bad in ({"display_name": None}, {"timezone": None}, {"role": "admin"}, {"avatar_mascot_id": 0}):
        with pytest.raises(ValidationError):
            UserUpdateIn(**bad)


@pytest.mark.parametrize("field,value", [("daily_minutes", 7), ("starter_mascot_id", 4), ("start_mode", "b1"), ("goal", "sat")])
def test_onboarding_choices(field, value):
    payload = {"goal": "ielts", "daily_minutes": 10, "starter_mascot_id": 2, "start_mode": "placement"}
    OnboardingIn(**payload)
    with pytest.raises(ValidationError):
        OnboardingIn(**{**payload, field: value})
