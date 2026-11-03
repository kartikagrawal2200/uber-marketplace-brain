"""
api/driver.py — REST endpoints for the Driver App.
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

router = APIRouter()


class HintResponse(BaseModel):
    driver_id: str
    accepted: bool
    hint_id: Optional[str] = None


class DriverChatQuery(BaseModel):
    message: str
    driver_id: str


@router.get("/hint/{driver_id}")
async def get_positioning_hint(driver_id: str) -> dict:
    return {
        "driver_id": driver_id,
        "action": "stay",
        "target_zone_id": None,
        "reason": "TODO: implement hint retrieval",
        "confidence": 0.0,
        "note": "TODO: connect to PositioningRecommender",
    }


@router.post("/hint/accept")
async def accept_hint(body: HintResponse) -> dict:
    return {"status": "recorded", "note": "TODO: implement acceptance tracking"}


@router.post("/hint/reject")
async def reject_hint(body: HintResponse) -> dict:
    return {"status": "recorded", "note": "TODO: implement rejection tracking"}


@router.get("/earnings/{driver_id}")
async def get_earnings(driver_id: str) -> dict:
    return {
        "driver_id": driver_id,
        "session_earnings": 0.0,
        "completed_rides": 0,
        "earnings_per_hour": 0.0,
        "note": "TODO: connect to engine and DB",
    }


@router.post("/chat")
async def driver_chat(body: DriverChatQuery) -> dict:
    return {
        "response": "TODO: implement driver chat via agent router",
        "agent_type": "TODO",
    }
