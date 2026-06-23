"""
Работа с PostgreSQL/pgvector через asyncpg.
Все операции с базой данных: CRUD для documents, plans, subscriptions, usage, payments, team_members.
"""
import asyncpg
import json
from datetime import datetime, timezone
from typing import Optional, List, Any, Tuple
from loguru import logger
from config import get_settings

settings = get_settings()

# Глобальный пул соединений
_pool: Optional[asyncpg.Pool] = None


async def get_pool() -> asyncpg.Pool:
    """Возвращает пул соединений, создаёт при первом вызове."""
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(
            dsn=settings.database_url,
            min_size=2,
            max_size=10,
            command_timeout=60,
        )
    return _pool


async def close_pool():
    """Закрывает пул соединений при завершении приложения."""
    global _pool
    if _pool:
        await _pool.close()
        _pool = None


async def init_db():
    """Создаёт таблицы если они не существуют. Вызывается при старте."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("CREATE EXTENSION IF NOT EXISTS vector;")

        # ── Документы (оригинальная таблица + новые поля) ───────────
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                created_at      TIMESTAMPTZ DEFAULT NOW(),
                filename        TEXT NOT NULL,
                file_url        TEXT NOT NULL,
                status          TEXT DEFAULT 'pending',
                contract_type   TEXT,
                overall_risk    TEXT,
                result_json     JSONB,
                report_url      TEXT,
                error_text      TEXT,
                user_id         UUID,
                is_public       BOOLEAN DEFAULT false
            );
        """)

        await conn.execute("""
            CREATE INDEX IF NOT EXISTS documents_user_idx
            ON documents(user_id, created_at DESC)
            WHERE user_id IS NOT NULL;
        """)

        # ── Нормы законодательства РБ (pgvector) ──────────────────
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS law_chunks (
                id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                document_name   TEXT NOT NULL,
                article_number  TEXT,
                article_title   TEXT,
                text            TEXT NOT NULL,
                url             TEXT,
                embedding       vector(1536)
            );
        """)

        await conn.execute("""
            CREATE INDEX IF NOT EXISTS law_chunks_embedding_idx
            ON law_chunks USING ivfflat (embedding vector_cosine_ops)
            WITH (lists = 100);
        """)

        # ── Тарифные планы ─────────────────────────────────────────
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS plans (
                id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name                TEXT NOT NULL UNIQUE,
                display_name        TEXT NOT NULL,
                price_usd           DECIMAL(10,2) NOT NULL DEFAULT 0,
                checks_per_month    INTEGER,
                max_file_mb         INTEGER NOT NULL DEFAULT 5,
                has_docx_download   BOOLEAN NOT NULL DEFAULT false,
                has_history         BOOLEAN NOT NULL DEFAULT false,
                has_api_access      BOOLEAN NOT NULL DEFAULT false,
                has_priority_queue  BOOLEAN NOT NULL DEFAULT false,
                max_team_members    INTEGER NOT NULL DEFAULT 1,
                is_active           BOOLEAN NOT NULL DEFAULT true,
                created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        """)

        # ── Подписки ───────────────────────────────────────────────
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS subscriptions (
                id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id                 UUID NOT NULL UNIQUE,
                plan_id                 UUID NOT NULL REFERENCES plans(id),
                status                  TEXT NOT NULL DEFAULT 'active',
                current_period_start    TIMESTAMPTZ NOT NULL,
                current_period_end      TIMESTAMPTZ NOT NULL,
                bepaid_order_id         TEXT,
                bepaid_subscription_id  TEXT,
                cancelled_at            TIMESTAMPTZ,
                cancel_at_period_end    BOOLEAN NOT NULL DEFAULT false,
                created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        """)

        await conn.execute("""
            CREATE INDEX IF NOT EXISTS subscriptions_bepaid_idx
            ON subscriptions(bepaid_subscription_id)
            WHERE bepaid_subscription_id IS NOT NULL;
        """)

        # ── Использование ──────────────────────────────────────────
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS usage (
                id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id         UUID NOT NULL,
                period_start    TIMESTAMPTZ NOT NULL,
                period_end      TIMESTAMPTZ NOT NULL,
                checks_used     INTEGER NOT NULL DEFAULT 0,
                updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                UNIQUE(user_id, period_start)
            );
        """)

        await conn.execute("""
            CREATE INDEX IF NOT EXISTS usage_user_period_idx
            ON usage(user_id, period_start DESC);
        """)

        # ── Платежи ────────────────────────────────────────────────
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS payments (
                id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id                 UUID NOT NULL,
                subscription_id         UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
                amount_usd              DECIMAL(10,2) NOT NULL,
                amount_byn              DECIMAL(10,2),
                exchange_rate           DECIMAL(10,4),
                status                  TEXT NOT NULL,
                bepaid_transaction_id   TEXT UNIQUE,
                bepaid_order_id         TEXT,
                bepaid_uid              TEXT,
                payload_json            JSONB,
                failure_reason          TEXT,
                created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        """)

        await conn.execute("""
            CREATE INDEX IF NOT EXISTS payments_user_idx
            ON payments(user_id, created_at DESC);
        """)

        # ── Участники команды (FIRM) ────────────────────────────────
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS team_members (
                id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                owner_id        UUID NOT NULL,
                member_id       UUID,
                invite_email    TEXT NOT NULL,
                invite_token    TEXT UNIQUE,
                status          TEXT NOT NULL DEFAULT 'pending',
                invited_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                accepted_at     TIMESTAMPTZ,
                created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                UNIQUE(owner_id, invite_email)
            );
        """)

        await conn.execute("""
            CREATE INDEX IF NOT EXISTS team_members_owner_idx ON team_members(owner_id);
            CREATE INDEX IF NOT EXISTS team_members_token_idx ON team_members(invite_token)
            WHERE invite_token IS NOT NULL;
        """)

    logger.info("База данных инициализирована")


# ── Documents CRUD ────────────────────────────────────────────────────

async def create_document(filename: str, file_url: str, user_id: Optional[str] = None) -> str:
    """Создаёт запись о документе, возвращает UUID."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO documents (filename, file_url, status, user_id)
            VALUES ($1, $2, 'pending', $3::uuid)
            RETURNING id::text
            """,
            filename, file_url, user_id,
        )
        doc_id = row["id"]
        logger.info(f"Создан документ {doc_id} ({filename}) user={user_id}")
        return doc_id


async def update_document_status(
    doc_id: str,
    status: str,
    contract_type: Optional[str] = None,
    overall_risk: Optional[str] = None,
    result_json: Optional[Any] = None,
    report_url: Optional[str] = None,
    error_text: Optional[str] = None,
):
    """Обновляет статус и результаты анализа документа."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            """
            UPDATE documents
            SET status = $2,
                contract_type = COALESCE($3, contract_type),
                overall_risk = COALESCE($4, overall_risk),
                result_json = COALESCE($5::jsonb, result_json),
                report_url = COALESCE($6, report_url),
                error_text = COALESCE($7, error_text)
            WHERE id = $1::uuid
            """,
            doc_id, status, contract_type, overall_risk,
            json.dumps(result_json, ensure_ascii=False) if result_json else None,
            report_url, error_text,
        )
        logger.info(f"Документ {doc_id} → статус={status}")


async def get_document(doc_id: str) -> Optional[dict]:
    """Возвращает запись документа по ID."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT id::text, filename, file_url, status,
                   contract_type, overall_risk,
                   result_json::text as result_json_text,
                   report_url, error_text, created_at,
                   user_id::text, is_public
            FROM documents WHERE id = $1::uuid
            """,
            doc_id,
        )
        if not row:
            return None
        data = dict(row)
        if data.get("result_json_text"):
            data["result_json"] = json.loads(data["result_json_text"])
        else:
            data["result_json"] = None
        del data["result_json_text"]
        return data


async def get_user_documents(
    user_id: str,
    limit: int = 20,
    offset: int = 0,
    risk_filter: Optional[str] = None,
) -> Tuple[List[dict], int]:
    """
    Возвращает историю документов пользователя (для страницы /history).

    Returns:
        (список документов, общее количество)
    """
    pool = await get_pool()
    async with pool.acquire() as conn:
        where_extra = "AND overall_risk = $4" if risk_filter else ""
        params_count = [user_id]
        params_list = [user_id, limit, offset]
        if risk_filter:
            params_count.append(risk_filter)
            params_list.append(risk_filter)

        count_row = await conn.fetchrow(
            f"SELECT COUNT(*) as cnt FROM documents WHERE user_id = $1::uuid AND status = 'done' {where_extra}",
            *params_count,
        )
        total = count_row["cnt"]

        rows = await conn.fetch(
            f"""
            SELECT id::text, filename, status, contract_type, overall_risk,
                   report_url, created_at
            FROM documents
            WHERE user_id = $1::uuid AND status = 'done'
            {where_extra}
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
            """,
            *params_list,
        )
        return [dict(r) for r in rows], total


async def delete_document(doc_id: str, user_id: str) -> bool:
    """Удаляет документ (только свой). Возвращает True если удалён."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        result = await conn.execute(
            "DELETE FROM documents WHERE id = $1::uuid AND user_id = $2::uuid",
            doc_id, user_id,
        )
        deleted = result.split()[-1] == "1"
        if deleted:
            logger.info(f"Документ {doc_id} удалён пользователем {user_id}")
        return deleted


# ── Plans CRUD ────────────────────────────────────────────────────────

async def get_all_plans() -> List[dict]:
    """Возвращает все активные тарифные планы."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT id::text, * FROM plans WHERE is_active = true ORDER BY price_usd ASC"
        )
        return [dict(r) for r in rows]


async def get_plan_by_name(name: str) -> Optional[dict]:
    """Возвращает тарифный план по имени ('free', 'solo', 'firm')."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT id::text, * FROM plans WHERE name = $1 AND is_active = true",
            name,
        )
        return dict(row) if row else None


async def get_plan_by_id(plan_id: str) -> Optional[dict]:
    """Возвращает тарифный план по UUID."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT id::text, * FROM plans WHERE id = $1::uuid",
            plan_id,
        )
        return dict(row) if row else None


# ── Subscriptions CRUD ────────────────────────────────────────────────

async def get_user_subscription(user_id: str) -> Optional[dict]:
    """
    Возвращает текущую подписку пользователя вместе с данными плана.
    Если подписки нет — возвращает None (пользователь на free).
    """
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT
                s.id::text as subscription_id,
                s.status,
                s.current_period_start,
                s.current_period_end,
                s.bepaid_subscription_id,
                s.cancel_at_period_end,
                s.cancelled_at,
                p.id::text as plan_id,
                p.name as plan_name,
                p.display_name,
                p.price_usd,
                p.checks_per_month,
                p.max_file_mb,
                p.has_docx_download,
                p.has_history,
                p.has_api_access,
                p.has_priority_queue,
                p.max_team_members
            FROM subscriptions s
            JOIN plans p ON p.id = s.plan_id
            WHERE s.user_id = $1::uuid
            """,
            user_id,
        )
        return dict(row) if row else None


async def upsert_subscription(
    user_id: str,
    plan_id: str,
    status: str,
    period_start: datetime,
    period_end: datetime,
    bepaid_order_id: Optional[str] = None,
    bepaid_subscription_id: Optional[str] = None,
) -> str:
    """
    Создаёт или обновляет подписку пользователя (UPSERT по user_id).
    Возвращает UUID подписки.
    """
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO subscriptions
                (user_id, plan_id, status, current_period_start, current_period_end,
                 bepaid_order_id, bepaid_subscription_id, updated_at)
            VALUES
                ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, NOW())
            ON CONFLICT (user_id) DO UPDATE SET
                plan_id = EXCLUDED.plan_id,
                status = EXCLUDED.status,
                current_period_start = EXCLUDED.current_period_start,
                current_period_end = EXCLUDED.current_period_end,
                bepaid_order_id = COALESCE(EXCLUDED.bepaid_order_id, subscriptions.bepaid_order_id),
                bepaid_subscription_id = COALESCE(EXCLUDED.bepaid_subscription_id, subscriptions.bepaid_subscription_id),
                cancel_at_period_end = false,
                cancelled_at = NULL,
                updated_at = NOW()
            RETURNING id::text
            """,
            user_id, plan_id, status, period_start, period_end,
            bepaid_order_id, bepaid_subscription_id,
        )
        sub_id = row["id"]
        logger.info(f"Подписка upsert: user={user_id} plan={plan_id} status={status}")
        return sub_id


async def cancel_subscription_db(user_id: str) -> bool:
    """Помечает подписку как отменённую (cancel_at_period_end=true)."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        result = await conn.execute(
            """
            UPDATE subscriptions
            SET cancel_at_period_end = true,
                cancelled_at = NOW(),
                updated_at = NOW()
            WHERE user_id = $1::uuid AND status = 'active'
            """,
            user_id,
        )
        updated = result.split()[-1] == "1"
        if updated:
            logger.info(f"Подписка пользователя {user_id} помечена к отмене")
        return updated


async def find_subscription_by_bepaid_id(bepaid_subscription_id: str) -> Optional[dict]:
    """Поиск подписки по ID рекуррентной подписки Bepaid (для вебхуков)."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT id::text, user_id::text, plan_id::text, status FROM subscriptions WHERE bepaid_subscription_id = $1",
            bepaid_subscription_id,
        )
        return dict(row) if row else None


async def find_subscription_by_order_id(order_id: str) -> Optional[dict]:
    """Поиск подписки по ID заказа Bepaid."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT id::text, user_id::text, plan_id::text, status FROM subscriptions WHERE bepaid_order_id = $1",
            order_id,
        )
        return dict(row) if row else None


# ── Usage CRUD ────────────────────────────────────────────────────────

async def get_current_usage(user_id: str) -> Optional[dict]:
    """Возвращает счётчик использования за текущий период."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT id::text, checks_used, period_start, period_end, updated_at
            FROM usage
            WHERE user_id = $1::uuid AND period_end > NOW()
            ORDER BY period_start DESC
            LIMIT 1
            """,
            user_id,
        )
        return dict(row) if row else None


async def increment_usage(user_id: str, period_start: datetime, period_end: datetime) -> int:
    """
    Увеличивает счётчик использования на 1. Создаёт запись если нет.
    Возвращает новое значение checks_used.
    """
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO usage (user_id, period_start, period_end, checks_used)
            VALUES ($1::uuid, $2, $3, 1)
            ON CONFLICT (user_id, period_start) DO UPDATE
            SET checks_used = usage.checks_used + 1,
                updated_at = NOW()
            RETURNING checks_used
            """,
            user_id, period_start, period_end,
        )
        return row["checks_used"]


async def reset_usage(user_id: str, period_start: datetime, period_end: datetime):
    """Сбрасывает счётчик при продлении подписки."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO usage (user_id, period_start, period_end, checks_used)
            VALUES ($1::uuid, $2, $3, 0)
            ON CONFLICT (user_id, period_start) DO UPDATE
            SET checks_used = 0, updated_at = NOW()
            """,
            user_id, period_start, period_end,
        )
        logger.info(f"Сброс счётчика использования для {user_id}")


# ── Payments CRUD ─────────────────────────────────────────────────────

async def create_payment(
    user_id: str,
    amount_usd: float,
    amount_byn: Optional[float] = None,
    exchange_rate: Optional[float] = None,
    status: str = "pending",
    bepaid_order_id: Optional[str] = None,
    bepaid_transaction_id: Optional[str] = None,
    bepaid_uid: Optional[str] = None,
    subscription_id: Optional[str] = None,
    payload_json: Optional[dict] = None,
    failure_reason: Optional[str] = None,
) -> str:
    """Создаёт запись о платеже. Возвращает UUID."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO payments
                (user_id, amount_usd, amount_byn, exchange_rate, status,
                 bepaid_order_id, bepaid_transaction_id, bepaid_uid,
                 subscription_id, payload_json, failure_reason)
            VALUES
                ($1::uuid, $2, $3, $4, $5, $6, $7, $8,
                 $9::uuid, $10::jsonb, $11)
            RETURNING id::text
            """,
            user_id, amount_usd, amount_byn, exchange_rate, status,
            bepaid_order_id, bepaid_transaction_id, bepaid_uid,
            subscription_id,
            json.dumps(payload_json, ensure_ascii=False) if payload_json else None,
            failure_reason,
        )
        return row["id"]


async def update_payment_status(
    bepaid_order_id: str,
    status: str,
    bepaid_transaction_id: Optional[str] = None,
    bepaid_uid: Optional[str] = None,
    payload_json: Optional[dict] = None,
    failure_reason: Optional[str] = None,
) -> Optional[str]:
    """Обновляет статус платежа по order_id. Возвращает user_id."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            UPDATE payments
            SET status = $2,
                bepaid_transaction_id = COALESCE($3, bepaid_transaction_id),
                bepaid_uid = COALESCE($4, bepaid_uid),
                payload_json = COALESCE($5::jsonb, payload_json),
                failure_reason = COALESCE($6, failure_reason)
            WHERE bepaid_order_id = $1
            RETURNING user_id::text
            """,
            bepaid_order_id, status, bepaid_transaction_id, bepaid_uid,
            json.dumps(payload_json, ensure_ascii=False) if payload_json else None,
            failure_reason,
        )
        return row["user_id"] if row else None


async def get_user_payments(user_id: str, limit: int = 20) -> List[dict]:
    """Возвращает историю платежей пользователя."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT id::text, amount_usd, amount_byn, status,
                   bepaid_transaction_id, bepaid_order_id, created_at, failure_reason
            FROM payments
            WHERE user_id = $1::uuid
            ORDER BY created_at DESC
            LIMIT $2
            """,
            user_id, limit,
        )
        return [dict(r) for r in rows]


# ── Team Members CRUD ─────────────────────────────────────────────────

async def get_team_members(owner_id: str) -> List[dict]:
    """Возвращает список участников команды для владельца FIRM."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT id::text, member_id::text, invite_email, status, invited_at, accepted_at
            FROM team_members
            WHERE owner_id = $1::uuid AND status != 'removed'
            ORDER BY created_at ASC
            """,
            owner_id,
        )
        return [dict(r) for r in rows]


async def count_active_team_members(owner_id: str) -> int:
    """Считает активных + pending участников команды."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT COUNT(*) as cnt FROM team_members WHERE owner_id = $1::uuid AND status != 'removed'",
            owner_id,
        )
        return row["cnt"]


async def invite_team_member(owner_id: str, invite_email: str, invite_token: str) -> str:
    """Создаёт приглашение в команду. Возвращает UUID записи."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO team_members (owner_id, invite_email, invite_token)
            VALUES ($1::uuid, $2, $3)
            ON CONFLICT (owner_id, invite_email) DO UPDATE
            SET invite_token = EXCLUDED.invite_token,
                status = 'pending',
                invited_at = NOW()
            RETURNING id::text
            """,
            owner_id, invite_email, invite_token,
        )
        return row["id"]


async def accept_team_invite(invite_token: str, member_id: str) -> Optional[str]:
    """Принимает приглашение. Возвращает owner_id."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            UPDATE team_members
            SET status = 'active', member_id = $2::uuid, accepted_at = NOW()
            WHERE invite_token = $1 AND status = 'pending'
            RETURNING owner_id::text
            """,
            invite_token, member_id,
        )
        return row["owner_id"] if row else None


async def remove_team_member(owner_id: str, member_id: str) -> bool:
    """Удаляет участника из команды."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        result = await conn.execute(
            """
            UPDATE team_members
            SET status = 'removed'
            WHERE owner_id = $1::uuid AND (member_id = $2::uuid OR invite_email = $2)
            """,
            owner_id, member_id,
        )
        return result.split()[-1] != "0"


# ── Law chunks CRUD ───────────────────────────────────────────────────

async def insert_law_chunk(
    document_name: str,
    article_number: Optional[str],
    article_title: Optional[str],
    text: str,
    url: Optional[str],
    embedding: List[float],
):
    """Сохраняет одну статью/норму РБ с эмбеддингом."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO law_chunks
                (document_name, article_number, article_title, text, url, embedding)
            VALUES ($1, $2, $3, $4, $5, $6::vector)
            """,
            document_name, article_number, article_title, text, url, str(embedding),
        )


async def search_similar_laws(query_embedding: List[float], top_k: int = 10) -> List[dict]:
    """Семантический поиск по правовой базе РБ."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT document_name, article_number, article_title, text, url,
                   1 - (embedding <=> $1::vector) AS similarity
            FROM law_chunks
            ORDER BY embedding <=> $1::vector
            LIMIT $2
            """,
            str(query_embedding), top_k,
        )
        return [dict(row) for row in rows]


async def count_law_chunks() -> int:
    """Количество загруженных норм."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT COUNT(*) as cnt FROM law_chunks")
        return row["cnt"]
