from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.database import create_db_and_tables
from app.routers import auth, notebooks, diaries, proxy, assets, amap, users, timeline, stats, tags, share, karakeep, tasks
from app.config import settings
import os
import asyncio
import shutil
from pathlib import Path
from datetime import datetime

# 获取项目根目录（用于本地开发环境）
PROJECT_ROOT = Path(__file__).parent.parent.parent
STATIC_DIR_ABSOLUTE = PROJECT_ROOT / "static"

# 数据库路径和备份配置
SQLITE_FILE_PATH = settings.DATABASE_URL.replace("sqlite:///", "")
BACKUP_DIR = os.path.join(os.path.dirname(SQLITE_FILE_PATH), "backups")
BACKUP_INTERVAL_HOURS = 1  # 备份间隔（小时）
MAX_BACKUPS = 3  # 保留备份数量

# 环境检测：如果 PRODUCTION=TRUE (不区分大小写)，则禁用文档
is_prod = os.getenv("PRODUCTION", "FALSE").upper() == "TRUE"

app = FastAPI(
    title="Journey Your Day API",
    docs_url=None if is_prod else "/docs",
    redoc_url=None if is_prod else "/redoc",
    openapi_url=None if is_prod else "/openapi.json"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for mobile app compatibility
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if not os.path.exists("data/uploads"):
    os.makedirs("data/uploads")

app.mount("/uploads", StaticFiles(directory="data/uploads"), name="uploads")

# 确保备份目录存在
os.makedirs(BACKUP_DIR, exist_ok=True)

def cleanup_auto_backups():
    """清理旧的自动备份，只保留最新的 MAX_BACKUPS 个"""
    backups = sorted(
        [f for f in os.listdir(BACKUP_DIR) if f.startswith("auto_")],
        reverse=True
    )
    for old_backup in backups[MAX_BACKUPS:]:
        os.remove(os.path.join(BACKUP_DIR, old_backup))

async def auto_backup_task():
    """后台定时备份任务"""
    while True:
        await asyncio.sleep(BACKUP_INTERVAL_HOURS * 3600)
        try:
            if os.path.exists(SQLITE_FILE_PATH):
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                backup_path = os.path.join(BACKUP_DIR, f"auto_{timestamp}.db")
                shutil.copy(SQLITE_FILE_PATH, backup_path)
                cleanup_auto_backups()
                print(f"[Auto Backup] Created: {backup_path}")
        except Exception as e:
            print(f"[Auto Backup] Error: {e}")

@app.on_event("startup")
async def on_startup():
    create_db_and_tables()
    # 启动自动备份后台任务
    asyncio.create_task(auto_backup_task())

# Health check - 必须在 SPA fallback 之前
@app.get("/health")
def health_check():
    return {"status": "ok"}

app.include_router(auth.router)
app.include_router(notebooks.router)
app.include_router(diaries.router)
app.include_router(proxy.router)
app.include_router(assets.router)
app.include_router(amap.router)
app.include_router(users.router)
app.include_router(timeline.router)
app.include_router(stats.router)
app.include_router(tags.router)
app.include_router(share.router)
app.include_router(karakeep.router)
app.include_router(tasks.router)

# --- 生产环境静态文件托管 ---
# 双重检查：先检查相对路径（Docker），再检查绝对路径（本地开发）
def get_static_assets_dir():
    """获取 assets 目录路径，兼容 Docker 和本地开发环境"""
    if os.path.exists("static/assets"):
        return "static/assets"
    if (STATIC_DIR_ABSOLUTE / "assets").exists():
        return str(STATIC_DIR_ABSOLUTE / "assets")
    return None

assets_dir = get_static_assets_dir()
if assets_dir:
    app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

# SPA fallback - 必须放在最后
@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    # 如果路径以 api/ 开头且未被之前的路由匹配，返回 404
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404)
    
    # 双重检查：先检查相对路径（Docker），再检查绝对路径（本地开发）
    if os.path.exists("static/index.html"):
        return FileResponse("static/index.html")
    if (STATIC_DIR_ABSOLUTE / "index.html").exists():
        return FileResponse(str(STATIC_DIR_ABSOLUTE / "index.html"))
    
    return {"message": "Journey API is running. Static files not found."}