from fastapi import APIRouter

from app.modules.integrations.ai_settings_router import router as ai_settings_router
from app.modules.integrations.amap_router import router as amap_router
from app.modules.integrations.assets_router import router as assets_router
from app.modules.integrations.geo_settings_router import router as geo_settings_router
from app.modules.integrations.immich_settings_router import router as immich_settings_router
from app.modules.integrations.karakeep_router import router as karakeep_router
from app.modules.integrations.karakeep_settings_router import router as karakeep_settings_router
from app.modules.integrations.media_crawler_router import router as media_crawler_router
from app.modules.integrations.notion_router import router as notion_router
from app.modules.integrations.notion_settings_router import router as notion_settings_router
from app.modules.integrations.proxy_router import router as proxy_router

router = APIRouter()

router.include_router(immich_settings_router)
router.include_router(karakeep_settings_router)
router.include_router(ai_settings_router)
router.include_router(geo_settings_router)
router.include_router(notion_settings_router)
router.include_router(proxy_router)
router.include_router(assets_router)
router.include_router(amap_router)
router.include_router(karakeep_router)
router.include_router(notion_router)
router.include_router(media_crawler_router)
