"""engine.py -- tick-based ride-hailing simulation (1 tick = 1 simulated minute).
*** SYNTHETIC DATA: nothing here is real ride-hailing data. ***

Fixed random seed: the engine uses three independent generators (demand, weather, driver placement) spawned
from one seed, so the SAME seed gives the SAME requests and weather no matter which policy is running.
"""
import time

import numpy as np

from .city import N_ZONES, DATA_LABEL, ZONE_TYPES
from .demand import DemandGenerator
from .drivers import Driver, State, DEFAULT_GPS_STALE_MINUTES, drop_stale, match
from .events import EventManager, trigger_rain, trigger_stadium_end, trigger_surge
from .traffic_weather import Traffic, Weather

HORIZON = 15      # minutes used for "incoming" supply


class Engine:
    def __init__(self, seed=42, n_drivers=70, speed=0.0, policy=None, start_hour=8, start_day=0,
                 history_limit=240, gps_stale_minutes=DEFAULT_GPS_STALE_MINUTES, manual_driver=None):
        self.seed = seed
        self.speed = speed                  # simulated minutes per real second for run(realtime=True); 0 = max speed
        self.policy = policy
        self.start_hour, self.start_day = start_hour, start_day
        self.gps_stale_minutes = gps_stale_minutes
        self.history_limit = history_limit

        demand_rng, weather_rng, _ = [np.random.default_rng(s) for s in np.random.SeedSequence(seed).spawn(3)]
        self.demand = DemandGenerator(demand_rng)
        self.weather = Weather(weather_rng)
        self.traffic = Traffic()
        self.events = EventManager()

        self.t = 0
        self.hour, self.day = start_hour, start_day
        self.drivers = [Driver(i, i % N_ZONES) for i in range(n_drivers)]
        if manual_driver is not None:
            self.drivers[manual_driver].manual = True
        self.pending = []
        self.history = []
        self.hold_manual = False            # True while the demo driver has a recommendation on screen
        self.input_age_minutes = 0          # fault injection: how old the forecast inputs are

        self.total_requests = 0
        self.completed_requests = 0
        self.expired_requests = 0
        self.wait_sum = 0.0
        self.waits = 0
        self.new_by_zone = [0] * N_ZONES
        self.zone_total = [0] * N_ZONES
        self.zone_completed = [0] * N_ZONES
        self.zone_expired = [0] * N_ZONES
        self.traffic.update(self.hour, self.weather.state)

    # -- event triggers (same names as events.py) --------------------------------------
    def trigger_stadium_end(self, zone=None, **kw):   # kw: duration, peak, delay
        trigger_stadium_end(self, zone, **kw)

    def trigger_surge(self, zone, **kw):
        trigger_surge(self, zone, **kw)

    def trigger_rain(self, **kw):
        trigger_rain(self, **kw)

    # -- helpers ----------------------------------------------------------------------
    def travel(self, a, b):
        return self.traffic.travel_minutes(a, b)

    def inject_gps_dropout(self, driver_ids, minutes):
        """Fault injection: these drivers stop sending GPS pings for `minutes` minutes."""
        for d in self.drivers:
            if d.id in set(driver_ids):
                d.gps_blackout_until = self.t + minutes

    def reposition(self, from_zone, to_zone, n):
        """Send up to n idle, fresh, non-manual drivers from one zone to another. Returns how many moved."""
        moved = 0
        for d in self.drivers:
            if moved >= n:
                break
            if d.active and d.is_available() and d.zone == from_zone and not d.manual:
                d.start_reposition(to_zone, self.travel(from_zone, to_zone))
                moved += 1
        return moved

    def reposition_driver(self, driver_id, to_zone):
        d = self.drivers[driver_id]
        if d.is_available() and d.zone != to_zone:
            d.start_reposition(to_zone, self.travel(d.zone, to_zone))
            return True
        return False

    # -- one simulated minute ------------------------------------------------------------
    def tick(self):
        self.t += 1
        minutes = self.start_hour * 60 + self.t
        self.hour = (minutes // 60) % 24
        self.day = (self.start_day + minutes // 1440) % 7

        weather = self.weather.step(self.t)
        self.traffic.update(self.hour, weather, self.events.congestion_extra(self.t))
        event_f = self.events.demand_factors(self.t)
        surge_f = self.events.surge_factors(self.t)

        # GPS pings, then stale-GPS removal from the available pool
        for d in self.drivers:
            if self.t >= d.gps_blackout_until:
                d.update_gps(self.t)
        fresh = {d.id for d in drop_stale(self.drivers, self.t, self.gps_stale_minutes)}
        for d in self.drivers:
            d.active = d.id in fresh

        # new requests (Poisson)
        new = self.demand.step(self.t, self.hour, self.day, weather, event_f, surge_f)
        self.total_requests += len(new)
        self.new_by_zone = [0] * N_ZONES
        for r in new:
            self.new_by_zone[r.orig] += 1
            self.zone_total[r.orig] += 1
        self.pending.extend(new)

        # riders give up after max_wait minutes
        keep = []
        for r in self.pending:
            if self.t - r.created_t > r.max_wait:
                r.status = "expired"
                self.expired_requests += 1
                self.zone_expired[r.orig] += 1
            else:
                keep.append(r)
        self.pending = keep

        # match
        available = [d for d in self.drivers
                     if d.active and d.is_available() and not (d.manual and self.hold_manual)]
        just_assigned = set()
        for d, r in match(available, self.pending, self.travel, self.t):
            d.assign(r)
            just_assigned.add(d.id)          # stays ASSIGNED for this minute, starts driving next minute
            self.pending.remove(r)

        # advance every driver's state machine
        for d in self.drivers:
            if d.id in just_assigned:
                continue
            done = d.advance(self.t, self.travel)
            if done is not None:
                self.completed_requests += 1
                self.zone_completed[done.orig] += 1
                self.wait_sum += max(0, done.pickup_t - done.created_t)
                self.waits += 1

        snap = self.snapshot()
        self.history.append(snap)
        if self.history_limit and len(self.history) > self.history_limit:
            del self.history[: len(self.history) - self.history_limit]

        if self.policy is not None:
            for from_z, to_z, n in self.policy(self) or []:
                self.reposition(from_z, to_z, n)
        return snap

    def run(self, n_ticks, realtime=False):
        for _ in range(n_ticks):
            self.tick()
            if realtime and self.speed > 0:
                time.sleep(1.0 / self.speed)
        return self.stats()

    # -- state ----------------------------------------------------------------------
    def snapshot(self):
        idle = [0] * N_ZONES
        incoming = [0] * N_ZONES
        pending = [0] * N_ZONES
        for r in self.pending:
            pending[r.orig] += 1
        for d in self.drivers:
            if not d.active:
                continue
            if d.is_available():
                idle[d.zone] += 1
            eta, where = d.eta_free(self.travel)
            if 0 < eta <= HORIZON:
                incoming[where] += 1
        weather = self.weather.state
        ev_f = self.events.demand_factors(self.t)
        sv_f = self.events.surge_factors(self.t)
        soon, eta = self.events.scheduled_features(self.t)
        return {
            "label": DATA_LABEL,
            "tick": self.t,
            "clock": f"{self.hour:02d}:{self.t % 60:02d}",
            "hour": self.hour,
            "day": self.day,
            "weather": weather,
            "age_minutes": self.input_age_minutes,
            "events": self.events.snapshot(self.t),
            "requests": {z: self.new_by_zone[z] for z in range(N_ZONES)},      # NEW requests this minute
            "pending": {z: pending[z] for z in range(N_ZONES)},
            "idle": {z: idle[z] for z in range(N_ZONES)},
            "incoming": {z: incoming[z] for z in range(N_ZONES)},
            # queued requests that will absorb supply first (spec term: "finishing trips" subtracted from supply)
            "finishing": {z: pending[z] for z in range(N_ZONES)},
            "event_factor": {z: round(ev_f[z], 3) for z in range(N_ZONES)},
            "event_soon": {z: round(soon[z], 3) for z in range(N_ZONES)},      # announced, starts within 15 min
            "event_eta": {z: eta[z] for z in range(N_ZONES)},
            "surge": {z: sv_f[z] for z in range(N_ZONES)},
            "congestion": {z: round(float(self.traffic.mult[z]), 2) for z in range(N_ZONES)},
            "stats": self.stats(),
        }

    def stats(self):
        n = max(1, self.total_requests)
        return {
            "total_requests": self.total_requests,
            "completed_requests": self.completed_requests,
            "expired_requests": self.expired_requests,
            "fulfilment_rate": self.completed_requests / n,
            "avg_wait_min": (self.wait_sum / self.waits) if self.waits else 0.0,
            "active_drivers": sum(1 for d in self.drivers if d.active),
            "idle_drivers": sum(1 for d in self.drivers if d.active and d.is_available()),
        }
