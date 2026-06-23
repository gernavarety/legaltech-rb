"""
Конвертация DOCX → PDF через LibreOffice headless.
В Docker-окружении используется /usr/bin/libreoffice.
Для локальной разработки без LibreOffice — возвращает None с предупреждением.
"""

import logging
import os
import subprocess
import tempfile
from pathlib import Path

logger = logging.getLogger(__name__)

# Возможные пути к LibreOffice в разных ОС
_LIBREOFFICE_PATHS = [
    "/usr/bin/libreoffice",
    "/usr/bin/soffice",
    "/usr/lib/libreoffice/program/soffice",
    "/opt/libreoffice/program/soffice",
    # macOS
    "/Applications/LibreOffice.app/Contents/MacOS/soffice",
]


def _find_libreoffice() -> str | None:
    """Возвращает путь к исполняемому файлу LibreOffice или None."""
    for path in _LIBREOFFICE_PATHS:
        if os.path.isfile(path) and os.access(path, os.X_OK):
            return path
    # Попробуем через PATH
    try:
        result = subprocess.run(
            ["which", "libreoffice"],
            capture_output=True, text=True, timeout=5
        )
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip()
    except Exception:
        pass
    return None


def docx_to_pdf(docx_path: str) -> str | None:
    """
    Конвертирует DOCX в PDF через LibreOffice headless.

    Args:
        docx_path: абсолютный путь к .docx файлу

    Returns:
        Путь к PDF файлу (во временной директории) или None при ошибке.

    Примечание:
        Файл создаётся во временной директории с тем же именем но .pdf расширением.
        Вызывающая сторона отвечает за удаление файла.
    """
    lo_bin = _find_libreoffice()
    if not lo_bin:
        logger.warning(
            "LibreOffice не найден — PDF генерация недоступна. "
            "Установите LibreOffice или используйте Dockerfile.worker."
        )
        return None

    out_dir = tempfile.mkdtemp(prefix="pdf_output_")

    try:
        result = subprocess.run(
            [
                lo_bin,
                "--headless",
                "--nofirststartwizard",
                "--convert-to", "pdf",
                "--outdir", out_dir,
                docx_path,
            ],
            capture_output=True,
            text=True,
            timeout=120,  # 2 минуты максимум
        )

        if result.returncode != 0:
            logger.error(
                "LibreOffice завершился с кодом %d: %s",
                result.returncode,
                result.stderr[:500]
            )
            return None

        # LibreOffice создаёт PDF с тем же именем что и DOCX
        docx_stem = Path(docx_path).stem
        pdf_path = os.path.join(out_dir, f"{docx_stem}.pdf")

        if not os.path.exists(pdf_path):
            logger.error(
                "LibreOffice не создал PDF файл по пути %s. stdout: %s",
                pdf_path,
                result.stdout[:200]
            )
            return None

        logger.info("PDF успешно создан: %s (%d байт)", pdf_path, os.path.getsize(pdf_path))
        return pdf_path

    except subprocess.TimeoutExpired:
        logger.error("LibreOffice превысил таймаут конвертации (120 сек)")
        return None
    except Exception as exc:
        logger.exception("Ошибка при конвертации DOCX→PDF: %s", exc)
        return None
