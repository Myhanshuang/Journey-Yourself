from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select, and_
from app.database import get_session
from app.models import Diary, Notebook, Tag, User
from app.schemas import DiaryCreate, DiaryRead
from app.auth import get_current_user
from typing import List
from datetime import datetime, timezone

from app.modules.journaling.helpers.content_stats import walk_content
from app.modules.journaling.helpers.cover_image import resolve_cover_image_url
from app.modules.notebooks.helpers.stats_snapshot import update_stats_snapshot

router = APIRouter(prefix="/api/diaries", tags=["diaries"])

def sync_tags(session: Session, tag_names: List[str]) -> List[Tag]:
    db_tags = []
    for name in [n.strip() for n in tag_names if n.strip()]:
        tag = session.exec(select(Tag).where(Tag.name == name)).first()
        if not tag:
            tag = Tag(name=name); session.add(tag); session.flush()
        db_tags.append(tag)
    return db_tags

@router.post("/", response_model=DiaryRead)
async def create_diary(diary_in: DiaryCreate, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    # 验证 notebook 归属权
    notebook = session.get(Notebook, diary_in.notebook_id)
    if not notebook or notebook.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this notebook")
    
    wc, ic = walk_content(diary_in.content)
    now = datetime.now(timezone.utc)
    
    # 明确提取地点信息
    loc = diary_in.location if diary_in.location else None
    weather_data = diary_in.stats.get("weather") if diary_in.stats else None
    
    db_diary = Diary(
        notebook_id=diary_in.notebook_id, title=diary_in.title, content=diary_in.content,
        date=diary_in.date or now, updated_at=now,
        cover_image_url=resolve_cover_image_url(diary_in.content),
        word_count=wc, image_count=ic, mood=diary_in.mood,
        location_snapshot=loc,
        weather_snapshot=weather_data
    )
    if diary_in.tags: db_diary.tags = sync_tags(session, diary_in.tags)
    session.add(db_diary)
    notebook.stats_snapshot = update_stats_snapshot(notebook.stats_snapshot, words_delta=wc, entries_delta=1)
    session.add(notebook)
    session.commit(); session.refresh(db_diary); return db_diary

# 注意：特定路径路由必须在参数路由 /{diary_id} 之前定义
@router.get("/recent", response_model=List[DiaryRead])
def get_recent(limit: int = 5, offset: int = 0, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """获取最近的日记列表，支持分页"""
    return session.exec(select(Diary).join(Notebook).where(Notebook.user_id == user.id).order_by(Diary.date.desc()).offset(offset).limit(limit)).all()

@router.get("/pinned", response_model=List[DiaryRead])
def get_pinned(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """获取置顶的日记列表"""
    return session.exec(select(Diary).join(Notebook).where(and_(Notebook.user_id == user.id, Diary.is_pinned == True)).order_by(Diary.date.desc())).all()

@router.get("/last-year-today", response_model=List[DiaryRead])
def get_last_year(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    now = datetime.now(timezone.utc)
    s = datetime(now.year - 1, now.month, now.day, 0, 0, 0, tzinfo=timezone.utc)
    e = datetime(now.year - 1, now.month, now.day, 23, 59, 59, tzinfo=timezone.utc)
    return session.exec(select(Diary).join(Notebook).where(and_(Notebook.user_id == user.id, Diary.date >= s, Diary.date <= e))).all()

@router.get("/notebook/{notebook_id}", response_model=List[DiaryRead])
def list_by_notebook(notebook_id: int, limit: int = 20, offset: int = 0, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """按日记本列出日记，支持分页"""
    # 验证用户权限
    notebook = session.get(Notebook, notebook_id)
    if not notebook or notebook.user_id != user.id:
        raise HTTPException(status_code=404, detail="Notebook not found")
    return session.exec(select(Diary).where(Diary.notebook_id == notebook_id).order_by(Diary.date.desc()).offset(offset).limit(limit)).all()

# 参数路由必须放在最后
@router.get("/{diary_id}", response_model=DiaryRead)
def get_diary(diary_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """获取单个日记详情"""
    diary = session.get(Diary, diary_id)
    if not diary:
        raise HTTPException(status_code=404, detail="Diary not found")
    # 验证用户权限：通过日记本关联检查
    notebook = session.get(Notebook, diary.notebook_id)
    if not notebook or notebook.user_id != user.id:
        raise HTTPException(status_code=404, detail="Diary not found")
    return diary

@router.put("/{diary_id}", response_model=DiaryRead)
def update_diary(diary_id: int, diary_in: DiaryCreate, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    db_diary = session.get(Diary, diary_id)
    if not db_diary: raise HTTPException(404)
    
    # 验证用户权限
    old_notebook = session.get(Notebook, db_diary.notebook_id)
    if not old_notebook or old_notebook.user_id != user.id:
        raise HTTPException(status_code=404, detail="Diary not found")
    
    old_wc = db_diary.word_count
    old_notebook_id = db_diary.notebook_id
    wc, ic = walk_content(diary_in.content)
    
    db_diary.title = diary_in.title
    db_diary.content = diary_in.content
    db_diary.cover_image_url = resolve_cover_image_url(diary_in.content)
    db_diary.mood = diary_in.mood
    db_diary.location_snapshot = diary_in.location
    
    if diary_in.date: db_diary.date = diary_in.date
    if diary_in.stats and "weather" in diary_in.stats:
        db_diary.weather_snapshot = diary_in.stats["weather"]
        
    db_diary.word_count, db_diary.image_count = wc, ic
    db_diary.updated_at = datetime.now(timezone.utc)
    if diary_in.tags is not None: db_diary.tags = sync_tags(session, diary_in.tags)
    
    # 处理 notebook_id 变更
    new_notebook_id = diary_in.notebook_id
    if new_notebook_id and new_notebook_id != old_notebook_id:
        # 验证新笔记本存在且属于当前用户
        new_notebook = session.get(Notebook, new_notebook_id)
        if not new_notebook or new_notebook.user_id != user.id:
            raise HTTPException(status_code=404, detail="Target notebook not found")
        
        old_notebook.stats_snapshot = update_stats_snapshot(old_notebook.stats_snapshot, words_delta=-old_wc, entries_delta=-1)
        session.add(old_notebook)
        
        new_notebook.stats_snapshot = update_stats_snapshot(new_notebook.stats_snapshot, words_delta=wc, entries_delta=1)
        session.add(new_notebook)
        
        # 更新日记的 notebook_id
        db_diary.notebook_id = new_notebook_id
    else:
        old_notebook.stats_snapshot = update_stats_snapshot(old_notebook.stats_snapshot, words_delta=wc - old_wc)
        session.add(old_notebook)
        
    session.add(db_diary); session.commit(); session.refresh(db_diary); return db_diary

@router.post("/{diary_id}/toggle-pin")
def toggle_pin(diary_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """切换日记的置顶状态"""
    diary = session.get(Diary, diary_id)
    if not diary:
        raise HTTPException(status_code=404, detail="Diary not found")
    
    # 验证用户权限
    notebook = session.get(Notebook, diary.notebook_id)
    if not notebook or notebook.user_id != user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    diary.is_pinned = not diary.is_pinned
    diary.updated_at = datetime.now(timezone.utc)
    session.add(diary)
    session.commit()
    return {"is_pinned": diary.is_pinned}

@router.delete("/{diary_id}")
def delete_diary(diary_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    diary = session.get(Diary, diary_id)
    if not diary:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Diary not found")
    
    # 验证用户权限：通过笔记本关联检查
    notebook = session.get(Notebook, diary.notebook_id)
    if not notebook or notebook.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    notebook.stats_snapshot = update_stats_snapshot(notebook.stats_snapshot, words_delta=-diary.word_count, entries_delta=-1)
    session.add(notebook)
    session.delete(diary); session.commit(); return {"status": "ok"}
