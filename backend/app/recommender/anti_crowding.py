"""
recommender/anti_crowding.py — Prevents too many drivers from moving to the same zone.
"""

from typing import Dict, List
from app.recommender.positioning import PositioningHint, PositioningAction


class AntiCrowdingFilter:
    def __init__(self, max_drivers_per_zone: int = 5) -> None:
        self.max_drivers_per_zone = max_drivers_per_zone
        self._inflight: Dict[int, int] = {}

    def filter(self, hints: List[PositioningHint]) -> List[PositioningHint]:
        filtered = []
        for hint in hints:
            if hint.action == PositioningAction.GO and hint.target_zone_id is not None:
                count = self._inflight.get(hint.target_zone_id, 0)
                if count >= self.max_drivers_per_zone:
                    hint.action = PositioningAction.STAY
                    hint.target_zone_id = None
                    hint.reason = f"Zone already receiving {count} drivers — staying put."
                else:
                    self._inflight[hint.target_zone_id] = count + 1
            filtered.append(hint)
        return filtered

    def record_acceptance(self, zone_id: int) -> None:
        self._inflight[zone_id] = self._inflight.get(zone_id, 0) + 1

    def reset_tick(self) -> None:
        self._inflight.clear()

    def get_inflight_counts(self) -> Dict[int, int]:
        return dict(self._inflight)
