from fastapi import APIRouter, Depends, HTTPException
import httpx
from pydantic import BaseModel
from sqlmodel import Session

from app.auth import get_current_user
from app.database import get_session
from app.models import User
from app.security import encrypt_data

router = APIRouter(prefix="/api/users", tags=["users"])


class NotionUpdate(BaseModel):
    api_key: str


@router.patch("/me/notion")
async def update_notion(
    notion_in: NotionUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    api_key = notion_in.api_key.strip()
    print(f"DEBUG: Verifying Notion API key for {current_user.username}")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.post(
                "https://api.notion.com/v1/search",
                headers=headers,
                json={"page_size": 1},
            )

            if resp.status_code == 200:
                print(f"DEBUG: Notion verification successful for {current_user.username}")
                current_user.notion_api_key = encrypt_data(api_key)
                session.add(current_user)
                session.commit()
                return {"status": "ok"}

            if resp.status_code == 401:
                raise HTTPException(status_code=400, detail="Invalid Notion API key")

            print(f"DEBUG: Notion failed with status {resp.status_code}: {resp.text}")
            raise HTTPException(status_code=400, detail=f"Notion API error: {resp.status_code}")
        except httpx.RequestError as e:
            print(f"DEBUG: Notion connection error: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Notion connection failed: {str(e)}")
        except Exception as e:
            print(f"DEBUG: Unexpected error during Notion verification: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
