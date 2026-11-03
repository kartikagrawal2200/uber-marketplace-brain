"""Round-robin Gemini API key rotation with cooldowns.

- acquire(): next usable key (skips disabled / cooling-down keys), or None.
- report_rate_limited(): cooldown (Retry-After or default) after HTTP 429.
- report_invalid(): permanently disable after 401/403/API_KEY_INVALID.
- report_error(): short cooldown after 5xx / network errors.
Keys come from GEMINI_API_KEYS (comma-separated) or GEMINI_API_KEY.
"""
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
        return cls(raw.split(","), **kw)

    def __len__(self) -> int:
        return len(self._keys)

    def acquire(self) -> Optional[str]:
        with self._lock:
            now, n = self._clock(), len(self._keys)
            for i in range(n):
                idx = (self._next + i) % n
                k = self._keys[idx]
                if k not in self._disabled and self._cool_until.get(k, 0.0) <= now:
                    self._next = (idx + 1) % n  # rotate so load spreads across keys
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
