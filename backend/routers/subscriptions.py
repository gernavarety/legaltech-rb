"""
Роутер подписок и оплаты.

GET  /api/subscription           — текущая подписка + использование
POST /api/subscription/checkout  — создать платёж → redirect URL Bepaid
POST /api/subscription/cancel    — отменить подписку
"""
import uuid
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from loguru import logger
from pydantic import BaseModel

from auth import CurrentUser, get_current_user
from config import get_settings
from database import (
    get_user_subscription,
    get_current_usage,
    get_plan_by_name,
    upsert_subscription,
    cancel_subscription_db,
    create_payment,
    find_subscription_by_order_id,
)
from dependencies import UserPlan, get_user_plan
from notifications import EmailService
from payments import BePaidClient, get_bepaid_client
from utils.currency import usd_to_byn

settings = get_settings()
router = APIRouter(prefix="/api/subscription", tags=["subscription"])


class CheckoutRequest(BaseModel):
    plan: str  # 'solo' | 'firm'


@router.get("")
async def get_subscription(user_plan: UserPlan = Depends(get_user_plan)):
    """
    Возвращает текущую подписку пользователя.
    Если подписки нет — возвращает данные free плана.
    """
    usage = await get_current_usage(user_plan.user.user_id)
    checks_used = usage["checks_used"] if usage else 0

    return {
        "plan_name": user_plan.plan_name,
        "subscription": user_plan.subscription,
        "usage": {
            "checks_used": checks_used,
            "checks_limit": user_plan.checks_per_month,
            "is_unlimited": user_plan.has_unlimited_checks,
        },
        "features": {
            "has_docx_download": user_plan.has_docx_download,
            "has_history": user_plan.has_history,
            "has_api_access": user_plan.has_api_access,
            "has_priority_queue": user_plan.has_priority_queue,
            "max_team_members": user_plan.max_team_members,
            "max_file_mb": user_plan.max_file_mb,
        },
    }


@router.post("/checkout")
async def create_checkout(
    body: CheckoutRequest,
    user: CurrentUser = Depends(get_current_user),
    bepaid: BePaidClient = Depends(get_bepaid_client),
):
    """
    Создаёт платёж и возвращает URL для редиректа на страницу оплаты Bepaid.

    Флоу:
    1. Валидируем план
    2. Создаём pending запись платежа в БД
    3. Запрашиваем токен у Bepaid
    4. Возвращаем redirect_url клиенту
    5. Клиент редиректит пользователя на Bepaid checkout
    6. После оплаты Bepaid делает вебхук на /api/webhooks/bepaid
    """
    plan_name = body.plan.lower().strip()
    if plan_name not in ("solo", "firm"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Допустимые значения plan: 'solo' или 'firm'",
        )

    plan = await get_plan_by_name(plan_name)
    if not plan:
        raise HTTPException(status_code=404, detail="Тарифный план не найден")

    order_id = str(uuid.uuid4())
    amount_usd = float(plan["price_usd"])
    amount_byn = await usd_to_byn(amount_usd)

    # Создаём pending запись платежа
    payment_id = await create_payment(
        user_id=user.user_id,
        amount_usd=amount_usd,
        amount_byn=amount_byn,
        status="pending",
        bepaid_order_id=order_id,
    )
    logger.info(f"Создан платёж {payment_id} (order={order_id}) для {user.email} план={plan_name}")

    # Создаём токен Bepaid
    return_url = f"{settings.frontend_url}/payment/{{status}}?order_id={order_id}"
    notify_url = f"{settings.frontend_url.replace('3000', '8000')}/api/webhooks/bepaid"
    # В продакшне notify_url должен быть реальным публичным URL бэкенда

    token_data = await bepaid.create_payment_token(
        amount_usd=amount_usd,
        order_id=order_id,
        description=f"LexAI.by — тариф {plan['display_name']} (1 месяц)",
        customer_email=user.email,
        return_url=return_url,
        notify_url=notify_url,
        plan_name=plan_name,
    )

    return {
        "payment_url": token_data["redirect_url"],
        "order_id": order_id,
        "amount_byn": amount_byn,
        "amount_usd": amount_usd,
        "plan": plan_name,
        "is_stub": token_data.get("is_stub", False),
    }


@router.post("/cancel")
async def cancel_subscription(
    user: CurrentUser = Depends(get_current_user),
    bepaid: BePaidClient = Depends(get_bepaid_client),
):
    """
    Отменяет подписку.
    - Вызывает Bepaid API для отмены рекуррентных списаний
    - В БД помечает cancel_at_period_end=true
    - Доступ сохраняется до конца оплаченного периода
    - Отправляет email подтверждение
    """
    subscription = await get_user_subscription(user.user_id)

    if not subscription or subscription["status"] != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="У вас нет активной подписки для отмены",
        )

    if subscription.get("cancel_at_period_end"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Подписка уже отменена. Доступ сохраняется до конца периода.",
        )

    # Отменяем в Bepaid
    bepaid_sub_id = subscription.get("bepaid_subscription_id")
    if bepaid_sub_id:
        cancelled_in_bepaid = await bepaid.cancel_subscription(bepaid_sub_id)
        if not cancelled_in_bepaid:
            logger.warning(f"Bepaid не смог отменить подписку {bepaid_sub_id}")

    # Помечаем в БД
    await cancel_subscription_db(user.user_id)

    # Email подтверждение
    access_until = subscription["current_period_end"]
    email_service = EmailService()
    await email_service.send_subscription_cancelled(
        to_email=user.email,
        plan_display_name=subscription["display_name"],
        access_until=access_until,
    )

    return {
        "success": True,
        "message": "Подписка отменена. Доступ сохраняется до конца оплаченного периода.",
        "access_until": access_until,
    }
