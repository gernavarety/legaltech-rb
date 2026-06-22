"""
Ollama провайдер — локальный, полностью бесплатный.
Поддерживает llama3.1, mistral, gemma, qwen и другие модели.

Установка Ollama: https://ollama.ai
Запуск: ollama serve
Модели: ollama pull llama3.1 | ollama pull nomic-embed-text
"""
import httpx
from loguru import logger
from .base import BaseLLMProvider, BaseEmbeddingProvider, LLMResponse, ProviderInfo


class OllamaLLM(BaseLLMProvider):
    """LLM через локальный Ollama сервер."""

    def __init__(self, model: str = "llama3.1:latest", base_url: str = "http://localhost:11434"):
        self._model = model
        self.base_url = base_url.rstrip("/")

    @property
    def name(self) -> str:
        return "ollama"

    @property
    def model(self) -> str:
        return self._model

    async def chat(self, system: str, user: str) -> LLMResponse:
        async with httpx.AsyncClient(timeout=180) as client:
            resp = await client.post(
                f"{self.base_url}/api/chat",
                json={
                    "model": self._model,
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": user},
                    ],
                    "stream": False,
                    "options": {
                        "temperature": 0.1,
                        "num_predict": 4096,
                        "num_ctx": 8192,
                    },
                },
            )
            resp.raise_for_status()
            data = resp.json()
            text = data["message"]["content"]
            tokens = data.get("eval_count")
            logger.info(f"[Ollama/{self._model}] Ответ: {len(text)} символов, токены: {tokens}")
            return LLMResponse(text=text, model=self._model, provider="ollama", tokens_used=tokens)

    async def health(self) -> ProviderInfo:
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                resp = await client.get(f"{self.base_url}/api/tags")
                models = [m["name"] for m in resp.json().get("models", [])]
                model_base = self._model.split(":")[0]
                available = any(model_base in m for m in models)
                if not available:
                    return ProviderInfo(
                        name="ollama", model=self._model, available=False,
                        error=f"Модель '{self._model}' не найдена. Запустите: ollama pull {self._model}"
                    )
                return ProviderInfo(name="ollama", model=self._model, available=True)
        except Exception as e:
            return ProviderInfo(
                name="ollama", model=self._model, available=False,
                error=f"Ollama недоступна: {e}. Запустите: ollama serve"
            )


class OllamaEmbeddings(BaseEmbeddingProvider):
    """Эмбеддинги через Ollama (nomic-embed-text = 768 dim)."""

    def __init__(self, model: str = "nomic-embed-text", base_url: str = "http://localhost:11434"):
        self._model = model
        self.base_url = base_url.rstrip("/")

    @property
    def name(self) -> str:
        return "ollama"

    @property
    def dimensions(self) -> int:
        # nomic-embed-text → 768, mxbai-embed-large → 1024
        return 768

    async def embed(self, text: str) -> list[float]:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{self.base_url}/api/embeddings",
                json={"model": self._model, "prompt": text[:4000]},
            )
            resp.raise_for_status()
            return resp.json()["embedding"]

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        results = []
        for text in texts:
            emb = await self.embed(text)
            results.append(emb)
        return results

    async def health(self) -> ProviderInfo:
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                resp = await client.get(f"{self.base_url}/api/tags")
                models = [m["name"] for m in resp.json().get("models", [])]
                available = any(self._model.split(":")[0] in m for m in models)
                if not available:
                    return ProviderInfo(
                        name="ollama", model=self._model, available=False,
                        error=f"Модель эмбеддингов '{self._model}' не найдена. Запустите: ollama pull {self._model}"
                    )
                return ProviderInfo(name="ollama", model=self._model, available=True)
        except Exception as e:
            return ProviderInfo(name="ollama", model=self._model, available=False, error=str(e))
