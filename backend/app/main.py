"""
main.py — FastAPI application entry point.

Responsibilities:
  - Create the FastAPI app with CORS middleware
  - Mount API routers (rider, driver, admin)
  - Serve GET /health
  - Serve WebSocket /ws/state (broadcasts marketplace state every tick)
  - Start the simulator tick loop on startup
"""

import asyncio
import json
import logging
from contextlib import asynccontextmanager
from typing import List

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.simulator.engine import SimulatorEngine
from app.api import rider, driver, admin

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# WebSocket connection manager
# ---------------------------------------------------------------------------

class ConnectionManager:
    """Tracks all active WebSocket connections and broadcasts to all of them."""

    def __init__(self) -> None:
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WS client connected. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket) -> None:
        self.active_connections.remove(websocket)
        logger.info(f"WS client disconnected. Total: {len(self.active_connections)}")

    async def broadcast(self, message: dict) -> None:
        """Send JSON payload to every connected client."""
        dead: List[WebSocket] = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                dead.append(connection)
        for d in dead:
            self.active_connections.remove(d)


manager = ConnectionManager()

# ---------------------------------------------------------------------------
# Simulator engine (singleton)
# ---------------------------------------------------------------------------

engine = SimulatorEngine(seed=settings.simulation_seed)

# ---------------------------------------------------------------------------
# Lifespan: start tick loop on startup
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start background tasks on startup; cancel them on shutdown."""
    task = asyncio.create_task(tick_loop())
    logger.info("Simulator tick loop started.")
    yield
    task.cancel()
    logger.info("Simulator tick loop stopped.")


async def tick_loop() -> None:
    """
    Advance the simulation by one tick every TICK_INTERVAL_SECONDS,
    then broadcast the new state to all WebSocket clients.

    TODO: integrate forecasting and recommender updates here.
    """
    while True:
        await asyncio.sleep(settings.tick_interval_seconds)
        state = engine.tick()
        await manager.broadcast(state.model_dump())

# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Uber Marketplace Brain",
    version="0.1.0",
    description="AI-powered marketplace layer for ride-hailing simulation.",
    lifespan=lifespan,
)

# CORS — allow all origins in dev; tighten in prod
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

app.include_router(rider.router, prefix="/api/rider", tags=["rider"])
app.include_router(driver.router, prefix="/api/driver", tags=["driver"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])

# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/health", tags=["system"])
async def health_check() -> dict:
    """
    Health check endpoint.
    Returns service status and current tick count.
    """
    return {
        "status": "ok",
        "tick": engine.tick_count,
        "connected_clients": len(manager.active_connections),
    }


@app.websocket("/ws/state")
async def websocket_state(websocket: WebSocket) -> None:
    """
    WebSocket endpoint that streams marketplace state on every simulator tick.
    """
    await manager.connect(websocket)
    try:
        current_state = engine.get_state()
        await websocket.send_json(current_state.model_dump())

        while True:
            data = await websocket.receive_text()
            logger.debug(f"WS received: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
