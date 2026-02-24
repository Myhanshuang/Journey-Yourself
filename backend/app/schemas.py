from typing import List, Optional, Dict, Any
from pydantic import BaseModel, field_validator
from datetime import datetime

# --- User ---
class UserBase(BaseModel):
    username: str
    immich_url: Optional[str] = None
    avatar_url: Optional[str] = None
    timezone: Optional[str] = "UTC"
    time_offset_mins: int = 0

class UserCreate(UserBase):
    password: str
    role: Optional[str] = "user"

class UserUpdate(BaseModel):
    username: Optional[str] = None
    avatar_url: Optional[str] = None
    timezone: Optional[str] = None
    time_offset_mins: Optional[int] = None
    password: Optional[str] = None
    role: Optional[str] = None
    geo_provider: Optional[str] = None
    geo_api_key: Optional[str] = None

class UserAdminRead(BaseModel):
    """管理员查看用户信息"""
    id: int
    username: str
    role: str
    timezone: str
    time_offset_mins: int
    has_immich_key: bool = False
    has_karakeep_key: bool = False
    has_ai_key: bool = False
    has_geo_key: bool = False
    ai_provider: Optional[str] = None
    geo_provider: Optional[str] = None

class UserRead(UserBase):
    id: int
    role: str
    has_immich_key: bool = False
    karakeep_url: Optional[str] = None
    has_karakeep_key: bool = False
    has_geo_key: bool = False
    geo_provider: Optional[str] = "amap"

class Token(BaseModel):
    access_token: str
    token_type: str

# --- Diary ---
class DiaryBase(BaseModel):
    title: Optional[str] = "Untitled Entry"
    content: Dict[str, Any]
    notebook_id: int
    date: Optional[datetime] = None
    mood: Optional[Dict[str, Any]] = None

class DiaryCreate(DiaryBase):
    location: Optional[Dict[str, Any]] = None
    tags: List[str] = []
    stats: Optional[Dict[str, Any]] = {}

class DiaryRead(DiaryBase):
    id: int
    word_count: int
    image_count: int
    is_favorite: bool
    date: datetime
    updated_at: datetime
    location_snapshot: Optional[Dict[str, Any]] = None
    weather_snapshot: Optional[Dict[str, Any]] = None
    stats: Dict[str, Any] = {}
    tags: List[Any] = []

    @field_validator('tags', mode='before')
    @classmethod
    def transform_tags(cls, v):
        # 核心整理：将复杂的数据库对象映射为前端可读的字符串列表
        if isinstance(v, list):
            return [t.name if hasattr(t, 'name') else t for t in v]
        return v

# --- Notebook ---
class NotebookBase(BaseModel):
    name: str
    description: Optional[str] = None
    cover_url: Optional[str] = None

class NotebookCreate(NotebookBase):
    pass

class NotebookRead(NotebookBase):
    id: int
    stats_snapshot: Dict[str, Any]
    created_at: datetime
    updated_at: datetime


# --- Share ---
class ShareCreate(BaseModel):
    """创建分享请求"""
    diary_id: Optional[int] = None
    notebook_id: Optional[int] = None
    expires_in_days: Optional[int] = 7  # 默认7天过期，None 表示永不过期


class ShareUpdate(BaseModel):
    """更新分享请求"""
    expires_at: Optional[datetime] = None  # None 表示永不过期


class ShareRead(BaseModel):
    """分享信息"""
    id: int
    token: str
    diary_id: Optional[int] = None
    notebook_id: Optional[int] = None
    created_at: datetime
    expires_at: Optional[datetime] = None
    is_active: bool
    
    # 额外信息，方便前端展示
    diary_title: Optional[str] = None
    notebook_name: Optional[str] = None


class SharePublicRead(BaseModel):
    """公开分享内容（无需登录）"""
    share_type: str  # "diary" or "notebook"
    diary: Optional[DiaryRead] = None
    notebook: Optional[NotebookRead] = None
    diaries: Optional[List[DiaryRead]] = None  # 笔记本分享时包含的所有日记
