"""
🔌 ЗАГЛУШКА — Anthropic Claude провайдер.

Подключение:
1. Получить ключ: https://console.anthropic.com → API Keys
2. Добавить в .env: ANTHROPIC_API_KEY=sk-ant-api03-...
3. Сменить провайдер: LLM_PROVIDER=anthropic

Доступные модели (задайте в LLM_MODEL):
- claude-sonnet-4-6        ← рекомендуется (баланс качество/цена)
- claude-opus-4-8          ← максимальное качество
- claude-haiku-4-5-20251001 ← самый быстрый и дешёвый

Цены (примерные): https://anthropic.com/pricing
- Sonnet: ~$3 / 1M вх. токенов, $15 / 1M вых.
- Один анализ договора ≈ $0.05–0.15

pip install anthropic
"""
import os
from loguru import logger
from .base import BaseLLMProvider, LLMResponse, ProviderInfo

STUB_WARNING = (
    "Anthropic Claude не настроен. "
    "Добавьте ANTHROPIC_API_KEY в .env и установите LLM_PROVIDER=anthropic"
)


class AnthropicLLM(BaseLLMProvider):
    """Claude API провайдер."""

    def __init__(self, model: str = "claude-sonnet-4-6", api_key: str = ""):
        self._model = model
        self._api_key = api_key or os.getenv("ANTHROPIC_API_KEY", "")

    @property
    def name(self) -> str:
        return "anthropic"

    @property
    def model(self) -> str:
        return self._model

    async def chat(self, system: str, user: str) -> LLMResponse:
        if not self._api_key:
            raise RuntimeError(STUB_WARNING)

        # Ленивый импорт — не падаем если пакет не установлен
        try:
            import anthropic
        except ImportError:
            raise RuntimeError("Установите пакет: pip install anthropic")

        client = anthropic.Anthropic(api_key=self._api_key)
        message = client.messages.create(
            model=self._model,
            max_tokens=4096,
            timeout=120,
            system=system,
            messages=[{"role": "user", "content": user}],
        )
        text = message.content[0].text
        tokens = message.usage.input_tokens + message.usage.output_tokens
        logger.info(f"[Anthropic/{self._model}] Ответ: {len(text)} символов, токены: {tokens}")
        return LLMResponse(text=text, model=self._model, provider="anthropic", tokens_used=tokens)

    async def health(self) -> ProviderInfo:
        if not self._api_key:
            return ProviderInfo(name="anthropic", model=self._model, available=False, error=STUB_WARNING)
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=self._api_key)
            # Минимальный запрос для проверки ключа
            client.messages.create(
                model=self._model, max_tokens=10,
                messages=[{"role": "user", "content": "ping"}],
            )
            return ProviderInfo(name="anthropic", model=self._model, available=True)
        except Exception as e:
            return ProviderInfo(name="anthropic", model=self._model, available=False, error=str(e))
