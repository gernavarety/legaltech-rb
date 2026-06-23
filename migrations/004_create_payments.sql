-- Миграция 004: история платежей
-- Запуск: psql $DATABASE_URL -f migrations/004_create_payments.sql

CREATE TABLE IF NOT EXISTS payments (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID NOT NULL,
    subscription_id         UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    amount_usd              DECIMAL(10,2) NOT NULL,
    amount_byn              DECIMAL(10,2),               -- сумма в белорусских рублях
    exchange_rate           DECIMAL(10,4),               -- курс USD/BYN на момент платежа
    status                  TEXT NOT NULL,
    -- Возможные статусы: pending | success | failed | refunded | chargeback
    bepaid_transaction_id   TEXT UNIQUE,                 -- ID транзакции Bepaid
    bepaid_order_id         TEXT,                        -- ID заказа Bepaid
    bepaid_uid              TEXT,                        -- токен карты для рекуррентных платежей
    payload_json            JSONB,                       -- полный payload от Bepaid для аудита
    failure_reason          TEXT,                        -- причина отказа (из Bepaid)
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Индекс для аудита и отчётности
CREATE INDEX IF NOT EXISTS payments_user_idx ON payments(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS payments_status_idx ON payments(status);
CREATE INDEX IF NOT EXISTS payments_bepaid_order_idx ON payments(bepaid_order_id);

COMMENT ON TABLE payments IS 'История всех платёжных транзакций через Bepaid.by';
COMMENT ON COLUMN payments.bepaid_uid IS 'Токен карты Bepaid для последующих рекуррентных списаний';
