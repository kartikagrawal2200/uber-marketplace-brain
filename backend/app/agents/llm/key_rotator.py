"""Round-robin Gemini API key rotation with cooldowns."""
from __future__ import annotations

import os
import threading
import time
from typing import Callable, Dict, Iterable, List, Optional


class KeyRotator:
    def __init__(self, keys: Iterable[str], *, rate_limit_cooldown_s: float = 60.0,
                 error_cooldown_s: float = 10.0, clock: Callable[[], float] = time.monotonic):
        self._keys: List[str] = list(dict.fromkeys(k.strip() for k in keys if k and k.strip()))
        self._rl, self._err, self._clock = rate_limit_cooldown_s, error_cooldown_s, clock
        self._cool_until: Dict[str, float] = {}
        self._disabled: set = set()
        self._next = 0
        self._lock = threading.Lock()

    @classmethod
    def from_env(cls, **kw) -> "KeyRotator":
        raw = os.environ.get("GEMINI_API_KEYS") or os.environ.get("GEMINI_API_KEY") or ""
        keys = [k.strip() for k in raw.split(",") if k.strip()]
        if not keys:
            keys = [os.environ.get(f"GEMINI_KEY_{i}", "") for i in range(1, 5)]
        return cls([k for k in keys if k], **kw)

    def __len__(self) -> int:
        return len(self._keys)

    def acquire(self) -> Optional[str]:
        with self._lock:
            now, n = self._clock(), len(self._keys)
            if n == 0:
                return None
            for i in range(n):
                idx = (self._next + i) % n
                k = self._keys[idx]
                if k not in self._disabled and self._cool_until.get(k, 0.0) <= now:
                    self._next = (idx + 1) % n
                    return k
            return None

    def report_success(self, key: str) -> None:
        with self._lock:
            self._cool_until.pop(key, None)

    def report_rate_limited(self, key: str, retry_after_s: Optional[float] = None) -> None:
        with self._lock:
            self._cool_until[key] = self._clock() + (retry_after_s or self._rl)

    def report_error(self, key: str) -> None:
        with self._lock:
            self._cool_until[key] = self._clock() + self._err

    def report_invalid(self, key: str) -> None:
        with self._lock:
            self._disabled.add(key)

    def status(self) -> List[dict]:
        now = self._clock()
        with self._lock:
            return [{"key": "…" + k[-4:], "disabled": k in self._disabled,
                     "cooldown_s": max(0.0, round(self._cool_until.get(k, 0.0) - now, 1))}
                    for k in self._keys]
