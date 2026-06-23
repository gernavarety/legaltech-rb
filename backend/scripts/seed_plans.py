"""
Начальное заполнение таблицы plans тарифными планами.

Запуск:
    cd backend
    python scripts/seed_plans.py

Или через Docker:
    docker compose exec backend python scripts/seed_plans.py
"""
import asyncio
import sys
from pathlib import Path

# Добавляем backend/ в путь чтобы импорты работали
sys.path.insert(0, str(Path(__file__).parent.parent))

import asyncpg
from config import get_settings
from loguru import logger

settings = get_settings()

PLANS = [
    {
        "name": "free",
        "display_name": "FREE",
        "price_usd": 0.00,
        "checks_per_month": 3,
        "max_file_mb": 5,
        "has_docx_download": False,
        "has_history": False,
        "has_api_access": False,
        "has_priority_queue": False,
        "max_team_members": 1,
    },
    {
        "name": "solo",
        "display_name": "SOLO",
        "price_usd": 49.00,
        "checks_per_month": 50,
        "max_file_mb": 10,
        "has_docx_download": True,
        "has_history": True,
        "has_api_access": False,
        "has_priority_queue": False,
        "max_team_members": 1,
    },
    {
        "name": "firm",
        "display_name": "FIRM",
        "price_usd": 149.00,
        "checks_per_month": None,  # безлимит
        "max_file_mb": 50,
        "has_docx_download": True,
        "has_history": True,
        "has_api_access": True,
        "has_priority_queue": True,
        "max_team_members": 5,
    },
]


async def seed():
    """Создаёт тарифные планы в БД. Безопасно запускать повторно (ON CONFLICT DO NOTHING)."""
    logger.info(f"Подключение к БД: {settings.database_url[:50]}...")
    conn = await asyncpg.connect(settings.database_url)

    try:
        for plan in PLANS:
            await conn.execute(
                """
                INSERT INTO plans (
                    name, display_name, price_usd,
                    checks_per_month, max_file_mb,
                    has_docx_download, has_history,
                    has_api_access, has_priority_queue, max_team_members
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                ON CONFLICT (name) DO UPDATE SET
                    display_name = EXCLUDED.display_name,
                    price_usd = EXCLUDED.price_usd,
                    checks_per_month = EXCLUDED.checks_per_month,
                    max_file_mb = EXCLUDED.max_file_mb,
                    has_docx_download = EXCLUDED.has_docx_download,
                    has_history = EXCLUDED.has_history,
                    has_api_access = EXCLUDED.has_api_access,
                    has_priority_queue = EXCLUDED.has_priority_queue,
                    max_team_members = EXCLUDED.max_team_members
                """,
                plan["name"],
                plan["display_name"],
                plan["price_usd"],
                plan["checks_per_month"],
                plan["max_file_mb"],
                plan["has_docx_download"],
                plan["has_history"],
                plan["has_api_access"],
                plan["has_priority_queue"],
                plan["max_team_members"],
            )
            checks_str = str(plan["checks_per_month"]) if plan["checks_per_month"] else "∞"
            logger.info(
                f"  ✓ {plan['display_name']:8} | ${plan['price_usd']:6.2f}/мес | "
                f"{checks_str:>3} проверок | max {plan['max_file_mb']}MB"
            )

        logger.info("Тарифные планы успешно созданы/обновлены")

        # Проверяем результат
        rows = await conn.fetch("SELECT name, display_name, price_usd FROM plans ORDER BY price_usd")
        logger.info("\n=== Текущие тарифы в БД ===")
        for row in rows:
            logger.info(f"  {row['display_name']:8} ${row['price_usd']:.2f}/мес")

    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(seed())
