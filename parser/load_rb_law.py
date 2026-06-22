"""
Скрипт загрузки правовой базы Республики Беларусь в pgvector.

Парсит pravo.by и загружает статьи следующих НПА:
- Гражданский кодекс РБ
- Трудовой кодекс РБ
- Хозяйственный процессуальный кодекс РБ
- Закон об аренде
- Закон о хозяйственных обществах

Запуск:
    python load_rb_law.py
    python load_rb_law.py --dry-run    # только показать что будет загружено
    python load_rb_law.py --doc gk     # загрузить только ГК РБ
"""
import asyncio
import argparse
import re
import sys
import time
from typing import List, Optional, Tuple
from dataclasses import dataclass

import asyncpg
import httpx
import openai
from bs4 import BeautifulSoup
from loguru import logger

# Настройка логирования
logger.remove()
logger.add(
    sys.stdout,
    format="{time:HH:mm:ss} | {level} | {message}",
    colorize=True,
    level="INFO",
)
logger.add("parser.log", level="DEBUG", encoding="utf-8")

# --- Конфигурация ---
try:
    from dotenv import load_dotenv
    load_dotenv("../.env")
    load_dotenv(".env")
except ImportError:
    pass

import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/legaltech")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
EMBEDDING_MODEL = "text-embedding-3-small"

# Задержка между запросами к pravo.by (секунды)
REQUEST_DELAY = 1.5
REQUEST_TIMEOUT = 30


@dataclass
class LawDocument:
    """Описание НПА для парсинга."""
    key: str
    name: str
    url: str
    description: str


# Список НПА Республики Беларусь для загрузки
LAW_DOCUMENTS = [
    LawDocument(
        key="gk",
        name="Гражданский кодекс РБ",
        url="https://pravo.by/document/?guid=3871&p0=hk9800218",
        description="Основной документ гражданского права РБ",
    ),
    LawDocument(
        key="tk",
        name="Трудовой кодекс РБ",
        url="https://pravo.by/document/?guid=3871&p0=HK9900296",
        description="Трудовые отношения в РБ",
    ),
    LawDocument(
        key="hpk",
        name="Хозяйственный процессуальный кодекс РБ",
        url="https://pravo.by/document/?guid=3871&p0=Hk9800219",
        description="Процессуальные нормы хозяйственных споров",
    ),
    LawDocument(
        key="arenda",
        name="Закон РБ об аренде",
        url="https://pravo.by/document/?guid=3871&p0=V19002337",
        description="Аренда имущества в РБ",
    ),
    LawDocument(
        key="hozobshestva",
        name="Закон РБ о хозяйственных обществах",
        url="https://pravo.by/document/?guid=3871&p0=H10600056",
        description="Хозяйственные общества (ООО, ОАО и др.)",
    ),
]


@dataclass
class ArticleChunk:
    """Одна статья НПА."""
    document_name: str
    article_number: str
    article_title: str
    text: str
    url: str


# ─── Парсинг pravo.by ────────────────────────────────────────────────────────

def _make_headers() -> dict:
    return {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ru-RU,ru;q=0.9",
    }


def fetch_page(url: str, client: httpx.Client, retries: int = 3) -> Optional[str]:
    """Загружает HTML страницу с retry логикой."""
    for attempt in range(1, retries + 1):
        try:
            response = client.get(url, headers=_make_headers(), timeout=REQUEST_TIMEOUT)
            response.raise_for_status()
            return response.text
        except httpx.HTTPStatusError as e:
            logger.warning(f"HTTP ошибка {e.response.status_code} для {url} (попытка {attempt})")
        except httpx.RequestError as e:
            logger.warning(f"Ошибка запроса к {url} (попытка {attempt}): {e}")
        if attempt < retries:
            time.sleep(REQUEST_DELAY * attempt * 2)
    return None


def parse_articles_from_html(html: str, doc: LawDocument) -> List[ArticleChunk]:
    """
    Извлекает статьи из HTML страницы pravo.by.
    Ищет элементы с заголовками статей и их текстом.
    """
    soup = BeautifulSoup(html, "lxml")
    chunks = []

    # pravo.by размещает текст НПА в основном контенте страницы
    # Ищем блоки с текстом статей
    content_div = (
        soup.find("div", class_="doc-text") or
        soup.find("div", id="content") or
        soup.find("div", class_="content") or
        soup.find("div", class_="document-content") or
        soup.find("main") or
        soup.find("article")
    )

    if not content_div:
        # Запасной вариант: берём весь body
        content_div = soup.find("body")

    if not content_div:
        logger.warning(f"Контент не найден в HTML документа {doc.name}")
        return []

    # Получаем весь текст
    full_text = content_div.get_text(separator="\n", strip=True)

    # Разбиваем по статьям
    chunks = _split_by_articles(full_text, doc)

    if not chunks:
        # Если статьи не найдены — делаем чанки из общего текста
        logger.info(f"Статьи не распознаны для {doc.name}, делаем текстовые чанки")
        chunks = _split_by_paragraphs(full_text, doc)

    logger.info(f"{doc.name}: извлечено {len(chunks)} статей/фрагментов")
    return chunks


def _split_by_articles(text: str, doc: LawDocument) -> List[ArticleChunk]:
    """Разбивает текст по паттернам статей ('Статья N.', 'Артыкул N.')"""
    # Паттерны для статей в белорусском праве (русский и беларуский)
    article_pattern = re.compile(
        r"(?:^|\n)(Статья\s+(\d+[\d\.]*)\.\s*(.+?))\n",
        re.MULTILINE,
    )

    matches = list(article_pattern.finditer(text))
    if not matches:
        return []

    chunks = []
    for i, match in enumerate(matches):
        article_number = match.group(2)
        article_title = match.group(3).strip()

        # Текст статьи — до следующей статьи
        start = match.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        article_text = text[start:end].strip()

        # Пропускаем слишком короткие фрагменты
        if len(article_text) < 50:
            continue

        # Ограничиваем длину одной статьи (очень длинные статьи делим)
        if len(article_text) > 6000:
            sub_chunks = _split_long_article(article_text, article_number, article_title, doc)
            chunks.extend(sub_chunks)
        else:
            chunks.append(ArticleChunk(
                document_name=doc.name,
                article_number=f"Ст. {article_number}",
                article_title=article_title,
                text=article_text,
                url=doc.url,
            ))

    return chunks


def _split_long_article(
    text: str,
    article_number: str,
    article_title: str,
    doc: LawDocument,
    max_chars: int = 4000,
) -> List[ArticleChunk]:
    """Разбивает длинную статью на части по абзацам."""
    chunks = []
    paragraphs = text.split("\n")
    current = []
    current_len = 0
    part = 1

    for para in paragraphs:
        if current_len + len(para) > max_chars and current:
            chunks.append(ArticleChunk(
                document_name=doc.name,
                article_number=f"Ст. {article_number} (ч.{part})",
                article_title=article_title,
                text="\n".join(current),
                url=doc.url,
            ))
            current = [para]
            current_len = len(para)
            part += 1
        else:
            current.append(para)
            current_len += len(para)

    if current:
        chunks.append(ArticleChunk(
            document_name=doc.name,
            article_number=f"Ст. {article_number} (ч.{part})",
            article_title=article_title,
            text="\n".join(current),
            url=doc.url,
        ))

    return chunks


def _split_by_paragraphs(text: str, doc: LawDocument, max_chars: int = 3000) -> List[ArticleChunk]:
    """Запасной метод: делим текст на равные фрагменты."""
    chunks = []
    lines = text.split("\n")
    current_lines = []
    current_len = 0
    chunk_num = 1

    for line in lines:
        if current_len + len(line) > max_chars and current_lines:
            chunk_text = "\n".join(current_lines).strip()
            if chunk_text:
                chunks.append(ArticleChunk(
                    document_name=doc.name,
                    article_number=f"Фр. {chunk_num}",
                    article_title=doc.name,
                    text=chunk_text,
                    url=doc.url,
                ))
            current_lines = [line]
            current_len = len(line)
            chunk_num += 1
        else:
            current_lines.append(line)
            current_len += len(line)

    if current_lines:
        chunk_text = "\n".join(current_lines).strip()
        if chunk_text:
            chunks.append(ArticleChunk(
                document_name=doc.name,
                article_number=f"Фр. {chunk_num}",
                article_title=doc.name,
                text=chunk_text,
                url=doc.url,
            ))

    return chunks


def parse_document(doc: LawDocument, client: httpx.Client) -> List[ArticleChunk]:
    """Парсит один НПА с pravo.by."""
    logger.info(f"Парсинг: {doc.name} ({doc.url})")

    html = fetch_page(doc.url, client)
    if not html:
        logger.error(f"Не удалось загрузить страницу: {doc.url}")
        return []

    articles = parse_articles_from_html(html, doc)
    time.sleep(REQUEST_DELAY)
    return articles


# ─── Эмбеддинги ─────────────────────────────────────────────────────────────

def create_embeddings_batch(texts: List[str], batch_size: int = 50) -> List[List[float]]:
    """Создаёт эмбеддинги батчами через OpenAI API."""
    if not OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY не задан в .env")

    client = openai.OpenAI(api_key=OPENAI_API_KEY)
    all_embeddings = []

    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        # Ограничиваем длину текста (API лимит ~8192 токенов)
        batch = [t[:6000] for t in batch]

        for attempt in range(1, 4):
            try:
                response = client.embeddings.create(
                    model=EMBEDDING_MODEL,
                    input=batch,
                )
                embeddings = [item.embedding for item in response.data]
                all_embeddings.extend(embeddings)
                logger.info(f"Эмбеддинги: батч {i // batch_size + 1}, всего {len(all_embeddings)}")
                break
            except openai.RateLimitError:
                wait = 30 * attempt
                logger.warning(f"Rate limit OpenAI, ожидание {wait}с...")
                time.sleep(wait)
            except Exception as e:
                logger.error(f"Ошибка OpenAI embeddings: {e}")
                if attempt == 3:
                    raise
                time.sleep(10)

        time.sleep(0.5)  # Небольшая пауза между батчами

    return all_embeddings


# ─── Загрузка в PostgreSQL ───────────────────────────────────────────────────

async def init_database(pool: asyncpg.Pool):
    """Создаёт таблицы если не существуют."""
    async with pool.acquire() as conn:
        await conn.execute("CREATE EXTENSION IF NOT EXISTS vector;")
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
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS law_chunks_embedding_idx
            ON law_chunks USING ivfflat (embedding vector_cosine_ops)
            WITH (lists = 100);
        """)
    logger.info("Таблицы готовы")


async def clear_document_chunks(pool: asyncpg.Pool, document_name: str):
    """Удаляет старые чанки перед перезагрузкой документа."""
    async with pool.acquire() as conn:
        deleted = await conn.execute(
            "DELETE FROM law_chunks WHERE document_name = $1",
            document_name,
        )
        logger.info(f"Удалено старых записей для '{document_name}': {deleted}")


async def insert_chunks_bulk(
    pool: asyncpg.Pool,
    chunks: List[ArticleChunk],
    embeddings: List[List[float]],
):
    """Массовая вставка чанков с эмбеддингами."""
    async with pool.acquire() as conn:
        # Используем COPY для быстрой вставки
        await conn.executemany(
            """
            INSERT INTO law_chunks
                (document_name, article_number, article_title, text, url, embedding)
            VALUES ($1, $2, $3, $4, $5, $6::vector)
            """,
            [
                (
                    chunk.document_name,
                    chunk.article_number,
                    chunk.article_title,
                    chunk.text,
                    chunk.url,
                    str(emb),
                )
                for chunk, emb in zip(chunks, embeddings)
            ],
        )
    logger.info(f"Вставлено {len(chunks)} записей в law_chunks")


async def get_stats(pool: asyncpg.Pool) -> dict:
    """Статистика по загруженным документам."""
    async with pool.acquire() as conn:
        rows = await conn.fetch("""
            SELECT document_name, COUNT(*) as cnt
            FROM law_chunks
            GROUP BY document_name
            ORDER BY cnt DESC
        """)
        return {row["document_name"]: row["cnt"] for row in rows}


# ─── Основная логика ─────────────────────────────────────────────────────────

async def load_document(
    doc: LawDocument,
    pool: asyncpg.Pool,
    dry_run: bool = False,
):
    """Парсит и загружает один НПА в pgvector."""
    logger.info(f"{'[DRY RUN] ' if dry_run else ''}Загрузка: {doc.name}")

    # Парсим документ
    with httpx.Client(follow_redirects=True, timeout=REQUEST_TIMEOUT) as client:
        articles = parse_document(doc, client)

    if not articles:
        logger.error(f"Нет данных для {doc.name}")
        return

    logger.info(f"{doc.name}: {len(articles)} статей/фрагментов")

    if dry_run:
        for article in articles[:5]:
            logger.info(f"  {article.article_number}: {article.article_title[:60]}... ({len(article.text)} символов)")
        return

    # Создаём эмбеддинги
    texts = [f"{article.article_number} {article.article_title}\n{article.text}" for article in articles]
    logger.info(f"Создание эмбеддингов для {len(texts)} фрагментов...")
    embeddings = create_embeddings_batch(texts)

    # Удаляем старые данные и вставляем новые
    await clear_document_chunks(pool, doc.name)
    await insert_chunks_bulk(pool, articles, embeddings)
    logger.info(f"✓ {doc.name} загружен: {len(articles)} статей")


async def main():
    parser = argparse.ArgumentParser(
        description="Загрузка правовой базы РБ в pgvector"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Только показать что будет загружено, без записи в БД",
    )
    parser.add_argument(
        "--doc",
        choices=[d.key for d in LAW_DOCUMENTS] + ["all"],
        default="all",
        help="Конкретный документ для загрузки (по умолчанию все)",
    )
    args = parser.parse_args()

    # Подключаемся к БД
    logger.info(f"Подключение к БД: {DATABASE_URL[:50]}...")
    pool = await asyncpg.create_pool(dsn=DATABASE_URL, min_size=2, max_size=5)

    if not args.dry_run:
        await init_database(pool)

    # Выбираем документы для загрузки
    docs_to_load = (
        LAW_DOCUMENTS if args.doc == "all"
        else [d for d in LAW_DOCUMENTS if d.key == args.doc]
    )

    logger.info(f"Будет загружено документов: {len(docs_to_load)}")

    # Загружаем каждый документ
    success = 0
    for doc in docs_to_load:
        try:
            await load_document(doc, pool, dry_run=args.dry_run)
            success += 1
        except Exception as e:
            logger.error(f"Ошибка загрузки {doc.name}: {e}")

    # Итоговая статистика
    if not args.dry_run:
        stats = await get_stats(pool)
        logger.info("\n=== ИТОГИ ЗАГРУЗКИ ===")
        total = 0
        for doc_name, cnt in stats.items():
            logger.info(f"  {doc_name}: {cnt} норм")
            total += cnt
        logger.info(f"  ИТОГО: {total} норм в базе")

    await pool.close()
    logger.info(f"Готово. Успешно: {success}/{len(docs_to_load)}")


if __name__ == "__main__":
    asyncio.run(main())
