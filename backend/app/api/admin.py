"""
api/admin.py — REST endpoints for the Admin Dashboard.
"""

from fastapi import APIRouter
from typing import Optional

router = APIRouter()

AVAILABLE_SCENARIOS = ["stadium_surge", "rain_burst", "stale_model"]


@router.get("/state")
async def get_full_state() -> dict:
    return {"note": "TODO: return engine.get_state()"}


@router.post("/scenario/{scenario_name}")
async def trigger_scenario(scenario_name: str) -> dict:
    if scenario_name not in AVAILABLE_SCENARIOS:
        return {"error": f"Unknown scenario. Available: {AVAILABLE_SCENARIOS}"}
    return {
        "scenario": scenario_name,
        "status": "triggered",
        "note": "TODO: implement scenario trigger logic",
    }


@router.get("/metrics")
async def get_metrics() -> dict:
    return {
        "fulfilment_rate": 0.0,
        "baseline_fulfilment_rate": 0.0,
        "delta_fr_pp": 0.0,
        "total_requests": 0,
        "completed_requests": 0,
        "note": "TODO: connect to engine metrics",
    }


@router.get("/llm_health")
async def get_llm_health() -> dict:
    return {
        "active_provider": "TODO",
        "status": "TODO",
        "fallback_count": 0,
        "note": "TODO: connect to ModelHealthMonitor",
    }


@router.post("/reset")
async def reset_simulation() -> dict:
    return {"status": "reset", "note": "TODO: implement engine reset"}
