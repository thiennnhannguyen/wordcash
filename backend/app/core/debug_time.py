"""
Header `X-Debug-Now` (ISO 8601): ghi đè "bây giờ" của một request để dev và e2e giả lập ngày khác (Cửa Ải, streak, Boss).

- Chỉ hoạt động khi `settings.debug_time_enabled` (ENV development hoặc e2e). Ở production và testing middleware bỏ qua
  header hoàn toàn (không đọc, không báo lỗi).
- Giá trị sai định dạng → 422 VALIDATION_ERROR (dễ phát hiện lỗi viết test).
- Chỉ ảnh hưởng `clock.now()`; JWT và refresh token luôn theo giờ thật (`clock.real_now()`).
"""

from starlette.types import ASGIApp, Receive, Scope, Send

from app.core import clock
from app.core.config import settings
from app.core.errors import ERRORS, error_response

HEADER = b"x-debug-now"


class DebugNowMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http" or not settings.debug_time_enabled:
            await self.app(scope, receive, send)
            return
        raw = next((v for k, v in scope.get("headers", []) if k == HEADER), None)
        if raw is None:
            await self.app(scope, receive, send)
            return
        try:
            at = clock.parse_iso(raw.decode("latin-1"))
        except ValueError:
            status, message = ERRORS["VALIDATION_ERROR"]
            response = error_response("VALIDATION_ERROR", message, status,
                                      details=[{"field": "X-Debug-Now", "message": "Thời gian phải theo ISO 8601"}])
            await response(scope, receive, send)
            return
        token = clock.set_request_now(at)
        try:
            await self.app(scope, receive, send)
        finally:
            clock.reset_request_now(token)
