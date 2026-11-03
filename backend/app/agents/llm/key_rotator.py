"""
agents/llm/key_rotator.py — Round-robin rotation across Gemini API keys.
"""

from typing import List, Optional
import itertools
import logging

from app.config import settings

logger = logging.getLogger(__name__)


class GeminiKeyRotator:
    def __init__(self, keys: Optional[List[str]] = None) -> None:
        self._keys = keys or settings.gemini_keys
        if not self._keys:
            logger.warning("No Gemini API keys configured! Check .env GEMINI_KEY_1..4")
        self._cycle = itertools.cycle(self._keys) if self._keys else iter([])
        self._current_index = 0

    def next_key(self) -> Optional[str]:
        try:
            key = next(self._cycle)
            self._current_index = (self._current_index + 1) % max(len(self._keys), 1)
            return key
        except StopIteration:
            return None

    def mark_exhausted(self, key: str) -> None:
        logger.warning(f"Key ...{key[-4:]} marked as exhausted")

    @property
    def key_count(self) -> int:
        return len(self._keys)
