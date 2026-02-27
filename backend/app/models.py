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
    
    ai_provider: Optional[str] = Field(default="openai")
    ai_base_url: Optional[str] = None
    ai_api_key: Optional[str] = None
    ai_model: Optional[str] = Field(default="gpt-3.5-turbo")
    ai_language: Optional[str] = Field(default="zh")  # zh or en
    
    geo_provider: Optional[str] = Field(default="amap") # amap
    geo_api_key: Optional[str] = None
    
    notion_api_key: Optional[str] = None  # Notion API Key (加密存储)
    notion_config: Dict[str, Any] = Field(default_factory=lambda: {}, sa_column=Column(JSON))
    
    # 用户任务配置 (e.g. {"daily_summary": {"enabled": true}})
    task_configs: Dict[str, Any] = Field(default_factory=lambda: {}, sa_column=Column(JSON))
    
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


class Task(SQLModel, table=True):
    """定时任务配置模型"""
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(unique=True, index=True)  # 任务标识 e.g. "daily_summary"
    display_name: str  # 显示名称 e.g. "每日阅读摘要"
    description: str  # 任务描述
    is_enabled: bool = Field(default=True)  # 全局开关
    cron_expr: str = Field(default="0 0 * * *")  # cron 表达式，默认每日0点
    last_run: Optional[datetime] = None
    next_run: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class XiaohongshuPost(SQLModel, table=True):
    """小红书帖子元数据"""
    __tablename__ = "xiaohongshu_post"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    note_id: str = Field(index=True, unique=True)  # 小红书帖子ID
    title: str
    desc: Optional[str] = None
    note_type: str = Field(default="normal")  # "normal" | "video"
    video_url: Optional[str] = None  # 视频链接（视频类型时）
    author_id: str
    author_name: str
    author_avatar: Optional[str] = None
    liked_count: int = Field(default=0)
    collected_count: int = Field(default=0)
    comment_count: int = Field(default=0)
    share_count: int = Field(default=0)
    ip_location: Optional[str] = None
    tags: Optional[str] = None  # JSON数组字符串
    source_url: str
    created_at: Optional[datetime] = None  # 原帖发布时间
    fetched_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    comments: Optional[List[Dict[str, Any]]] = Field(default=None, sa_column=Column(JSON))
    
    # 关联图片
    images: List["XiaohongshuImage"] = Relationship(back_populates="post")


class XiaohongshuImage(SQLModel, table=True):
    """小红书帖子图片（本地存储）"""
    __tablename__ = "xiaohongshu_image"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    post_id: int = Field(foreign_key="xiaohongshu_post.id", index=True)
    image_index: int  # 图片顺序，从0开始
    local_path: str  # 相对路径: xhs/{note_id}/{index}.jpg
    original_url: Optional[str] = None
    
    post: XiaohongshuPost = Relationship(back_populates="images")


class BilibiliVideo(SQLModel, table=True):
    """B站视频元数据"""
    __tablename__ = "bilibili_video"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    video_id: str = Field(index=True, unique=True)  # avid (数字ID)
    bvid: Optional[str] = Field(default=None, index=True)  # BV号
    title: str
    desc: Optional[str] = None
    author_id: str
    author_name: str
    author_avatar: Optional[str] = None
    duration: Optional[int] = None  # 时长（秒）
    play_count: int = Field(default=0)
    like_count: int = Field(default=0)
    coin_count: int = Field(default=0)
    favorite_count: int = Field(default=0)
    share_count: int = Field(default=0)
    danmaku_count: int = Field(default=0)
    comment_count: int = Field(default=0)
    cover_local_path: Optional[str] = None  # 相对路径: bilibili/{video_id}/cover.jpg
    source_url: str
    created_at: Optional[datetime] = None  # 视频发布时间
    fetched_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    comments: Optional[List[Dict[str, Any]]] = Field(default=None, sa_column=Column(JSON))
