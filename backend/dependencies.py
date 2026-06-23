"""
FastAPI dependencies для контроля доступа по тарифному плану.

Использование:
    @router.get("/download/{task_id}")
    @require_plan("solo", "firm")
    async def download(task_id: str, user=Depends(get_current_user)):
        ...

    # Или через Depends:
    async def my_endpoint(
        _: None = Depends(require_plan("solo", "firm")),
        user: CurrentUser = Depends(get_current_user),
    ):
        ...
"""
from datetime import datetime, timezone
from functools import wraps
from typing import Optional

from fastapi import Depends, HTTPException, status
from loguru import logger

from auth import CurrentUser, get_current_user
from database import (
    get_user_subscription,
    get_plan_by_name,
    get_current_usage,
    increment_usage,
)


class UserPlan:
    """Агрегирует данные о подписке и использовании пользователя."""

    def __init__(self, user: CurrentUser, subscription: Optional[dict]):
        self.user = user
        self.subscription = subscription

        if subscription and subscription["status"] in ("active",):
            self.plan_name = subscription["plan_name"]
            self.period_end = subscription["current_period_end"]
            self.checks_per_month = subscription["checks_per_month"]  # None = безлимит
            self.max_file_mb = subscription["max_file_mb"]
            self.has_docx_download = subscription["has_docx_download"]
            self.has_history = subscription["has_history"]
            self.has_api_access = subscription["has_api_access"]
            self.has_priority_queue = subscription["has_priority_queue"]
            self.max_team_members = subscription["max_team_members"]
        else:
            # Нет активной подписки → free план
            self.plan_name = "free"
            self.period_end = None
            self.checks_per_month = 3
            self.max_file_mb = 5
            self.has_docx_download = False
            self.has_history = False
            self.has_api_access = False
            self.has_priority_queue = False
            self.max_team_members = 1

    @property
    def is_free(self) -> bool:
        return self.plan_name == "free"

    @property
    def is_solo(self) -> bool:
        return self.plan_name == "solo"

    @property
    def is_firm(self) -> bool:
        return self.plan_name == "firm"

    @property
    def has_unlimited_checks(self) -> bool:
        return self.checks_per_month is None


async def get_user_plan(user: CurrentUser = Depends(get_current_user)) -> UserPlan:
    """
    Dependency: возвращает объект UserPlan с данными о подписке пользователя.
    Используется во всех защищённых эндпоинтах.
    """
    subscription = await get_user_subscription(user.user_id)
    return UserPlan(user=user, subscription=subscription)


def require_plan(*allowed_plans: str):
    """
    Dependency-фабрика: проверяет что пользователь на одном из указанных планов.

    Пример:
        @router.get("/download")
        async def download(
            _: None = Depends(require_plan("solo", "firm")),
            user_plan: UserPlan = Depends(get_user_plan),
        ):
            ...
    """
    async def _dependency(user_plan: UserPlan = Depends(get_user_plan)) -> UserPlan:
        if user_plan.plan_name not in allowed_plans:
            plans_display = " или ".join(p.upper() for p in allowed_plans)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "code": "plan_required",
                    "message": f"Эта функция доступна только на тарифе {plans_display}.",
                    "required_plans": list(allowed_plans),
                    "current_plan": user_plan.plan_name,
                    "upgrade_url": "/pricing",
                },
            )
        return user_plan

    return _dependency


async def check_upload_limit(user_plan: UserPlan = Depends(get_user_plan)) -> UserPlan:
    """
    Dependency для эндпоинта загрузки файла.
    Проверяет лимит проверок и инкрементирует счётчик.

    Порядок:
    1. Получить текущий план пользователя
    2. Если FIRM (безлимит) — пропустить
    3. Получить текущий счётчик из usage
    4. Если лимит достигнут — 403
    5. Инкрементировать счётчик
    """
    # FIRM имеет безлимитные проверки
    if user_plan.has_unlimited_checks:
        return user_plan

    # Определяем текущий расчётный период
    now = datetime.now(timezone.utc)
    if user_plan.subscription and user_plan.subscription["status"] == "active":
        period_start = user_plan.subscription["current_period_start"]
        period_end = user_plan.subscription["current_period_end"]
    else:
        # Free план: период = текущий календарный месяц
        period_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if now.month == 12:
            period_end = now.replace(year=now.year + 1, month=1, day=1,
                                      hour=0, minute=0, second=0, microsecond=0)
        else:
            period_end = now.replace(month=now.month + 1, day=1,
                                      hour=0, minute=0, second=0, microsecond=0)

    # Проверяем текущее использование
    current = await get_current_usage(user_plan.user.user_id)
    checks_used = current["checks_used"] if current else 0

    if checks_used >= user_plan.checks_per_month:
        plan_display = {"free": "FREE", "solo": "SOLO"}.get(user_plan.plan_name, user_plan.plan_name.upper())
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "limit_reached",
                "message": (
                    f"Вы использовали все {user_plan.checks_per_month} проверок "
                    f"в рамках тарифа {plan_display}. "
                    f"Перейдите на следующий тариф для продолжения работы."
                ),
                "checks_used": checks_used,
                "checks_limit": user_plan.checks_per_month,
                "current_plan": user_plan.plan_name,
                "upgrade_url": "/pricing",
            },
        )

    # Инкрементируем счётчик
    new_count = await increment_usage(user_plan.user.user_id, period_start, period_end)
    logger.info(
        f"Использование: user={user_plan.user.user_id} "
        f"checks={new_count}/{user_plan.checks_per_month} "
        f"план={user_plan.plan_name}"
    )
    return user_plan
