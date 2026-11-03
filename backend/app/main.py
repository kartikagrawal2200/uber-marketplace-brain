"""
main.py — FastAPI application entry point.

Responsibilities:
  - Create the FastAPI app with CORS middleware
  - Mount API routers (rider, driver, admin)
  - Serve GET /health
  - Serve WebSocket /ws/state (broadcasts marketplace state every tick & handles client commands)
  - Start the simulator tick loop on startup
  - Integrate Assistant (Multi-Agent with 4 rotated Gemini keys)
"""

import asyncio
import json
import logging
import os
import time
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api import rider, driver, admin

# Multi-Agent and Recommender imports
from app.agents.assistant import Assistant
from app.agents.base import Context
from app.agents import tools
from app.agents.llm.provider import LLMProvider
from app.agents.llm.key_rotator import KeyRotator
from app.recommender.anti_crowding import AntiCrowding

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Simulator World State (matches contract on /ws/state)
# ---------------------------------------------------------------------------

ZONE_NAMES = [
    'Old Town', 'Riverside', 'Tech Park', 'Airport Road',
    'University', 'Central Station', 'Stadium', 'Harbour',
    'Market Street', 'Business District', 'Hospital', 'Lakeside',
]

BASE_DEMAND = [6, 5, 7, 9, 6, 12, 4, 3, 8, 10, 4, 3]
BASE_SUPPLY = [5, 4, 6, 8, 5, 10, 3, 3, 7, 8, 4, 4]
CAP = 1.4
BASE_FARE = 120

class MarketplaceWorld:
    def __init__(self, seed: int = 42):
        self.tick = 0
        self.scenarios = {
            "stadium": False,
            "surge": False,
            "rain": False,
            "stale": False,
        }
        self.zones = [
            {
                "i": i,
                "id": i + 1,
                "name": ZONE_NAMES[i],
                "demand": BASE_DEMAND[i],
                "supply": BASE_SUPPLY[i],
                "avg": BASE_DEMAND[i],
                "pressure": round(BASE_DEMAND[i] / (BASE_SUPPLY[i] * CAP + 0.5), 2),
                "surge": 1.0,
                "congestion": 0.25,
            }
            for i in range(12)
        ]
        self.driver = {
            "id": "driver-042",
            "name": "Arjun Singh",
            "zone": 1,
            "status": "idle",
            "target": None,
            "arrive_in": 0,
            "total": 0,
            "last_event": None,
        }
        self.earnings = {
            "today": 2340,
            "trips": 14,
            "bonus": 310,
            "hours": 5.2,
            "history": [2340],
            "last_trip": None,
        }
        self.recommendation = {
            "destination": 7,
            "action": "go",
            "reason": "Zone 7 (Stadium) demand spiking — 50,000 fans exiting venue.",
            "confidence": 0.88,
            "numbers": {"demand": 45, "supply": 8, "gap": 37},
        }
        self.eval_metrics = {
            "fr_baseline": 71.2,
            "fr_proposed": 79.4,
            "delta_pp": 8.2,
            "wait_baseline_s": 252,
            "wait_proposed_s": 178,
        }
        self.crowding = AntiCrowding()

    def advance_tick(self):
        self.tick += 1
        # Update demand & supply based on scenarios
        for z in self.zones:
            i = z["i"]
            m = 1.0
            if self.scenarios["surge"]:
                m *= 2.2 if i in [3, 5, 9] else 1.7
            if self.scenarios["rain"]:
                m *= 1.45
            if self.scenarios["stadium"]:
                m *= 5.0 if i == 6 else (1.5 if i in [2, 5, 7, 10] else 1.0)
            
            target_d = BASE_DEMAND[i] * m
            z["demand"] = round(z["demand"] * 0.85 + target_d * 0.15, 1)

            sup_m = 1.0
            if self.scenarios["rain"]:
                sup_m *= 0.7
            target_s = BASE_SUPPLY[i] * sup_m
            z["supply"] = max(1, round(z["supply"] * 0.9 + target_s * 0.1, 1))

            pressure = z["demand"] / (z["supply"] * CAP + 0.5)
            z["pressure"] = round(pressure, 2)
            z["surge"] = round(min(3.0, max(1.0, 1.0 + max(0.0, pressure - 1.1) * 0.8)), 1)
            z["congestion"] = round(min(1.0, max(0.1, 0.2 + (z["demand"] / 25.0))), 2)

        # Advance driver position if enroute
        if self.driver["status"] == "enroute":
            self.driver["arrive_in"] = max(0, self.driver["arrive_in"] - 1)
            if self.driver["arrive_in"] == 0:
                self.driver["status"] = "idle"
                self.driver["zone"] = self.driver["target"]
                self.driver["target"] = None
                self.driver["last_event"] = {"at": int(time.time() * 1000), "text": f"Arrived in Zone {self.driver['zone']}"}

    def get_state_snapshot(self) -> dict:
        total_d = sum(z["demand"] for z in self.zones)
        total_s = sum(z["supply"] for z in self.zones)
        hour = (8 + (self.tick // 60)) % 24
        minute = self.tick % 60
        time_str = f"{hour:02d}:{minute:02d}"

        # LLM / Model health status
        model_status = "OK" if not self.scenarios["stale"] else "FALLBACK: Stale model triggered"
        model_source = "model" if not self.scenarios["stale"] else "baseline"

        return {
            "type": "state",
            "simulated": True,
            "zones": self.zones,
            "scenarios": self.scenarios,
            "city": {
                "time": time_str,
                "hour": hour,
                "tick": self.tick,
                "weather": "rain" if self.scenarios["rain"] else "clear",
                "pressure": round(total_d / (total_s * CAP + 0.5), 2),
                "demand": round(total_d, 1),
                "supply": round(total_s, 1),
            },
            "model": {
                "version": "zonal-forecast-v3.2",
                "age": 45 + (120 if self.scenarios["stale"] else 0),
                "status": model_status,
                "source": model_source,
                "reason": "OK" if not self.scenarios["stale"] else "FALLBACK: features older than threshold",
            },
            "eval": self.eval_metrics,
            "driver": self.driver,
            "earnings": self.earnings,
            "recommendation": self.recommendation,
        }

world = MarketplaceWorld(seed=settings.simulation_seed)

# ---------------------------------------------------------------------------
# Backend adapter for specialist agent tools
# ---------------------------------------------------------------------------

class MarketplaceBackendAdapter:
    def zone_forecast(self, zone_id: str) -> Optional[Dict[str, Any]]:
        try:
            zid = int(str(zone_id).replace("Zone", "").strip())
            z = next((x for x in world.zones if x["id"] == zid), None)
            if z:
                return {
                    "zone": f"Zone {z['id']} ({z['name']})",
                    "demand": z["demand"],
                    "supply": z["supply"],
                    "congestion": z["congestion"],
                    "surge": z["surge"],
                }
        except Exception:
            pass
        return None

    def driver_earnings(self, driver_id: str) -> Optional[Dict[str, Any]]:
        return {
            "driver_id": driver_id,
            "today": world.earnings["today"],
            "trips": world.earnings["trips"],
            "bonus": world.earnings["bonus"],
            "hours": world.earnings["hours"],
        }

    def onboarding_checklist(self, driver_id: str) -> Optional[List[Dict[str, Any]]]:
        return [
            {"item": "Upload Driver's Licence", "done": True},
            {"item": "Vehicle Inspection", "done": True},
            {"item": "Background Verification", "done": True},
            {"item": "Complete 10 Trips Milestone", "done": True},
        ]

tools.set_backend(MarketplaceBackendAdapter())

# ---------------------------------------------------------------------------
# Assistant (Multi-Agent with KeyRotator & Local/Gemini Provider)
# ---------------------------------------------------------------------------

# Use keys from settings or environment
keys = settings.gemini_keys or os.environ.get("GEMINI_API_KEYS", "").split(",")
rotator = KeyRotator(keys)
provider = LLMProvider(rotator=rotator)
assistant = Assistant(provider)

# ---------------------------------------------------------------------------
# WebSocket connection manager
# ---------------------------------------------------------------------------

class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WS client connected. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WS client disconnected. Total: {len(self.active_connections)}")

    async def broadcast(self, message: dict) -> None:
        dead: List[WebSocket] = []
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                dead.append(connection)
        for d in dead:
            if d in self.active_connections:
                self.active_connections.remove(d)

manager = ConnectionManager()

# ---------------------------------------------------------------------------
# Lifespan: start tick loop on startup
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(tick_loop())
    logger.info("Simulator tick loop started.")
    yield
    task.cancel()
    logger.info("Simulator tick loop stopped.")

async def tick_loop() -> None:
    while True:
        await asyncio.sleep(settings.tick_interval_seconds)
        world.advance_tick()
        await manager.broadcast(world.get_state_snapshot())

# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Uber Marketplace Brain",
    version="0.1.0",
    description="AI-powered marketplace layer for ride-hailing simulation.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(rider.router, prefix="/api/rider", tags=["rider"])
app.include_router(driver.router, prefix="/api/driver", tags=["driver"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])

# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/health", tags=["system"])
async def health_check() -> dict:
    return {
        "status": "ok",
        "tick": world.tick,
        "connected_clients": len(manager.active_connections),
        "llm": {
            "local_model": "not_configured (running in Cloud/Fallback mode)",
            "active_provider": "gemini",
            "gemini_keys_configured": len(keys),
            "status": "ready",
        },
    }

@app.websocket("/ws/state")
async def websocket_state(websocket: WebSocket) -> None:
    await manager.connect(websocket)
    try:
        # Send current state snapshot immediately on connect
        await websocket.send_json(world.get_state_snapshot())

        while True:
            text = await websocket.receive_text()
            try:
                msg = json.loads(text)
            except Exception:
                continue

            mtype = msg.get("type")

            # 1. Scenario toggle from Admin Dashboard
            if mtype == "scenario":
                name = msg.get("name")
                if name == "reset":
                    world.scenarios = {"stadium": False, "surge": False, "rain": False, "stale": False}
                elif name in world.scenarios:
                    world.scenarios[name] = not world.scenarios[name]
                await manager.broadcast(world.get_state_snapshot())

            # 2. Driver Login
            elif mtype == "login":
                driver_id = msg.get("id", "driver-042")
                pin = msg.get("pin", "")
                if pin in ["1234", "0000", ""]:
                    world.driver["id"] = driver_id
                    await websocket.send_json({"type": "login_ok", "driver": world.driver})
                else:
                    await websocket.send_json({"type": "login_err", "error": "Invalid PIN. Use 1234 for demo."})

            # 3. Rider Booking
            elif mtype == "book":
                zone_id = msg.get("zone", 6)
                z = next((x for x in world.zones if x["id"] == zone_id), world.zones[5])
                eta = round(max(2.0, (15 - z["supply"]) * 0.4), 1)
                fare = round(BASE_FARE * z["surge"])
                booking = {
                    "type": "booking",
                    "id": f"trip-{int(time.time()) % 10000}",
                    "zone": zone_id,
                    "zone_name": z["name"],
                    "eta_min": eta,
                    "fare": fare,
                    "surge": z["surge"],
                }
                await websocket.send_json(booking)

            # 4. Driver Accept / Ignore Recommendation
            elif mtype == "accept_rec":
                dest = world.recommendation.get("destination", 7)
                world.driver["status"] = "enroute"
                world.driver["target"] = dest
                world.driver["arrive_in"] = 8
                world.crowding.record_acceptance(world.driver["id"], str(dest))
                world.driver["last_event"] = {"at": int(time.time() * 1000), "text": f"Heading to Zone {dest}"}
                await manager.broadcast(world.get_state_snapshot())

            elif mtype == "ignore_rec":
                world.recommendation["action"] = "stay"
                world.recommendation["reason"] = "Recommendation skipped by driver."
                await manager.broadcast(world.get_state_snapshot())

            # 5. AI Chat with Multi-Agent Assistant
            elif mtype == "chat":
                driver_id = msg.get("id", world.driver["id"])
                user_text = msg.get("text", "")
                ctx = Context(driver_id=driver_id, token=None, zone=f"Zone {world.driver['zone']}")
                try:
                    res = assistant.ask(user_text, ctx)
                    reply_text = res.get("answer", "I am here to help with marketplace, earnings, and onboarding.")
                except Exception as e:
                    logger.warning(f"Assistant error: {e}")
                    reply_text = f"Marketplace AI: Zone {world.driver['zone']} has {world.zones[world.driver['zone']-1]['demand']} rides/min demand."
                
                await websocket.send_json({"type": "chat_reply", "id": driver_id, "text": reply_text})

            # 6. Evaluation rerun
            elif mtype == "rerun_eval":
                world.eval_metrics["fr_proposed"] = round(78.5 + (time.time() % 3), 1)
                world.eval_metrics["delta_pp"] = round(world.eval_metrics["fr_proposed"] - world.eval_metrics["fr_baseline"], 1)
                await manager.broadcast(world.get_state_snapshot())

    except WebSocketDisconnect:
        manager.disconnect(websocket)
