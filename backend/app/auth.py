import bcrypt
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status, Query
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session, select
from app.database import get_session
from app.models import User, Diary, Notebook
from app.config import settings

# 核心修复：auto_error=False 允许 Header 为空，从而支持 Query Token
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login", auto_error=False)

def verify_password(plain_password, hashed_password):
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

async def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme), 
    query_token: Optional[str] = Query(None, alias="token"),
    session: Session = Depends(get_session)
):
    actual_token = token or query_token
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not actual_token:
        raise credentials_exception
        
    try:
        payload = jwt.decode(actual_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = session.exec(select(User).where(User.username == username)).first()
    if user is None:
        raise credentials_exception
    return user


async def verify_notebook_ownership(
    notebook_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
) -> Notebook:
    """验证笔记本归属权，返回笔记本对象"""
    notebook = session.get(Notebook, notebook_id)
    if not notebook:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notebook not found")
    if notebook.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return notebook


async def verify_diary_ownership(
    diary_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
) -> Diary:
    """验证日记归属权（通过笔记本间接验证），返回日记对象"""
    diary = session.get(Diary, diary_id)
    if not diary:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Diary not found")
    notebook = session.get(Notebook, diary.notebook_id)
    if not notebook or notebook.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return diary
