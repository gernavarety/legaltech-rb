"""
🔌 ЗАГЛУШКА — Groq провайдер (бесплатный tier, очень быстрый).

Groq — облачный inference на кастомных чипах. Бесплатный tier:
- 30 запросов/минуту, 14 400 запросов/день
- Достаточно для тестирования без затрат

Подключение:
1. Регистрация: https://console.groq.com (бесплатно)
2. API Keys → Create API Key
3. Добавить в .env: GROQ_API_KEY=gsk_...
4. Сменить провайдер: LLM_PROVIDER=groq

Доступные модели (задайте в LLM_MODEL):
- llama-3.1-70b-versatile   ← рекомендуется для русского (70B параметров)
- llama-3.1-8b-instant      ← быстрее, чуть хуже качество
- mixtral-8x7b-32768        ← хорошее понимание русского
- gemma2-9b-it              ← от Google, тоже неплохой

Groq OpenAI-совместим, поэтому использует openai SDK.
pip install openai
"""
import os
from loguru import logger
from .base import BaseLLMProvider, LLMResponse, ProviderInfo

STUB_WARNING = (
    "Groq не настроен. "
    "Зарегистрируйтесь на console.groq.com, получите бесплатный ключ "
    "и добавьте GROQ_API_KEY в .env, затем LLM_PROVIDER=groq"
)


class GroqLLM(BaseLLMProvider):
    """Groq Cloud провайдер (OpenAI-совместимый API)."""

    GROQ_BASE_URL = "https://api.groq.com/openai/v1"

    def __init__(self, model: str = "llama-3.3-70b-versatile", api_key: str = ""):
        self._model = model
        self._api_key = api_key or os.getenv("GROQ_API_KEY", "")

    @property
    def name(self) -> str:
        return "groq"

    @property
    def model(self) -> str:
        return self._model

    async def chat(self, system: str, user: str) -> LLMResponse:
        if not self._api_key:
            raise RuntimeError(STUB_WARNING)

        try:
            from openai import AsyncOpenAI
        except ImportError:
            raise RuntimeError("Установите пакет: pip install openai")

        client = AsyncOpenAI(api_key=self._api_key, base_url=self.GROQ_BASE_URL)
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
        logger.info(f"[Groq/{self._model}] Ответ: {len(text)} символов, токены: {tokens}")
        return LLMResponse(text=text, model=self._model, provider="groq", tokens_used=tokens)

    async def health(self) -> ProviderInfo:
        if not self._api_key:
            return ProviderInfo(name="groq", model=self._model, available=False, error=STUB_WARNING)
        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=self._api_key, base_url=self.GROQ_BASE_URL)
            models = await client.models.list()
            available = any(self._model in m.id for m in models.data)
            if not available:
                return ProviderInfo(name="groq", model=self._model, available=False,
                                    error=f"Модель '{self._model}' недоступна в Groq")
            return ProviderInfo(name="groq", model=self._model, available=True)
        except Exception as e:
            return ProviderInfo(name="groq", model=self._model, available=False, error=str(e))
