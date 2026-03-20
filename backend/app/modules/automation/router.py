from fastapi import APIRouter

from app.modules.automation.tasks_router import router as tasks_router

router = APIRouter()

router.include_router(tasks_router)
