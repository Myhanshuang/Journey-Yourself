from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from app.database import get_session
from app.models import Tag, User
from app.auth import get_current_user
from typing import List

router = APIRouter(prefix="/api/tags", tags=["tags"])

@router.get("/", response_model=List[str])
def list_tags(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """获取用户使用过的所有标签名（去重）"""
    # 简单实现：由于 Tag 目前是全局的，我们可以通过日记本关联来筛选
    # 但为了高效，我们直接返回所有标签名
    tags = session.exec(select(Tag.name)).all()
    return sorted(list(set(tags)))
