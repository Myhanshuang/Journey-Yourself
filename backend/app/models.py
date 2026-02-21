from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from sqlmodel import SQLModel, Field, Relationship, Column, JSON
from enum import Enum
from uuid import UUID, uuid4
import secrets

class UserRole(str, Enum):
    ADMIN = "admin"
    USER = "user"

class DiaryTagLink(SQLModel, table=True):
    diary_id: Optional[int] = Field(default=None, foreign_key="diary.id", primary_key=True)
    tag_id: Optional[int] = Field(default=None, foreign_key="tag.id", primary_key=True)

class Tag(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True)
    diaries: List["Diary"] = Relationship(back_populates="tags", link_model=DiaryTagLink)

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    hashed_password: str
    role: UserRole = Field(default=UserRole.USER)
    timezone: str = Field(default="UTC")
    time_offset_mins: int = Field(default=0)
    immich_url: Optional[str] = None
    immich_api_key: Optional[str] = None
    immich_config: Dict[str, Any] = Field(default_factory=lambda: {"mode": "link"}, sa_column=Column(JSON))
    
    karakeep_url: Optional[str] = None
    karakeep_api_key: Optional[str] = None
    karakeep_config: Dict[str, Any] = Field(default_factory=lambda: {}, sa_column=Column(JSON))
    
    geo_provider: Optional[str] = Field(default="amap") # amap
    geo_api_key: Optional[str] = None
    
    avatar_url: Optional[str] = None
    notebooks: List["Notebook"] = Relationship(back_populates="user")

class Notebook(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    description: Optional[str] = None
    cover_url: Optional[str] = None
    user_id: int = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    stats_snapshot: Dict[str, Any] = Field(default_factory=lambda: {"total_words": 0, "total_entries": 0}, sa_column=Column(JSON))
    user: User = Relationship(back_populates="notebooks")
    diaries: List["Diary"] = Relationship(back_populates="notebook")

class Diary(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    notebook_id: int = Field(foreign_key="notebook.id")
    title: Optional[str] = Field(default="Untitled Entry")
    date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), index=True)
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    content: Dict[str, Any] = Field(sa_column=Column(JSON))
    word_count: int = Field(default=0, index=True)
    image_count: int = Field(default=0)
    mood: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    is_favorite: bool = Field(default=False, index=True)
    stats: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    location_snapshot: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    weather_snapshot: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    notebook: Notebook = Relationship(back_populates="diaries")
    tags: List[Tag] = Relationship(back_populates="diaries", link_model=DiaryTagLink)


def generate_share_token() -> str:
    """生成安全的分享 token"""
    return secrets.token_urlsafe(16)


class ShareToken(SQLModel, table=True):
    """分享令牌模型：支持日记和笔记本的分享"""
    id: Optional[int] = Field(default=None, primary_key=True)
    token: str = Field(default_factory=generate_share_token, unique=True, index=True)
    
    # 分享目标：日记或笔记本（二选一）
    diary_id: Optional[int] = Field(default=None, foreign_key="diary.id")
    notebook_id: Optional[int] = Field(default=None, foreign_key="notebook.id")
    
    # 创建者
    created_by: int = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # 过期时间（默认7天）
    expires_at: Optional[datetime] = None
    
    # 是否有效
    is_active: bool = Field(default=True)
