"""
agents/tools.py — Tool functions that read real simulator data for agent use.
"""

from typing import Dict, List, Optional


def get_zone_demand(zone_id: int) -> dict:
    return {
        "zone_id": zone_id,
        "pending_requests": 0,
        "forecast_15min": 0.0,
        "baseline_15min": 0.0,
        "note": "TODO: connect to live engine",
    }


def get_active_events(tick: int) -> List[dict]:
    return [{"note": "TODO: connect to EventEngine"}]


def get_surge_zones() -> List[dict]:
    return [{"note": "TODO: implement surge zone detection"}]


def get_idle_driver_distribution() -> Dict[int, int]:
    return {z: 0 for z in range(1, 13)}


def get_driver_stats(driver_id: str) -> dict:
    return {
        "driver_id": driver_id,
        "completed_rides": 0,
        "total_earnings": 0.0,
        "acceptance_rate": 0.0,
        "note": "TODO: connect to driver state",
    }


TOOL_REGISTRY = {
    "get_zone_demand": get_zone_demand,
    "get_active_events": get_active_events,
    "get_surge_zones": get_surge_zones,
    "get_idle_driver_distribution": get_idle_driver_distribution,
    "get_driver_stats": get_driver_stats,
}
