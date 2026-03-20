from fastapi import APIRouter, Depends, HTTPException
import httpx
from pydantic import BaseModel
from sqlmodel import Session

from app.auth import get_current_user
from app.database import get_session
from app.models import User
from app.security import encrypt_data

router = APIRouter(prefix="/api/users", tags=["users"])


class ImmichUpdate(BaseModel):
    url: str
    api_key: str


@router.patch("/me/immich")
async def update_immich(
    immich_in: ImmichUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    base_url = immich_in.url.strip().rstrip("/")
    api_key = immich_in.api_key.strip()
    print(f"DEBUG: Verifying Immich link for {current_user.username} at {base_url}")

    async with httpx.AsyncClient(verify=False) as client:
        try:
            resp = await client.get(f"{base_url}/api/users/me", headers={"x-api-key": api_key}, timeout=8.0)
            if resp.status_code == 200:
                print(f"DEBUG: Immich verification successful for {current_user.username}")
                current_user.immich_url = base_url
                current_user.immich_api_key = encrypt_data(api_key)
                session.add(current_user)
                session.commit()
                return {"status": "ok"}

            print(f"DEBUG: Immich failed with status {resp.status_code}: {resp.text}")
            raise HTTPException(status_code=400, detail=f"Immich: {resp.status_code} {resp.text[:50]}")
        except httpx.RequestError as e:
            print(f"DEBUG: Immich connection error: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Immich connection failed: {str(e)}")
        except Exception as e:
            print(f"DEBUG: Unexpected error during Immich verification: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
