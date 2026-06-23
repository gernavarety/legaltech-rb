"""
Суpabase JWT аутентификация для FastAPI.

Supabase подписывает JWT токены своим секретом (SUPABASE_JWT_SECRET).
Клиент передаёт токен в заголовке: Authorization: Bearer <token>
Мы верифицируем подпись и извлекаем user_id (sub) и email.
"""
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from loguru import logger
from pydantic import BaseModel
from typing import Optional

from config import get_settings

settings = get_settings()

# FastAPI security scheme — читает заголовок Authorization: Bearer <token>
bearer_scheme = HTTPBearer(auto_error=False)


class CurrentUser(BaseModel):
    """Данные авторизованного пользователя из JWT токена."""
    user_id: str
    email: str
    role: str = "authenticated"


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> CurrentUser:
    """
    Dependency для FastAPI: верифицирует Supabase JWT и возвращает пользователя.
    Если токен отсутствует или невалиден — raises 401.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Требуется авторизация. Передайте токен в заголовке Authorization: Bearer <token>",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    if not settings.supabase_jwt_secret:
        # Режим разработки без Supabase: принимаем любой токен для тестирования
        logger.warning("SUPABASE_JWT_SECRET не задан — режим разработки без проверки токена")
        return CurrentUser(
            user_id="dev-user-00000000-0000-0000-0000-000000000000",
            email="dev@lexai.by",
            role="authenticated",
        )

    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            options={"verify_aud": False},  # Supabase аудитория проверяется отдельно
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Токен истёк. Войдите в систему снова.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError as e:
        logger.warning(f"Невалидный JWT токен: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Невалидный токен авторизации.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    email = payload.get("email", "")
    role = payload.get("role", "authenticated")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Токен не содержит идентификатор пользователя.",
        )

    return CurrentUser(user_id=user_id, email=email, role=role)


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> Optional[CurrentUser]:
    """
    Dependency для эндпоинтов, доступных и анонимным пользователям.
    Возвращает None если токен не передан.
    """
    if not credentials:
        return None
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None
