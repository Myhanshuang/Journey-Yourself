import os
import re
import shutil
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlmodel import Session, select

from app.auth import get_current_user
from app.config import settings
from app.database import engine, get_session
from app.models import BilibiliVideo, Diary, Notebook, User, UserRole, XiaohongshuImage

router = APIRouter(prefix="/api/users", tags=["users"])

sqlite_file_path = settings.DATABASE_URL.replace("sqlite:///", "")
backup_dir = os.path.join(os.path.dirname(sqlite_file_path), "backups")
os.makedirs(backup_dir, exist_ok=True)

EXCLUDE_URL_PATTERNS = [
    r"/api/proxy/immich/",
    r"^https?://(?!localhost|127\.0\.0\.1)",
    r"/api/proxy/notion/",
    r"^https?://.*\.notion\.site",
    r"picsum\.photos",
    r"placeholder",
]


def cleanup_old_backups(prefix: str, max_count: int = 3):
    backups = sorted([f for f in os.listdir(backup_dir) if f.startswith(prefix)], reverse=True)
    for old_backup in backups[max_count:]:
        os.remove(os.path.join(backup_dir, old_backup))


def is_excluded_url(url: str) -> bool:
    for pattern in EXCLUDE_URL_PATTERNS:
        if re.search(pattern, url):
            return True
    return False


def extract_local_paths_from_content(content: dict) -> set[str]:
    paths: set[str] = set()

    def extract_from_node(node: dict):
        if not isinstance(node, dict):
            return
        if node.get("type") in ["image", "video", "audio"]:
            src = node.get("attrs", {}).get("src", "")
            if src and src.startswith("/uploads/"):
                paths.add(src)
        content_list = node.get("content", [])
        if isinstance(content_list, list):
            for child in content_list:
                extract_from_node(child)

    if isinstance(content, dict):
        extract_from_node(content)
    return paths


@router.get("/system/export")
async def export_db(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(403)
    if not os.path.exists(sqlite_file_path):
        raise HTTPException(404, "Database file not found")
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    return FileResponse(path=sqlite_file_path, filename=f"journey_backup_{timestamp}.db")


@router.post("/system/import")
async def import_db(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(403)
    if not file.filename or not file.filename.endswith(".db"):
        raise HTTPException(400, "Invalid file type. Must be .db file")

    content = await file.read()
    if len(content) > 50 * 1024 * 1024:
        raise HTTPException(400, "File too large. Max 50MB")
    if not content.startswith(b"SQLite format 3"):
        raise HTTPException(400, "Not a valid SQLite database file")

    backup_path = None
    if os.path.exists(sqlite_file_path):
        backup_path = os.path.join(backup_dir, f"pre_import_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db")
        shutil.copy(sqlite_file_path, backup_path)
        cleanup_old_backups("pre_import_", max_count=3)

    engine.dispose()
    for suffix in ["", "-wal", "-shm"]:
        path = sqlite_file_path + suffix
        if os.path.exists(path):
            os.remove(path)

    with open(sqlite_file_path, "wb") as f:
        f.write(content)

    return {"status": "success", "backup": backup_path}


@router.get("/system/orphan-files")
async def get_orphan_files(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(403, "Admin only")

    data_dir = os.path.dirname(sqlite_file_path)
    uploads_dir = os.path.join(data_dir, "uploads")
    xhs_dir = os.path.join(data_dir, "xhs")
    bilibili_dir = os.path.join(data_dir, "bilibili")

    all_local_files: dict[str, tuple[str, int]] = {}

    for root_dir in (uploads_dir, xhs_dir, bilibili_dir):
        if os.path.exists(root_dir):
            for root, _, files in os.walk(root_dir):
                for filename in files:
                    abs_path = os.path.join(root, filename)
                    rel_path = os.path.relpath(abs_path, data_dir)
                    url_path = "/" + rel_path.replace(os.sep, "/")
                    all_local_files[url_path] = (abs_path, os.path.getsize(abs_path))

    referenced_paths = set()

    notebooks = session.exec(select(Notebook)).all()
    for notebook in notebooks:
        if notebook.cover_url and not is_excluded_url(notebook.cover_url) and notebook.cover_url.startswith("/uploads/"):
            referenced_paths.add(notebook.cover_url)

    diaries = session.exec(select(Diary)).all()
    for diary in diaries:
        if diary.content:
            referenced_paths.update(extract_local_paths_from_content(diary.content))

    try:
        xhs_images = session.exec(select(XiaohongshuImage)).all()
        for image in xhs_images:
            if image.local_path:
                referenced_paths.add("/" + image.local_path.replace(os.sep, "/"))
    except Exception:
        pass

    try:
        bili_videos = session.exec(select(BilibiliVideo)).all()
        for video in bili_videos:
            if video.cover_local_path:
                referenced_paths.add("/" + video.cover_local_path.replace(os.sep, "/"))
    except Exception:
        pass

    orphan_files = []
    total_size = 0
    for url_path, (abs_path, size) in all_local_files.items():
        if url_path not in referenced_paths:
            orphan_files.append({"path": url_path, "size": size, "modified": os.path.getmtime(abs_path)})
            total_size += size

    orphan_files.sort(key=lambda x: x["modified"], reverse=True)
    return {
        "files": orphan_files,
        "total_count": len(orphan_files),
        "total_size_bytes": total_size,
        "warning": "请仔细确认后再删除，删除后无法恢复",
    }


class OrphanFilesDelete(BaseModel):
    paths: List[str]


@router.delete("/system/orphan-files")
async def delete_orphan_files(
    data: OrphanFilesDelete,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    del session
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(403, "Admin only")

    data_dir = os.path.dirname(sqlite_file_path)
    deleted = []
    failed = []

    for path in data.paths:
        if not any(path.startswith(f"/{directory}/") for directory in ["uploads", "xhs", "bilibili"]):
            failed.append({"path": path, "reason": "Invalid path"})
            continue

        abs_path = os.path.join(data_dir, path.lstrip("/"))
        if not os.path.abspath(abs_path).startswith(os.path.abspath(data_dir)):
            failed.append({"path": path, "reason": "Path traversal detected"})
            continue
        if not os.path.exists(abs_path):
            failed.append({"path": path, "reason": "File not found"})
            continue

        try:
            os.remove(abs_path)
            deleted.append(path)
        except Exception as e:
            failed.append({"path": path, "reason": str(e)})

    return {
        "deleted": deleted,
        "failed": failed,
        "deleted_count": len(deleted),
        "failed_count": len(failed),
    }
