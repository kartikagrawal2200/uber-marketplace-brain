"""events.py -- scheduled demand spikes, surge pricing, forced rain.
*** SYNTHETIC DATA: all events are simulated scenarios. ***  Deps: numpy, stdlib."""
from dataclasses import dataclass
import numpy as np
from city import N_ZONES, get_neighbors

@dataclass
class Event:
    kind: str      # stadium_end | surge | rain
    zone: int      # -1 for city-wide (rain)
    end: int       # tick when it expires (exclusive)
    value: float   # demand magnitude / surge multiplier / (2.0 if heavy rain else 1.0)
    value2: float = 1.0   # stadium: neighbor magnitude

class EventManager:
    """Holds active events. `now` is updated by advance(t) each tick, so trigger_* use the current tick."""
    def __init__(self):
        self.now, self.events = 0, []

    def advance(self, now):
        self.now = now
        self.events = [e for e in self.events if e.end > now]

    def trigger_stadium_end(self, zone, duration=30, magnitude=4.0, neighbor_magnitude=1.8):
        """Demand spike in stadium zone (x magnitude) and its neighbors for ~duration minutes."""
        self.events.append(Event("stadium_end", zone, self.now + duration, magnitude, neighbor_magnitude))

    def trigger_surge(self, zone, multiplier=2.0, duration=30):
        """Price surge multiplier in `zone` for `duration` minutes."""
        self.events.append(Event("surge", zone, self.now + duration, multiplier))

    def trigger_rain(self, heavy=False, duration=45):
        """Force rain (or heavy_rain) city-wide for `duration` minutes."""
        self.events.append(Event("rain", -1, self.now + duration, 2.0 if heavy else 1.0))

    def demand_factors(self):
        """Per-zone EventFactor array (product of active stadium events)."""
        f = np.ones(N_ZONES)
        for e in self.events:
            if e.kind == "stadium_end":
                f[e.zone] *= e.value
                for n in get_neighbors(e.zone): f[n] *= e.value2
        return f

    def surge_array(self):
        """Per-zone event-driven surge multiplier (max of active surges, default 1.0)."""
        s = np.ones(N_ZONES)
        for e in self.events:
            if e.kind == "surge": s[e.zone] = max(s[e.zone], e.value)
        return s

    def forced_weather(self):
        """'heavy_rain' / 'rain' while a rain event is active, else None."""
        v = [e.value for e in self.events if e.kind == "rain"]
        return None if not v else ("heavy_rain" if max(v) > 1.5 else "rain")

    def active(self):
        """Human-readable list of active events."""
        return [f"{e.kind}@{e.zone if e.zone >= 0 else 'city'} (until t={e.end})" for e in self.events]
