# LexAI.by — AI-анализ договоров по праву Республики Беларусь

Платформа автоматически анализирует договоры на соответствие законодательству РБ:
выявляет риски, ссылается на конкретные статьи ГК РБ, ТК РБ, ХПК РБ и генерирует DOCX-отчёт.

**Стек:** Next.js 14 · FastAPI · Celery · PostgreSQL + pgvector · Claude claude-sonnet-4-6 · Cloudflare R2

---

## Запуск за 5 команд

```bash
# 1. Клонировать репозиторий
git clone https://github.com/your-org/legaltech-rb && cd legaltech-rb

# 2. Создать .env файл и заполнить API ключи
cp .env.example .env && nano .env

# 3. Запустить все сервисы
docker-compose up -d

# 4. Загрузить правовую базу РБ в pgvector (выполнить один раз)
docker-compose exec backend python /app/../parser/load_rb_law.py

# 5. Открыть браузер
open http://localhost:3000
```

---

## Архитектура

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Пользователь                                │
│                    (браузер → localhost:3000)                        │
└───────────────────────────┬─────────────────────────────────────────┘
                            │ HTTP
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   Next.js Frontend (порт 3000)                      │
│  ┌──────────────┐  ┌────────────────┐  ┌─────────────────────────┐ │
│  │  Drag & Drop │  │ Progress Steps │  │   Таблица рисков        │ │
│  │  Upload Zone │  │  (polling 2s)  │  │   (фильтры, детали)     │ │
│  └──────────────┘  └────────────────┘  └─────────────────────────┘ │
└───────────────────────────┬─────────────────────────────────────────┘
                            │ /api/* → rewrite proxy
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   FastAPI Backend (порт 8000)                       │
│  POST /api/upload  ·  GET /api/task/{id}  ·  GET /api/download/{id}│
└─────┬────────────────────────────────┬────────────────────────────┘
      │ upload to R2                   │ async task
      ▼                                ▼
┌──────────────┐            ┌────────────────────────────────────────┐
│  Cloudflare  │            │        Celery Worker                   │
│     R2       │◄───────────│  1. Download file from R2              │
│  (contracts/ │            │  2. Extract text (PyMuPDF / python-docx│
│   reports/)  │            │  3. Create embeddings (OpenAI)         │
└──────────────┘            │  4. Search law norms (pgvector)        │
                            │  5. Claude API analysis                │
                            │  6. Generate DOCX report               │
                            │  7. Upload report to R2                │
                            └──────────────┬─────────────────────────┘
                                           │
                  ┌────────────────────────┴──────────────────────┐
                  │                                               │
                  ▼                                               ▼
     ┌─────────────────────┐                      ┌──────────────────────┐
     │  PostgreSQL/pgvector │                      │       Redis          │
     │  ┌───────────────┐   │                      │  (Celery broker +   │
     │  │   documents   │   │                      │   result backend)   │
     │  │  (статусы)    │   │                      └──────────────────────┘
     │  └───────────────┘   │
     │  ┌───────────────┐   │
     │  │  law_chunks   │   │
     │  │ (нормы РБ +   │   │
     │  │  embeddings)  │   │
     │  └───────────────┘   │
     └─────────────────────┘
```

---

## Структура проекта

```
legaltech-rb/
├── frontend/                    # Next.js 14 (App Router)
│   ├── app/
│   │   ├── layout.tsx           # Хедер, футер, глобальные стили
│   │   ├── page.tsx             # Главная — форма загрузки
│   │   ├── globals.css
│   │   └── result/[task_id]/
│   │       └── page.tsx         # Страница результатов
│   ├── components/
│   │   ├── upload-zone.tsx      # Drag & drop загрузка файлов
│   │   ├── progress-steps.tsx   # Шаги обработки с анимацией
│   │   └── risk-table.tsx       # Таблица рисков с фильтрами
│   ├── lib/
│   │   ├── api.ts               # API клиент + polling
│   │   └── utils.ts             # Утилиты (cn, цвета рисков)
│   ├── Dockerfile
│   ├── package.json
│   └── next.config.js
│
├── backend/                     # FastAPI + Celery
│   ├── main.py                  # FastAPI эндпоинты
│   ├── tasks.py                 # Celery задача (весь пайплайн)
│   ├── database.py              # PostgreSQL/pgvector операции
│   ├── storage.py               # Cloudflare R2 операции
│   ├── models.py                # Pydantic модели
│   ├── config.py                # Настройки из .env
│   ├── requirements.txt
│   └── Dockerfile
│
├── parser/
│   └── load_rb_law.py           # Парсинг pravo.by → pgvector
│
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## API Эндпоинты

| Метод | Путь | Описание |
|-------|------|----------|
| `POST` | `/api/upload` | Загрузка PDF/DOCX файла |
| `GET` | `/api/task/{task_id}` | Статус и результат анализа |
| `GET` | `/api/download/{task_id}` | Скачивание DOCX-отчёта |
| `GET` | `/api/health` | Проверка работоспособности |

### POST /api/upload

```json
// Ответ
{
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "message": "Файл принят в обработку"
}
```

### GET /api/task/{task_id}

```json
// Ответ при status=done
{
  "task_id": "550e8400-...",
  "status": "done",
  "filename": "contract.pdf",
  "contract_type": "Договор поставки",
  "overall_risk": "высокий",
  "result": {
    "contract_type": "Договор поставки",
    "overall_risk": "высокий",
    "summary": "Договор содержит серьёзные риски...",
    "risks": [
      {
        "level": "высокий",
        "clause": "п. 4.2 Договора",
        "issue": "Не определён порядок ответственности за нарушение сроков",
        "law_reference": "ст. 364 ГК РБ",
        "recommendation": "Добавить неустойку 0.1% за каждый день просрочки"
      }
    ],
    "missing_clauses": ["Форс-мажорные обстоятельства", "Порядок разрешения споров"],
    "needs_lawyer": true
  },
  "download_url": "/api/download/550e8400-..."
}
```

---

## Настройка окружения

### Обязательные переменные

| Переменная | Описание | Где получить |
|-----------|----------|--------------|
| `ANTHROPIC_API_KEY` | Ключ Claude API | [console.anthropic.com](https://console.anthropic.com) |
| `OPENAI_API_KEY` | Ключ для эмбеддингов | [platform.openai.com](https://platform.openai.com) |
| `R2_ACCOUNT_ID` | ID аккаунта Cloudflare | Панель Cloudflare |
| `R2_ACCESS_KEY_ID` | Ключ доступа R2 | R2 → Manage R2 API Tokens |
| `R2_SECRET_ACCESS_KEY` | Секретный ключ R2 | R2 → Manage R2 API Tokens |

### Cloudflare R2 — создание бакета

1. Войдите в [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Перейдите в **R2 Object Storage**
3. Создайте бакет `legaltech-rb`
4. Перейдите в **Manage R2 API Tokens** → создайте токен с правами Read/Write

---

## Загрузка правовой базы РБ

Скрипт парсит [pravo.by](https://pravo.by) и загружает нормы в pgvector.

```bash
# Загрузить все НПА (ГК РБ, ТК РБ, ХПК РБ, Закон об аренде, Закон о хозобществах)
docker-compose exec backend python /app/../parser/load_rb_law.py

# Загрузить только ГК РБ
docker-compose exec backend python /app/../parser/load_rb_law.py --doc gk

# Проверить без записи в БД
docker-compose exec backend python /app/../parser/load_rb_law.py --dry-run

# Доступные ключи документов: gk, tk, hpk, arenda, hozobshestva
```

---

## Разработка

### Запуск бэкенда локально

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# FastAPI
uvicorn main:app --reload --port 8000

# Celery Worker (в другом терминале)
celery -A tasks.celery_app worker --loglevel=info
```

### Запуск фронтенда локально

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

### Просмотр задач Celery (Flower)

```bash
docker-compose --profile monitoring up -d flower
# → http://localhost:5555
```

---

## Схема базы данных

```sql
-- Загруженные договоры
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  filename TEXT NOT NULL,
  file_url TEXT NOT NULL,       -- ключ в R2
  status TEXT DEFAULT 'pending', -- pending|processing|done|error
  contract_type TEXT,
  overall_risk TEXT,
  result_json JSONB,            -- полный JSON от Claude
  report_url TEXT,              -- ключ DOCX отчёта в R2
  error_text TEXT
);

-- Правовая база РБ (нормы с эмбеддингами)
CREATE TABLE law_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_name TEXT NOT NULL,  -- "Гражданский кодекс РБ"
  article_number TEXT,          -- "Ст. 402"
  article_title TEXT,           -- "Оферта"
  text TEXT NOT NULL,
  url TEXT,                     -- ссылка на pravo.by
  embedding vector(1536)        -- OpenAI text-embedding-3-small
);
```

---

## Ограничения MVP

- Файлы до 10 МБ (PDF, DOCX)
- Анализ одного документа за раз (не пакетный)
- Время анализа: 30–90 секунд
- Правовая база: 5 НПА РБ (расширяется скриптом)
- Язык анализа: русский

---

## Лицензия

MIT License. Результаты анализа носят информационный характер и не заменяют консультацию квалифицированного юриста.
