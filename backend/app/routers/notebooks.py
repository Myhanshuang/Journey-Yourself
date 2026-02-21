from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from app.database import get_session
from app.models import Notebook, User, Diary
from app.schemas import NotebookCreate, NotebookRead
from app.auth import get_current_user
from typing import List
from datetime import datetime

router = APIRouter(prefix="/api/notebooks", tags=["notebooks"])

@router.post("/", response_model=NotebookRead)
def create_notebook(notebook_in: NotebookCreate, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    # 使用更有质感的默认封面
    default_cover = f"https://picsum.photos/seed/{notebook_in.name}/800/1000"
    db_notebook = Notebook(
        name=notebook_in.name,
        description=notebook_in.description,
        cover_url=notebook_in.cover_url or default_cover,
        user_id=current_user.id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    session.add(db_notebook)
    session.commit()
    session.refresh(db_notebook)
    return db_notebook

@router.put("/{notebook_id}", response_model=NotebookRead)
def update_notebook(notebook_id: int, notebook_in: NotebookCreate, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    db_notebook = session.exec(select(Notebook).where(Notebook.id == notebook_id, Notebook.user_id == current_user.id)).first()
    if not db_notebook:
        raise HTTPException(status_code=404, detail="Notebook not found")
    
    db_notebook.name = notebook_in.name
    db_notebook.description = notebook_in.description
    db_notebook.updated_at = datetime.utcnow() # 更新修改时间
    if notebook_in.cover_url:
        db_notebook.cover_url = notebook_in.cover_url
        
    session.add(db_notebook)
    session.commit()
    session.refresh(db_notebook)
    return db_notebook

@router.delete("/{notebook_id}")
def delete_notebook(notebook_id: int, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    db_notebook = session.exec(select(Notebook).where(Notebook.id == notebook_id, Notebook.user_id == current_user.id)).first()
    if not db_notebook:
        raise HTTPException(status_code=404, detail="Notebook not found")
    
    # 级联删除日记
    diaries = session.exec(select(Diary).where(Diary.notebook_id == notebook_id)).all()
    for diary in diaries:
        session.delete(diary)
        
    session.delete(db_notebook)
    session.commit()
    return {"status": "ok"}

@router.get("/{notebook_id}", response_model=NotebookRead)
def get_notebook(notebook_id: int, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """获取单个日记本详情"""
    db_notebook = session.exec(select(Notebook).where(Notebook.id == notebook_id, Notebook.user_id == current_user.id)).first()
    if not db_notebook:
        raise HTTPException(status_code=404, detail="Notebook not found")
    return db_notebook

@router.get("/", response_model=List[NotebookRead])
def list_notebooks(limit: int = 50, offset: int = 0, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """列出用户的日记本，支持分页"""
    return session.exec(select(Notebook).where(Notebook.user_id == current_user.id).order_by(Notebook.updated_at.desc()).offset(offset).limit(limit)).all()


DRAFT_NOTEBOOK_NAME = "Drafts"

@router.get("/drafts/ensure", response_model=NotebookRead)
def ensure_draft_notebook(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """获取或创建Draft日记本，用于保存未完成的草稿"""
    # 查找是否已存在Drafts日记本
    draft_notebook = session.exec(
        select(Notebook).where(
            Notebook.user_id == current_user.id,
            Notebook.name == DRAFT_NOTEBOOK_NAME
        )
    ).first()
    
    if draft_notebook:
        return draft_notebook
    
    # 创建新的Drafts日记本
    draft_notebook = Notebook(
        name=DRAFT_NOTEBOOK_NAME,
        description="Auto-saved drafts and unfinished entries",
        cover_url=f"https://picsum.photos/seed/{DRAFT_NOTEBOOK_NAME}/800/1000",
        user_id=current_user.id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    session.add(draft_notebook)
    session.commit()
    session.refresh(draft_notebook)
    return draft_notebook
