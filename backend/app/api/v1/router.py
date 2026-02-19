from fastapi import APIRouter
from app.api.v1.endpoints import auth, boards, lists, cards

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(boards.router, prefix="/boards", tags=["Boards"])
api_router.include_router(lists.router, prefix="/lists", tags=["Lists"])
api_router.include_router(cards.router, prefix="/cards", tags=["Cards"])