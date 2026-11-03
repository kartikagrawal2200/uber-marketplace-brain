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
        self.max = max_entries
        self.ttl = ttl_s
        self.clock = clock
        self._data: "OrderedDict[str, Tuple[str, str, float]]" = OrderedDict()
        self._lock = threading.Lock()

    @staticmethod
    def make_key(namespace: str, prompt: str) -> str:
        h = hashlib.sha256()
        h.update(namespace.encode("utf-8"))
        h.update(b"\x00")
        h.update(prompt.strip().encode("utf-8"))
        return h.hexdigest()

    def get(self, key: str) -> Optional[Tuple[str, str]]:
        with self._lock:
            val = self._data.get(key)
            if val is None:
                return None
            text, source, exp = val
            if exp <= self.clock():
                del self._data[key]
                return None
            self._data.move_to_end(key)
            return text, source

    def set(self, key: str, text: str, source: str) -> None:
        with self._lock:
            if key in self._data:
                self._data.move_to_end(key)
            self._data[key] = (text, source, self.clock() + self.ttl)
            while len(self._data) > self.max:
                self._data.popitem(last=False)
