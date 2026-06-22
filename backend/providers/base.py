"""
Абстрактный базовый класс для LLM и Embedding провайдеров.
Любой новый провайдер наследует эти классы и реализует методы.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional


@dataclass
class LLMResponse:
    text: str
    model: str
    provider: str
    tokens_used: Optional[int] = None


@dataclass
class ProviderInfo:
    name: str
    model: str
    available: bool
    error: Optional[str] = None


class BaseLLMProvider(ABC):
    """Интерфейс языковой модели для анализа договоров."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Название провайдера, например 'ollama', 'anthropic'."""
        ...

    @property
    @abstractmethod
    def model(self) -> str:
        """Название модели, например 'llama3.1:latest'."""
        ...

    @abstractmethod
    async def chat(self, system: str, user: str) -> LLMResponse:
        """
        Отправляет запрос к LLM.
        system — системный промпт (роль юриста РБ).
        user   — текст договора + контекст норм.
        """
        ...

    @abstractmethod
    async def health(self) -> ProviderInfo:
        """Проверяет доступность провайдера и модели."""
        ...


class BaseEmbeddingProvider(ABC):
    """Интерфейс для создания эмбеддингов (семантический поиск)."""

    @property
    @abstractmethod
    def name(self) -> str:
        ...

    @property
    @abstractmethod
    def dimensions(self) -> int:
        """Размерность векторов (768, 1536, 3072 и т.д.)."""
        ...

    @abstractmethod
    async def embed(self, text: str) -> list[float]:
        """Возвращает вектор эмбеддинга для текста."""
        ...

    @abstractmethod
    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """Возвращает список эмбеддингов для батча текстов."""
        ...

    @abstractmethod
    async def health(self) -> ProviderInfo:
        ...
