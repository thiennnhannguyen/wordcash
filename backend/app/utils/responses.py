"""
Định dạng JSON thống nhất cho mọi API:
- thành công: {success: true, message, data}
- thất bại:   {success: false, message, errors?}
Router trả `success_response(...)` kèm `response_model=ApiResponse[...]`; lỗi đi qua exception handler trong core/exceptions.py.
"""

from typing import Any

from fastapi.responses import JSONResponse


def success_response(data: Any = None, message: str = "Thành công") -> dict:
    """Tạo phản hồi chuẩn cho API thành công (mã HTTP đặt ở `status_code` của route)."""
    return {"success": True, "message": message, "data": data}


def error_response(message: str = "Đã có lỗi xảy ra", code: int = 400, errors: Any = None) -> JSONResponse:
    """Tạo phản hồi chuẩn cho API thất bại."""
    payload: dict[str, Any] = {"success": False, "message": message}
    if errors is not None:
        payload["errors"] = errors
    return JSONResponse(payload, status_code=code)
