from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.api.app.schemas import EntryDetailPayload, NotebookDetailPayload, PublicShareSummaryPayload
from app.database import get_session
from app.models import Diary, Notebook, ShareToken
from app.schemas import DiaryRead

router = APIRouter(prefix="/api/app", tags=["app"])


@router.get("/public/shares/{token}", response_model=PublicShareSummaryPayload)
def get_public_share_summary(token: str, session: Session = Depends(get_session)):
    share = session.exec(
        select(ShareToken).where(ShareToken.token == token, ShareToken.is_active == True)
    ).first()
    if not share:
        raise HTTPException(status_code=404, detail="Share not found or expired")

    if share.expires_at:
        expires_at = share.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=410, detail="Share link has expired")

    if share.diary_id:
        diary = session.get(Diary, share.diary_id)
        if not diary:
            raise HTTPException(status_code=404, detail="Diary not found")
        diary_read = DiaryRead.model_validate(diary.model_dump() | {"tags": diary.tags})
        return PublicShareSummaryPayload(
            share_type="diary",
            diary=EntryDetailPayload.model_validate(diary_read.model_dump()),
        )

    if share.notebook_id:
        notebook = session.get(Notebook, share.notebook_id)
        if not notebook:
            raise HTTPException(status_code=404, detail="Notebook not found")
        return PublicShareSummaryPayload(
            share_type="notebook",
            notebook=NotebookDetailPayload.model_validate(notebook.model_dump()),
        )

    raise HTTPException(status_code=404, detail="Share target not found")
