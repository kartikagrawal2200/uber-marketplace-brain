"""api/admin.py -- REST endpoints for the Admin dashboard.  ALL DATA IS SYNTHETIC."""
import json
import os

from fastapi import APIRouter

from app.evaluation.run_eval import RESULTS_PATH

router = APIRouter()
world = None           # set by main.py
SCENARIOS = ["stadium", "surge", "rain", "stale", "reset"]


@router.get("/state")
async def get_full_state() -> dict:
    return world.snapshot()


@router.post("/scenario/{name}")
async def trigger_scenario(name: str) -> dict:
    if name not in SCENARIOS:
        return {"error": f"Unknown scenario. Available: {SCENARIOS}"}
    return {"scenario": name, "ok": world.set_scenario(name), "active": world.scenarios()}


@router.get("/metrics")
async def get_metrics() -> dict:
    """Last saved evaluation (baseline vs proposed) from evaluation/results.json."""
    if not os.path.exists(RESULTS_PATH):
        return {"data": "SYNTHETIC", "error": "No evaluation yet. Run: python -m app.evaluation.run_eval"}
    with open(RESULTS_PATH, encoding="utf-8") as f:
        return json.load(f)
