"""
Công cụ duyệt nội dung kho từ — CHỈ có khi ENV=development (không có ở production, testing, e2e; có test).
Đọc / ghi trực tiếp backend/content/<cấp>/*.json. Nghiệp vụ: services/dev_content_service.py. Trang dùng: frontend /dev/content.
"""

from fastapi import APIRouter

from app.api.deps import CurrentUser
from app.api.responses import error_responses
from app.schemas.dev_content import EntryPatchIn, RewriteIn, RewriteResolveIn, UnitPatchIn
from app.services import dev_content_service as svc

router = APIRouter(prefix="/dev/content", tags=["Dev: duyệt nội dung"])
NF = ("TOKEN_INVALID", "TOKEN_EXPIRED", "CONTENT_NOT_FOUND")


@router.get("", summary="(dev) Các cấp, chủ đề và tiến độ duyệt")
async def levels(_: CurrentUser):
    return svc.list_levels()


@router.get("/{level}/{topic}", summary="(dev) Toàn bộ mục và bài của một chủ đề", responses=error_responses(*NF))
async def topic(level: str, topic: str, _: CurrentUser):
    return svc.get_topic(level, topic)


@router.patch("/{level}/{topic}/entries/{key}", summary="(dev) Sửa / duyệt / từ chối một mục",
              responses=error_responses(*NF, "CONTENT_REJECT_REASON_REQUIRED", "VALIDATION_ERROR"))
async def patch_entry(level: str, topic: str, key: str, data: EntryPatchIn, _: CurrentUser):
    return await svc.update_entry(level, topic, key, data.model_dump(exclude_unset=True))


@router.get("/{level}/{topic}/entries/{key}/questions", summary="(dev) Câu hỏi mẫu mức 1–4 (kèm đáp án)", responses=error_responses(*NF))
async def questions(level: str, topic: str, key: str, _: CurrentUser):
    return svc.sample_questions(level, topic, key)


@router.post("/{level}/{topic}/entries/{key}/rewrite",
             summary="(dev) Viết lại một trường: chế độ agent → vào hàng đợi; anthropic → trả bản mới (không tự lưu)",
             responses=error_responses(*NF, "CONTENT_FIELD_NOT_EDITABLE", "CONTENT_AI_UNAVAILABLE"))
async def rewrite(level: str, topic: str, key: str, data: RewriteIn, _: CurrentUser):
    return await svc.rewrite_field(level, topic, key, data.field, data.note)


@router.post("/{level}/{topic}/rewrites/{request_id}", summary="(dev) Chọn bản mới / giữ bản cũ của một yêu cầu viết lại",
             responses=error_responses(*NF, "CONTENT_REWRITE_NOT_READY", "VALIDATION_ERROR"))
async def resolve_rewrite(level: str, topic: str, request_id: str, data: RewriteResolveIn, _: CurrentUser):
    return await svc.resolve_rewrite(level, topic, request_id, data.accept)


@router.patch("/{level}/{topic}/units/{unit_key}", summary="(dev) Sửa / duyệt tên bài", responses=error_responses(*NF))
async def patch_unit(level: str, topic: str, unit_key: str, data: UnitPatchIn, _: CurrentUser):
    return await svc.update_unit(level, topic, unit_key, data.model_dump(exclude_unset=True))
