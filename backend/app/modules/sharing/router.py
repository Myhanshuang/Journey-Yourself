from fastapi import APIRouter

from app.modules.sharing.share_router import router as share_router

router = APIRouter()

router.include_router(share_router)
