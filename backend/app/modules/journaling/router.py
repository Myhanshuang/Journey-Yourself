from fastapi import APIRouter

from app.modules.journaling.diaries_router import router as diaries_router
from app.modules.journaling.tags_router import router as tags_router

router = APIRouter()

router.include_router(diaries_router)
router.include_router(tags_router)
