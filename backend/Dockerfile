FROM python:3.12-slim

# Системные зависимости для PyMuPDF и других библиотек
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libffi-dev \
    libssl-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Копируем зависимости сначала для кэширования слоёв Docker
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Копируем код приложения
COPY . .

# Создаём директорию для логов
RUN mkdir -p /app/logs

# Порт FastAPI
EXPOSE 8000

# Healthcheck для FastAPI
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# Команда по умолчанию — FastAPI (переопределяется в docker-compose для worker)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
