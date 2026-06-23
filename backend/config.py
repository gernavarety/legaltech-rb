"""
Конфигурация приложения — читает переменные окружения через pydantic-settings.
"""
from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List


class Settings(BaseSettings):
    # ── LLM провайдеры ──────────────────────────────────────────────
    anthropic_api_key: str = ""
    openai_api_key: str = ""
    groq_api_key: str = ""
    llm_provider: str = "groq"
    llm_model: str = "llama-3.3-70b-versatile"
    embedding_provider: str = "ollama"
    embedding_model: str = "nomic-embed-text"

    # ── База данных ──────────────────────────────────────────────────
    database_url: str = "postgresql://postgres:postgres@pgvector:5432/legaltech"

    # ── Supabase ─────────────────────────────────────────────────────
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    supabase_jwt_secret: str = ""

    # ── Cloudflare R2 ─────────────────────────────────────────────────
    r2_account_id: str = ""
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_bucket_name: str = "legaltech-rb"
    r2_endpoint_url: str = ""

    # ── Redis ─────────────────────────────────────────────────────────
    redis_url: str = "redis://redis:6379"

    # ── Bepaid.by ─────────────────────────────────────────────────────
    bepaid_shop_id: str = ""
    bepaid_secret_key: str = ""
    bepaid_public_key: str = ""
    bepaid_test_mode: bool = True
    webhook_secret: str = ""

    # ── Email (Resend.com) ────────────────────────────────────────────
    resend_api_key: str = ""
    from_email: str = "noreply@lexai.by"

    # ── URLs ──────────────────────────────────────────────────────────
    frontend_url: str = "http://localhost:3000"

    # ── Приложение ────────────────────────────────────────────────────
    max_file_size_mb: int = 10
    claude_timeout_seconds: int = 120
    claude_model: str = "claude-sonnet-4-6"
    embedding_model_openai: str = "text-embedding-3-small"
    chunk_size_tokens: int = 1500
    chunk_overlap_tokens: int = 200

    # ── CORS ──────────────────────────────────────────────────────────
    cors_origins: List[str] = ["http://localhost:3000", "http://frontend:3000"]

    @property
    def r2_endpoint(self) -> str:
        if self.r2_endpoint_url:
            return self.r2_endpoint_url
        return f"https://{self.r2_account_id}.r2.cloudflarestorage.com"

    @property
    def max_file_size_bytes(self) -> int:
        return self.max_file_size_mb * 1024 * 1024

    @property
    def bepaid_base_url(self) -> str:
        """Bepaid использует единый URL и для тестового, и для боевого режима."""
        return "https://api.bepaid.by"

    @property
    def bepaid_checkout_url(self) -> str:
        if self.bepaid_test_mode:
            return "https://checkout.begateway.com"
        return "https://checkout.bepaid.by"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
