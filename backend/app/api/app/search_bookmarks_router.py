from typing import Any, Optional

from fastapi import APIRouter, Depends, Query
import httpx

from app.auth import get_current_user
from app.models import User
from app.security import decrypt_data

router = APIRouter(prefix="/api/app/search", tags=["app"])


@router.get("/bookmarks")
async def search_bookmarks(
    q: Optional[str] = Query(None),
    tag: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
):
    if not current_user.karakeep_url or not current_user.karakeep_api_key:
        return []

    try:
        karakeep_key = decrypt_data(current_user.karakeep_api_key)
        headers = {"Authorization": f"Bearer {karakeep_key}"}
        base_url = current_user.karakeep_url.rstrip("/")

        async with httpx.AsyncClient(verify=False, timeout=10.0) as client:
            resp = await client.get(f"{base_url}/api/v1/bookmarks", headers=headers, params={"limit": 100})
            if resp.status_code != 200:
                return []

            data = resp.json()
            all_bookmarks = data.get("bookmarks", [])
            filtered: list[dict[str, Any]] = []

            for bookmark in all_bookmarks:
                content = bookmark.get("content", {})
                title = bookmark.get("title") or content.get("title") or ""
                description = content.get("description") or ""
                url = content.get("url") or ""

                matches_query = not q
                if q:
                    q_lower = q.lower()
                    matches_query = q_lower in title.lower() or q_lower in description.lower() or q_lower in url.lower()

                matches_tag = not tag
                if tag:
                    tags = bookmark.get("tags", [])
                    if isinstance(tags, list):
                        for item in tags:
                            if item == tag or (isinstance(item, dict) and item.get("name") == tag):
                                matches_tag = True
                                break

                if matches_query and matches_tag:
                    filtered.append({
                        "id": bookmark.get("id"),
                        "title": title,
                        "description": description,
                        "url": url,
                        "image_url": content.get("imageUrl"),
                        "created_at": bookmark.get("createdAt"),
                        "tags": bookmark.get("tags", []),
                    })

            return filtered[:50]
    except Exception as exc:
        print(f"Karakeep search error: {exc}")
        return []
