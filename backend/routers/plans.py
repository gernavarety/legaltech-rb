"""
Роутер тарифных планов.
GET /api/plans — список всех активных планов
"""
from fastapi import APIRouter
from loguru import logger

from database import get_all_plans

router = APIRouter(prefix="/api/plans", tags=["plans"])


@router.get("")
async def list_plans():
    """
    Возвращает список всех активных тарифных планов.
    Публичный эндпоинт — авторизация не требуется (нужен для /pricing страницы).
    """
    plans = await get_all_plans()
    return {"plans": plans}
