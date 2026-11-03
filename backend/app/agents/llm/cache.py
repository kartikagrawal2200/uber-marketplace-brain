"""Thread-safe in-memory TTL + LRU response cache for LLM answers."""
from __future__ import annotations

import hashlib
import threading
import time
from collections import OrderedDict
from typing import Callable, Optional, Tuple


class ResponseCache:
    def __init__(self, max_entries: int = 512, ttl_s: float = 300.0,
                 clock: Callable[[], float] = time.monotonic):
        self.max_entries, self.ttl_s, self._clock = max_entries, ttl_s, clock
        self._d: "OrderedDict[str, Tuple[float, str, str]]" = OrderedDict()
        self._lock = threading.Lock()

    @staticmethod
    def make_key(system: str, prompt: str) -> str:
        return hashlib.sha256(f"{system}\x00{prompt}".encode()).hexdigest()

    def get(self, key: str) -> Optional[Tuple[str, str]]:
        """-> (text, source) or None."""
        with self._lock:
            item = self._d.get(key)
            if item is None:
                return None
            exp, text, source = item
            if exp <= self._clock():
                del self._d[key]
                return None
            self._d.move_to_end(key)
            return text, source

    def set(self, key: str, text: str, source: str) -> None:
        with self._lock:
            self._d[key] = (self._clock() + self.ttl_s, text, source)
            self._d.move_to_end(key)
            while len(self._d) > self.max_entries:
                self._d.popitem(last=False)
