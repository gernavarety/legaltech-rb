"""
Конвертация валют: USD → BYN через официальный API Нацбанка Республики Беларусь.

API НБ РБ: https://api.nbrb.by/exrates/rates/{currency_id}
Код USD = 431

Курс кэшируется в Redis на 1 час, чтобы не дёргать НБ РБ при каждом платеже.
"""
import json
from datetime import date, datetime
from typing import Optional

import httpx
import redis.asyncio as aioredis
from loguru import logger

from config import get_settings

settings = get_settings()

# Код валюты USD в справочнике НБ РБ
NBR_USD_CURRENCY_ID = 431
NBR_API_URL = f"https://api.nbrb.by/exrates/rates/{NBR_USD_CURRENCY_ID}"
CACHE_KEY = "nbrb:usd_byn_rate"
CACHE_TTL_SECONDS = 3600  # 1 час


def _get_redis() -> aioredis.Redis:
    return aioredis.from_url(settings.redis_url, decode_responses=True)


async def get_usd_to_byn_rate(for_date: Optional[date] = None) -> float:
    """
    Возвращает курс USD/BYN.
    Сначала проверяет кэш в Redis. Если нет — запрашивает НБ РБ и кэширует.

    Args:
        for_date: дата курса (по умолчанию текущий день)

    Returns:
        Курс USD к BYN (например 3.2540)
    """
    cache_key = CACHE_KEY
    if for_date:
        cache_key = f"{CACHE_KEY}:{for_date.isoformat()}"

    # Пробуем Redis
    try:
        redis = _get_redis()
        cached = await redis.get(cache_key)
        if cached:
            rate = float(cached)
            logger.debug(f"Курс USD/BYN из кэша: {rate}")
            return rate
    except Exception as e:
        logger.warning(f"Redis недоступен при получении курса: {e}")

    # Запрашиваем НБ РБ
    rate = await _fetch_rate_from_nbrb(for_date)

    # Кэшируем результат
    try:
        redis = _get_redis()
        await redis.set(cache_key, str(rate), ex=CACHE_TTL_SECONDS)
    except Exception as e:
        logger.warning(f"Не удалось закэшировать курс в Redis: {e}")

    return rate


async def _fetch_rate_from_nbrb(for_date: Optional[date] = None) -> float:
    """Запрашивает актуальный курс USD/BYN у НБ РБ."""
    params = {}
    if for_date:
        params["ondate"] = for_date.isoformat()

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(NBR_API_URL, params=params)
            response.raise_for_status()
            data = response.json()
            rate = float(data["Cur_OfficialRate"])
            logger.info(f"Курс USD/BYN от НБ РБ: {rate} (дата: {data.get('Date')})")
            return rate
    except Exception as e:
        logger.error(f"Ошибка получения курса USD/BYN от НБ РБ: {e}")
        # Резервный курс чтобы не ломать платёжный флоу
        fallback_rate = 3.30
        logger.warning(f"Используем резервный курс USD/BYN: {fallback_rate}")
        return fallback_rate


async def usd_to_byn_kopecks(amount_usd: float, for_date: Optional[date] = None) -> int:
    """
    Конвертирует сумму в USD в копейки BYN (минимальная единица Bepaid).

    Bepaid принимает суммы в копейках: 4900 = 49.00 BYN

    Args:
        amount_usd: сумма в долларах (например 49.0)
        for_date: дата для курса (по умолчанию сегодня)

    Returns:
        Сумма в копейках BYN (целое число)
    """
    rate = await get_usd_to_byn_rate(for_date)
    amount_byn = amount_usd * rate
    kopecks = round(amount_byn * 100)
    logger.info(f"${amount_usd} → {amount_byn:.2f} BYN ({kopecks} коп.) @ курс {rate}")
    return kopecks


async def usd_to_byn(amount_usd: float, for_date: Optional[date] = None) -> float:
    """Конвертирует USD в BYN с точностью до 2 знаков."""
    rate = await get_usd_to_byn_rate(for_date)
    return round(amount_usd * rate, 2)
