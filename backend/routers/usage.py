"""
Роутер использования.
GET /api/usage — текущий счётчик проверок
GET /api/history — история документов пользователя
"""
from fastapi import APIRouter, Depends, Query

from auth import CurrentUser, get_current_user
from database import get_current_usage, get_user_documents, delete_document, get_user_payments
from dependencies import UserPlan, get_user_plan, require_plan

router = APIRouter(prefix="/api", tags=["usage"])


@router.get("/usage")
async def get_usage(user_plan: UserPlan = Depends(get_user_plan)):
    """
    Возвращает текущий счётчик использования проверок.
    Показывается в /dashboard как прогресс-бар.
    """
    usage = await get_current_usage(user_plan.user.user_id)
    checks_used = usage["checks_used"] if usage else 0
    period_end = usage["period_end"] if usage else None

    return {
        "checks_used": checks_used,
        "checks_limit": user_plan.checks_per_month,
        "is_unlimited": user_plan.has_unlimited_checks,
        "period_end": period_end,
        "plan_name": user_plan.plan_name,
    }


@router.get("/history")
async def get_history(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    risk_filter: str = Query(default=None, pattern="^(высокий|средний|низкий)$"),
    user_plan: UserPlan = Depends(require_plan("solo", "firm")),
):
    """
    История документов пользователя (только SOLO/FIRM).
    Пагинация: page + per_page.
    Фильтр: risk_filter = высокий | средний | низкий
    """
    offset = (page - 1) * per_page
    documents, total = await get_user_documents(
        user_id=user_plan.user.user_id,
        limit=per_page,
        offset=offset,
        risk_filter=risk_filter,
    )

    return {
        "documents": documents,
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page,
    }


@router.delete("/history/{doc_id}")
async def delete_document_endpoint(
    doc_id: str,
    user: CurrentUser = Depends(get_current_user),
):
    """Удаляет документ из истории (только свой документ)."""
    deleted = await delete_document(doc_id=doc_id, user_id=user.user_id)
    if not deleted:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Документ не найден или не принадлежит вам")
    return {"success": True}


@router.get("/payments")
async def get_payment_history(
    user: CurrentUser = Depends(get_current_user),
):
    """История платежей пользователя (для страницы /settings)."""
    payments = await get_user_payments(user_id=user.user_id, limit=20)
    return {"payments": payments}
