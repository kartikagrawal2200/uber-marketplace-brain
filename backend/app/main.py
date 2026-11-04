"""main.py -- FastAPI entry point.  ALL DATA IS SYNTHETIC.

* GET  /health
* WS   /ws/state     one tick per TICK_INTERVAL_SECONDS: the real simulator + forecaster state for the 3 apps
* REST /api/rider, /api/driver, /api/admin
Works with NO API keys: the chat assistant falls back to built-in templates when Gemini/Ollama are unavailable.
"""
import asyncio
import json
import logging
import os
from contextlib import asynccontextmanager
from typing import List

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.agents.assistant import Assistant
from app.agents.llm.key_rotator import KeyRotator
from app.agents.llm.provider import LLMProvider
from app.api import admin, driver, rider
from app.config import settings
from app.world import LiveWorld

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("marketplace")

os.environ.setdefault("JWT_SECRET", settings.jwt_secret)
keys = settings.gemini_keys
assistant = Assistant(LLMProvider(rotator=KeyRotator(keys)))
world = LiveWorld(seed=settings.simulation_seed, assistant=assistant, jwt_secret=os.environ["JWT_SECRET"])


class ConnectionManager:
    def __init__(self) -> None:
        self.active: List[WebSocket] = []

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket) -> None:
        if ws in self.active:
            self.active.remove(ws)

    async def broadcast(self, message: dict) -> None:
        for ws in list(self.active):
            try:
                await ws.send_json(message)
            except Exception:
                self.disconnect(ws)


manager = ConnectionManager()


async def tick_loop() -> None:
    while True:
        await asyncio.sleep(settings.tick_interval_seconds)
        try:
            world.step()
            if manager.active:
                await manager.broadcast(world.snapshot())
        except Exception:
            logger.exception("tick failed")


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(tick_loop())
    logger.info("Simulator running (SYNTHETIC data), seed=%s", settings.simulation_seed)
    yield
    task.cancel()


app = FastAPI(title="Uber Marketplace Brain (SYNTHETIC DATA)", version="0.2.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=False, allow_methods=["*"], allow_headers=["*"])
app.include_router(rider.router, prefix="/api/rider", tags=["rider"])
app.include_router(driver.router, prefix="/api/driver", tags=["driver"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
rider.world = driver.world = admin.world = world


@app.get("/health", tags=["system"])
async def health() -> dict:
    return {"status": "ok", "data": "SYNTHETIC", "tick": world.engine.t, "clients": len(manager.active),
            "forecast_source": world.monitor.last_source, "forecast_reason": world.monitor.last_reason,
            "llm": {"gemini_keys": len(keys), "mode": "gemini" if keys else "built-in templates (no keys needed)"}}


@app.websocket("/ws/state")
async def ws_state(ws: WebSocket) -> None:
    await manager.connect(ws)
    out = lambda r: ws.send_json({"simulated": True, **r})
    try:
        await ws.send_json(world.snapshot())
        while True:
            try:
                msg = json.loads(await ws.receive_text())
            except ValueError:
                continue
            kind = msg.get("type")
            if kind == "scenario":
                ok = world.set_scenario(str(msg.get("name")), msg.get("on") if isinstance(msg.get("on"), bool) else None)
                await manager.broadcast(world.snapshot())
                await out({"type": "ack", "what": "scenario", "name": msg.get("name"), "ok": ok})
            elif kind == "rerun_eval":
                loop = asyncio.get_running_loop()
                started = world.start_eval(lambda: asyncio.run_coroutine_threadsafe(
                    manager.broadcast(world.snapshot()), loop))
                await manager.broadcast(world.snapshot())
                await out({"type": "ack", "what": "rerun_eval", "ok": started})
            elif kind == "book":
                await out(world.book(msg.get("zone")))
            elif kind == "login":
                if msg.get("id") and str(msg.get("pin")) == "1234":
                    await out({"type": "login_ok", "driver": {"id": str(msg["id"]), "name": str(msg["id"])}})
                else:
                    await out({"type": "login_err", "error": "Driver ID or PIN is wrong. The demo PIN is 1234."})
            elif kind == "accept_rec":
                ok = world.accept_rec()
                await manager.broadcast(world.snapshot())
                await out({"type": "ack", "what": "accept_rec", "ok": ok})
            elif kind == "ignore_rec":
                world.ignore_rec()
                await manager.broadcast(world.snapshot())
                await out({"type": "ack", "what": "ignore_rec", "ok": True})
            elif kind == "chat":
                reply = await asyncio.to_thread(world.chat, str(msg.get("text", "")), msg.get("id"))
                await out({"type": "chat_reply", "reply_to": msg.get("id"), **reply})
            else:
                await out({"type": "ack", "ok": False, "error": "unknown message type"})
    except WebSocketDisconnect:
        manager.disconnect(ws)
