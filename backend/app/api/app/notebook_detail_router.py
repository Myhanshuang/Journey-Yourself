from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from app.api.app.schemas import NotebookDetailPayload
from app.auth import get_current_user
from app.database import get_session
from app.models import Notebook, User

router = APIRouter(prefix="/api/app", tags=["app"])


@router.get("/notebooks/{notebook_id}", response_model=NotebookDetailPayload)
def get_notebook_detail(
    notebook_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    notebook = session.get(Notebook, notebook_id)
    if not notebook or notebook.user_id != user.id:
        raise HTTPException(status_code=404, detail="Notebook not found")

    return NotebookDetailPayload.model_validate(notebook.model_dump())
