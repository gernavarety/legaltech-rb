-- Миграция 005: команда для тарифа FIRM
-- Запуск: psql $DATABASE_URL -f migrations/005_create_team_members.sql

CREATE TABLE IF NOT EXISTS team_members (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id        UUID NOT NULL,          -- владелец подписки FIRM
    member_id       UUID,                   -- UUID пользователя после принятия приглашения
    invite_email    TEXT NOT NULL,          -- email для приглашения
    invite_token    TEXT UNIQUE,            -- токен для подтверждения приглашения
    status          TEXT NOT NULL DEFAULT 'pending',
    -- Возможные статусы: pending | active | removed
    invited_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accepted_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(owner_id, invite_email)
);

CREATE INDEX IF NOT EXISTS team_members_owner_idx ON team_members(owner_id);
CREATE INDEX IF NOT EXISTS team_members_member_idx ON team_members(member_id) WHERE member_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS team_members_token_idx ON team_members(invite_token) WHERE invite_token IS NOT NULL;

COMMENT ON TABLE team_members IS 'Участники команды в рамках тарифа FIRM (до 5 пользователей)';
