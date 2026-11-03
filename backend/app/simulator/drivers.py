"""drivers.py -- driver state machine, stale-GPS filtering, nearest-idle matching."""
from enum import Enum
import numpy as np

try:
    from app.simulator.city import N_ZONES, MANHATTAN, SPEED_KMH
except ImportError:
    try:
        from .city import N_ZONES, MANHATTAN, SPEED_KMH
    except ImportError:
        from city import N_ZONES, MANHATTAN, SPEED_KMH


class State(Enum):
    IDLE = "idle"
    ASSIGNED = "assigned"
    PICKUP = "pickup"
    ON_TRIP = "on_trip"


class Driver:
    def __init__(self, driver_id, zone, rng=None):
        self.id = driver_id
        self.zone = zone
        self.state = State.IDLE
        self.req_id = None
        self.dest_zone = None
        self.time_left = 0
        self.completed = 0
        self.earnings = 0.0
        self.last_gps_t = 0
        self.rng = rng or np.random.default_rng()

    def update_gps(self, t):
        self.last_gps_t = t

    def is_gps_stale(self, t, threshold_mins=5):
        return (t - self.last_gps_t) > threshold_mins


def drop_stale(drivers, t, threshold_mins=5):
    return [d for d in drivers if not d.is_gps_stale(t, threshold_mins)]


def match(idle_drivers, pending_requests):
    matched = []
    available = set(idle_drivers)
    for req in pending_requests:
        if not available:
            break
        best_d = min(available, key=lambda d: MANHATTAN[d.zone, req.orig])
        matched.append((best_d, req))
        available.remove(best_d)
    return matched
