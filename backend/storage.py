"""
Работа с Cloudflare R2 (S3-совместимое хранилище).
Загрузка и скачивание файлов договоров и готовых DOCX-отчётов.
"""
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
import uuid
from typing import Optional
from loguru import logger
from config import get_settings

settings = get_settings()


def _get_client():
    """Создаёт S3-совместимый клиент для Cloudflare R2."""
    return boto3.client(
        "s3",
        endpoint_url=settings.r2_endpoint,
        aws_access_key_id=settings.r2_access_key_id,
        aws_secret_access_key=settings.r2_secret_access_key,
        config=Config(signature_version="s3v4"),
        region_name="auto",
    )


def upload_file(
    file_bytes: bytes,
    original_filename: str,
    content_type: str,
    folder: str = "contracts",
) -> str:
    """
    Загружает файл в R2.
    Возвращает ключ объекта (путь внутри бакета).
    """
    client = _get_client()
    ext = original_filename.rsplit(".", 1)[-1].lower()
    key = f"{folder}/{uuid.uuid4()}.{ext}"

    client.put_object(
        Bucket=settings.r2_bucket_name,
        Key=key,
        Body=file_bytes,
        ContentType=content_type,
    )
    logger.info(f"Файл загружен в R2: {key}")
    return key


def download_file(key: str) -> bytes:
    """Скачивает файл из R2 по ключу, возвращает байты."""
    client = _get_client()
    response = client.get_object(Bucket=settings.r2_bucket_name, Key=key)
    data = response["Body"].read()
    logger.info(f"Файл скачан из R2: {key} ({len(data)} байт)")
    return data


def upload_report(report_bytes: bytes, task_id: str) -> str:
    """
    Загружает готовый DOCX-отчёт в R2.
    Возвращает ключ объекта.
    """
    client = _get_client()
    key = f"reports/{task_id}/report.docx"
    client.put_object(
        Bucket=settings.r2_bucket_name,
        Key=key,
        Body=report_bytes,
        ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )
    logger.info(f"Отчёт загружен в R2: {key}")
    return key


def get_presigned_url(key: str, expires_in: int = 3600) -> str:
    """
    Генерирует подписанную ссылку для скачивания файла.
    По умолчанию действует 1 час.
    """
    client = _get_client()
    url = client.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.r2_bucket_name, "Key": key},
        ExpiresIn=expires_in,
    )
    return url


def file_exists(key: str) -> bool:
    """Проверяет существование объекта в R2."""
    client = _get_client()
    try:
        client.head_object(Bucket=settings.r2_bucket_name, Key=key)
        return True
    except ClientError:
        return False
