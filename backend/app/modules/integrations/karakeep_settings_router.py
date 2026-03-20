from fastapi import APIRouter, Depends, HTTPException
import httpx
from pydantic import BaseModel
from sqlmodel import Session

from app.auth import get_current_user
from app.database import get_session
from app.models import User
from app.security import encrypt_data

router = APIRouter(prefix="/api/users", tags=["users"])


class KarakeepUpdate(BaseModel):
    url: str
    api_key: str


@router.patch("/me/karakeep")
async def update_karakeep(
    karakeep_in: KarakeepUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    base_url = karakeep_in.url.strip().rstrip("/")
    api_key = karakeep_in.api_key.strip()
    print(f"DEBUG: Verifying Karakeep link for {current_user.username} at {base_url}")

    headers = {"Authorization": f"Bearer {api_key}"}

    async with httpx.AsyncClient(verify=False) as client:
        try:
            resp = await client.get(f"{base_url}/api/v1/bookmarks", headers=headers, params={"limit": 1}, timeout=8.0)
            if resp.status_code == 200 or resp.status_code == 404:
                print(f"DEBUG: Karakeep verification successful for {current_user.username}")
                current_user.karakeep_url = base_url
                current_user.karakeep_api_key = encrypt_data(api_key)
                session.add(current_user)
                session.commit()
                return {"status": "ok"}

            print(f"DEBUG: Karakeep failed with status {resp.status_code}: {resp.text}")
            raise HTTPException(status_code=400, detail=f"Karakeep: {resp.status_code}")
        except httpx.RequestError as e:
            print(f"DEBUG: Karakeep connection error: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Karakeep connection failed: {str(e)}")
        except Exception as e:
            print(f"DEBUG: Unexpected error during Karakeep verification: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
