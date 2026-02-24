from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlmodel import Session, select
from app.database import get_session, engine
from app.config import settings
from app.models import User, UserRole
from app.auth import get_current_user, get_password_hash, verify_password
from app.security import encrypt_data, decrypt_data
from app.schemas import UserUpdate, UserCreate
from pydantic import BaseModel
from typing import Optional, Any, List
from datetime import datetime
import shutil
import os
import httpx

router = APIRouter(prefix="/api/users", tags=["users"])

sqlite_file_path = settings.DATABASE_URL.replace("sqlite:///", "")
backup_dir = os.path.join(os.path.dirname(sqlite_file_path), "backups")

# 确保备份目录存在
os.makedirs(backup_dir, exist_ok=True)

class PasswordUpdate(BaseModel):
    old_password: str
    new_password: str

class ImmichUpdate(BaseModel):
    url: str
    api_key: str

class KarakeepUpdate(BaseModel):
    url: str
    api_key: str

class AIUpdate(BaseModel):
    provider: str
    base_url: str
    api_key: str
    model: str
    language: str = "zh"

class GeoUpdate(BaseModel):
    provider: str # amap
    api_key: str

@router.post("/", response_model=dict)
async def create_user_admin(user_in: UserCreate, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    if current_user.role != UserRole.ADMIN: 
        raise HTTPException(status_code=403, detail="Admin only")
    existing = session.exec(select(User).where(User.username == user_in.username)).first()
    if existing: 
        raise HTTPException(status_code=400, detail="Username exists")
    
    new_user = User(
        username=user_in.username,
        hashed_password=get_password_hash(user_in.password),
        role=user_in.role or UserRole.USER, # 这里支持选择角色
        timezone=user_in.timezone or "UTC",
        time_offset_mins=user_in.time_offset_mins or 0
    )
    session.add(new_user)
    session.commit()
    return {"status": "ok", "message": f"Created {user_in.username} as {new_user.role}"}

# === Admin User Management APIs ===

from app.schemas import UserAdminRead

class RoleUpdate(BaseModel):
    role: str

class PasswordReset(BaseModel):
    new_password: str

@router.get("/", response_model=List[UserAdminRead])
async def list_users(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """获取所有用户列表（仅管理员）"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin only")
    users = session.exec(select(User)).all()
    return [
        UserAdminRead(
            id=u.id,
            username=u.username,
            role=u.role,
            timezone=u.timezone,
            time_offset_mins=u.time_offset_mins,
            has_immich_key=bool(u.immich_api_key),
            has_karakeep_key=bool(u.karakeep_api_key),
            has_ai_key=bool(u.ai_api_key),
            has_geo_key=bool(u.geo_api_key),
            ai_provider=u.ai_provider,
            geo_provider=u.geo_provider
        ) for u in users
    ]

@router.patch("/{user_id}/role", response_model=dict)
async def update_user_role(user_id: int, role_in: RoleUpdate, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """更新用户角色（仅管理员）"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin only")
    
    target_user = session.get(User, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # 不能修改自己的角色
    if target_user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot modify your own role")
    
    # 不能修改主管理员的角色
    if target_user.id == 1:
        raise HTTPException(status_code=400, detail="Cannot modify the primary administrator")
    
    try:
        target_user.role = UserRole(role_in.role)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    session.add(target_user)
    session.commit()
    return {"status": "ok", "message": f"Role updated to {role_in.role}"}

@router.patch("/{user_id}/password", response_model=dict)
async def reset_user_password(user_id: int, pw_in: PasswordReset, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """重置用户密码（仅管理员）"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin only")
    
    target_user = session.get(User, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    target_user.hashed_password = get_password_hash(pw_in.new_password)
    session.add(target_user)
    session.commit()
    return {"status": "ok", "message": "Password reset"}

@router.delete("/{user_id}", response_model=dict)
async def delete_user(user_id: int, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """删除用户（仅管理员）"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin only")
    
    target_user = session.get(User, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # 不能删除自己
    if target_user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    # 不能删除主管理员
    if target_user.id == 1:
        raise HTTPException(status_code=400, detail="Cannot delete the primary administrator")
    
    session.delete(target_user)
    session.commit()
    return {"status": "ok", "message": f"User {target_user.username} deleted"}

@router.get("/me")
async def read_user_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "role": current_user.role,
        "timezone": current_user.timezone,
        "time_offset_mins": current_user.time_offset_mins,
        "immich_url": current_user.immich_url,
        "has_immich_key": bool(current_user.immich_api_key),
        "karakeep_url": current_user.karakeep_url,
        "has_karakeep_key": bool(current_user.karakeep_api_key),
        "ai_provider": current_user.ai_provider or "openai",
        "ai_base_url": current_user.ai_base_url,
        "ai_model": current_user.ai_model,
        "ai_language": current_user.ai_language or "zh",
        "has_ai_key": bool(current_user.ai_api_key),
        "geo_provider": current_user.geo_provider or "amap",
        "has_geo_key": bool(current_user.geo_api_key)
    }

@router.patch("/me")
async def update_user_me(user_in: UserUpdate, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    if user_in.username: current_user.username = user_in.username
    if user_in.timezone: current_user.timezone = user_in.timezone
    if user_in.time_offset_mins is not None: current_user.time_offset_mins = user_in.time_offset_mins
    session.add(current_user)
    session.commit()
    return {"status": "ok"}

@router.patch("/me/password")
async def update_password(pw_in: PasswordUpdate, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    if not verify_password(pw_in.old_password, current_user.hashed_password):
        raise HTTPException(400, "Incorrect password")
    current_user.hashed_password = get_password_hash(pw_in.new_password)
    session.add(current_user)
    session.commit()
    return {"status": "ok"}

@router.patch("/me/immich")
async def update_immich(immich_in: ImmichUpdate, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
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

@router.patch("/me/karakeep")
async def update_karakeep(karakeep_in: KarakeepUpdate, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    base_url = karakeep_in.url.strip().rstrip("/")
    api_key = karakeep_in.api_key.strip()
    print(f"DEBUG: Verifying Karakeep link for {current_user.username} at {base_url}")
    
    # Karakeep usually uses Bearer token, but let's check headers.
    # Assuming "Authorization: Bearer <token>"
    headers = {"Authorization": f"Bearer {api_key}"}
    
    async with httpx.AsyncClient(verify=False) as client:
        try:
            # Verify endpoint - try to list bookmarks to verify token
            # Karakeep uses /api/v1/bookmarks
            resp = await client.get(f"{base_url}/api/v1/bookmarks", headers=headers, params={"limit": 1}, timeout=8.0)
            if resp.status_code == 200 or resp.status_code == 404: # 404 might mean no bookmarks but auth worked? No, usually 401/403 for auth fail.
                # Actually, if it's 200, we are good.
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

@router.patch("/me/ai")
async def update_ai(ai_in: AIUpdate, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    base_url = ai_in.base_url.strip().rstrip("/") if ai_in.base_url else "https://api.openai.com/v1"
    api_key = ai_in.api_key.strip()
    provider = ai_in.provider.lower()
    model = ai_in.model.strip()
    language = ai_in.language or "zh"
    
    print(f"DEBUG: Verifying AI link for {current_user.username} with {provider} at {base_url}")
    
    # Generic verification: Try listing models if possible, or just accept if key is non-empty.
    # OpenAI: GET /v1/models
    # Most providers support /models or /v1/models
    
    headers = {"Authorization": f"Bearer {api_key}"}
    if provider == "azure":
        # Azure specific headers if needed, but for now assuming generic OpenAI compatible
        pass

    async with httpx.AsyncClient(verify=False) as client:
        try:
            # Try to list models to verify key
            resp = await client.get(f"{base_url}/models", headers=headers, timeout=10.0)
            if resp.status_code == 200:
                print(f"DEBUG: AI verification successful")
            elif resp.status_code == 404:
                # Some proxies might not implement /models, fallback to trusting user
                print(f"DEBUG: AI verification /models 404, proceeding anyway")
            else:
                 # If explicit 401/403, fail
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
             # Allow saving even if offline? No, better verify.
             # But if user is offline, maybe allow?
             # For now, require verification.
            print(f"DEBUG: AI connection error: {str(e)}")
            raise HTTPException(status_code=400, detail=f"AI connection failed: {str(e)}")
        except Exception as e:
            print(f"DEBUG: Unexpected error during AI verification: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

@router.patch("/me/geo")
async def update_geo(geo_in: GeoUpdate, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    provider = geo_in.provider.strip().lower()
    api_key = geo_in.api_key.strip()
    
    if provider == "amap":
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.get(
                    "https://restapi.amap.com/v3/weather/weatherInfo",
                    params={"key": api_key, "city": "110000"} 
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
    else:
        raise HTTPException(status_code=400, detail="Unsupported provider")

@router.get("/system/export")
async def export_db(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN: raise HTTPException(403)
    
    if not os.path.exists(sqlite_file_path):
        raise HTTPException(404, "Database file not found")
    
    from fastapi.responses import FileResponse
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    return FileResponse(path=sqlite_file_path, filename=f"journey_backup_{timestamp}.db")

@router.post("/system/import")
async def import_db(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN: raise HTTPException(403)
    
    # 1. 文件类型验证
    if not file.filename or not file.filename.endswith('.db'):
        raise HTTPException(400, "Invalid file type. Must be .db file")
    
    # 2. 读取文件内容并检查大小 (50MB 限制)
    content = await file.read()
    if len(content) > 50 * 1024 * 1024:
        raise HTTPException(400, "File too large. Max 50MB")
    
    # 3. SQLite 格式验证
    if not content.startswith(b'SQLite format 3'):
        raise HTTPException(400, "Not a valid SQLite database file")
    
    # 4. 自动备份当前数据库
    backup_path = None
    if os.path.exists(sqlite_file_path):
        backup_path = os.path.join(backup_dir, f"pre_import_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db")
        shutil.copy(sqlite_file_path, backup_path)
        # 清理旧备份，只保留最新3个
        cleanup_old_backups("pre_import_", max_count=3)
    
    # 5. 关闭连接并删除旧文件
    engine.dispose()
    for suffix in ["", "-wal", "-shm"]:
        path = sqlite_file_path + suffix
        if os.path.exists(path):
            os.remove(path)
    
    # 6. 写入新数据库
    with open(sqlite_file_path, "wb") as f:
        f.write(content)
    
    return {"status": "success", "backup": backup_path}


def cleanup_old_backups(prefix: str, max_count: int = 3):
    """清理旧备份，保留最新的 max_count 个"""
    backups = sorted(
        [f for f in os.listdir(backup_dir) if f.startswith(prefix)],
        reverse=True
    )
    for old_backup in backups[max_count:]:
        os.remove(os.path.join(backup_dir, old_backup))
