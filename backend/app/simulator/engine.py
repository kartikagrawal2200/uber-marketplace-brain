"""
simulator/engine.py — Main simulation tick loop.
"""

from __future__ import annotations

import uuid
from typing import Dict, List, Optional

import numpy as np
from pydantic import BaseModel

from app.simulator.city import ZONES, Zone, all_zones
from app.simulator.demand import generate_requests
from app.simulator.drivers import Driver, DriverState
from app.simulator.events import EventEngine
from app.simulator.traffic_weather import TrafficEngine, WeatherEngine


class ZoneState(BaseModel):
    zone_id: int
    name: str
    zone_type: str
    pending_requests: int
    idle_drivers: int
    demand_forecast: Optional[float] = None
    congestion: float
    active_event: Optional[str] = None


class RideRequest(BaseModel):
    request_id: str
    zone_id: int
    created_tick: int
    status: str = "pending"


class MarketplaceState(BaseModel):
    tick: int
    simulated_hour: float
    weather: str
    zones: List[ZoneState]
    pending_requests: int
    total_requests: int
    completed_requests: int
    fulfilment_rate: float
    active_drivers: int
    idle_drivers: int
    events: List[str]


class SimulatorEngine:
    TICK_MINUTES = 0.5
    REQUEST_TIMEOUT_TICKS = 20

    def __init__(
        self,
        seed: int = 42,
        n_drivers: int = 30,
        sim_start_hour: float = 8.0,
    ) -> None:
        self.rng = np.random.default_rng(seed)
        self.tick_count = 0
        self.sim_hour = sim_start_hour

        self.weather_engine = WeatherEngine(self.rng)
        self.traffic_engine = TrafficEngine(self.rng)
        self.event_engine = EventEngine()

        self.drivers: Dict[str, Driver] = {}
        zone_ids = list(ZONES.keys())
        for i in range(n_drivers):
            d = Driver(zone_id=zone_ids[i % len(zone_ids)])
            self.drivers[d.driver_id] = d

        self.pending_requests: Dict[str, RideRequest] = {}
        self.all_requests: List[RideRequest] = []
        self.completed_count = 0

    def tick(self) -> MarketplaceState:
        self.tick_count += 1
        self.sim_hour = (self.sim_hour + self.TICK_MINUTES / 60.0) % 24.0

        weather = self.weather_engine.tick()
        demand_multipliers = self.event_engine.get_demand_multipliers(self.tick_count)
        traffic_deltas = self.event_engine.get_traffic_deltas(self.tick_count)
        self.traffic_engine.tick(self.sim_hour, traffic_deltas)

        for zone in all_zones():
            n = generate_requests(
                zone,
                self.sim_hour,
                weather,
                demand_multipliers.get(zone.zone_id, 1.0),
                self.rng,
            )
            for _ in range(n):
                req = RideRequest(
                    request_id=str(uuid.uuid4())[:8],
                    zone_id=zone.zone_id,
                    created_tick=self.tick_count,
                )
                self.pending_requests[req.request_id] = req
                self.all_requests.append(req)

        self._expire_requests()
        self._match_drivers()

        for driver in self.drivers.values():
            driver.tick()
            if driver.state == DriverState.EN_ROUTE and driver.ticks_in_state >= 4:
                driver.complete(fare=12.5)
                self.completed_count += 1

        return self.get_state()

    def get_state(self) -> MarketplaceState:
        active_events = self.event_engine.get_active_events(self.tick_count)
        zone_states = []
        for zone in all_zones():
            pending = sum(
                1 for r in self.pending_requests.values() if r.zone_id == zone.zone_id
            )
            idle = sum(
                1 for d in self.drivers.values()
                if d.zone_id == zone.zone_id and d.state == DriverState.IDLE
            )
            evt = next(
                (e.description for e in active_events if e.zone_id == zone.zone_id), None
            )
            zone_states.append(ZoneState(
                zone_id=zone.zone_id,
                name=zone.name,
                zone_type=zone.zone_type,
                pending_requests=pending,
                idle_drivers=idle,
                congestion=self.traffic_engine.get_congestion(zone.zone_id),
                active_event=evt,
            ))

        total = len(self.all_requests)
        fr = self.completed_count / total if total > 0 else 0.0
        idle_total = sum(1 for d in self.drivers.values() if d.state == DriverState.IDLE)

        return MarketplaceState(
            tick=self.tick_count,
            simulated_hour=round(self.sim_hour, 2),
            weather=self.weather_engine.current,
            zones=zone_states,
            pending_requests=len(self.pending_requests),
            total_requests=total,
            completed_requests=self.completed_count,
            fulfilment_rate=round(fr, 4),
            active_drivers=len(self.drivers),
            idle_drivers=idle_total,
            events=[e.description for e in active_events],
        )

    def _expire_requests(self) -> None:
        expired = [
            rid for rid, req in self.pending_requests.items()
            if self.tick_count - req.created_tick > self.REQUEST_TIMEOUT_TICKS
        ]
        for rid in expired:
            self.pending_requests[rid].status = "timed_out"
            del self.pending_requests[rid]

    def _match_drivers(self) -> None:
        idle_by_zone: Dict[int, List[Driver]] = {}
        for d in self.drivers.values():
            if d.state == DriverState.IDLE:
                idle_by_zone.setdefault(d.zone_id, []).append(d)

        matched_request_ids = []
        for req in list(self.pending_requests.values()):
            zone_drivers = idle_by_zone.get(req.zone_id, [])
            if zone_drivers:
                driver = zone_drivers.pop(0)
                driver.assign(req.request_id)
                req.status = "matched"
                matched_request_ids.append(req.request_id)
                driver.pickup()

        for rid in matched_request_ids:
            del self.pending_requests[rid]
