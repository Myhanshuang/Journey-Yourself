from fastapi import APIRouter

from app.modules.discovery.search_router import router as search_router
from app.modules.discovery.stats_router import router as stats_router
from app.modules.discovery.timeline_router import router as timeline_router

router = APIRouter()

router.include_router(timeline_router)
router.include_router(stats_router)
router.include_router(search_router)
