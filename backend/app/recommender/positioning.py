"""Driver positioning: given the driver's zone, score every zone and return
{"destination": <zone or "stay">, "reason": str, "numbers": {...}}.

score(zone) = w.gap * (demand - supply - crowding_penalty)
              - w.travel_per_min * travel_minutes
              - w.congestion * congestion          (congestion in 0..1)
Staying = same formula with travel 0 for the current zone.
Move only if the best zone has a positive adjusted gap AND beats staying by
at least w.min_gain (avoids pointless relocations).
"""
from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Callable, Dict, Mapping, Optional

from anti_crowding import AntiCrowding

STAY = "stay"


@dataclass(frozen=True)
class ZoneState:
    zone_id: str
    demand: float       # forecast rides/hour
    supply: float       # forecast available drivers (same unit)
    congestion: float = 0.0  # 0 (free) .. 1 (gridlock)


@dataclass(frozen=True)
class Weights:
    gap: float = 1.0
    travel_per_min: float = 0.15
    congestion: float = 3.0
    min_gain: float = 1.0


TravelFn = Callable[[str, str], Optional[float]]  # minutes, or None if unreachable


def _score(z: ZoneState, travel_min: float, penalty: float, w: Weights) -> dict:
    raw_gap = z.demand - z.supply
    gap = raw_gap - penalty
    cong = min(max(z.congestion, 0.0), 1.0)
    score = w.gap * gap - w.travel_per_min * travel_min - w.congestion * cong
    return {"zone": z.zone_id, "demand": z.demand, "supply": z.supply,
            "raw_gap": round(raw_gap, 2), "crowding_penalty": round(penalty, 2),
            "adjusted_gap": round(gap, 2), "travel_min": round(travel_min, 1),
            "congestion": round(cong, 2), "score": round(score, 2)}


def recommend(current_zone: str, zones: Mapping[str, ZoneState], travel_minutes: TravelFn,
              *, driver_id: Optional[str] = None, crowding: Optional[AntiCrowding] = None,
              weights: Weights = Weights()) -> Dict:
    cur = zones.get(current_zone)
    if cur is None:
        return {"destination": STAY,
                "reason": f"No forecast for current zone {current_zone}; not moving without data.",
                "numbers": {}}

    def pen(zid: str) -> float:
        return crowding.penalty(zid, exclude_driver=driver_id) if crowding else 0.0

    stay = _score(cur, 0.0, pen(current_zone), weights)
    cands = []
    for zid in sorted(zones):
        if zid == current_zone:
            continue
        t = travel_minutes(current_zone, zid)
        if t is None:
            continue
        cands.append(_score(zones[zid], float(t), pen(zid), weights))

    ranked = sorted(cands, key=lambda c: (-c["score"], c["travel_min"], c["zone"]))
    numbers = {"stay": stay, "alternatives": ranked[:3], "weights": asdict(weights)}
    viable = [c for c in ranked if c["adjusted_gap"] > 0]

    if not viable:
        return {"destination": STAY, "numbers": numbers,
                "reason": "No other zone has a forecast driver shortfall after crowding adjustment."}
    best = viable[0]
    if best["score"] - stay["score"] < weights.min_gain:
        return {"destination": STAY, "numbers": numbers,
                "reason": (f"Best alternative {best['zone']} scores {best['score']} vs "
                           f"{stay['score']} for staying; gain is below {weights.min_gain}.")}
    numbers["chosen"] = best
    return {"destination": best["zone"], "numbers": numbers,
            "reason": (f"{best['zone']} has {best['adjusted_gap']} more rides/hr of demand than "
                       f"drivers (after {best['crowding_penalty']} for drivers already heading there), "
                       f"{best['travel_min']} min away, congestion {best['congestion']}; "
                       f"score {best['score']} vs {stay['score']} for staying.")}


def accept(result: Dict, driver_id: str, crowding: AntiCrowding) -> None:
    """Call when the driver accepts the recommendation, so others see the zone as busier."""
    if result["destination"] != STAY:
        crowding.record_acceptance(driver_id, result["destination"])
