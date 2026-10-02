"""
Lỗi nghiệp vụ dùng chung và exception handler toàn cục.

Mọi lỗi trả về client cùng một dạng:
    {"error": {"code": "EMAIL_TAKEN", "message": "Email này đã được dùng", "details": ...}}
`message` viết bằng tiếng Việt, thân thiện, hiển thị thẳng cho người dùng được. Service ném `AppError(code)`;
mã HTTP và thông báo mặc định lấy từ bảng `ERRORS`. Lỗi 422 của Pydantic đổi thành VALIDATION_ERROR,
`details` là danh sách {field, message}.
"""

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)

# mã: (HTTP, thông báo mặc định)
ERRORS: dict[str, tuple[int, str]] = {
    "VALIDATION_ERROR": (422, "Dữ liệu chưa hợp lệ, bạn kiểm tra lại nhé."),
    "EMAIL_TAKEN": (409, "Email này đã được dùng"),
    "USERNAME_TAKEN": (409, "Tên người dùng đã có người chọn"),
    "INVALID_CREDENTIALS": (401, "Thông tin đăng nhập không đúng"),
    "TOO_MANY_ATTEMPTS": (429, "Bạn thử quá nhiều lần. Vui lòng đợi một lúc rồi thử lại."),
    "TOKEN_EXPIRED": (401, "Phiên đăng nhập đã hết hạn."),
    "TOKEN_INVALID": (401, "Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại."),
    "SESSION_REVOKED": (401, "Phiên đăng nhập đã bị thu hồi. Vui lòng đăng nhập lại."),
    "WEAK_PASSWORD": (422, "Mật khẩu này quá dễ đoán, bạn chọn mật khẩu khác nhé."),
    "WRONG_PASSWORD": (400, "Mật khẩu hiện tại không đúng"),
    "ACCOUNT_DISABLED": (403, "Tài khoản này đã bị khóa."),
    "FORBIDDEN_ORIGIN": (403, "Yêu cầu bị từ chối vì không đến từ trang WORDCLASH."),
    # Mã bổ sung cho các lỗi chung
    "FORBIDDEN": (403, "Bạn không có quyền thực hiện thao tác này."),
    "EMAIL_NOT_VERIFIED": (403, "Bạn cần xác thực email trước."),
    "NOT_FOUND": (404, "Không tìm thấy."),
    "METHOD_NOT_ALLOWED": (405, "Phương thức không được hỗ trợ."),
    "HTTP_ERROR": (400, "Yêu cầu không hợp lệ."),
    "INTERNAL_ERROR": (500, "Đã có lỗi xảy ra, bạn thử lại sau nhé."),
}

HTTP_STATUS_CODES = {404: "NOT_FOUND", 405: "METHOD_NOT_ALLOWED", 401: "TOKEN_INVALID", 403: "FORBIDDEN"}

BEARER = {"WWW-Authenticate": "Bearer"}


class AppError(Exception):
    """Lỗi do service ném ra. Chỉ cần `code`; mã HTTP và thông báo lấy từ ERRORS nếu không truyền."""

    def __init__(self, code: str, message: str | None = None, status_code: int | None = None, details=None, headers: dict | None = None):
        default_status, default_message = ERRORS.get(code, (400, "Yêu cầu không hợp lệ."))
        self.code = code
        self.message = message or default_message
        self.status_code = status_code or default_status
        self.details = details
        self.headers = headers
        super().__init__(self.message)


class AuthError(AppError):
    """Lỗi xác thực (401) kèm header WWW-Authenticate: Bearer."""

    def __init__(self, code: str = "TOKEN_INVALID", message: str | None = None):
        super().__init__(code, message, headers=BEARER)


def error_payload(code: str, message: str, details=None) -> dict:
    return {"error": {"code": code, "message": message, "details": details}}


def error_response(code: str, message: str, status_code: int, details=None, headers: dict | None = None) -> JSONResponse:
    return JSONResponse(error_payload(code, message, details), status_code=status_code, headers=headers)


def _field_message(err: dict, field: str) -> str:
    """Thông báo tiếng Việt cho từng lỗi Pydantic."""
    kind, ctx = err.get("type", ""), err.get("ctx") or {}
    if kind == "missing":
        return "Trường này là bắt buộc"
    if kind == "string_too_short":
        return f"Cần ít nhất {ctx.get('min_length')} ký tự"
    if kind == "string_too_long":
        return f"Tối đa {ctx.get('max_length')} ký tự"
    if kind == "string_pattern_mismatch":
        if field == "username":
            return "Chỉ dùng chữ thường không dấu, số, dấu chấm và gạch dưới"
        return "Định dạng không hợp lệ"
    if kind == "value_error":
        if field == "email":
            return "Email không hợp lệ"
        return str(ctx.get("error") or err.get("msg", "")).removeprefix("Value error, ") or "Giá trị không hợp lệ"
    if kind in ("literal_error", "enum"):
        return f"Chọn một trong: {ctx.get('expected', '')}".strip()
    if kind == "extra_forbidden":
        return "Không được phép gửi trường này"
    if kind in ("json_invalid", "model_attributes_type", "model_type", "dict_type"):
        return "Dữ liệu gửi lên không đúng định dạng"
    if kind.endswith("_type") or kind.endswith("_parsing"):
        return "Sai kiểu dữ liệu"
    return "Giá trị không hợp lệ"


def validation_details(exc: RequestValidationError) -> list[dict[str, str]]:
    details = []
    for err in exc.errors():
        loc = [str(p) for p in err.get("loc", ()) if p not in ("body", "query", "path", "header", "cookie")]
        field = ".".join(loc) or "_"
        details.append({"field": field, "message": _field_message(err, field)})
    return details


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def _app_error(_: Request, exc: AppError):
        return error_response(exc.code, exc.message, exc.status_code, exc.details, exc.headers)

    @app.exception_handler(RequestValidationError)
    async def _validation_error(_: Request, exc: RequestValidationError):
        code = "VALIDATION_ERROR"
        return error_response(code, ERRORS[code][1], 422, validation_details(exc))

    @app.exception_handler(StarletteHTTPException)
    async def _http_error(_: Request, exc: StarletteHTTPException):
        code = HTTP_STATUS_CODES.get(exc.status_code, "HTTP_ERROR")
        return error_response(code, ERRORS[code][1], exc.status_code, headers=exc.headers)

    @app.exception_handler(Exception)
    async def _unhandled(_: Request, exc: Exception):
        # Chỉ ghi loại lỗi và traceback; engine đặt hide_parameters nên không lộ dữ liệu SQL
        logger.exception("Lỗi không xử lý được: %s", type(exc).__name__, exc_info=exc)
        code = "INTERNAL_ERROR"
        return error_response(code, ERRORS[code][1], 500)
