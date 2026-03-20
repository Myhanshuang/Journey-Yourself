from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select, or_, col, func
from app.database import get_session
from app.models import Diary, Notebook, Tag, User, DiaryTagLink
from app.auth import get_current_user
from app.security import decrypt_data
import httpx
from typing import List, Optional, Any, Dict

router = APIRouter(prefix="/api/search", tags=["search"])

@router.get("/unified")
async def search_unified(
    q: Optional[str] = Query(None),
    tag: Optional[str] = Query(None),
    include_diaries: bool = True,
    include_bookmarks: bool = True,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    results = {"diaries": [], "bookmarks": []}
    
    # 1. Search Diaries
    if include_diaries:
        statement = select(Diary).join(Notebook).where(Notebook.user_id == current_user.id)
        if q:
            # SQLite case-insensitive match often requires simple logic or custom collation
            # For this simple app, we assume standard ILIKE or similar
            q_pattern = f"%{q}%"
            statement = statement.where(or_(
                col(Diary.title).ilike(q_pattern),
                # col(Diary.content).ilike(q_pattern), # JSON content search is tricky in generic SQL
                # Simple fallback: search title only or assume simple JSON structure
                # In timeline.py: content_match = func.cast(Diary.content, col(Diary.content).type).ilike(f'%: "%{q}%"%')
                # Let's use similar logic
                func.cast(Diary.content, col(Diary.content).type).ilike(f'%{q}%'),
                col(Notebook.name).ilike(q_pattern)
            ))
        if tag:
            statement = statement.join(DiaryTagLink).join(Tag).where(Tag.name == tag)
            
        statement = statement.order_by(Diary.date.desc()).limit(50)
        diaries = session.exec(statement).all()
        # Transform tags for frontend (simulating schema validator)
        results["diaries"] = []
        for d in diaries:
            d_dict = d.model_dump()
            d_dict['tags'] = [t.name for t in d.tags]
            results["diaries"].append(d_dict)

    # 2. Search Karakeep
    if include_bookmarks and current_user.karakeep_url and current_user.karakeep_api_key:
        try:
            karakeep_key = decrypt_data(current_user.karakeep_api_key)
            headers = {"Authorization": f"Bearer {karakeep_key}"}
            base_url = current_user.karakeep_url.rstrip('/')
            
            async with httpx.AsyncClient(verify=False, timeout=10.0) as client:
                # Karakeep uses /api/v1/bookmarks with cursor pagination
                resp = await client.get(f"{base_url}/api/v1/bookmarks", headers=headers, params={"limit": 100})
                if resp.status_code == 200:
                    data = resp.json()
                    all_b = data.get('bookmarks', [])
                    
                    filtered = []
                    for b in all_b:
                        # Extract content for search (Karakeep stores title/description in content object)
                        content = b.get('content', {})
                        b_title = b.get('title') or content.get('title') or ''
                        b_desc = content.get('description') or ''
                        b_url = content.get('url') or ''
                        
                        match = False
                        # Filter by Query
                        if q:
                            q_lower = q.lower()
                            if q_lower in b_title.lower() or q_lower in b_desc.lower() or q_lower in b_url.lower():
                                match = True
                        
                        # Filter by Tag (AND logic if both present)
                        tag_match = False
                        if tag:
                            b_tags = b.get('tags', [])
                            # Handle ["tag1"] or [{"name": "tag1"}]
                            if isinstance(b_tags, list):
                                if tag in b_tags: tag_match = True
                                else:
                                    for t in b_tags:
                                        if isinstance(t, dict) and t.get('name') == tag:
                                            tag_match = True
                                            break
                                        if isinstance(t, str) and t == tag:
                                            tag_match = True
                                            break
                        else:
                            tag_match = True # No tag filter
                        
                        if q and not match: tag_match = False # If q defined but not matched
                        
                        if (q or tag) and tag_match:
                             if not q or match:
                                 # Transform to simplified format for frontend
                                 filtered.append({
                                     "id": b.get("id"),
                                     "title": b_title,
                                     "description": b_desc,
                                     "url": b_url,
                                     "image_url": content.get("imageUrl"),
                                     "created_at": b.get("createdAt"),
                                     "tags": b.get("tags", []),
                                 })
                        elif not q and not tag:
                             # No filters, transform and add
                             filtered.append({
                                 "id": b.get("id"),
                                 "title": b_title,
                                 "description": b_desc,
                                 "url": b_url,
                                 "image_url": content.get("imageUrl"),
                                 "created_at": b.get("createdAt"),
                                 "tags": b.get("tags", []),
                             })
                             
                    results["bookmarks"] = filtered[:50]
        except Exception as e:
            print(f"Karakeep search error: {e}")
            
    return results
