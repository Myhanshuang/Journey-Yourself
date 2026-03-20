from fastapi import APIRouter

from app.modules.automation.router import router as automation_router
from app.modules.discovery.router import router as discovery_router
from app.modules.identity.router import router as identity_router
from app.modules.integrations.router import router as integrations_router
from app.modules.journaling.router import router as journaling_router
from app.modules.notebooks.router import router as notebooks_router
from app.modules.sharing.router import router as sharing_router
from app.modules.system_admin.router import router as system_admin_router

router = APIRouter()

router.include_router(identity_router)
router.include_router(notebooks_router)
router.include_router(journaling_router)
router.include_router(discovery_router)
router.include_router(sharing_router)
router.include_router(automation_router)
router.include_router(integrations_router)
router.include_router(system_admin_router)
