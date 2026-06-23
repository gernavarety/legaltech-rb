-- Миграция 008: сгенерированные документы
-- Запуск: psql $DATABASE_URL -f migrations/008_create_generated_documents.sql

CREATE TABLE IF NOT EXISTS generated_documents (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL,                    -- UUID из Supabase auth
    template_id         UUID NOT NULL REFERENCES document_templates(id),
    template_slug       TEXT NOT NULL,                    -- денормализация для удобства
    input_data          JSONB NOT NULL,                   -- данные введённые пользователем
    result_docx_url     TEXT,                             -- ключ в Cloudflare R2
    result_pdf_url      TEXT,                             -- ключ в Cloudflare R2
    preview_text        TEXT,                             -- первые 800 символов для Free
    claude_prompt       TEXT,                             -- полный промпт (для отладки)
    claude_response     TEXT,                             -- полный ответ Claude
    status              TEXT NOT NULL DEFAULT 'pending',  -- pending|processing|done|error
    error_text          TEXT,
    tokens_used         INTEGER,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS gen_docs_user_idx      ON generated_documents(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS gen_docs_template_idx  ON generated_documents(template_slug);
CREATE INDEX IF NOT EXISTS gen_docs_status_idx    ON generated_documents(status);

COMMENT ON TABLE generated_documents IS 'Документы сгенерированные пользователями через AI';
