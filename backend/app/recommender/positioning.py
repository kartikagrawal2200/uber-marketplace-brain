"""
recommender/positioning.py — Zone positioning recommendations for idle drivers.
"""

from dataclasses import dataclass
from enum import Enum
from typing import List, Dict, Optional


class PositioningAction(str, Enum):
    GO   = "go"
    STAY = "stay"


@dataclass
class PositioningHint:
    driver_id: str
    action: PositioningAction
    current_zone_id: int
    target_zone_id: Optional[int]
    reason: str
    confidence: float
    estimated_earnings_boost: float

    def to_dict(self) -> dict:
        return {
            "driver_id": self.driver_id,
            "action": self.action.value,
            "current_zone_id": self.current_zone_id,
            "target_zone_id": self.target_zone_id,
            "reason": self.reason,
            "confidence": self.confidence,
            "estimated_earnings_boost": self.estimated_earnings_boost,
        }


class PositioningRecommender:
    def __init__(self) -> None:
        pass

    def recommend(
        self,
        idle_drivers: List[dict],
        supply_gaps: Dict[int, float],
        zone_adjacency: Dict[int, List[int]],
    ) -> List[PositioningHint]:
        hints = []
        for driver in idle_drivers:
            hints.append(PositioningHint(
                driver_id=driver["driver_id"],
                action=PositioningAction.STAY,
                current_zone_id=driver["zone_id"],
                target_zone_id=None,
                reason="TODO: implement demand-based positioning logic",
                confidence=0.0,
                estimated_earnings_boost=0.0,
            ))
        return hints
