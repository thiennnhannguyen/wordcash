"""
Lỗi nghiệp vụ dùng chung và exception handler toàn cục. Mọi lỗi trả về cùng định dạng `utils/responses.error_response`:
{success: false, message, errors?}.
"""

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.utils.responses import error_response

logger = logging.getLogger(__name__)

# Thông báo tiếng Việt thay cho câu mặc định tiếng Anh của Starlette/FastAPI
HTTP_MESSAGES = {
    401: "Bạn cần đăng nhập.",
    403: "Bạn không có quyền thực hiện thao tác này.",
    404: "Không tìm thấy.",
    405: "Phương thức không được hỗ trợ.",
}


class AppError(Exception):
    """Lỗi do service ném ra; handler đổi thành phản hồi JSON với mã `code`."""

    def __init__(self, message: str, code: int = 400, errors: dict | list | None = None, headers: dict | None = None):
        super().__init__(message)
        self.message = message
        self.code = code
        self.errors = errors
        self.headers = headers


def _validation_errors(exc: RequestValidationError) -> dict[str, str]:
    """Gom lỗi Pydantic thành {tên trường: thông báo}, bỏ tiền tố body/query."""
    errors: dict[str, str] = {}
    for err in exc.errors():
        loc = [str(p) for p in err.get("loc", ()) if p not in ("body", "query", "path", "header")]
        errors.setdefault(".".join(loc) or "_", err.get("msg", "Không hợp lệ"))
    return errors


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def _app_error(_: Request, exc: AppError):
        response = error_response(exc.message, exc.code, exc.errors)
        if exc.headers:
            response.headers.update(exc.headers)
        return response

    @app.exception_handler(StarletteHTTPException)
    async def _http_error(_: Request, exc: StarletteHTTPException):
        message = HTTP_MESSAGES.get(exc.status_code) or (exc.detail if isinstance(exc.detail, str) else "Đã có lỗi xảy ra")
        response = error_response(message, exc.status_code)
        if exc.headers:
            response.headers.update(exc.headers)
        return response

    @app.exception_handler(RequestValidationError)
    async def _validation_error(_: Request, exc: RequestValidationError):
        return error_response("Dữ liệu gửi lên không hợp lệ.", 422, _validation_errors(exc))

    @app.exception_handler(Exception)
    async def _unhandled(_: Request, exc: Exception):
        logger.exception("Lỗi không xử lý được", exc_info=exc)
        return error_response("Đã có lỗi xảy ra", 500)
