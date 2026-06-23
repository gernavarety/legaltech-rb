-- Миграция 001: таблица тарифных планов
-- Запуск: psql $DATABASE_URL -f migrations/001_create_plans.sql

CREATE TABLE IF NOT EXISTS plans (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                TEXT NOT NULL UNIQUE,          -- 'free' | 'solo' | 'firm'
    display_name        TEXT NOT NULL,
    price_usd           DECIMAL(10,2) NOT NULL DEFAULT 0,
    checks_per_month    INTEGER,                        -- NULL = безлимит
    max_file_mb         INTEGER NOT NULL DEFAULT 5,
    has_docx_download   BOOLEAN NOT NULL DEFAULT false,
    has_history         BOOLEAN NOT NULL DEFAULT false,
    has_api_access      BOOLEAN NOT NULL DEFAULT false,
    has_priority_queue  BOOLEAN NOT NULL DEFAULT false,
    max_team_members    INTEGER NOT NULL DEFAULT 1,
    is_active           BOOLEAN NOT NULL DEFAULT true,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE plans IS 'Тарифные планы LexAI.by';
COMMENT ON COLUMN plans.checks_per_month IS 'NULL означает безлимитное количество проверок';
