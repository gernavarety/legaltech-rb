"""
Celery задача генерации юридических документов.

Пайплайн:
1. Загрузить данные запроса из БД
2. Получить fields_schema шаблона
3. Найти релевантные нормы РБ из pgvector
4. Сформировать промпт и вызвать Claude API
5. Конвертировать текст в DOCX (python-docx)
6. Конвертировать DOCX в PDF (LibreOffice headless)
7. Загрузить оба файла в Cloudflare R2
8. Обновить статус и URL-ы в generated_documents
"""

import asyncio
import logging
import os
import tempfile
from typing import Any

import asyncpg

from celery_app import celery_app  # переиспользуем существующий экземпляр
from config import settings
from database import get_db_connection
from generation_prompts import build_generation_prompt
from providers.factory import get_llm_provider
from storage import upload_file_to_r2
from templates_data import TEMPLATES_BY_SLUG
from utils.docx_builder import build_docx_from_text
from utils.pdf_converter import docx_to_pdf

logger = logging.getLogger(__name__)

PREVIEW_LENGTH = 800  # символов для бесплатного предпросмотра


async def _fetch_law_chunks(conn: asyncpg.Connection, query: str) -> list[str]:
    """Поиск релевантных норм РБ в pgvector по смысловому сходству."""
    try:
        provider_name = settings.embedding_provider
        from providers.factory import get_embedding_provider
        emb_provider = get_embedding_provider()
        query_embedding = await emb_provider.embed(query)
        embedding_str = "[" + ",".join(str(x) for x in query_embedding) + "]"

        rows = await conn.fetch(
            """
            SELECT text, article_number, document_name
            FROM law_chunks
            ORDER BY embedding <=> $1::vector
            LIMIT 5
            """,
            embedding_str,
        )
        return [
            f"{row['document_name']}, {row['article_number']}:\n{row['text']}"
            for row in rows
        ]
    except Exception as exc:
        logger.warning("Не удалось получить нормы из pgvector: %s", exc)
        return []


async def _run_generation(task_id: str) -> None:
    """Основная логика генерации (async, вызывается из sync-задачи)."""
    conn = await get_db_connection()
    try:
        # 1. Загружаем запись из БД
        row = await conn.fetchrow(
            """
            SELECT gd.id, gd.user_id, gd.template_slug, gd.input_data,
                   dt.name AS template_name, dt.fields_schema
            FROM generated_documents gd
            JOIN document_templates dt ON dt.id = gd.template_id
            WHERE gd.id = $1
            """,
            task_id,
        )
        if not row:
            logger.error("Запись generated_documents не найдена: %s", task_id)
            return

        template_slug: str = row["template_slug"]
        input_data: dict = dict(row["input_data"])
        template_name: str = row["template_name"]
        fields_schema: dict = dict(row["fields_schema"])

        # Статус → processing
        await conn.execute(
            "UPDATE generated_documents SET status = 'processing' WHERE id = $1",
            task_id,
        )

        # 2. Получить нормы РБ из pgvector
        law_chunks = await _fetch_law_chunks(conn, template_name)

        # 3. Строим промпт
        prompt = build_generation_prompt(
            document_type=template_name,
            input_data=input_data,
            fields_schema=fields_schema,
            law_chunks=law_chunks,
        )

        # 4. Вызываем Claude / Groq
        llm = get_llm_provider()
        response = await llm.generate(
            prompt=prompt,
            max_tokens=4000,
            temperature=0.3,  # низкая температура для точных юридических текстов
        )
        generated_text: str = response.get("text", "")
        tokens_used: int = response.get("tokens_used", 0)

        if not generated_text.strip():
            raise ValueError("LLM вернул пустой ответ")

        # 5. Создаём DOCX
        docx_path = build_docx_from_text(generated_text, template_name)

        # 6. Конвертируем в PDF (необязательно — только если LibreOffice доступен)
        pdf_path = docx_to_pdf(docx_path)

        # 7. Загружаем файлы в R2
        docx_r2_key = f"generated/{row['user_id']}/{task_id}.docx"
        pdf_r2_key = f"generated/{row['user_id']}/{task_id}.pdf" if pdf_path else None

        with open(docx_path, "rb") as f:
            await upload_file_to_r2(
                file_content=f.read(),
                key=docx_r2_key,
                content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )

        if pdf_path and pdf_r2_key:
            with open(pdf_path, "rb") as f:
                await upload_file_to_r2(
                    file_content=f.read(),
                    key=pdf_r2_key,
                    content_type="application/pdf",
                )

        # 8. Удаляем временные файлы
        try:
            os.unlink(docx_path)
        except Exception:
            pass
        if pdf_path:
            try:
                os.unlink(pdf_path)
                os.rmdir(os.path.dirname(pdf_path))
            except Exception:
                pass

        # 9. Сохраняем результат в БД
        preview_text = generated_text[:PREVIEW_LENGTH]

        await conn.execute(
            """
            UPDATE generated_documents
            SET status = 'done',
                result_docx_url = $2,
                result_pdf_url  = $3,
                preview_text    = $4,
                claude_prompt   = $5,
                claude_response = $6,
                tokens_used     = $7
            WHERE id = $1
            """,
            task_id,
            docx_r2_key,
            pdf_r2_key,
            preview_text,
            prompt[:10000],        # ограничиваем размер для хранения
            generated_text[:20000],
            tokens_used,
        )

        logger.info(
            "Документ сгенерирован успешно: task_id=%s template=%s tokens=%d",
            task_id, template_slug, tokens_used
        )

    except Exception as exc:
        logger.exception("Ошибка генерации документа task_id=%s: %s", task_id, exc)
        try:
            await conn.execute(
                """
                UPDATE generated_documents
                SET status = 'error', error_text = $2
                WHERE id = $1
                """,
                task_id,
                str(exc)[:1000],
            )
        except Exception:
            pass
    finally:
        await conn.close()


@celery_app.task(name="generate_document", bind=True, max_retries=2)
def generate_document_task(self, task_id: str) -> None:
    """
    Celery задача: генерация юридического документа.
    Запускает async-логику через asyncio.run().
    """
    try:
        asyncio.run(_run_generation(task_id))
    except Exception as exc:
        logger.exception("Celery задача упала: task_id=%s", task_id)
        raise self.retry(exc=exc, countdown=30)
