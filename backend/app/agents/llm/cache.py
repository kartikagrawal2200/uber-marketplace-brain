"""
agents/llm/cache.py — Simple in-memory LLM response cache.
"""

from typing import Dict, Optional
import hashlib
import logging

logger = logging.getLogger(__name__)

MAX_CACHE_SIZE = 256


class LLMCache:
    def __init__(self) -> None:
        self._store: Dict[str, str] = {}
        self._hit_count = 0
        self._miss_count = 0

    def _key(self, prompt: str) -> str:
        return hashlib.sha256(prompt.encode()).hexdigest()

    def get(self, prompt: str) -> Optional[str]:
        k = self._key(prompt)
        result = self._store.get(k)
        if result:
            self._hit_count += 1
            logger.debug(f"Cache HIT (hits={self._hit_count})")
        else:
            self._miss_count += 1
        return result

    def set(self, prompt: str, response: str) -> None:
        if len(self._store) >= MAX_CACHE_SIZE:
            oldest = next(iter(self._store))
            del self._store[oldest]
        self._store[self._key(prompt)] = response

    def clear(self) -> None:
        self._store.clear()

    def stats(self) -> dict:
        return {
            "size": len(self._store),
            "hits": self._hit_count,
            "misses": self._miss_count,
            "hit_rate": (
                self._hit_count / max(self._hit_count + self._miss_count, 1)
            ),
        }
