"""
Роутер генератора юридических документов.

Эндпоинты:
  GET  /api/templates               — список всех шаблонов
  GET  /api/templates/{slug}        — fields_schema конкретного шаблона
  POST /api/generate                — запуск генерации (Celery)
  GET  /api/generate/history        — история генераций пользователя
  GET  /api/generate/{task_id}      — статус генерации
  GET  /api/generate/{task_id}/preview  — первые 800 символов (Free доступно)
  GET  /api/generate/{task_id}/download — скачать DOCX/PDF
"""

from datetime import datetime, timezone
from typing import Annotated, Optional
from uuid import uuid4

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from auth import CurrentUser, get_current_user
from database import get_db_connection
from dependencies import UserPlan, get_user_plan
from generation_task import generate_document_task
from storage import get_presigned_download_url
from templates_data import GROUPS, TEMPLATES, TEMPLATES_BY_SLUG

router = APIRouter(prefix="/api", tags=["generate"])


# ─────────────────────────────────────────────────────────
# Pydantic модели
# ─────────────────────────────────────────────────────────

class TemplateResponse(BaseModel):
    slug: str
    name: str
    group_name: str
    description: str | None
    law_references: list[str]
    available_plans: list[str]


class TemplateDetailResponse(TemplateResponse):
    fields_schema: dict


class GenerateRequest(BaseModel):
    template_slug: str
    input_data: dict


class GenerateResponse(BaseModel):
    task_id: str
    status: str
    message: str


class GenerationStatusResponse(BaseModel):
    task_id: str
    status: str
    template_name: str | None
    created_at: str | None
    download_url_docx: str | None
    download_url_pdf: str | None
    preview_text: str | None
    error_text: str | None


class HistoryItem(BaseModel):
    id: str
    template_slug: str
    template_name: str | None
    status: str
    created_at: str
    has_docx: bool
    has_pdf: bool


class HistoryResponse(BaseModel):
    items: list[HistoryItem]
    total: int
    page: int
    limit: int


# ─────────────────────────────────────────────────────────
# Лимиты генерации
# ─────────────────────────────────────────────────────────

async def check_generation_limit(
    user: CurrentUser = Depends(get_current_user),
    user_plan: UserPlan = Depends(get_user_plan),
) -> UserPlan:
    """Проверяет лимит генераций и инкрементирует счётчик."""
    if getattr(user_plan, "generations_per_month", None) is None:
        # FIRM — безлимит, просто инкрементируем для статистики
        await _increment_generation_usage(user.user_id, user_plan)
        return user_plan

    conn = await get_db_connection()
    try:
        now = datetime.now(timezone.utc)
        period_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        row = await conn.fetchrow(
            "SELECT generations_used FROM generation_usage WHERE user_id = $1 AND period_start = $2",
            user.user_id, period_start,
        )
        used = row["generations_used"] if row else 0
        limit = getattr(user_plan, "generations_per_month", 3) or 3

        if used >= limit:
            raise HTTPException(
                status_code=403,
                detail={
                    "code": "generation_limit_reached",
                    "message": f"Исчерпан лимит генераций на этот месяц ({limit} шт.).",
                    "used": used,
                    "limit": limit,
                    "upgrade_url": "/pricing",
                },
            )

        # Атомарный UPSERT счётчика
        await conn.execute(
            """
            INSERT INTO generation_usage (user_id, period_start, period_end, generations_used)
            VALUES ($1, $2, $2 + interval '1 month', 1)
            ON CONFLICT (user_id, period_start)
            DO UPDATE SET generations_used = generation_usage.generations_used + 1,
                          updated_at = NOW()
            """,
            user.user_id, period_start,
        )
    finally:
        await conn.close()

    return user_plan


async def _increment_generation_usage(user_id: str, user_plan: UserPlan) -> None:
    """Только инкремент без проверки лимита (для FIRM тарифа)."""
    try:
        conn = await get_db_connection()
        now = datetime.now(timezone.utc)
        period_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        await conn.execute(
            """
            INSERT INTO generation_usage (user_id, period_start, period_end, generations_used)
            VALUES ($1, $2, $2 + interval '1 month', 1)
            ON CONFLICT (user_id, period_start)
            DO UPDATE SET generations_used = generation_usage.generations_used + 1,
                          updated_at = NOW()
            """,
            user_id, period_start,
        )
        await conn.close()
    except Exception:
        pass


# ─────────────────────────────────────────────────────────
# Эндпоинты шаблонов
# ─────────────────────────────────────────────────────────

@router.get("/templates", response_model=list[TemplateResponse])
async def list_templates(group: Optional[str] = Query(None, description="Фильтр по группе")):
    """Список всех активных шаблонов из памяти (без БД)."""
    templates = TEMPLATES
    if group:
        templates = [t for t in templates if t["group_name"] == group]
    return [
        TemplateResponse(
            slug=t["slug"],
            name=t["name"],
            group_name=t["group_name"],
            description=t.get("description"),
            law_references=t.get("law_references", []),
            available_plans=t.get("available_plans", ["free", "solo", "firm"]),
        )
        for t in templates
    ]


@router.get("/templates/groups")
async def list_template_groups() -> list[str]:
    """Список групп шаблонов для фильтра."""
    return GROUPS


@router.get("/templates/{slug}", response_model=TemplateDetailResponse)
async def get_template(slug: str):
    """Полная информация о шаблоне включая fields_schema для рендеринга формы."""
    tmpl = TEMPLATES_BY_SLUG.get(slug)
    if not tmpl:
        raise HTTPException(status_code=404, detail=f"Шаблон '{slug}' не найден")
    return TemplateDetailResponse(
        slug=tmpl["slug"],
        name=tmpl["name"],
        group_name=tmpl["group_name"],
        description=tmpl.get("description"),
        law_references=tmpl.get("law_references", []),
        available_plans=tmpl.get("available_plans", ["free", "solo", "firm"]),
        fields_schema=tmpl["fields_schema"],
    )


# ─────────────────────────────────────────────────────────
# Генерация
# ─────────────────────────────────────────────────────────

@router.post("/generate", response_model=GenerateResponse)
async def start_generation(
    body: GenerateRequest,
    user: CurrentUser = Depends(get_current_user),
    user_plan: UserPlan = Depends(check_generation_limit),
):
    """
    Запускает генерацию документа.
    Проверяет лимит тарифа, создаёт запись в БД, ставит задачу в Celery.
    """
    # Проверяем что шаблон существует
    tmpl = TEMPLATES_BY_SLUG.get(body.template_slug)
    if not tmpl:
        raise HTTPException(status_code=404, detail=f"Шаблон '{body.template_slug}' не найден")

    # Проверяем доступ тарифа к шаблону
    plan_name = getattr(user_plan, "plan_name", "free")
    if plan_name not in tmpl.get("available_plans", ["free", "solo", "firm"]):
        raise HTTPException(
            status_code=403,
            detail={
                "code": "plan_required",
                "message": f"Шаблон «{tmpl['name']}» доступен на тарифах: {', '.join(tmpl['available_plans'])}",
                "upgrade_url": "/pricing",
            },
        )

    conn = await get_db_connection()
    try:
        task_id = str(uuid4())

        # Получаем UUID шаблона из БД (или создаём в памяти)
        template_db = await conn.fetchrow(
            "SELECT id FROM document_templates WHERE slug = $1",
            body.template_slug,
        )
        if not template_db:
            raise HTTPException(
                status_code=500,
                detail="Шаблон не найден в БД. Запустите seed_templates.py",
            )

        # Создаём запись генерации
        await conn.execute(
            """
            INSERT INTO generated_documents
                (id, user_id, template_id, template_slug, input_data, status)
            VALUES ($1, $2, $3, $4, $5, 'pending')
            """,
            task_id,
            user.user_id,
            template_db["id"],
            body.template_slug,
            body.input_data,
        )
    finally:
        await conn.close()

    # Ставим задачу в Celery (приоритет для FIRM)
    queue_name = "priority" if plan_name == "firm" else "celery"
    generate_document_task.apply_async(
        args=[task_id],
        queue=queue_name,
    )

    return GenerateResponse(
        task_id=task_id,
        status="pending",
        message=f"Генерация документа «{tmpl['name']}» запущена. Обычно занимает 30–60 секунд.",
    )


# ─────────────────────────────────────────────────────────
# Статус и результат
# ─────────────────────────────────────────────────────────

@router.get("/generate/history", response_model=HistoryResponse)
async def generation_history(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    template_slug: Optional[str] = Query(None),
    user: CurrentUser = Depends(get_current_user),
    user_plan: UserPlan = Depends(get_user_plan),
):
    """История генераций пользователя с пагинацией."""
    if not getattr(user_plan, "has_history", False):
        raise HTTPException(
            status_code=403,
            detail={
                "code": "plan_required",
                "message": "История генераций доступна на тарифах Solo и Firm.",
                "upgrade_url": "/pricing",
            },
        )

    offset = (page - 1) * limit
    conn = await get_db_connection()
    try:
        conditions = ["user_id = $1"]
        params: list = [user.user_id]

        if template_slug:
            params.append(template_slug)
            conditions.append(f"template_slug = ${len(params)}")

        where = " AND ".join(conditions)

        total = await conn.fetchval(
            f"SELECT COUNT(*) FROM generated_documents WHERE {where}",
            *params,
        )

        params.extend([limit, offset])
        rows = await conn.fetch(
            f"""
            SELECT gd.id, gd.template_slug, gd.status,
                   gd.created_at, gd.result_docx_url, gd.result_pdf_url,
                   dt.name AS template_name
            FROM generated_documents gd
            LEFT JOIN document_templates dt ON dt.slug = gd.template_slug
            WHERE {where}
            ORDER BY gd.created_at DESC
            LIMIT ${len(params) - 1} OFFSET ${len(params)}
            """,
            *params,
        )

        items = [
            HistoryItem(
                id=str(row["id"]),
                template_slug=row["template_slug"],
                template_name=row["template_name"],
                status=row["status"],
                created_at=row["created_at"].isoformat(),
                has_docx=bool(row["result_docx_url"]),
                has_pdf=bool(row["result_pdf_url"]),
            )
            for row in rows
        ]
        return HistoryResponse(items=items, total=total, page=page, limit=limit)
    finally:
        await conn.close()


@router.get("/generate/{task_id}", response_model=GenerationStatusResponse)
async def get_generation_status(
    task_id: str,
    user: CurrentUser = Depends(get_current_user),
):
    """Статус генерации и ссылки для скачивания (если готово)."""
    conn = await get_db_connection()
    try:
        row = await conn.fetchrow(
            """
            SELECT gd.id, gd.status, gd.error_text, gd.preview_text,
                   gd.result_docx_url, gd.result_pdf_url, gd.created_at,
                   dt.name AS template_name
            FROM generated_documents gd
            LEFT JOIN document_templates dt ON dt.slug = gd.template_slug
            WHERE gd.id = $1 AND gd.user_id = $2
            """,
            task_id, user.user_id,
        )
    finally:
        await conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Генерация не найдена")

    docx_url = None
    pdf_url = None
    if row["status"] == "done":
        if row["result_docx_url"]:
            docx_url = await get_presigned_download_url(row["result_docx_url"])
        if row["result_pdf_url"]:
            pdf_url = await get_presigned_download_url(row["result_pdf_url"])

    return GenerationStatusResponse(
        task_id=str(row["id"]),
        status=row["status"],
        template_name=row["template_name"],
        created_at=row["created_at"].isoformat() if row["created_at"] else None,
        download_url_docx=docx_url,
        download_url_pdf=pdf_url,
        preview_text=row["preview_text"],
        error_text=row["error_text"],
    )


@router.get("/generate/{task_id}/preview")
async def get_generation_preview(
    task_id: str,
    user: CurrentUser = Depends(get_current_user),
):
    """Предпросмотр первых 800 символов документа. Доступно на Free тарифе."""
    conn = await get_db_connection()
    try:
        row = await conn.fetchrow(
            "SELECT status, preview_text FROM generated_documents WHERE id = $1 AND user_id = $2",
            task_id, user.user_id,
        )
    finally:
        await conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Генерация не найдена")
    if row["status"] != "done":
        raise HTTPException(status_code=400, detail="Документ ещё не готов")

    return {
        "task_id": task_id,
        "preview_text": row["preview_text"],
        "is_truncated": True,
        "full_length_hint": "Скачайте документ для полного текста",
    }


@router.get("/generate/{task_id}/download")
async def download_generation(
    task_id: str,
    format: str = Query("docx", pattern="^(docx|pdf)$"),
    user: CurrentUser = Depends(get_current_user),
    user_plan: UserPlan = Depends(get_user_plan),
):
    """
    Скачивание сгенерированного документа.
    DOCX — все тарифы, PDF — Solo и Firm.
    """
    if format == "pdf" and not getattr(user_plan, "has_pdf_download", False):
        raise HTTPException(
            status_code=403,
            detail={
                "code": "plan_required",
                "message": "Скачивание PDF доступно на тарифах Solo и Firm.",
                "upgrade_url": "/pricing",
            },
        )

    conn = await get_db_connection()
    try:
        row = await conn.fetchrow(
            """
            SELECT status, result_docx_url, result_pdf_url
            FROM generated_documents
            WHERE id = $1 AND user_id = $2
            """,
            task_id, user.user_id,
        )
    finally:
        await conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Генерация не найдена")
    if row["status"] != "done":
        raise HTTPException(status_code=400, detail="Документ ещё не готов")

    r2_key = row["result_pdf_url"] if format == "pdf" else row["result_docx_url"]
    if not r2_key:
        raise HTTPException(
            status_code=404,
            detail=f"Файл в формате {format.upper()} недоступен"
        )

    download_url = await get_presigned_download_url(r2_key)
    return {"download_url": download_url, "format": format}
