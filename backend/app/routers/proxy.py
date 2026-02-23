from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select
import httpx
import uuid
import os
import hashlib
import hmac
from app.auth import get_current_user
from app.models import User
from app.security import decrypt_data
from app.config import settings
from app.database import get_session

router = APIRouter(prefix="/api/proxy/immich", tags=["immich-proxy"])

UPLOAD_DIR = "data/uploads"


def generate_asset_signature(asset_id: str, user_id: int = 1) -> str:
    """生成资源签名（永不过期），包含用户ID"""
    message = f"immich:{user_id}:{asset_id}"
    return hmac.new(
        settings.SECRET_KEY.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()[:32]


def verify_asset_signature(asset_id: str, sig: str, session: Session) -> tuple[bool, User | None]:
    """验证资源签名，遍历数据库中所有用户进行验证
    
    返回: (是否有效, 用户对象)
    """
    # 查询所有用户
    users = session.exec(select(User)).all()
    for user in users:
        expected = generate_asset_signature(asset_id, user.id)
        if hmac.compare_digest(expected, sig):
            return True, user
    return False, None


def get_immich_headers(user: User) -> dict:
    """获取 Immich API 请求头"""
    if not user.immich_url or not user.immich_api_key:
        return None
    api_key = decrypt_data(user.immich_api_key)
    return {
        "x-api-key": api_key,
        "Accept": "application/json"
    }


def get_immich_base_url(user: User) -> str:
    """获取 Immich API 基础 URL"""
    return f"{user.immich_url.rstrip('/')}/api"


@router.get("/albums")
async def list_albums(current_user: User = Depends(get_current_user)):
    headers = get_immich_headers(current_user)
    if not headers: return []
    base_url = get_immich_base_url(current_user)
    
    async with httpx.AsyncClient(base_url=base_url, headers=headers, verify=False, timeout=30.0) as client:
        resp = await client.get("/albums")
        if resp.status_code == 200:
            albums = resp.json()
            # 为每个相册的封面添加签名
            for album in albums:
                if album.get("albumThumbnailAssetId"):
                    album["albumThumbnailSig"] = generate_asset_signature(album["albumThumbnailAssetId"], current_user.id)
            return albums
        return []


@router.get("/album/{album_id}/assets")
async def list_album_assets(album_id: str, current_user: User = Depends(get_current_user)):
    """获取特定相册内的资产：GET /api/albums/{id}"""
    headers = get_immich_headers(current_user)
    if not headers: return []
    base_url = get_immich_base_url(current_user)
    
    async with httpx.AsyncClient(base_url=base_url, headers=headers, verify=False, timeout=30.0) as client:
        resp = await client.get(f"/albums/{album_id}")
        if resp.status_code == 200:
            data = resp.json()
            assets = data.get("assets", [])
            return [{
                "id": a.get("id"),
                "type": a.get("type"),
                "duration": a.get("duration"),
                "originalFileName": a.get("originalFileName"),
                "sig": generate_asset_signature(a.get("id"), current_user.id),
            } for a in assets]
        return []


@router.get("/assets")
async def list_immich_assets(page: int = 1, size: int = 50, current_user: User = Depends(get_current_user)):
    """获取资产列表，包含 type、duration 和签名"""
    headers = get_immich_headers(current_user)
    if not headers: return []
    base_url = get_immich_base_url(current_user)
    
    async with httpx.AsyncClient(base_url=base_url, headers=headers, verify=False, timeout=30.0) as client:
        resp = await client.post("/search/metadata", json={"page": page, "size": size, "order": "desc"})
        if resp.status_code == 200:
            data = resp.json()
            assets_obj = data.get("assets", {})
            items = assets_obj.get("items", []) if isinstance(assets_obj, dict) else data
            return [{
                "id": a.get("id"),
                "type": a.get("type"),
                "duration": a.get("duration"),
                "originalFileName": a.get("originalFileName"),
                "sig": generate_asset_signature(a.get("id"), current_user.id),
            } for a in items]
        return []


@router.get("/asset/{asset_id}")
async def proxy_asset(
    asset_id: str, 
    sig: str = Query(...),
    session: Session = Depends(get_session)
):
    """代理缩略图 - 支持签名验证，无需 Authorization header"""
    # 通过签名验证获取用户
    valid, user = verify_asset_signature(asset_id, sig, session)
    if not valid or not user:
        raise HTTPException(403, "Invalid signature")
    
    headers = get_immich_headers(user)
    if not headers: raise HTTPException(404, "Immich not configured")
    base_url = get_immich_base_url(user)
    
    async def generate():
        async with httpx.AsyncClient(base_url=base_url, headers=headers, verify=False, timeout=60.0) as client:
            async with client.stream("GET", f"/assets/{asset_id}/thumbnail", params={"size": "thumbnail", "format": "WEBP"}) as response:
                async for chunk in response.aiter_bytes():
                    yield chunk
    
    return StreamingResponse(generate(), media_type="image/webp")


@router.get("/info/{asset_id}")
async def get_asset_info(asset_id: str, current_user: User = Depends(get_current_user)):
    """获取资产信息，包含类型（IMAGE/VIDEO）"""
    headers = get_immich_headers(current_user)
    if not headers: raise HTTPException(404, "Immich not configured")
    base_url = get_immich_base_url(current_user)
    
    async with httpx.AsyncClient(base_url=base_url, headers=headers, verify=False, timeout=30.0) as client:
        resp = await client.get(f"/assets/{asset_id}")
        if resp.status_code != 200:
            raise HTTPException(404, "Asset not found")
        data = resp.json()
        return {
            "id": data.get("id"),
            "type": data.get("type"),
            "originalFileName": data.get("originalFileName"),
            "originalMimeType": data.get("originalMimeType"),
            "duration": data.get("duration"),
            "width": data.get("width"),
            "height": data.get("height"),
        }


@router.get("/original/{asset_id}")
async def proxy_original(
    asset_id: str,
    sig: str = Query(...),
    session: Session = Depends(get_session)
):
    """代理原始图片 - 支持签名验证，无需 Authorization header"""
    valid, user = verify_asset_signature(asset_id, sig, session)
    if not valid or not user:
        raise HTTPException(403, "Invalid signature")
    
    headers = get_immich_headers(user)
    if not headers: raise HTTPException(404, "Immich not configured")
    base_url = get_immich_base_url(user)
    
    async def generate():
        async with httpx.AsyncClient(base_url=base_url, headers=headers, verify=False, timeout=300.0) as client:
            async with client.stream("GET", f"/assets/{asset_id}/original") as response:
                async for chunk in response.aiter_bytes():
                    yield chunk
    
    return StreamingResponse(generate(), media_type="image/jpeg")


@router.get("/video/{asset_id}")
async def proxy_video(
    asset_id: str,
    sig: str = Query(...),
    session: Session = Depends(get_session)
):
    """代理视频播放流 - 支持签名验证，无需 Authorization header"""
    valid, user = verify_asset_signature(asset_id, sig, session)
    if not valid or not user:
        raise HTTPException(403, "Invalid signature")
    
    headers = get_immich_headers(user)
    if not headers: raise HTTPException(404, "Immich not configured")
    base_url = get_immich_base_url(user)
    
    async def generate():
        async with httpx.AsyncClient(base_url=base_url, headers=headers, verify=False, timeout=300.0) as client:
            async with client.stream("GET", f"/assets/{asset_id}/video/playback") as response:
                async for chunk in response.aiter_bytes():
                    yield chunk
    
    return StreamingResponse(generate(), media_type="video/mp4")


@router.post("/import")
async def import_asset(asset_id: str, mode: str = "link", current_user: User = Depends(get_current_user)):
    """导入资产：返回带签名的URL"""
    headers = get_immich_headers(current_user)
    if not headers: raise HTTPException(404, "Immich not configured")
    base_url = get_immich_base_url(current_user)
    
    async with httpx.AsyncClient(base_url=base_url, headers=headers, verify=False, timeout=300.0) as client:
        # 获取资产信息
        info_resp = await client.get(f"/assets/{asset_id}")
        if info_resp.status_code != 200:
            raise HTTPException(404, "Asset not found")
        
        asset_info = info_resp.json()
        asset_type = asset_info.get("type", "IMAGE")
        original_mime = asset_info.get("originalMimeType", "image/jpeg")
        duration = asset_info.get("duration")
        
        # 生成签名
        sig = generate_asset_signature(asset_id, current_user.id)
        
        if mode == "link":
            if asset_type == "VIDEO":
                return {
                    "url": f"/api/proxy/immich/video/{asset_id}?sig={sig}",
                    "type": "video",
                    "mediaType": "video",
                    "duration": duration,
                    "signature": sig
                }
            else:
                return {
                    "url": f"/api/proxy/immich/original/{asset_id}?sig={sig}",
                    "type": "image",
                    "mediaType": "image",
                    "signature": sig
                }
        
        # copy 模式：下载原文件
        original_resp = await client.get(f"/assets/{asset_id}/original")
        if original_resp.status_code != 200:
            raise HTTPException(400, "Failed to fetch original asset")
        
        ext_map = {
            "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", 
            "image/gif": ".gif", "image/svg+xml": ".svg",
            "video/mp4": ".mp4", "video/webm": ".webm", "video/quicktime": ".mov",
            "video/x-msvideo": ".avi"
        }
        ext = ext_map.get(original_mime, ".bin")
        
        file_name = f"immich_{uuid.uuid4()}{ext}"
        file_path = os.path.join(UPLOAD_DIR, file_name)
        with open(file_path, "wb") as f:
            f.write(original_resp.content)
        
        media_type = "video" if asset_type == "VIDEO" else "image"
        return {
            "url": f"/uploads/{file_name}",
            "type": media_type,
            "mediaType": media_type,
            "duration": duration
        }