"""traffic_weather.py -- per-zone congestion, Markov weather, travel times.
*** SYNTHETIC DATA: all traffic/weather values are invented for simulation. ***  Deps: numpy."""
import numpy as np
from city import N_ZONES, ZONE_TYPES, DIST, get_neighbors

WEATHER_STATES = ("clear", "rain", "heavy_rain")
_P = np.array([[0.9990, 0.0010, 0.0000],   # per-minute Markov transition matrix (rain is rare, short)
               [0.0200, 0.9750, 0.0050],
               [0.0000, 0.0300, 0.9700]])
_DEMAND = {"clear": 1.00, "rain": 1.25, "heavy_rain": 1.50}      # demand multiplier
_SLOW = {"clear": 1.00, "rain": 1.25, "heavy_rain": 1.60}        # travel-time multiplier

class Weather:
    def __init__(self, state="clear"):
        self.state = state
    def step(self, rng):
        """One Markov transition (1 tick = 1 minute)."""
        self.state = WEATHER_STATES[rng.choice(3, p=_P[WEATHER_STATES.index(self.state)])]
    @property
    def demand_factor(self): return _DEMAND[self.state]
    @property
    def slowdown(self): return _SLOW[self.state]

# Static extra congestion: stadium/airport zones, plus a smaller bump for their neighbors.
_EXTRA = np.zeros(N_ZONES)
for _z, _t in enumerate(ZONE_TYPES):
    if _t in ("stadium", "airport"):
        _EXTRA[_z] += 0.2
        for _n in get_neighbors(_z): _EXTRA[_n] += 0.1
_OFFICE = np.array([t in ("office", "transit_hub") for t in ZONE_TYPES], float)

def congestion(hour_float):
    """Per-zone congestion multiplier (>=1.0); rush peaks ~8:30 and ~17:30."""
    rush = sum(np.exp(-0.5 * (min(abs(hour_float - c), 24 - abs(hour_float - c)) / 1.5) ** 2) for c in (8.5, 17.5))
    rush = min(1.0, rush)
    return 1.0 + 0.6 * rush + _EXTRA + 0.15 * rush * _OFFICE

def travel_time(a, b, cong, slowdown=1.0):
    """Minutes (int >=1) from zone a to b: 4 + 5/hop, scaled by avg congestion and weather slowdown."""
    return max(1, int(np.ceil((4 + 5 * DIST[a, b]) * 0.5 * (cong[a] + cong[b]) * slowdown)))
