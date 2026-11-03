"""
api/rider.py — REST endpoints for the Rider App.
"""

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class RideRequestCreate(BaseModel):
    pickup_zone_id: int
    dropoff_zone_id: int
    rider_id: str


class ChatQuery(BaseModel):
    message: str
    rider_id: str


@router.post("/request")
async def create_ride_request(body: RideRequestCreate) -> dict:
    return {
        "request_id": "TODO",
        "status": "pending",
        "estimated_wait_seconds": 0,
        "note": "TODO: implement ride request creation",
    }


@router.get("/status/{request_id}")
async def get_request_status(request_id: str) -> dict:
    return {
        "request_id": request_id,
        "status": "TODO",
        "driver_eta_seconds": None,
        "note": "TODO: implement status lookup",
    }


@router.post("/cancel/{request_id}")
async def cancel_request(request_id: str) -> dict:
    return {"request_id": request_id, "status": "cancelled", "note": "TODO: implement"}


@router.post("/chat")
async def rider_chat(body: ChatQuery) -> dict:
    return {
        "response": "TODO: implement rider chat via agent router",
        "agent_type": "TODO",
    }
