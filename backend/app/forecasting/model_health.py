"""
forecasting/model_health.py — LLM staleness checks and fallback switching.
"""

import time
import logging
from enum import Enum
from typing import Optional

logger = logging.getLogger(__name__)

STALE_TICK_THRESHOLD = 3
STALE_SECONDS_THRESHOLD = 30.0


class LLMProvider(str, Enum):
    LOCAL  = "local"
    GEMINI = "gemini"


class ModelHealthMonitor:
    def __init__(self) -> None:
        self.active_provider = LLMProvider.LOCAL
        self.last_local_success_tick: Optional[int] = None
        self.last_local_success_time: Optional[float] = None
        self.consecutive_local_failures = 0
        self.fallback_count = 0

    def record_success(self, provider: LLMProvider, tick: int) -> None:
        if provider == LLMProvider.LOCAL:
            self.last_local_success_tick = tick
            self.last_local_success_time = time.time()
            self.consecutive_local_failures = 0
            if self.active_provider == LLMProvider.GEMINI:
                logger.info("Local model recovered — switching back from Gemini.")
                self.active_provider = LLMProvider.LOCAL

    def record_failure(self, provider: LLMProvider, tick: int) -> None:
        if provider == LLMProvider.LOCAL:
            self.consecutive_local_failures += 1
            logger.warning(
                f"Local model failure #{self.consecutive_local_failures} at tick {tick}"
            )
            if self.consecutive_local_failures >= STALE_TICK_THRESHOLD:
                self._activate_fallback()

    def check_staleness(self, current_tick: int) -> bool:
        if self.last_local_success_time is None:
            return True
        age = time.time() - self.last_local_success_time
        return age > STALE_SECONDS_THRESHOLD

    def _activate_fallback(self) -> None:
        if self.active_provider != LLMProvider.GEMINI:
            logger.warning("Switching to Gemini fallback — local model is stale.")
            self.active_provider = LLMProvider.GEMINI
            self.fallback_count += 1

    def status_dict(self) -> dict:
        return {
            "active_provider": self.active_provider.value,
            "consecutive_local_failures": self.consecutive_local_failures,
            "fallback_count": self.fallback_count,
            "last_local_success_tick": self.last_local_success_tick,
            "status": (
                "healthy" if self.active_provider == LLMProvider.LOCAL else "fallback"
            ),
        }
