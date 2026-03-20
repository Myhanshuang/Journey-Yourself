from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from datetime import datetime, timezone, timedelta
from typing import List
from app.database import get_session
from app.models import ShareToken, Diary, Notebook, User
from app.schemas import ShareCreate, ShareUpdate, ShareRead, SharePublicRead, DiaryRead, NotebookRead
from app.auth import get_current_user

router = APIRouter(prefix="/api/share", tags=["share"])


def build_share_read(share: ShareToken, session: Session) -> ShareRead:
    """构建 ShareRead 响应，包含额外展示信息"""
    result = ShareRead(
        id=share.id,
        token=share.token,
        diary_id=share.diary_id,
        notebook_id=share.notebook_id,
        created_at=share.created_at,
        expires_at=share.expires_at,
        is_active=share.is_active
    )
    
    if share.diary_id:
        diary = session.get(Diary, share.diary_id)
        if diary:
            result.diary_title = diary.title
    
    if share.notebook_id:
        notebook = session.get(Notebook, share.notebook_id)
        if notebook:
            result.notebook_name = notebook.name
    
    return result


@router.post("/", response_model=ShareRead)
def create_share(
    share_in: ShareCreate,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """创建分享链接"""
    # 验证必须指定日记或笔记本（二选一）
    if not share_in.diary_id and not share_in.notebook_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Must specify either diary_id or notebook_id"
        )
    
    if share_in.diary_id and share_in.notebook_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot share both diary and notebook at the same time"
        )
    
    # 验证所有权
    if share_in.diary_id:
        diary = session.get(Diary, share_in.diary_id)
        if not diary:
            raise HTTPException(status_code=404, detail="Diary not found")
        notebook = session.get(Notebook, diary.notebook_id)
        if not notebook or notebook.user_id != user.id:
            raise HTTPException(status_code=403, detail="Access denied")
    
    if share_in.notebook_id:
        notebook = session.get(Notebook, share_in.notebook_id)
        if not notebook or notebook.user_id != user.id:
            raise HTTPException(status_code=403, detail="Access denied")
    
    # 计算过期时间
    expires_at = None
    if share_in.expires_in_days is not None:
        expires_at = datetime.now(timezone.utc) + timedelta(days=share_in.expires_in_days)
    
    # 创建分享令牌
    share = ShareToken(
        diary_id=share_in.diary_id,
        notebook_id=share_in.notebook_id,
        created_by=user.id,
        expires_at=expires_at
    )
    session.add(share)
    session.commit()
    session.refresh(share)
    
    return build_share_read(share, session)


@router.get("/", response_model=List[ShareRead])
def list_shares(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """获取当前用户的所有活跃分享"""
    shares = session.exec(
        select(ShareToken)
        .where(ShareToken.created_by == user.id, ShareToken.is_active == True)
        .order_by(ShareToken.created_at.desc())
    ).all()
    return [build_share_read(s, session) for s in shares]


@router.patch("/{share_id}", response_model=ShareRead)
def update_share(
    share_id: int,
    share_in: ShareUpdate,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """更新分享设置（如过期时间）"""
    share = session.get(ShareToken, share_id)
    if not share:
        raise HTTPException(status_code=404, detail="Share not found")
    
    if share.created_by != user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # 更新过期时间
    if share_in.expires_at is not None:
        # 确保存储为 UTC 时间
        expires_at = share_in.expires_at
        if expires_at.tzinfo is None:
            # 如果是 naive datetime，假设是 UTC
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        share.expires_at = expires_at
    else:
        # None 表示永不过期
        share.expires_at = None
    
    session.add(share)
    session.commit()
    session.refresh(share)
    
    return build_share_read(share, session)


@router.delete("/{share_id}")
def delete_share(
    share_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """撤销分享"""
    share = session.get(ShareToken, share_id)
    if not share:
        raise HTTPException(status_code=404, detail="Share not found")
    
    if share.created_by != user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    share.is_active = False
    session.add(share)
    session.commit()
    return {"status": "ok"}


@router.get("/{token}", response_model=SharePublicRead)
def get_shared_content(
    token: str,
    session: Session = Depends(get_session)
):
    """通过 token 获取分享内容（公开访问，无需登录）"""
    share = session.exec(
        select(ShareToken).where(ShareToken.token == token, ShareToken.is_active == True)
    ).first()
    
    if not share:
        raise HTTPException(status_code=404, detail="Share not found or expired")
    
    # 检查是否过期
    if share.expires_at:
        # 处理时区问题：如果 expires_at 是 naive datetime，先转为 aware
        expires_at = share.expires_at
        if expires_at.tzinfo is None:
            # 假设存储的是 UTC 时间
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=410, detail="Share link has expired")
    
    result = SharePublicRead(share_type="")
    
    if share.diary_id:
        diary = session.get(Diary, share.diary_id)
        if not diary:
            raise HTTPException(status_code=404, detail="Diary not found")
        result.share_type = "diary"
        result.diary = DiaryRead.model_validate(diary.model_dump())
    
    elif share.notebook_id:
        notebook = session.get(Notebook, share.notebook_id)
        if not notebook:
            raise HTTPException(status_code=404, detail="Notebook not found")
        
        # 获取笔记本内所有日记
        diaries = session.exec(
            select(Diary).where(Diary.notebook_id == share.notebook_id).order_by(Diary.date.desc())
        ).all()
        
        result.share_type = "notebook"
        result.notebook = NotebookRead.model_validate(notebook.model_dump())
        result.diaries = [DiaryRead.model_validate(d.model_dump()) for d in diaries]
    
    return result
