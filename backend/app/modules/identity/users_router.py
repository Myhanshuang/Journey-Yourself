from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from app.auth import get_current_user, get_password_hash, verify_password
from app.database import get_session
from app.models import User, UserRole
from app.schemas import UserAdminRead, UserCreate, UserUpdate

router = APIRouter(prefix="/api/users", tags=["users"])


class PasswordUpdate(BaseModel):
    old_password: str
    new_password: str


class RoleUpdate(BaseModel):
    role: str


class PasswordReset(BaseModel):
    new_password: str


@router.post("/", response_model=dict)
async def create_user_admin(
    user_in: UserCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin only")
    existing = session.exec(select(User).where(User.username == user_in.username)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username exists")

    new_user = User(
        username=user_in.username,
        hashed_password=get_password_hash(user_in.password),
        role=user_in.role or UserRole.USER,
        timezone=user_in.timezone or "UTC",
        time_offset_mins=user_in.time_offset_mins or 0,
    )
    session.add(new_user)
    session.commit()
    return {"status": "ok", "message": f"Created {user_in.username} as {new_user.role}"}


@router.get("/", response_model=List[UserAdminRead])
async def list_users(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin only")
    users = session.exec(select(User)).all()
    return [
        UserAdminRead(
            id=user.id,
            username=user.username,
            role=user.role,
            timezone=user.timezone,
            time_offset_mins=user.time_offset_mins,
            has_immich_key=bool(user.immich_api_key),
            has_karakeep_key=bool(user.karakeep_api_key),
            has_ai_key=bool(user.ai_api_key),
            has_geo_key=bool(user.geo_api_key),
            ai_provider=user.ai_provider,
            geo_provider=user.geo_provider,
        )
        for user in users
    ]


@router.patch("/{user_id}/role", response_model=dict)
async def update_user_role(
    user_id: int,
    role_in: RoleUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin only")

    target_user = session.get(User, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    if target_user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot modify your own role")
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
async def reset_user_password(
    user_id: int,
    pw_in: PasswordReset,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
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
async def delete_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin only")

    target_user = session.get(User, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    if target_user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
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
        "has_notion_key": bool(current_user.notion_api_key),
        "ai_provider": current_user.ai_provider or "openai",
        "ai_base_url": current_user.ai_base_url,
        "ai_model": current_user.ai_model,
        "ai_language": current_user.ai_language or "zh",
        "has_ai_key": bool(current_user.ai_api_key),
        "geo_provider": current_user.geo_provider or "amap",
        "has_geo_key": bool(current_user.geo_api_key),
    }


@router.patch("/me")
async def update_user_me(
    user_in: UserUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if user_in.username:
        current_user.username = user_in.username
    if user_in.timezone:
        current_user.timezone = user_in.timezone
    if user_in.time_offset_mins is not None:
        current_user.time_offset_mins = user_in.time_offset_mins
    session.add(current_user)
    session.commit()
    return {"status": "ok"}


@router.patch("/me/password")
async def update_password(
    pw_in: PasswordUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if not verify_password(pw_in.old_password, current_user.hashed_password):
        raise HTTPException(400, "Incorrect password")
    current_user.hashed_password = get_password_hash(pw_in.new_password)
    session.add(current_user)
    session.commit()
    return {"status": "ok"}
