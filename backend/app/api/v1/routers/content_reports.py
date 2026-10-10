"""
Báo lỗi nội dung. Người học: POST /content-reports (chỉ mục từ hệ thống; tối đa CONTENT_REPORT_DAILY_LIMIT báo cáo mới mỗi
ngày; cùng mục + cùng loại trong ngày chỉ tính một lần). Quản trị (CHỈ role admin): GET /admin/content-reports (gom theo mục,
sắp theo số báo cáo), PATCH /admin/content-reports/entries/{entry_id} (đổi trạng thái cả nhóm), PATCH
/admin/content-reports/{id}. Nghiệp vụ: services/content_report_service.py.
"""

import uuid
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query

from app.api.deps import CurrentUser, DbSession, get_current_active_admin
from app.api.responses import error_responses
from app.core import clock
from app.models import User
from app.schemas.content_report import ContentReportCreatedOut, ContentReportIn, ReportListOut, ReportStatusIn, ReportStatusOut
from app.services import content_report_service

router = APIRouter(tags=["Báo lỗi nội dung"])
AdminUser = Annotated[User, Depends(get_current_active_admin)]
AUTH = ("TOKEN_INVALID", "TOKEN_EXPIRED")


@router.post("/content-reports", response_model=ContentReportCreatedOut, summary="Báo lỗi một từ / câu hỏi",
             description="Gửi `question` (câu vừa làm: server tự chụp lại đề + đáp án đúng đã lưu) hoặc `entry_id` (thẻ học). "
                         "`created = false`: hôm nay đã báo cùng mục + cùng loại.",
             responses=error_responses(*AUTH, "CONTENT_REPORT_LIMIT", "CONTENT_REPORT_NOT_ALLOWED", "NOT_FOUND"))
async def create_report(data: ContentReportIn, user: CurrentUser, session: DbSession):
    return await content_report_service.create(session, user, data, clock.now())


@router.get("/admin/content-reports", response_model=ReportListOut, summary="(admin) Báo lỗi gom theo mục",
            responses=error_responses(*AUTH, "FORBIDDEN"))
async def list_reports(admin: AdminUser, session: DbSession,
                       status: Annotated[Literal["open", "resolved", "dismissed", "all"], Query()] = "open"):
    return await content_report_service.list_groups(session, status)


@router.patch("/admin/content-reports/entries/{entry_id}", response_model=ReportStatusOut,
              summary="(admin) Đổi trạng thái mọi báo cáo của một mục",
              description="resolved / dismissed: mọi báo cáo đang mở của mục; open: mở lại các báo cáo đã đóng.",
              responses=error_responses(*AUTH, "FORBIDDEN"))
async def set_entry_status(entry_id: int, data: ReportStatusIn, admin: AdminUser, session: DbSession):
    return {"updated": await content_report_service.set_entry_status(session, admin, entry_id, data.status, clock.now())}


@router.patch("/admin/content-reports/{report_id}", response_model=ReportStatusOut, summary="(admin) Đổi trạng thái một báo cáo",
              responses=error_responses(*AUTH, "FORBIDDEN", "NOT_FOUND"))
async def set_status(report_id: uuid.UUID, data: ReportStatusIn, admin: AdminUser, session: DbSession):
    return {"updated": await content_report_service.set_status(session, admin, report_id, data.status, clock.now())}
