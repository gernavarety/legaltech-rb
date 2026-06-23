-- Миграция 006: добавить user_id в существующую таблицу documents
-- Запуск: psql $DATABASE_URL -f migrations/006_alter_documents.sql

ALTER TABLE documents
    ADD COLUMN IF NOT EXISTS user_id UUID,
    ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

-- Индекс для истории документов пользователя (страница /history)
CREATE INDEX IF NOT EXISTS documents_user_idx
    ON documents(user_id, created_at DESC)
    WHERE user_id IS NOT NULL;

COMMENT ON COLUMN documents.user_id IS 'NULL для документов загруженных до введения аутентификации';
COMMENT ON COLUMN documents.is_public IS 'Зарезервировано для будущей функции публичных шаблонов';
