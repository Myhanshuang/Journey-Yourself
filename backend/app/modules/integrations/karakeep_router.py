from fastapi import APIRouter, Depends, HTTPException
import httpx
from app.auth import get_current_user
from app.models import User
from app.security import decrypt_data

router = APIRouter(prefix="/api/proxy/karakeep", tags=["karakeep-proxy"])

def get_karakeep_headers(user: User) -> dict:
    if not user.karakeep_url or not user.karakeep_api_key:
        return None
    api_key = decrypt_data(user.karakeep_api_key)
    return {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json"
    }

def get_karakeep_base_url(user: User) -> str:
    return f"{user.karakeep_url.rstrip('/')}"

def transform_bookmark(bookmark: dict) -> dict:
    """将 Karakeep 原始格式转换为前端期望的简化格式"""
    content = bookmark.get("content", {})
    return {
        "id": bookmark.get("id"),
        "title": bookmark.get("title") or content.get("title") or content.get("url"),
        "description": content.get("description"),
        "url": content.get("url"),
        "image_url": content.get("imageUrl"),
        "created_at": bookmark.get("createdAt"),
        "tags": bookmark.get("tags", []),
    }

@router.get("/bookmarks")
async def list_bookmarks(limit: int = 20, cursor: str = None, current_user: User = Depends(get_current_user)):
    headers = get_karakeep_headers(current_user)
    if not headers: 
        raise HTTPException(status_code=400, detail="Karakeep not configured")
    base_url = get_karakeep_base_url(current_user)
    
    async with httpx.AsyncClient(headers=headers, verify=False, timeout=30.0) as client:
        try:
            # Karakeep API uses /api/v1/bookmarks with cursor-based pagination
            url = f"{base_url}/api/v1/bookmarks"
            params = {"limit": limit}
            if cursor:
                params["cursor"] = cursor
            
            resp = await client.get(url, params=params)
            
            if resp.status_code == 200:
                data = resp.json()
                # Transform bookmarks to simplified format
                transformed_bookmarks = [transform_bookmark(b) for b in data.get("bookmarks", [])]
                return {
                    "bookmarks": transformed_bookmarks,
                    "nextCursor": data.get("nextCursor")
                }
            elif resp.status_code == 401:
                raise HTTPException(status_code=401, detail="Karakeep authentication failed")
            else:
                print(f"Karakeep Error: {resp.status_code} {resp.text}")
                return {"bookmarks": [], "nextCursor": None}
        except httpx.HTTPError as e:
             print(f"Karakeep Connection Error: {e}")
             raise HTTPException(status_code=500, detail="Failed to connect to Karakeep")
