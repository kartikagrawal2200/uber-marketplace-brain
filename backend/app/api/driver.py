"""api/driver.py -- REST endpoints for the Driver app.  ALL DATA IS SYNTHETIC."""
from fastapi import APIRouter

router = APIRouter()
world = None           # set by main.py


@router.get("/hint/{driver_id}")
async def get_positioning_hint(driver_id: str) -> dict:
    rec = world.snapshot()["recommendation"]
    if not rec:
        return {"data": "SYNTHETIC", "driver_id": driver_id, "action": "stay", "target_zone_id": None,
                "reason": "No zone is short of drivers right now.", "confidence": 0.0}
    return {"data": "SYNTHETIC", "driver_id": driver_id, "action": "go", "target_zone_id": rec["zone"],
            "reason": f"{rec['zone_name']}: demand {rec['demand_delta_pct']}% above its hourly average, "
                      f"{rec['drive_min']} min away.", "confidence": rec["confidence"], "source": rec["source"]}


@router.post("/hint/accept")
async def accept_hint() -> dict:
    return {"data": "SYNTHETIC", "status": "accepted" if world.accept_rec() else "no active hint"}


@router.post("/hint/reject")
async def reject_hint() -> dict:
    world.ignore_rec()
    return {"data": "SYNTHETIC", "status": "ignored"}


@router.get("/earnings/{driver_id}")
async def get_earnings(driver_id: str) -> dict:
    return {"data": "SYNTHETIC", "driver_id": driver_id, **world.snapshot()["earnings"]}
