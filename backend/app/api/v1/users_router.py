from fastapi import APIRouter

from app.modules.identity.users_router import router as identity_users_router
from app.modules.integrations.ai_settings_router import router as ai_settings_router
from app.modules.integrations.geo_settings_router import router as geo_settings_router
from app.modules.integrations.immich_settings_router import router as immich_settings_router
from app.modules.integrations.karakeep_settings_router import router as karakeep_settings_router
from app.modules.integrations.notion_settings_router import router as notion_settings_router
from app.modules.system_admin.router import router as system_admin_router

router = APIRouter()

router.include_router(identity_users_router)
router.include_router(immich_settings_router)
router.include_router(karakeep_settings_router)
router.include_router(ai_settings_router)
router.include_router(geo_settings_router)
router.include_router(notion_settings_router)
router.include_router(system_admin_router)
