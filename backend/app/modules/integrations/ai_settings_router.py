from fastapi import APIRouter, Depends, HTTPException
import httpx
from pydantic import BaseModel
from sqlmodel import Session

from app.auth import get_current_user
from app.database import get_session
from app.models import User
from app.security import encrypt_data

router = APIRouter(prefix="/api/users", tags=["users"])


class AIUpdate(BaseModel):
    provider: str
    base_url: str
    api_key: str
    model: str
    language: str = "zh"


@router.patch("/me/ai")
async def update_ai(
    ai_in: AIUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    base_url = ai_in.base_url.strip().rstrip("/") if ai_in.base_url else "https://api.openai.com/v1"
    api_key = ai_in.api_key.strip()
    provider = ai_in.provider.lower()
    model = ai_in.model.strip()
    language = ai_in.language or "zh"

    print(f"DEBUG: Verifying AI link for {current_user.username} with {provider} at {base_url}")

    headers = {"Authorization": f"Bearer {api_key}"}
    if provider == "azure":
        pass

    async with httpx.AsyncClient(verify=False) as client:
        try:
            resp = await client.get(f"{base_url}/models", headers=headers, timeout=10.0)
            if resp.status_code == 200:
                print("DEBUG: AI verification successful")
            elif resp.status_code == 404:
                print("DEBUG: AI verification /models 404, proceeding anyway")
            else:
                if resp.status_code in [401, 403]:
                    raise HTTPException(status_code=400, detail=f"AI Authentication failed: {resp.status_code}")
                print(f"DEBUG: AI verification returned {resp.status_code}, might be ok")

            current_user.ai_provider = provider
            current_user.ai_base_url = base_url
            current_user.ai_api_key = encrypt_data(api_key)
            current_user.ai_model = model
            current_user.ai_language = language
            session.add(current_user)
            session.commit()
            return {"status": "ok"}
        except httpx.RequestError as e:
            print(f"DEBUG: AI connection error: {str(e)}")
            raise HTTPException(status_code=400, detail=f"AI connection failed: {str(e)}")
        except Exception as e:
            print(f"DEBUG: Unexpected error during AI verification: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
