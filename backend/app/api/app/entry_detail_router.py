from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from app.auth import get_current_user
from app.database import get_session
from app.models import Diary, Notebook, User
from app.schemas import DiaryRead

router = APIRouter(prefix="/api/app", tags=["app"])


@router.get("/entries/{entry_id}", response_model=DiaryRead)
def get_entry_detail(
    entry_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    diary = session.get(Diary, entry_id)
    if not diary:
        raise HTTPException(status_code=404, detail="Diary not found")

    notebook = session.get(Notebook, diary.notebook_id)
    if not notebook or notebook.user_id != user.id:
        raise HTTPException(status_code=404, detail="Diary not found")

    return DiaryRead.model_validate(diary.model_dump() | {"tags": diary.tags})
