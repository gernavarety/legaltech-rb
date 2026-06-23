-- Мастер-скрипт: запускает все миграции по порядку
-- Использование: psql $DATABASE_URL -f migrations/000_run_all.sql

\echo '=== LexAI.by — применение миграций ==='

\echo '--- 001: plans ---'
\i migrations/001_create_plans.sql

\echo '--- 002: subscriptions ---'
\i migrations/002_create_subscriptions.sql

\echo '--- 003: usage ---'
\i migrations/003_create_usage.sql

\echo '--- 004: payments ---'
\i migrations/004_create_payments.sql

\echo '--- 005: team_members ---'
\i migrations/005_create_team_members.sql

\echo '--- 006: alter documents ---'
\i migrations/006_alter_documents.sql

\echo '--- 007: document_templates ---'
\i migrations/007_create_document_templates.sql

\echo '--- 008: generated_documents ---'
\i migrations/008_create_generated_documents.sql

\echo '--- 009: plans generations columns ---'
\i migrations/009_alter_plans_generations.sql

\echo '=== Миграции применены ==='
