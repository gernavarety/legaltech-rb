"""
FastAPI приложение — точка входа (продакшн режим с Celery + R2 + PostgreSQL).
Для локальной разработки используй main_local.py
"""
import sys
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, File, UploadFile, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from loguru import logger

import database
import storage
from auth import CurrentUser, get_current_user
from config import get_settings
from dependencies import UserPlan, get_user_plan, check_upload_limit, require_plan
from models import UploadResponse, TaskStatusResponse, HealthResponse, AnalysisResult
from payments import get_bepaid_client
from routers import (
    plans_router,
    subscriptions_router,
    webhooks_router,
    usage_router,
    team_router,
)
from tasks import celery_app, process_contract

settings = get_settings()

logger.remove()
logger.add(
    sys.stdout,
    format="{time:YYYY-MM-DD HH:mm:ss} | {level} | {name}:{function}:{line} | {message}",
    level="INFO",
    colorize=True,
)
logger.add(
    "logs/app.log",
    rotation="10 MB",
    retention="7 days",
    level="DEBUG",
    encoding="utf-8",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Инициализация при старте, очистка при остановке."""
    logger.info("Запуск LexAI.by API (продакшн режим)...")
    try:
        await database.init_db()
        law_count = await database.count_law_chunks()
        logger.info(f"Правовая база: {law_count} норм загружено")
    except Exception as e:
        logger.error(f"Ошибка инициализации БД: {e}")
    yield
    await database.close_pool()
    logger.info("API остановлен")


app = FastAPI(
    title="LexAI.by API",
    description="AI-анализ договоров по законодательству Республики Беларусь",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Роутеры ──────────────────────────────────────────────────────────
app.include_router(plans_router)
app.include_router(subscriptions_router)
app.include_router(webhooks_router)
app.include_router(usage_router)
app.include_router(team_router)


# ── Системные эндпоинты ───────────────────────────────────────────────

@app.get("/api/health", response_model=HealthResponse, tags=["System"])
async def health_check():
    """Healthcheck — используется Docker и балансировщиком нагрузки."""
    return HealthResponse()


# ── Документы ─────────────────────────────────────────────────────────

@app.post("/api/upload", response_model=UploadResponse, tags=["Documents"])
async def upload_contract(
    file: UploadFile = File(...),
    user_plan: UserPlan = Depends(check_upload_limit),  # проверяет лимит и инкрементирует счётчик
):
    """
    Принимает PDF или DOCX файл договора.
    Требует авторизации. Проверяет лимит по тарифу.
    Загружает в R2, создаёт запись в БД, запускает Celery задачу.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Имя файла обязательно")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ("pdf", "docx", "doc"):
        raise HTTPException(
            status_code=400,
            detail=f"Неподдерживаемый формат '{ext}'. Разрешены: PDF, DOCX",
        )

    file_bytes = await file.read()

    # Проверяем размер по тарифу
    max_bytes = user_plan.max_file_mb * 1024 * 1024
    if len(file_bytes) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"Файл слишком большой. На тарифе {user_plan.plan_name.upper()} — максимум {user_plan.max_file_mb} МБ",
        )

    if len(file_bytes) < 100:
        raise HTTPException(status_code=400, detail="Файл пустой или повреждён")

    content_type_map = {
        "pdf": "application/pdf",
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "doc": "application/msword",
    }
    content_type = content_type_map.get(ext, "application/octet-stream")

    try:
        file_key = storage.upload_file(
            file_bytes=file_bytes,
            original_filename=file.filename,
            content_type=content_type,
            folder="contracts",
        )

        task_id = await database.create_document(
            filename=file.filename,
            file_url=file_key,
            user_id=user_plan.user.user_id,
        )

        # FIRM тариф — приоритетная очередь
        queue = "priority" if user_plan.has_priority_queue else "celery"
        process_contract.apply_async(
            args=[task_id, file_key, file.filename],
            task_id=task_id,
            queue=queue,
        )

        logger.info(f"Задача создана: {task_id} | {file.filename} | user={user_plan.user.user_id} | queue={queue}")
        return UploadResponse(task_id=task_id)

    except Exception as e:
        logger.error(f"Ошибка при загрузке файла: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка сервера: {str(e)}")


@app.get("/api/task/{task_id}", response_model=TaskStatusResponse, tags=["Documents"])
async def get_task_status(
    task_id: str,
    user: CurrentUser = Depends(get_current_user),
):
    """Возвращает статус задачи. Требует авторизации."""
    doc = await database.get_document(task_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Задача не найдена")

    # Проверяем что документ принадлежит пользователю
    if doc.get("user_id") and doc["user_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Доступ запрещён")

    response = TaskStatusResponse(
        task_id=task_id,
        status=doc["status"],
        filename=doc["filename"],
        contract_type=doc.get("contract_type"),
        overall_risk=doc.get("overall_risk"),
        created_at=doc.get("created_at"),
    )

    if doc["status"] == "done":
        if doc.get("result_json"):
            response.result = AnalysisResult(**doc["result_json"])
        if doc.get("report_url"):
            response.download_url = f"/api/download/{task_id}"

    elif doc["status"] == "error":
        response.error_message = doc.get("error_text", "Неизвестная ошибка")

    return response


@app.get("/api/download/{task_id}", tags=["Documents"])
async def download_report(
    task_id: str,
    user_plan: UserPlan = Depends(require_plan("solo", "firm")),
):
    """
    Скачивает DOCX-отчёт. Только SOLO и FIRM.
    """
    doc = await database.get_document(task_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Задача не найдена")

    if doc.get("user_id") and doc["user_id"] != user_plan.user.user_id:
        raise HTTPException(status_code=403, detail="Доступ запрещён")

    if doc["status"] != "done":
        raise HTTPException(
            status_code=400,
            detail=f"Отчёт ещё не готов. Статус: {doc['status']}",
        )

    report_key = doc.get("report_url")
    if not report_key:
        raise HTTPException(status_code=404, detail="Файл отчёта не найден")

    try:
        report_bytes = storage.download_file(report_key)
    except Exception as e:
        logger.error(f"Ошибка скачивания отчёта {task_id}: {e}")
        raise HTTPException(status_code=500, detail="Ошибка получения файла")

    original_name = doc["filename"].rsplit(".", 1)[0]
    download_name = f"report_{original_name}.docx"

    import io
    return StreamingResponse(
        io.BytesIO(report_bytes),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={
            "Content-Disposition": f'attachment; filename="{download_name}"',
            "Content-Length": str(len(report_bytes)),
        },
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
