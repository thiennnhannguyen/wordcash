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
    "MASCOT_NOT_OWNED": (403, "Bạn chưa sở hữu linh vật này nên chưa thể chọn nó."),
    # Khóa học của tôi
    "COURSE_NOT_FOUND": (404, "Không tìm thấy khóa học."),
    "COURSE_LIMIT_REACHED": (409, "Bạn đã có tối đa số khóa học cho phép. Lưu trữ hoặc xóa bớt một khóa nhé."),
    "WORD_LIMIT_REACHED": (409, "Đã chạm giới hạn số từ cho phép."),
    "DUPLICATE_IN_COURSE": (409, "Từ này đã có trong khóa học."),
    "ENTRY_NOT_FOUND": (404, "Không tìm thấy mục từ."),
    "ENTRY_NOT_OWNED": (403, "Bạn chỉ sửa được từ do chính mình tạo."),
    "SYSTEM_ENTRY_EXISTS": (409, "Từ này đã có trong kho WORDCLASH, kèm đủ phát âm và ví dụ. Dùng bản trong kho nhé?"),
    "CUSTOM_ENTRY_EXISTS": (409, "Bạn đã tự tạo từ này rồi."),
    "IMPORT_INVALID": (422, "Nội dung nhập chưa đúng định dạng."),
    "CONFIRM_REQUIRED": (400, "Bạn cần xác nhận trước khi xóa."),
    "NOTHING_TO_STUDY": (409, "Không có từ nào phù hợp với chế độ học này."),
    "STUDY_SESSION_NOT_FOUND": (404, "Không tìm thấy phiên học."),
    "STUDY_SESSION_EXPIRED": (410, "Phiên học đã hết hạn, bạn bắt đầu phiên mới nhé."),
    "SESSION_FINISHED": (409, "Phiên này đã kết thúc."),
    # Học Viện, Cửa Ải
    "UNIT_LOCKED": (403, "Bài học này chưa mở. Hoàn thành bài trước nhé."),
    "TOPIC_LOCKED": (403, "Chặng này chưa mở."),
    "LEVEL_LOCKED": (403, "Cấp này chưa mở. Hãy vượt Trận Boss của cấp trước."),
    "BOSS_LOCKED": (403, "Trận Boss chỉ mở khi bạn hoàn thành mọi chặng của cấp."),
    "BOSS_COOLDOWN": (409, "Bạn cần luyện các chặng yếu hoặc chờ hết thời gian để đánh lại Boss."),
    "DAILY_CHECK_REQUIRED": (409, "Vượt Cửa Ải Hôm Nay trước đã nhé."),
    "DAILY_CHECK_DONE": (409, "Bạn đã hoàn thành Cửa Ải hôm nay."),
    # Bộ Sưu Tập, vòng quay
    "MASCOT_NOT_FOUND": (404, "Không tìm thấy linh vật."),
    "USER_NOT_FOUND": (404, "Không tìm thấy người chơi."),
    "NO_SPINS_LEFT": (409, "Bạn không đủ lượt quay. Học thêm ở Học Viện để nhận lượt mới nhé."),
    "INVALID_SPIN_COUNT": (422, "Mỗi lần chỉ mở được từ 1 tới 10 lượt."),
    "NOT_ENOUGH_SHARDS": (409, "Bạn chưa đủ mảnh để đổi linh vật này."),
    "MASCOT_ALREADY_OWNED": (409, "Bạn đã có linh vật này rồi."),
    "MASCOT_NOT_EXCHANGEABLE": (409, "Linh vật này không đổi bằng mảnh được (chưa ra mắt, nhận qua thành tích hoặc vùng chưa mở)."),
    "IDEMPOTENCY_KEY_REQUIRED": (400, "Thiếu header Idempotency-Key."),
    "IDEMPOTENCY_KEY_REUSED": (409, "Idempotency-Key này đã dùng cho một yêu cầu khác."),
    # Công cụ duyệt nội dung (chỉ dev)
    "CONTENT_NOT_FOUND": (404, "Không tìm thấy chủ đề hoặc mục nội dung."),
    "CONTENT_REJECT_REASON_REQUIRED": (422, "Từ chối thì phải ghi lý do."),
    "CONTENT_FIELD_NOT_EDITABLE": (422, "Trường này không nhờ AI viết lại được."),
    "CONTENT_AI_UNAVAILABLE": (503, "Chưa gọi được AI (thiếu ANTHROPIC_API_KEY / ANTHROPIC_MODEL hoặc lỗi mạng)."),
    "CONTENT_REWRITE_NOT_READY": (409, "Yêu cầu viết lại chưa có bản mới (chờ xử lý hàng đợi)."),
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
