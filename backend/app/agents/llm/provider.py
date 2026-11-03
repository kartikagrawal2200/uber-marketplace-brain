"""
agents/llm/provider.py — LLM provider abstraction.
"""

import logging
from typing import Optional

from app.config import settings
from app.forecasting.model_health import ModelHealthMonitor, LLMProvider
from app.agents.llm.key_rotator import GeminiKeyRotator
from app.agents.llm.cache import LLMCache

logger = logging.getLogger(__name__)


class LLMProvider:
    def __init__(
        self,
        health_monitor: ModelHealthMonitor,
        key_rotator: "GeminiKeyRotator",
        cache: "LLMCache",
    ) -> None:
        self.health = health_monitor
        self.rotator = key_rotator
        self.cache = cache

    async def complete(
        self,
        prompt: str,
        tick: int,
        system: Optional[str] = None,
        max_tokens: int = 512,
    ) -> str:
        cached = self.cache.get(prompt)
        if cached:
            return cached

        if self.health.active_provider.value == "local":
            try:
                result = await self._call_local(prompt, system, max_tokens)
                self.health.record_success(LLMProvider.LOCAL, tick)
                self.cache.set(prompt, result)
                return result
            except Exception as e:
                logger.warning(f"Local model failed: {e}")
                self.health.record_failure(LLMProvider.LOCAL, tick)

        result = await self._call_gemini(prompt, system, max_tokens, tick)
        self.cache.set(prompt, result)
        return result

    async def _call_local(
        self, prompt: str, system: Optional[str], max_tokens: int
    ) -> str:
        raise NotImplementedError("TODO: implement Ollama call")

    async def _call_gemini(
        self, prompt: str, system: Optional[str], max_tokens: int, tick: int
    ) -> str:
        key = self.rotator.next_key()
        if not key:
            raise RuntimeError("No Gemini API keys configured.")
        logger.info(f"Gemini call with key ...{key[-4:]} at tick {tick}")
        return f"[Gemini stub response at tick {tick}] TODO: implement real call"
