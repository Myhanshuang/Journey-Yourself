from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, and_, or_, select

from app.api.app.cursor import decode_cursor, encode_cursor
from app.api.app.schemas import CursorPage, PublicEntryCard, PublicTimelinePayload
from app.database import get_session
from app.models import Diary, ShareToken

router = APIRouter(prefix="/api/app", tags=["app"])


@router.get("/public/shares/{token}/entries", response_model=PublicTimelinePayload)
def get_public_share_entries(
    token: str,
    cursor: str | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
    session: Session = Depends(get_session),
):
    share = session.exec(
        select(ShareToken).where(ShareToken.token == token, ShareToken.is_active == True)
    ).first()
    if not share or not share.notebook_id:
        raise HTTPException(status_code=404, detail="Share not found or expired")

    if share.expires_at:
        expires_at = share.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=410, detail="Share link has expired")

    statement = (
        select(Diary)
        .where(Diary.notebook_id == share.notebook_id)
        .order_by(Diary.date.desc(), Diary.id.desc())
    )

    if cursor:
        cursor_date, cursor_id = decode_cursor(cursor)
        statement = statement.where(
            or_(
                Diary.date < cursor_date,
                and_(Diary.date == cursor_date, Diary.id < cursor_id),
            )
        )

    rows = session.exec(statement.limit(limit + 1)).all()
    has_more = len(rows) > limit
    items = rows[:limit]
    next_cursor = encode_cursor(items[-1].date, items[-1].id) if has_more and items else None

    return PublicTimelinePayload(
        items=[
            PublicEntryCard(
                id=entry.id,
                notebook_id=entry.notebook_id,
                title=entry.title,
                cover_image_url=entry.cover_image_url,
                date=entry.date,
                updated_at=entry.updated_at,
                word_count=entry.word_count,
                image_count=entry.image_count,
                is_pinned=entry.is_pinned,
                mood=entry.mood,
                weather_snapshot=entry.weather_snapshot,
                content=entry.content,
                tags=[tag.name for tag in entry.tags],
            )
            for entry in items
        ],
        page=CursorPage(next_cursor=next_cursor, has_more=has_more),
    )
