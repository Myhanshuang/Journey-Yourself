from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, and_, or_, col, func
from app.database import get_session
from app.models import Diary, Notebook, Tag, User, DiaryTagLink
from app.schemas import DiaryRead
from app.auth import get_current_user
from typing import List, Optional
import json

router = APIRouter(prefix="/api/timeline", tags=["timeline"])

@router.get("/", response_model=List[DiaryRead])
def get_timeline(
    notebook_id: Optional[int] = Query(None),
    q: Optional[str] = Query(None),
    mood: Optional[str] = Query(None),
    weather: Optional[str] = Query(None),
    tag: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """全域搜索引擎：支持标题、正文、日记本名称的联合检索"""
    statement = select(Diary).join(Notebook).where(Notebook.user_id == current_user.id)
    
    if q:
        q_pattern = f"%{q}%"
        # 1. 标题匹配
        title_match = col(Diary.title).ilike(q_pattern)
        # 2. 内容匹配 (JSON 文本内容提取)
        content_match = func.cast(Diary.content, col(Diary.content).type).ilike(f'%: "%{q}%"%')
        # 3. 日记本名称匹配 (新增)
        notebook_match = col(Notebook.name).ilike(q_pattern)
        
        statement = statement.where(or_(title_match, content_match, notebook_match))
        
    if notebook_id:
        statement = statement.where(Diary.notebook_id == notebook_id)
        
    if mood:
        statement = statement.where(func.json_extract(Diary.mood, "$.label") == mood)
        
    if weather:
        statement = statement.where(func.json_extract(Diary.weather_snapshot, "$.weather") == weather)
        
    if tag:
        statement = statement.join(DiaryTagLink).join(Tag).where(Tag.name == tag)
        
    statement = statement.order_by(Diary.date.desc())
    diaries = session.exec(statement).all()
    
    return diaries
