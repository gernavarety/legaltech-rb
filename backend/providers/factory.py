"""
Фабрика провайдеров — читает конфиг и возвращает нужный провайдер.
Переключение: LLM_PROVIDER=ollama|anthropic|groq|openai в .env

Текущие провайдеры:
┌─────────────┬──────────────────────────┬──────────┬────────────────────┐
│ Провайдер   │ Модели                   │ Стоимость│ Статус             │
├─────────────┼──────────────────────────┼──────────┼────────────────────┤
│ ollama      │ llama3.1, mistral, gemma │ Бесплатно│ ✅ Работает        │
│ groq        │ llama-3.1-70b, mixtral   │ Бесплатно│ 🔌 Нужен API ключ  │
│ anthropic   │ claude-sonnet-4-6 и др.  │ Платно   │ 🔌 Нужен API ключ  │
│ openai      │ gpt-4o, gpt-4o-mini      │ Платно   │ 🔌 Нужен API ключ  │
└─────────────┴──────────────────────────┴──────────┴────────────────────┘
"""
import os
from loguru import logger
from .base import BaseLLMProvider, BaseEmbeddingProvider
from .ollama import OllamaLLM, OllamaEmbeddings
from .anthropic import AnthropicLLM
from .groq import GroqLLM
from .openai import OpenAILLM, OpenAIEmbeddings


def get_llm_provider() -> BaseLLMProvider:
    """
    Создаёт LLM провайдер из переменных окружения.

    Переменные:
        LLM_PROVIDER — ollama | anthropic | groq | openai (default: ollama)
        LLM_MODEL    — конкретная модель (default: зависит от провайдера)
        OLLAMA_URL   — URL Ollama сервера (default: http://localhost:11434)
    """
    provider_name = os.getenv("LLM_PROVIDER", "ollama").lower().strip()

    defaults = {
        "ollama":    "llama3.1:latest",
        "anthropic": "claude-sonnet-4-6",
        "groq":      "llama-3.3-70b-versatile",
        "openai":    "gpt-4o-mini",
    }
    model = os.getenv("LLM_MODEL", defaults.get(provider_name, "llama3.1:latest"))

    logger.info(f"LLM провайдер: {provider_name} / модель: {model}")

    if provider_name == "ollama":
        url = os.getenv("OLLAMA_URL", "http://localhost:11434")
        return OllamaLLM(model=model, base_url=url)

    elif provider_name == "anthropic":
        return AnthropicLLM(model=model, api_key=os.getenv("ANTHROPIC_API_KEY", ""))

    elif provider_name == "groq":
        return GroqLLM(model=model, api_key=os.getenv("GROQ_API_KEY", ""))

    elif provider_name == "openai":
        return OpenAILLM(model=model, api_key=os.getenv("OPENAI_API_KEY", ""))

    else:
        logger.warning(f"Неизвестный LLM_PROVIDER='{provider_name}', используем ollama")
        return OllamaLLM(model="llama3.1:latest")


def get_embedding_provider() -> BaseEmbeddingProvider:
    """
    Создаёт Embedding провайдер из переменных окружения.

    Переменные:
        EMBEDDING_PROVIDER — ollama | openai (default: ollama)
        EMBEDDING_MODEL    — конкретная модель
    """
    provider_name = os.getenv("EMBEDDING_PROVIDER", "ollama").lower().strip()

    defaults = {
        "ollama": "nomic-embed-text",
        "openai": "text-embedding-3-small",
    }
    model = os.getenv("EMBEDDING_MODEL", defaults.get(provider_name, "nomic-embed-text"))

    logger.info(f"Embedding провайдер: {provider_name} / модель: {model}")

    if provider_name == "ollama":
        url = os.getenv("OLLAMA_URL", "http://localhost:11434")
        return OllamaEmbeddings(model=model, base_url=url)

    elif provider_name == "openai":
        return OpenAIEmbeddings(model=model, api_key=os.getenv("OPENAI_API_KEY", ""))

    else:
        logger.warning(f"Неизвестный EMBEDDING_PROVIDER='{provider_name}', используем ollama")
        return OllamaEmbeddings(model="nomic-embed-text")
