from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, and_, or_, select

from app.api.app.cursor import decode_cursor, encode_cursor
from app.api.app.home_router import to_entry_card
from app.api.app.schemas import CursorPage, TimelinePayload
from app.auth import get_current_user
from app.database import get_session
from app.models import Diary, Notebook, User

router = APIRouter(prefix="/api/app", tags=["app"])


@router.get("/timeline", response_model=TimelinePayload)
def get_timeline_payload(
    cursor: str | None = Query(None),
    notebook_id: int | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    statement = (
        select(Diary)
        .join(Notebook)
        .where(Notebook.user_id == user.id)
        .order_by(Diary.date.desc(), Diary.id.desc())
    )

    if notebook_id is not None:
        statement = statement.where(Diary.notebook_id == notebook_id)

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

    return TimelinePayload(
        items=[to_entry_card(entry) for entry in items],
        page=CursorPage(next_cursor=next_cursor, has_more=has_more),
    )
