from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, and_, select

from app.api.app.schemas import EntryCard, HomePayload
from app.auth import get_current_user
from app.database import get_session
from app.models import Diary, Notebook, User

router = APIRouter(prefix="/api/app", tags=["app"])


def to_entry_card(diary: Diary) -> EntryCard:
    return EntryCard(
        id=diary.id,
        notebook_id=diary.notebook_id,
        title=diary.title,
        cover_image_url=diary.cover_image_url,
        date=diary.date,
        updated_at=diary.updated_at,
        word_count=diary.word_count,
        image_count=diary.image_count,
        is_pinned=diary.is_pinned,
        mood=diary.mood,
        weather_snapshot=diary.weather_snapshot,
    )


@router.get("/home", response_model=HomePayload)
def get_home_payload(
    limit: int = Query(5, ge=1, le=20),
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    now = datetime.now(timezone.utc)
    start = datetime(now.year - 1, now.month, now.day, 0, 0, 0, tzinfo=timezone.utc)
    end = datetime(now.year - 1, now.month, now.day, 23, 59, 59, tzinfo=timezone.utc)

    pinned = session.exec(
        select(Diary)
        .join(Notebook)
        .where(and_(Notebook.user_id == user.id, Diary.is_pinned == True))
        .order_by(Diary.date.desc())
        .limit(limit)
    ).all()
    recent = session.exec(
        select(Diary)
        .join(Notebook)
        .where(Notebook.user_id == user.id)
        .order_by(Diary.date.desc())
        .limit(limit)
    ).all()
    on_this_day = session.exec(
        select(Diary)
        .join(Notebook)
        .where(and_(Notebook.user_id == user.id, Diary.date >= start, Diary.date <= end))
        .order_by(Diary.date.desc())
        .limit(limit)
    ).all()

    return HomePayload(
        pinned=[to_entry_card(entry) for entry in pinned],
        recent=[to_entry_card(entry) for entry in recent],
        on_this_day=[to_entry_card(entry) for entry in on_this_day],
    )
