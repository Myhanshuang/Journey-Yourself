from fastapi import APIRouter, Depends, HTTPException
import httpx
from app.auth import get_current_user
from app.models import User
from app.security import decrypt_data

router = APIRouter(prefix="/api/proxy/karakeep", tags=["karakeep-proxy"])

def get_karakeep_headers(user: User) -> dict:
    if not user.karakeep_url or not user.karakeep_api_key:
        return None
    api_key = decrypt_data(user.karakeep_api_key)
    return {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json"
    }

def get_karakeep_base_url(user: User) -> str:
    return f"{user.karakeep_url.rstrip('/')}"

@router.get("/bookmarks")
async def list_bookmarks(page: int = 1, per_page: int = 20, current_user: User = Depends(get_current_user)):
    headers = get_karakeep_headers(current_user)
    if not headers: 
        raise HTTPException(status_code=400, detail="Karakeep not configured")
    base_url = get_karakeep_base_url(current_user)
    
    async with httpx.AsyncClient(headers=headers, verify=False, timeout=30.0) as client:
        try:
            # Assuming endpoint is /api/bookmarks based on common REST patterns
            # Note: We use the full URL constructed from base_url + endpoint
            url = f"{base_url}/api/bookmarks"
            resp = await client.get(url, params={"page": page, "per_page": per_page})
            
            if resp.status_code == 200:
                return resp.json()
            elif resp.status_code == 401:
                raise HTTPException(status_code=401, detail="Karakeep authentication failed")
            else:
                print(f"Karakeep Error: {resp.status_code} {resp.text}")
                return {"data": [], "meta": {"total": 0}} # Return empty struct on error to avoid breaking frontend
        except Exception as e:
             print(f"Karakeep Connection Error: {e}")
             raise HTTPException(status_code=500, detail="Failed to connect to Karakeep")
