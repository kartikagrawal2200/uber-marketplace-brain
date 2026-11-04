"""traffic_weather.py -- per-zone congestion multiplier and clear / rain / heavy_rain weather.
*** SYNTHETIC DATA ***"""
import numpy as np

from .city import N_ZONES, ZONE_TYPES, MANHATTAN

WEATHER_STATES = ("clear", "rain", "heavy_rain")
WEATHER_DEMAND_FACTOR = {"clear": 1.0, "rain": 1.25, "heavy_rain": 1.5}     # more people want rides
WEATHER_SLOWDOWN = {"clear": 1.0, "rain": 1.15, "heavy_rain": 1.35}         # trips take longer


class Weather:
    """Markov weather chain with an override used by events.trigger_rain()."""

    def __init__(self, rng):
        self.rng = rng
        self.state = "clear"
        self.forced_state = None
        self.forced_until = -1

    def force(self, state, until_t):
        self.forced_state, self.forced_until = state, until_t

    def step(self, t):
        p = self.rng.uniform()          # always one draw per tick -> reproducible stream
        if self.forced_state and t < self.forced_until:
            self.state = self.forced_state
            return self.state
        self.forced_state = None
        if self.state == "clear":
            if p < 0.004:
                self.state = "rain"
        elif self.state == "rain":
            if p < 0.03:
                self.state = "clear"
            elif p < 0.04:
                self.state = "heavy_rain"
        else:
            if p < 0.05:
                self.state = "rain"
        return self.state


# How strongly each zone type reacts to rush hour
_RUSH_WEIGHT = {"office": 0.55, "transit_hub": 0.6, "airport": 0.35, "mall": 0.3,
                "residential": 0.25, "stadium": 0.2, "hospital": 0.15}


def rush_level(hour):
    """0..1 rush-hour intensity."""
    if 8 <= hour < 10 or 17 <= hour < 20:
        return 1.0
    if 7 <= hour < 8 or 10 <= hour < 11 or 20 <= hour < 21:
        return 0.5
    return 0.1


class Traffic:
    """Per-zone congestion multiplier (1.0 = free flow, 2.0 = twice as slow)."""

    def __init__(self):
        self.mult = np.ones(N_ZONES)
        self.slowdown = 1.0

    def update(self, hour, weather_state, extra=None):
        rush = rush_level(hour)
        for z in range(N_ZONES):
            m = 1.0 + _RUSH_WEIGHT[ZONE_TYPES[z]] * rush * 0.6
            if extra:
                m += extra.get(z, 0.0)
            self.mult[z] = min(2.5, m)
        self.slowdown = WEATHER_SLOWDOWN[weather_state]

    def travel_minutes(self, a, b):
        """Minutes to drive from zone a to zone b (never less than 1)."""
        base = 2.0 + 2.0 * MANHATTAN[a, b] if a != b else 2.0
        c = (self.mult[a] + self.mult[b]) / 2.0
        return max(1, int(round(base * c * self.slowdown)))
