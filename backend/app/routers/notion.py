"""Notion API 代理路由"""
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from app.database import get_session
from app.auth import get_current_user
from app.models import User
from app.security import decrypt_data
from pydantic import BaseModel
from typing import Optional, List, Any
import httpx

router = APIRouter(prefix="/api/proxy/notion", tags=["notion"])

NOTION_API_BASE = "https://api.notion.com/v1"
NOTION_VERSION = "2022-06-28"


class NotionPage(BaseModel):
    id: str
    title: str
    icon: Optional[str] = None
    cover: Optional[str] = None
    url: str
    created_time: Optional[str] = None
    last_edited_time: Optional[str] = None


class NotionBlock(BaseModel):
    id: str
    type: str
    content: Any


class NotionPageContent(BaseModel):
    id: str
    title: str
    icon: Optional[str] = None
    cover: Optional[str] = None
    blocks: List[NotionBlock]


def get_notion_headers(api_key: str) -> dict:
    return {
        "Authorization": f"Bearer {api_key}",
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json"
    }


def extract_title(page: dict) -> str:
    """从 Notion 页面对象中提取标题"""
    properties = page.get("properties", {})
    # 尝试找到 title 类型的属性
    for prop_name, prop_value in properties.items():
        if prop_value.get("type") == "title":
            title_list = prop_value.get("title", [])
            if title_list:
                return "".join([t.get("plain_text", "") for t in title_list])
    return "Untitled"


def extract_icon(page: dict) -> Optional[str]:
    """提取页面图标"""
    icon = page.get("icon")
    if icon:
        if icon.get("type") == "emoji":
            return icon.get("emoji")
        elif icon.get("type") == "external":
            return icon.get("external", {}).get("url")
        elif icon.get("type") == "file":
            return icon.get("file", {}).get("url")
    return None


def extract_cover(page: dict) -> Optional[str]:
    """提取页面封面"""
    cover = page.get("cover")
    if cover:
        if cover.get("type") == "external":
            return cover.get("external", {}).get("url")
        elif cover.get("type") == "file":
            return cover.get("file", {}).get("url")
    return None


@router.get("/search")
async def search_pages(
    query: str = "",
    page_size: int = 20,
    start_cursor: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """搜索 Notion 页面"""
    if not current_user.notion_api_key:
        raise HTTPException(status_code=400, detail="Notion API key not configured")
    
    api_key = decrypt_data(current_user.notion_api_key)
    headers = get_notion_headers(api_key)
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            body = {
                "query": query,
                "filter": {
                    "property": "object",
                    "value": "page"
                },
                "page_size": page_size
            }
            if start_cursor:
                body["start_cursor"] = start_cursor
            
            resp = await client.post(
                f"{NOTION_API_BASE}/search",
                headers=headers,
                json=body
            )
            
            if resp.status_code == 401:
                raise HTTPException(status_code=401, detail="Invalid Notion API key")
            if resp.status_code != 200:
                raise HTTPException(status_code=resp.status_code, detail=resp.text)
            
            data = resp.json()
            pages = []
            for page in data.get("results", []):
                pages.append(NotionPage(
                    id=page["id"],
                    title=extract_title(page),
                    icon=extract_icon(page),
                    cover=extract_cover(page),
                    url=page.get("url", ""),
                    created_time=page.get("created_time"),
                    last_edited_time=page.get("last_edited_time")
                ))
            
            return {
                "pages": pages,
                "next_cursor": data.get("next_cursor"),
                "has_more": data.get("has_more", False)
            }
        except httpx.RequestError as e:
            raise HTTPException(status_code=500, detail=f"Notion API error: {str(e)}")


@router.get("/page/{page_id}")
async def get_page(
    page_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """获取 Notion 页面详情和内容"""
    if not current_user.notion_api_key:
        raise HTTPException(status_code=400, detail="Notion API key not configured")
    
    api_key = decrypt_data(current_user.notion_api_key)
    headers = get_notion_headers(api_key)
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            # 获取页面信息
            page_resp = await client.get(
                f"{NOTION_API_BASE}/pages/{page_id}",
                headers=headers
            )
            
            if page_resp.status_code == 401:
                raise HTTPException(status_code=401, detail="Invalid Notion API key")
            if page_resp.status_code == 404:
                raise HTTPException(status_code=404, detail="Page not found")
            if page_resp.status_code != 200:
                raise HTTPException(status_code=page_resp.status_code, detail=page_resp.text)
            
            page_data = page_resp.json()
            
            # 获取页面内容块
            blocks_resp = await client.get(
                f"{NOTION_API_BASE}/blocks/{page_id}/children",
                headers=headers,
                params={"page_size": 100}
            )
            
            blocks = []
            if blocks_resp.status_code == 200:
                for block in blocks_resp.json().get("results", []):
                    blocks.append(parse_block(block))
            
            return NotionPageContent(
                id=page_data["id"],
                title=extract_title(page_data),
                icon=extract_icon(page_data),
                cover=extract_cover(page_data),
                blocks=blocks
            )
        except httpx.RequestError as e:
            raise HTTPException(status_code=500, detail=f"Notion API error: {str(e)}")


def parse_block(block: dict) -> NotionBlock:
    """解析 Notion 块为简化格式"""
    block_type = block.get("type", "unknown")
    
    def get_text_content(rich_text: list) -> str:
        return "".join([t.get("plain_text", "") for t in rich_text])
    
    content = {}
    
    if block_type == "paragraph":
        content = {"text": get_text_content(block.get("paragraph", {}).get("rich_text", []))}
    elif block_type == "heading_1":
        content = {"text": get_text_content(block.get("heading_1", {}).get("rich_text", []))}
    elif block_type == "heading_2":
        content = {"text": get_text_content(block.get("heading_2", {}).get("rich_text", []))}
    elif block_type == "heading_3":
        content = {"text": get_text_content(block.get("heading_3", {}).get("rich_text", []))}
    elif block_type == "bulleted_list_item":
        content = {"text": get_text_content(block.get("bulleted_list_item", {}).get("rich_text", []))}
    elif block_type == "numbered_list_item":
        content = {"text": get_text_content(block.get("numbered_list_item", {}).get("rich_text", []))}
    elif block_type == "to_do":
        todo = block.get("to_do", {})
        content = {
            "text": get_text_content(todo.get("rich_text", [])),
            "checked": todo.get("checked", False)
        }
    elif block_type == "toggle":
        content = {"text": get_text_content(block.get("toggle", {}).get("rich_text", []))}
    elif block_type == "quote":
        content = {"text": get_text_content(block.get("quote", {}).get("rich_text", []))}
    elif block_type == "code":
        code = block.get("code", {})
        content = {
            "text": get_text_content(code.get("rich_text", [])),
            "language": code.get("language", "plain text")
        }
    elif block_type == "callout":
        callout = block.get("callout", {})
        content = {
            "text": get_text_content(callout.get("rich_text", [])),
            "icon": extract_icon(callout)
        }
    elif block_type == "divider":
        content = {}
    elif block_type == "image":
        image = block.get("image", {})
        if image.get("type") == "external":
            content = {"url": image.get("external", {}).get("url", "")}
        elif image.get("type") == "file":
            content = {"url": image.get("file", {}).get("url", "")}
    elif block_type == "video":
        video = block.get("video", {})
        if video.get("type") == "external":
            content = {"url": video.get("external", {}).get("url", "")}
        elif video.get("type") == "file":
            content = {"url": video.get("file", {}).get("url", "")}
    elif block_type == "bookmark":
        bookmark = block.get("bookmark", {})
        content = {
            "url": bookmark.get("url", ""),
            "caption": get_text_content(bookmark.get("caption", []))
        }
    elif block_type == "embed":
        embed = block.get("embed", {})
        content = {"url": embed.get("url", "")}
    elif block_type == "link_preview":
        content = {"url": block.get("link_preview", {}).get("url", "")}
    else:
        content = {"raw": block.get(block_type, {})}
    
    return NotionBlock(
        id=block["id"],
        type=block_type,
        content=content
    )


@router.get("/block/{block_id}/children")
async def get_block_children(
    block_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """获取块的子块（用于嵌套列表等）"""
    if not current_user.notion_api_key:
        raise HTTPException(status_code=400, detail="Notion API key not configured")
    
    api_key = decrypt_data(current_user.notion_api_key)
    headers = get_notion_headers(api_key)
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            resp = await client.get(
                f"{NOTION_API_BASE}/blocks/{block_id}/children",
                headers=headers,
                params={"page_size": 100}
            )
            
            if resp.status_code != 200:
                raise HTTPException(status_code=resp.status_code, detail=resp.text)
            
            blocks = []
            for block in resp.json().get("results", []):
                blocks.append(parse_block(block))
            
            return {"blocks": blocks}
        except httpx.RequestError as e:
            raise HTTPException(status_code=500, detail=f"Notion API error: {str(e)}")
