"""
Работа с PostgreSQL/pgvector через asyncpg.
Все операции с базой данных: создание таблиц, CRUD для documents и law_chunks.
"""
import asyncpg
import json
from typing import Optional, List, Tuple, Any
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
        # Включаем расширение pgvector
        await conn.execute("CREATE EXTENSION IF NOT EXISTS vector;")

        # Таблица загруженных договоров
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                created_at TIMESTAMPTZ DEFAULT NOW(),
                filename TEXT NOT NULL,
                file_url TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                contract_type TEXT,
                overall_risk TEXT,
                result_json JSONB,
                report_url TEXT,
                error_text TEXT
            );
        """)

        # Таблица правовых норм РБ
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS law_chunks (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                document_name TEXT NOT NULL,
                article_number TEXT,
                article_title TEXT,
                text TEXT NOT NULL,
                url TEXT,
                embedding vector(1536)
            );
        """)

        # Индекс для быстрого семантического поиска
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS law_chunks_embedding_idx
            ON law_chunks USING ivfflat (embedding vector_cosine_ops)
            WITH (lists = 100);
        """)

    logger.info("База данных инициализирована")


# --- CRUD для documents ---

async def create_document(filename: str, file_url: str) -> str:
    """Создаёт запись о документе, возвращает UUID."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO documents (filename, file_url, status)
            VALUES ($1, $2, 'pending')
            RETURNING id::text
            """,
            filename,
            file_url,
        )
        doc_id = row["id"]
        logger.info(f"Создан документ {doc_id} ({filename})")
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
            doc_id,
            status,
            contract_type,
            overall_risk,
            json.dumps(result_json, ensure_ascii=False) if result_json else None,
            report_url,
            error_text,
        )
        logger.info(f"Документ {doc_id} обновлён: статус={status}")


async def get_document(doc_id: str) -> Optional[dict]:
    """Возвращает запись документа по ID."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT id::text, filename, file_url, status,
                   contract_type, overall_risk,
                   result_json::text as result_json_text,
                   report_url, error_text, created_at
            FROM documents
            WHERE id = $1::uuid
            """,
            doc_id,
        )
        if not row:
            return None
        data = dict(row)
        # Десериализуем JSONB обратно
        if data.get("result_json_text"):
            data["result_json"] = json.loads(data["result_json_text"])
        else:
            data["result_json"] = None
        del data["result_json_text"]
        return data


# --- CRUD для law_chunks ---

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
            document_name,
            article_number,
            article_title,
            text,
            url,
            str(embedding),  # pgvector принимает строку '[0.1, 0.2, ...]'
        )


async def search_similar_laws(
    query_embedding: List[float],
    top_k: int = 10,
) -> List[dict]:
    """
    Семантический поиск по правовой базе РБ.
    Возвращает top_k наиболее релевантных норм.
    """
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT
                document_name,
                article_number,
                article_title,
                text,
                url,
                1 - (embedding <=> $1::vector) AS similarity
            FROM law_chunks
            ORDER BY embedding <=> $1::vector
            LIMIT $2
            """,
            str(query_embedding),
            top_k,
        )
        return [dict(row) for row in rows]


async def count_law_chunks() -> int:
    """Возвращает количество загруженных норм в базе."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT COUNT(*) as cnt FROM law_chunks")
        return row["cnt"]
