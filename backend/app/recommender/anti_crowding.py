"""Anti-crowding: remember which zones drivers accepted, so the next driver
sees those zones as less attractive and gets a different destination."""
from __future__ import annotations

import threading
import time
from typing import Callable, Dict, Optional, Tuple


class AntiCrowding:
    """Tracks accepted recommendations (one live acceptance per driver).

    penalty(zone) is in the same unit as forecast demand/supply (rides/hour):
    each driver already heading to a zone is expected to absorb `per_driver`
    of that zone's shortfall.
    """

    def __init__(self, ttl_s: float = 600.0, per_driver: float = 1.0,
                 clock: Callable[[], float] = time.monotonic):
        self.ttl_s = ttl_s
        self.per_driver = per_driver
        self._clock = clock
        self._lock = threading.Lock()
        self._accepted: Dict[str, Tuple[str, float]] = {}  # driver -> (zone, expires_at)

    def _purge(self) -> None:
        now = self._clock()
        for d in [d for d, (_, exp) in self._accepted.items() if exp <= now]:
            del self._accepted[d]

    def record_acceptance(self, driver_id: str, zone_id: str) -> None:
        """A driver accepted a recommendation. Replaces their previous one."""
        with self._lock:
            self._purge()
            self._accepted[driver_id] = (zone_id, self._clock() + self.ttl_s)

    def release(self, driver_id: str) -> None:
        """Driver arrived, cancelled, or went offline."""
        with self._lock:
            self._accepted.pop(driver_id, None)

    def pending(self, zone_id: str, exclude_driver: Optional[str] = None) -> int:
        with self._lock:
            self._purge()
            return sum(1 for d, (z, _) in self._accepted.items()
                       if z == zone_id and d != exclude_driver)

    def penalty(self, zone_id: str, exclude_driver: Optional[str] = None) -> float:
        return self.pending(zone_id, exclude_driver) * self.per_driver
