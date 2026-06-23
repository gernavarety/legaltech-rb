-- Миграция 002: таблица подписок пользователей
-- Запуск: psql $DATABASE_URL -f migrations/002_create_subscriptions.sql

CREATE TABLE IF NOT EXISTS subscriptions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID NOT NULL,              -- ссылка на auth.users в Supabase
    plan_id                 UUID NOT NULL REFERENCES plans(id),
    status                  TEXT NOT NULL DEFAULT 'active',
    -- Возможные статусы: active | cancelled | expired | trial | past_due
    current_period_start    TIMESTAMPTZ NOT NULL,
    current_period_end      TIMESTAMPTZ NOT NULL,
    bepaid_order_id         TEXT,                       -- ID заказа в системе Bepaid
    bepaid_subscription_id  TEXT,                       -- ID рекуррентной подписки Bepaid
    cancelled_at            TIMESTAMPTZ,
    cancel_at_period_end    BOOLEAN NOT NULL DEFAULT false,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id)                                     -- один активный план на пользователя
);

-- Индекс для быстрого поиска истекающих подписок (используется в scheduled task)
CREATE INDEX IF NOT EXISTS subscriptions_period_end_idx
    ON subscriptions(current_period_end)
    WHERE status = 'active';

-- Индекс для поиска по bepaid subscription id (для обработки вебхуков)
CREATE INDEX IF NOT EXISTS subscriptions_bepaid_idx
    ON subscriptions(bepaid_subscription_id)
    WHERE bepaid_subscription_id IS NOT NULL;

COMMENT ON TABLE subscriptions IS 'Подписки пользователей на тарифные планы';
COMMENT ON COLUMN subscriptions.cancel_at_period_end IS 'Если true — подписка отменена, но доступ есть до конца периода';
