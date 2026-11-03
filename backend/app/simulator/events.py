"""events.py -- scheduled demand spikes, surge pricing, forced rain."""
from dataclasses import dataclass
import numpy as np

try:
    from app.simulator.city import N_ZONES, get_neighbors
except ImportError:
    try:
        from .city import N_ZONES, get_neighbors
    except ImportError:
        from city import N_ZONES, get_neighbors


@dataclass
class Event:
    kind: str
    target_zone: int
    multiplier: float
    start_t: int
    end_t: int


class EventManager:
    def __init__(self):
        self.events = []

    def schedule(self, kind, target_zone, multiplier, start_t, duration):
        self.events.append(Event(kind, target_zone, multiplier, start_t, start_t + duration))

    def step(self, t):
        factors = [1.0] * N_ZONES
        active = []
        for e in self.events:
            if e.start_t <= t < e.end_t:
                factors[e.target_zone] *= e.multiplier
                for nbr in get_neighbors(e.target_zone):
                    factors[nbr] *= (1.0 + (e.multiplier - 1.0) * 0.3)
                active.append(e)
        return factors, active
