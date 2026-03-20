from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel


class EntryCard(BaseModel):
    id: int
    notebook_id: int
    title: Optional[str]
    cover_image_url: Optional[str] = None
    date: datetime
    updated_at: datetime
    word_count: int
    image_count: int
    is_pinned: bool
    mood: Optional[dict[str, Any]] = None
    weather_snapshot: Optional[dict[str, Any]] = None


class CursorPage(BaseModel):
    next_cursor: Optional[str] = None
    has_more: bool


class TimelinePayload(BaseModel):
    items: list[EntryCard]
    page: CursorPage


class PublicEntryCard(EntryCard):
    content: dict[str, Any]
    tags: list[str] = []


class PublicTimelinePayload(BaseModel):
    items: list[PublicEntryCard]
    page: CursorPage


class HomePayload(BaseModel):
    pinned: list[EntryCard]
    recent: list[EntryCard]
    on_this_day: list[EntryCard]


class NotebookDetailPayload(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    cover_url: Optional[str] = None
    stats_snapshot: dict[str, Any]
    created_at: datetime
    updated_at: datetime


class EntryDetailPayload(EntryCard):
    content: dict[str, Any]
    is_favorite: bool
    location_snapshot: Optional[dict[str, Any]] = None
    weather_snapshot: Optional[dict[str, Any]] = None
    stats: dict[str, Any]
    tags: list[str] = []


class HomePayload(BaseModel):
    pinned: list[EntryCard]
    recent: list[EntryCard]
    on_this_day: list[EntryCard]


class PublicShareSummaryPayload(BaseModel):
    share_type: str
    diary: Optional[EntryDetailPayload] = None
    notebook: Optional[NotebookDetailPayload] = None
