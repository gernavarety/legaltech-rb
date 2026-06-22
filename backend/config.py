"""
Конфигурация приложения — читает переменные окружения через pydantic-settings.
"""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Anthropic
    anthropic_api_key: str = ""

    # OpenAI (только для эмбеддингов)
    openai_api_key: str = ""

    # База данных
    database_url: str = "postgresql://postgres:postgres@pgvector:5432/legaltech"

    # Supabase (опционально, если используем вместо локального pg)
    supabase_url: str = ""
    supabase_key: str = ""

    # Cloudflare R2
    r2_account_id: str = ""
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_bucket_name: str = "legaltech-rb"
    r2_endpoint_url: str = ""  # Будет построен автоматически если не задан

    # Redis
    redis_url: str = "redis://redis:6379"

    # Приложение
    max_file_size_mb: int = 10
    claude_timeout_seconds: int = 120
    claude_model: str = "claude-sonnet-4-6"
    embedding_model: str = "text-embedding-3-small"
    chunk_size_tokens: int = 1500
    chunk_overlap_tokens: int = 200

    # CORS
    cors_origins: list[str] = ["http://localhost:3000", "http://frontend:3000"]

    @property
    def r2_endpoint(self) -> str:
        if self.r2_endpoint_url:
            return self.r2_endpoint_url
        return f"https://{self.r2_account_id}.r2.cloudflarestorage.com"

    @property
    def max_file_size_bytes(self) -> int:
        return self.max_file_size_mb * 1024 * 1024

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
