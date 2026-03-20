from fastapi import APIRouter, Depends, HTTPException
import httpx
from pydantic import BaseModel
from sqlmodel import Session

from app.auth import get_current_user
from app.database import get_session
from app.models import User
from app.security import encrypt_data

router = APIRouter(prefix="/api/users", tags=["users"])


class GeoUpdate(BaseModel):
    provider: str
    api_key: str


@router.patch("/me/geo")
async def update_geo(
    geo_in: GeoUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    provider = geo_in.provider.strip().lower()
    api_key = geo_in.api_key.strip()

    if provider == "amap":
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.get(
                    "https://restapi.amap.com/v3/weather/weatherInfo",
                    params={"key": api_key, "city": "110000"},
                )
                data = resp.json()
                if data["status"] == "1":
                    current_user.geo_provider = "amap"
                    current_user.geo_api_key = encrypt_data(api_key)
                    session.add(current_user)
                    session.commit()
                    return {"status": "ok"}
                raise HTTPException(status_code=400, detail=f"Amap API Error: {data.get('info')}")
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Geo verification failed: {str(e)}")

    raise HTTPException(status_code=400, detail="Unsupported provider")
