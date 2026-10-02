"""
Schema đăng ký, đăng nhập, token, đổi mật khẩu.

Quy tắc:
- email: chữ thường.
- username: 3–20 ký tự [a-z0-9._] sau khi chuyển chữ thường, không bắt đầu/kết thúc bằng dấu chấm.
- display_name: 1–30 ký tự sau khi cắt khoảng trắng.
- mật khẩu: 8–128 ký tự, không trùng email, username hay phần trước @ của email (không phân biệt hoa thường).
"""

from pydantic import BaseModel, EmailStr, Field, ValidationInfo, field_validator

from app.schemas.user import UserOut, check_timezone, clean_display_name

PASSWORD_MIN, PASSWORD_MAX = 8, 128
USERNAME_PATTERN = r"^[a-z0-9._]+$"


def _lower(value):
    return value.strip().lower() if isinstance(value, str) else value


def password_matches_identity(password: str, email: str | None, username: str | None) -> bool:
    """True nếu mật khẩu trùng email, username hoặc phần trước @ của email."""
    pw = password.lower()
    candidates = {username, email, email.split("@", 1)[0] if email else None}
    return any(c and pw == c.lower() for c in candidates)


class RegisterIn(BaseModel):
    email: EmailStr = Field(max_length=255)
    username: str = Field(min_length=3, max_length=20, pattern=USERNAME_PATTERN)
    display_name: str = Field(min_length=1, max_length=30)
    password: str = Field(min_length=PASSWORD_MIN, max_length=PASSWORD_MAX)
    timezone: str | None = None

    _lower_username = field_validator("username", mode="before")(_lower)
    _strip_name = field_validator("display_name", mode="before")(clean_display_name)

    @field_validator("email")
    @classmethod
    def _lower_email(cls, value: str) -> str:
        return value.lower()

    @field_validator("username")
    @classmethod
    def _username_dots(cls, value: str) -> str:
        if value.startswith(".") or value.endswith("."):
            raise ValueError("Tên người dùng không được bắt đầu hoặc kết thúc bằng dấu chấm")
        return value

    @field_validator("timezone")
    @classmethod
    def _timezone(cls, value: str | None) -> str | None:
        return None if value is None else check_timezone(value)

    @field_validator("password")
    @classmethod
    def _password_not_identity(cls, value: str, info: ValidationInfo) -> str:
        # email, username khai báo trước password nên đã có trong info.data (nếu hợp lệ)
        if password_matches_identity(value, info.data.get("email"), info.data.get("username")):
            raise ValueError("Mật khẩu không được trùng email hoặc tên người dùng")
        return value


class LoginIn(BaseModel):
    identifier: str = Field(min_length=1, max_length=255, description="Email hoặc tên người dùng")
    password: str = Field(min_length=1, max_length=PASSWORD_MAX)

    _lower_identifier = field_validator("identifier", mode="before")(_lower)


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserOut


class AccessTokenOut(BaseModel):
    """Phản hồi của /auth/token (chuẩn OAuth2, cho nút Authorize trên /docs)."""

    access_token: str
    token_type: str = "bearer"


class ChangePasswordIn(BaseModel):
    current_password: str = Field(min_length=1, max_length=PASSWORD_MAX)
    new_password: str = Field(min_length=PASSWORD_MIN, max_length=PASSWORD_MAX)
