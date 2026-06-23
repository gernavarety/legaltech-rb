"""
Роутер управления командой (только FIRM тариф).

GET  /api/team              — список участников
POST /api/team/invite       — пригласить участника по email
POST /api/team/accept/{token} — принять приглашение
DELETE /api/team/{member_id}  — удалить участника
"""
import secrets
from fastapi import APIRouter, Depends, HTTPException, status
from loguru import logger
from pydantic import BaseModel, EmailStr

from auth import CurrentUser, get_current_user
from config import get_settings
from database import (
    get_team_members,
    count_active_team_members,
    invite_team_member,
    accept_team_invite,
    remove_team_member,
)
from dependencies import UserPlan, require_plan
from notifications import EmailService

settings = get_settings()
router = APIRouter(prefix="/api/team", tags=["team"])


class InviteRequest(BaseModel):
    email: EmailStr


@router.get("")
async def get_team(
    user_plan: UserPlan = Depends(require_plan("firm")),
):
    """Список участников команды (только FIRM)."""
    members = await get_team_members(user_plan.user.user_id)
    count = await count_active_team_members(user_plan.user.user_id)
    return {
        "members": members,
        "count": count,
        "max_members": user_plan.max_team_members,
    }


@router.post("/invite")
async def invite_member(
    body: InviteRequest,
    user_plan: UserPlan = Depends(require_plan("firm")),
):
    """
    Приглашает участника в команду.
    Лимит: 5 участников (включая владельца) для тарифа FIRM.
    """
    # Проверяем лимит (4 приглашённых + 1 владелец = 5)
    count = await count_active_team_members(user_plan.user.user_id)
    if count >= user_plan.max_team_members - 1:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Достигнут лимит участников команды ({user_plan.max_team_members} человек)",
        )

    invite_token = secrets.token_urlsafe(32)
    invite_url = f"{settings.frontend_url}/team/accept/{invite_token}"

    member_id = await invite_team_member(
        owner_id=user_plan.user.user_id,
        invite_email=body.email,
        invite_token=invite_token,
    )

    # Отправляем email с приглашением
    email_service = EmailService()
    await email_service.send_team_invite(
        to_email=body.email,
        inviter_email=user_plan.user.email,
        invite_url=invite_url,
    )

    logger.info(f"Приглашение отправлено: {body.email} от {user_plan.user.email}")
    return {
        "success": True,
        "message": f"Приглашение отправлено на {body.email}",
        "member_id": member_id,
    }


@router.post("/accept/{token}")
async def accept_invite(
    token: str,
    user: CurrentUser = Depends(get_current_user),
):
    """
    Принимает приглашение в команду.
    Вызывается когда приглашённый кликает по ссылке из email.
    """
    owner_id = await accept_team_invite(invite_token=token, member_id=user.user_id)
    if not owner_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Приглашение не найдено или уже принято",
        )
    return {
        "success": True,
        "message": "Вы успешно вошли в команду",
        "owner_id": owner_id,
    }


@router.delete("/{member_email}")
async def remove_member(
    member_email: str,
    user_plan: UserPlan = Depends(require_plan("firm")),
):
    """Удаляет участника из команды (только владелец)."""
    removed = await remove_team_member(
        owner_id=user_plan.user.user_id,
        member_id=member_email,
    )
    if not removed:
        raise HTTPException(status_code=404, detail="Участник не найден")
    return {"success": True}
