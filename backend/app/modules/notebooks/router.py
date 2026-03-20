from fastapi import APIRouter

from app.modules.notebooks.notebooks_router import router as notebooks_router

router = APIRouter()

router.include_router(notebooks_router)
