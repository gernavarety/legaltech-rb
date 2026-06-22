"""
Pydantic модели для запросов/ответов API и Celery задач.
"""
from pydantic import BaseModel, UUID4
from typing import Optional, List, Any
from datetime import datetime
from enum import Enum


class TaskStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    DONE = "done"
    ERROR = "error"


class RiskLevel(str, Enum):
    HIGH = "высокий"
    MEDIUM = "средний"
    LOW = "низкий"


class OverallRisk(str, Enum):
    HIGH = "высокий"
    MEDIUM = "средний"
    LOW = "низкий"


# --- Структуры ответа Claude ---

class RiskItem(BaseModel):
    level: str
    clause: str
    issue: str
    law_reference: str
    recommendation: str


class AnalysisResult(BaseModel):
    contract_type: str
    overall_risk: str
    summary: str
    risks: List[RiskItem]
    missing_clauses: List[str]
    needs_lawyer: bool


# --- API модели ---

class UploadResponse(BaseModel):
    task_id: str
    status: str = "processing"
    message: str = "Файл принят в обработку"


class TaskStatusResponse(BaseModel):
    task_id: str
    status: str
    filename: Optional[str] = None
    contract_type: Optional[str] = None
    overall_risk: Optional[str] = None
    result: Optional[AnalysisResult] = None
    download_url: Optional[str] = None
    error_message: Optional[str] = None
    created_at: Optional[datetime] = None


class HealthResponse(BaseModel):
    status: str = "ok"
    version: str = "1.0.0"
    service: str = "LegalTech RB API"


# --- DB модели (для записи в PostgreSQL) ---

class DocumentRecord(BaseModel):
    id: str
    filename: str
    file_url: str
    status: str
    contract_type: Optional[str] = None
    overall_risk: Optional[str] = None
    result_json: Optional[Any] = None
    report_url: Optional[str] = None
    error_text: Optional[str] = None
    created_at: Optional[datetime] = None


class LawChunk(BaseModel):
    document_name: str
    article_number: Optional[str] = None
    article_title: Optional[str] = None
    text: str
    url: Optional[str] = None
