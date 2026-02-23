from fastapi import APIRouter, Depends, HTTPException, Query
import httpx
from app.config import settings
from app.auth import get_current_user
from app.security import decrypt_data
from app.models import User
import asyncio

router = APIRouter(prefix="/api/proxy/amap", tags=["amap"])
lock = asyncio.Lock()

def get_user_geo_key(user: User) -> str:
    if user.geo_api_key:
        try:
            return decrypt_data(user.geo_api_key)
        except:
            pass
    return ""

@router.get("/weather")
async def get_weather(city_code: str, current_user: User = Depends(get_current_user)):
    api_key = get_user_geo_key(current_user)
    if not api_key: return {}
    
    async with lock:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://restapi.amap.com/v3/weather/weatherInfo",
                params={"key": api_key, "city": city_code, "extensions": "base"}
            )
            data = resp.json()
            if data["status"] == "1" and data["lives"]: return data["lives"][0]
            return {}

@router.get("/search")
async def search_poi(keywords: str, current_user: User = Depends(get_current_user)):
    api_key = get_user_geo_key(current_user)
    if not api_key: return []
    
    async with lock:
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.get(
                    "https://restapi.amap.com/v3/place/text",
                    params={"key": api_key, "keywords": keywords, "offset": 20}
                )
                return resp.json().get("pois", [])
            except: return []

async def convert_coords(client: httpx.AsyncClient, api_key: str, location: str) -> str:
    """将 GPS 坐标 (WGS-84) 转换为高德坐标 (GCJ-02)"""
    resp = await client.get(
        "https://restapi.amap.com/v3/assistant/coordinate/convert",
        params={"key": api_key, "locations": location, "coordsys": "gps"}
    )
    data = resp.json()
    if data.get("status") == "1" and data.get("locations"):
        return data["locations"]
    return location  # 转换失败时返回原坐标


@router.get("/regeo")
async def regeo(
    location: str, 
    coordsys: str = Query(default="", description="原坐标系: gps 表示 WGS-84"),
    current_user: User = Depends(get_current_user)
):
    """逆地理编码：返回周边 POI 列表供用户选择"""
    api_key = get_user_geo_key(current_user)
    if not api_key: return []
    
    async with lock:
        async with httpx.AsyncClient() as client:
            try:
                # 如果是 GPS 坐标，先转换为高德坐标
                if coordsys == "gps":
                    location = await convert_coords(client, api_key, location)
                
                resp = await client.get(
                    "https://restapi.amap.com/v3/geocode/regeo",
                    params={
                        "key": api_key, 
                        "location": location, 
                        "extensions": "all",
                        "radius": 1000, 
                        "roadlevel": 0
                    }
                )
                data = resp.json()
                if data["status"] == "1":
                    regeo_obj = data.get("regeocode", {})
                    return regeo_obj.get("pois", [])
                return []
            except: return []
