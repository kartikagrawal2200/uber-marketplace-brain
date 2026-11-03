"""engine.py -- tick-based ride-hailing simulation engine (1 tick = 1 simulated minute)."""
import time
import numpy as np
import pandas as pd

try:
    from app.simulator.city import N_ZONES, ZONE_TYPES, get_base_demand, MANHATTAN
    from app.simulator.demand import DemandGenerator
    from app.simulator.drivers import Driver, State, drop_stale, match
    from app.simulator.traffic_weather import Weather, congestion, travel_time
    from app.simulator.events import EventManager
except ImportError:
    try:
        from .city import N_ZONES, ZONE_TYPES, get_base_demand, MANHATTAN
        from .demand import DemandGenerator
        from .drivers import Driver, State, drop_stale, match
        from .traffic_weather import Weather, congestion, travel_time
        from .events import EventManager
    except ImportError:
        from city import N_ZONES, ZONE_TYPES, get_base_demand, MANHATTAN
        from demand import DemandGenerator
        from drivers import Driver, State, drop_stale, match
        from traffic_weather import Weather, congestion, travel_time
        from events import EventManager

LABEL = "SYNTHETIC DATA - simulated, not real ride-hailing data"


class Engine:
    def __init__(self, seed=42, n_drivers=30, speed=0.0):
        self.rng = np.random.default_rng(seed)
        self.t = 0
        self.hour = 8
        self.speed = speed
        self.events = EventManager()
        self.weather = Weather()
        self.demand = DemandGenerator(self.rng)
        self.drivers = [Driver(i, i % N_ZONES, self.rng) for i in range(n_drivers)]
        self.pending = []
        self.history = []

    def tick(self):
        self.t += 1
        self.hour = (8 + (self.t // 60)) % 24

        weather_state = self.weather.step(self.rng)
        w_factor = 1.3 if weather_state == "rain" else (1.6 if weather_state == "heavy_rain" else 1.0)
        event_factors, active_events = self.events.step(self.t)

        new_reqs = self.demand.step(self.t, self.hour, w_factor, event_factors)
        self.pending.extend(new_reqs)

        # Match idle
        idles = [d for d in self.drivers if d.state == State.IDLE]
        matches = match(idles, self.pending)
        for d, req in matches:
            d.state = State.ON_TRIP
            d.time_left = travel_time(d.zone, req.dest, MANHATTAN)
            d.zone = req.dest
            d.completed += 1
            d.earnings += req.fare
            self.pending.remove(req)

        # Advance drivers on trip
        for d in self.drivers:
            if d.state == State.ON_TRIP:
                d.time_left -= 1
                if d.time_left <= 0:
                    d.state = State.IDLE

        snap = self.snapshot()
        self.history.append(snap)
        return snap

    def snapshot(self):
        zone_demands = {z: sum(1 for r in self.pending if r.orig == z) for z in range(N_ZONES)}
        zone_idles = {z: sum(1 for d in self.drivers if d.state == State.IDLE and d.zone == z) for z in range(N_ZONES)}
        return {
            "tick": self.t,
            "hour": self.hour,
            "weather": self.weather.state,
            "demand": zone_demands,
            "idle": zone_idles,
            "pending_count": len(self.pending),
            "completed": sum(d.completed for d in self.drivers),
        }
