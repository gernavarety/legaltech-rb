"""
🔌 ЗАГЛУШКА — OpenAI провайдер (GPT-4o + эмбеддинги).

Подключение:
1. Получить ключ: https://platform.openai.com/api-keys
2. Добавить в .env: OPENAI_API_KEY=sk-proj-...
3. Сменить провайдер: LLM_PROVIDER=openai (и/или EMBEDDING_PROVIDER=openai)

Доступные LLM модели (LLM_MODEL):
- gpt-4o                ← топ качество, дороже
- gpt-4o-mini           ← дёшево и быстро, рекомендуется
- gpt-4-turbo           ← большой контекст 128k

Доступные модели эмбеддингов (EMBEDDING_MODEL):
- text-embedding-3-small ← 1536 dim, дёшево ($0.02/1M токенов)
- text-embedding-3-large ← 3072 dim, точнее но дороже

pip install openai
"""
import os
from loguru import logger
from .base import BaseLLMProvider, BaseEmbeddingProvider, LLMResponse, ProviderInfo

LLM_STUB = (
    "OpenAI не настроен. Добавьте OPENAI_API_KEY в .env и LLM_PROVIDER=openai"
)
EMBED_STUB = (
    "OpenAI Embeddings не настроен. Добавьте OPENAI_API_KEY в .env и EMBEDDING_PROVIDER=openai"
)


class OpenAILLM(BaseLLMProvider):
    """OpenAI GPT провайдер."""

    def __init__(self, model: str = "gpt-4o-mini", api_key: str = ""):
        self._model = model
        self._api_key = api_key or os.getenv("OPENAI_API_KEY", "")

    @property
    def name(self) -> str:
        return "openai"

    @property
    def model(self) -> str:
        return self._model

    async def chat(self, system: str, user: str) -> LLMResponse:
        if not self._api_key:
            raise RuntimeError(LLM_STUB)
        try:
            from openai import AsyncOpenAI
        except ImportError:
            raise RuntimeError("Установите пакет: pip install openai")

        client = AsyncOpenAI(api_key=self._api_key)
        response = await client.chat.completions.create(
            model=self._model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            max_tokens=4096,
            temperature=0.1,
        )
        text = response.choices[0].message.content
        tokens = response.usage.total_tokens if response.usage else None
        logger.info(f"[OpenAI/{self._model}] Ответ: {len(text)} символов, токены: {tokens}")
        return LLMResponse(text=text, model=self._model, provider="openai", tokens_used=tokens)

    async def health(self) -> ProviderInfo:
        if not self._api_key:
            return ProviderInfo(name="openai", model=self._model, available=False, error=LLM_STUB)
        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=self._api_key)
            await client.models.retrieve(self._model)
            return ProviderInfo(name="openai", model=self._model, available=True)
        except Exception as e:
            return ProviderInfo(name="openai", model=self._model, available=False, error=str(e))


class OpenAIEmbeddings(BaseEmbeddingProvider):
    """OpenAI text-embedding провайдер."""

    DIM_MAP = {
        "text-embedding-3-small": 1536,
        "text-embedding-3-large": 3072,
        "text-embedding-ada-002": 1536,
    }

    def __init__(self, model: str = "text-embedding-3-small", api_key: str = ""):
        self._model = model
        self._api_key = api_key or os.getenv("OPENAI_API_KEY", "")

    @property
    def name(self) -> str:
        return "openai"

    @property
    def dimensions(self) -> int:
        return self.DIM_MAP.get(self._model, 1536)

    async def embed(self, text: str) -> list[float]:
        if not self._api_key:
            raise RuntimeError(EMBED_STUB)
        try:
            from openai import AsyncOpenAI
        except ImportError:
            raise RuntimeError("Установите пакет: pip install openai")
        client = AsyncOpenAI(api_key=self._api_key)
        resp = await client.embeddings.create(model=self._model, input=[text[:8000]])
        return resp.data[0].embedding

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        if not self._api_key:
            raise RuntimeError(EMBED_STUB)
        try:
            from openai import AsyncOpenAI
        except ImportError:
            raise RuntimeError("Установите пакет: pip install openai")
        client = AsyncOpenAI(api_key=self._api_key)
        batch = [t[:8000] for t in texts]
        resp = await client.embeddings.create(model=self._model, input=batch)
        return [item.embedding for item in resp.data]

    async def health(self) -> ProviderInfo:
        if not self._api_key:
            return ProviderInfo(name="openai", model=self._model, available=False, error=EMBED_STUB)
        try:
            await self.embed("test")
            return ProviderInfo(name="openai", model=self._model, available=True)
        except Exception as e:
            return ProviderInfo(name="openai", model=self._model, available=False, error=str(e))
