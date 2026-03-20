from fastapi import APIRouter

from app.api.app.entry_detail_router import router as entry_detail_router
from app.api.app.home_router import router as home_router
from app.api.app.notebook_detail_router import router as notebook_detail_router
from app.api.app.notebook_entries_router import router as notebook_entries_router
from app.api.app.public_share_entries_router import router as public_share_entries_router
from app.api.app.public_share_summary_router import router as public_share_summary_router
from app.api.app.search_bookmarks_router import router as search_bookmarks_router
from app.api.app.search_entries_router import router as search_entries_router
from app.api.app.stats_router import router as stats_router
from app.api.app.timeline_router import router as timeline_router

router = APIRouter()

router.include_router(entry_detail_router)
router.include_router(home_router)
router.include_router(notebook_detail_router)
router.include_router(search_entries_router)
router.include_router(search_bookmarks_router)
router.include_router(stats_router)
router.include_router(timeline_router)
router.include_router(notebook_entries_router)
router.include_router(public_share_summary_router)
router.include_router(public_share_entries_router)
