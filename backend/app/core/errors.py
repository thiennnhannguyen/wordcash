"""
Lỗi nghiệp vụ dùng chung. Mọi lỗi trả về client dạng {"error": {"code", "message", "details"}}.

TODO (Bước 5): bảng mã lỗi đầy đủ và exception handler toàn cục.
"""


class AppError(Exception):
    """Lỗi do service ném ra; handler đổi thành JSON với `status_code`."""

    def __init__(self, code: str, message: str, status_code: int = 400, details=None, headers: dict | None = None):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details
        self.headers = headers


class AuthError(AppError):
    """Lỗi xác thực token (401)."""

    MESSAGES = {
        "TOKEN_EXPIRED": "Phiên đăng nhập đã hết hạn.",
        "TOKEN_INVALID": "Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.",
    }

    def __init__(self, code: str = "TOKEN_INVALID", message: str | None = None):
        super().__init__(code, message or self.MESSAGES.get(code, "Bạn cần đăng nhập."), 401, headers={"WWW-Authenticate": "Bearer"})
