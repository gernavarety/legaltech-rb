-- Миграция 009: добавить лимиты генерации в таблицу plans
-- Запуск: psql $DATABASE_URL -f migrations/009_alter_plans_generations.sql

ALTER TABLE plans
    ADD COLUMN IF NOT EXISTS generations_per_month INTEGER,  -- NULL = безлимит
    ADD COLUMN IF NOT EXISTS has_pdf_download BOOLEAN NOT NULL DEFAULT false;

-- Обновляем существующие планы
UPDATE plans SET generations_per_month = 3,    has_pdf_download = false WHERE name = 'free';
UPDATE plans SET generations_per_month = 30,   has_pdf_download = true  WHERE name = 'solo';
UPDATE plans SET generations_per_month = NULL, has_pdf_download = true  WHERE name = 'firm';

-- Таблица использования генераций (отдельная от usage проверок)
CREATE TABLE IF NOT EXISTS generation_usage (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL,
    period_start    TIMESTAMPTZ NOT NULL,
    period_end      TIMESTAMPTZ NOT NULL,
    generations_used INTEGER NOT NULL DEFAULT 0,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, period_start)
);

CREATE INDEX IF NOT EXISTS gen_usage_user_idx ON generation_usage(user_id, period_start DESC);

COMMENT ON COLUMN plans.generations_per_month IS 'NULL = безлимитные генерации (тариф FIRM)';
COMMENT ON COLUMN plans.has_pdf_download IS 'Доступно ли скачивание в формате PDF';
