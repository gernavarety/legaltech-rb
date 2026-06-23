-- Миграция 007: шаблоны юридических документов
-- Запуск: psql $DATABASE_URL -f migrations/007_create_document_templates.sql

CREATE TABLE IF NOT EXISTS document_templates (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug                TEXT UNIQUE NOT NULL,          -- snake_case идентификатор
    name                TEXT NOT NULL,                 -- отображаемое название
    group_name          TEXT NOT NULL,                 -- группа: Договоры | Трудовые | Корпоративные | Претензии
    description         TEXT,
    law_references      TEXT[] DEFAULT '{}',           -- ['ст. 424 ГК РБ', 'ст. 461 ГК РБ']
    fields_schema       JSONB NOT NULL,                -- схема полей формы
    available_plans     TEXT[] DEFAULT '{free,solo,firm}',
    is_active           BOOLEAN NOT NULL DEFAULT true,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS templates_group_idx ON document_templates(group_name);
CREATE INDEX IF NOT EXISTS templates_active_idx ON document_templates(is_active);

COMMENT ON TABLE document_templates IS '20 шаблонов юридических документов по праву РБ';
COMMENT ON COLUMN document_templates.fields_schema IS 'JSON Schema полей: {fields: [{key, label, type, required, hint, options}]}';
COMMENT ON COLUMN document_templates.available_plans IS 'Тарифы на которых доступен шаблон';
