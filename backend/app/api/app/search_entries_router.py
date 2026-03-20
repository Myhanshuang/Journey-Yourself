from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, col, func, or_, select

from app.api.app.home_router import to_entry_card
from app.api.app.schemas import EntryCard
from app.auth import get_current_user
from app.database import get_session
from app.models import Diary, DiaryTagLink, Notebook, Tag, User

router = APIRouter(prefix="/api/app/search", tags=["app"])


@router.get("/entries", response_model=list[EntryCard])
def search_entries(
    q: Optional[str] = Query(None),
    tag: Optional[str] = Query(None),
    mood: Optional[str] = Query(None),
    weather: Optional[str] = Query(None),
    notebook_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    statement = select(Diary).join(Notebook).where(Notebook.user_id == current_user.id)

    if q:
      q_pattern = f"%{q}%"
      statement = statement.where(
          or_(
              col(Diary.title).ilike(q_pattern),
              func.cast(Diary.content, col(Diary.content).type).ilike(f"%{q}%"),
              col(Notebook.name).ilike(q_pattern),
          )
      )

    if tag:
      statement = statement.join(DiaryTagLink).join(Tag).where(Tag.name == tag)

    if notebook_id is not None:
      statement = statement.where(Diary.notebook_id == notebook_id)

    if mood:
      statement = statement.where(func.json_extract(Diary.mood, "$.label") == mood)

    if weather:
      statement = statement.where(func.json_extract(Diary.weather_snapshot, "$.weather") == weather)

    rows = session.exec(statement.order_by(Diary.date.desc()).limit(50)).all()
    return [to_entry_card(entry) for entry in rows]
