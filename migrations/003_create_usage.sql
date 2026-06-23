-- Миграция 003: счётчик использования проверок
-- Запуск: psql $DATABASE_URL -f migrations/003_create_usage.sql

CREATE TABLE IF NOT EXISTS usage (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL,
    period_start    TIMESTAMPTZ NOT NULL,
    period_end      TIMESTAMPTZ NOT NULL,
    checks_used     INTEGER NOT NULL DEFAULT 0,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, period_start)
);

-- Индекс для быстрого поиска текущего периода пользователя
CREATE INDEX IF NOT EXISTS usage_user_period_idx
    ON usage(user_id, period_start DESC);

COMMENT ON TABLE usage IS 'Счётчик количества проверок договоров за текущий расчётный период';
