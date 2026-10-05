"""
Danh mục linh vật: GET /mascots (100 ô, có ETag / If-None-Match để client lưu cache), GET /mascots/{id}.
Ô coming_soon chỉ trả id, code, region, rarity, status. Linh vật không có chỉ số sức mạnh.
Nghiệp vụ: services/collection_service.py.
"""

import hashlib
import json

from fastapi import APIRouter, Request, Response, status
from fastapi.encoders import jsonable_encoder

from app.api.deps import CurrentUser, DbSession
from app.api.responses import error_responses
from app.schemas.collection import MascotListOut
from app.services import collection_service

router = APIRouter(prefix="/mascots", tags=["Bộ Sưu Tập"])

AUTH = ("TOKEN_INVALID", "TOKEN_EXPIRED")


@router.get("", response_model=MascotListOut, summary="Danh mục 100 linh vật",
            description="Trả header ETag; gửi lại If-None-Match trùng ETag thì nhận 304 (không có body).",
            responses={**error_responses(*AUTH), 304: {"description": "Danh mục không đổi"}})
async def list_mascots(request: Request, response: Response, _user: CurrentUser, session: DbSession):
    mascots = await collection_service.get_catalog(session)
    body = {"total": len(mascots), "mascots": mascots}
    etag = '"' + hashlib.sha256(json.dumps(jsonable_encoder(body), sort_keys=True, ensure_ascii=False).encode()).hexdigest()[:32] + '"'
    headers = {"ETag": etag, "Cache-Control": "private, no-cache"}
    if etag in [t.strip() for t in request.headers.get("if-none-match", "").split(",")]:
        return Response(status_code=status.HTTP_304_NOT_MODIFIED, headers=headers)
    response.headers.update(headers)
    return body


@router.get("/{mascot_id}", summary="Chi tiết một linh vật", responses=error_responses(*AUTH, "MASCOT_NOT_FOUND"))
async def get_mascot(mascot_id: int, _user: CurrentUser, session: DbSession) -> dict:
    return await collection_service.get_mascot(session, mascot_id)
