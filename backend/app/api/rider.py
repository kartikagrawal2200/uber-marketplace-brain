"""api/rider.py -- REST endpoints for the Rider app.  ALL DATA IS SYNTHETIC."""
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()
world = None           # set by main.py


class RideRequestCreate(BaseModel):
    pickup_zone_id: int          # 1..12
    dropoff_zone_id: int
    rider_id: str


@router.post("/request")
async def create_ride_request(body: RideRequestCreate) -> dict:
    b = world.book(body.pickup_zone_id)
    return {"data": "SYNTHETIC", "request_id": b["id"], "status": b["status"], "eta_min": b["eta_min"],
            "fare_estimate": b["fare_estimate"], "surge": b["surge"], "driver": b["driver"]}


@router.get("/zones")
async def zones() -> dict:
    return {"data": "SYNTHETIC", "zones": world.snapshot()["zones"]}
