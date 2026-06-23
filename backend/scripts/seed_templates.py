"""
Заполнение таблицы document_templates данными 20 шаблонов.

Запуск:
    docker compose exec backend python scripts/seed_templates.py
    # или локально:
    cd backend && python scripts/seed_templates.py

Скрипт идемпотентен — безопасно запускать повторно.
Использует ON CONFLICT (slug) DO UPDATE для обновления существующих записей.
"""

import asyncio
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncpg

from config import get_settings
from templates_data import TEMPLATES


async def seed_templates() -> None:
    settings = get_settings()
    conn = await asyncpg.connect(settings.database_url)

    print(f"Подключение к БД: {settings.database_url[:40]}...")
    inserted = 0
    updated = 0

    try:
        for tmpl in TEMPLATES:
            result = await conn.execute(
                """
                INSERT INTO document_templates
                    (slug, name, group_name, description, law_references,
                     fields_schema, available_plans, is_active)
                VALUES ($1, $2, $3, $4, $5, $6, $7, true)
                ON CONFLICT (slug) DO UPDATE SET
                    name            = EXCLUDED.name,
                    group_name      = EXCLUDED.group_name,
                    description     = EXCLUDED.description,
                    law_references  = EXCLUDED.law_references,
                    fields_schema   = EXCLUDED.fields_schema,
                    available_plans = EXCLUDED.available_plans,
                    is_active       = true
                """,
                tmpl["slug"],
                tmpl["name"],
                tmpl["group_name"],
                tmpl.get("description", ""),
                tmpl.get("law_references", []),
                json.dumps(tmpl["fields_schema"], ensure_ascii=False),
                tmpl.get("available_plans", ["free", "solo", "firm"]),
            )
            # asyncpg возвращает 'INSERT 0 1' или 'UPDATE 1'
            if "INSERT" in result:
                inserted += 1
                print(f"  ✓ Создан:   {tmpl['slug']:45s} ({tmpl['group_name']})")
            else:
                updated += 1
                print(f"  ↺ Обновлён: {tmpl['slug']:45s} ({tmpl['group_name']})")

    finally:
        await conn.close()

    print(f"\nГотово: {inserted} создано, {updated} обновлено. Всего: {len(TEMPLATES)} шаблонов.")

    # Также обновляем plans — добавляем поля generations_per_month и has_pdf_download
    print("\nОбновление таблицы plans...")
    conn2 = await asyncpg.connect(settings.database_url)
    try:
        await conn2.execute("""
            UPDATE plans SET generations_per_month = 3,    has_pdf_download = false WHERE name = 'free';
        """)
        await conn2.execute("""
            UPDATE plans SET generations_per_month = 30,   has_pdf_download = true  WHERE name = 'solo';
        """)
        await conn2.execute("""
            UPDATE plans SET generations_per_month = NULL, has_pdf_download = true  WHERE name = 'firm';
        """)
        print("  ✓ Лимиты генераций обновлены в таблице plans.")
    except Exception as e:
        print(f"  ! Ошибка обновления plans: {e}")
        print("    Запустите сначала: psql $DATABASE_URL -f migrations/009_alter_plans_generations.sql")
    finally:
        await conn2.close()


if __name__ == "__main__":
    asyncio.run(seed_templates())
