"""
Cookie chứa refresh token: httpOnly (JavaScript không đọc được), SameSite=Lax, chỉ gửi kèm các route /api/v1/auth.
"""

from fastapi import Response

from app.core.config import settings


def set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=settings.COOKIE_NAME,
        value=token,
        max_age=settings.refresh_token_seconds,
        path=settings.COOKIE_PATH,
        domain=settings.COOKIE_DOMAIN,
        secure=settings.COOKIE_SECURE,
        httponly=True,
        samesite="lax",
    )


def clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.COOKIE_NAME,
        path=settings.COOKIE_PATH,
        domain=settings.COOKIE_DOMAIN,
        secure=settings.COOKIE_SECURE,
        httponly=True,
        samesite="lax",
    )
