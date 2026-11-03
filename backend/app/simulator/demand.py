"""demand.py -- Poisson ride-request generation.
*** SYNTHETIC DATA: all requests generated here are simulated, not real. ***
lambda_per_min = Base x DayFactor x WeatherFactor x EventFactor x PriceFactor / 60. Deps: numpy."""
from dataclasses import dataclass
import numpy as np
from city import N_ZONES, ZONE_TYPES, WEEKEND_FACTOR, get_base_demand

@dataclass
class Request:
    id: int
    zone: int        # pickup zone
    dest_zone: int
    time: int        # tick (sim minute) the request was created
    # SYNTHETIC: simulated request, not a real rider

def day_factor(zone, is_weekend):
    """Weekday = 1.0; weekend = per-zone-type factor."""
    return WEEKEND_FACTOR[ZONE_TYPES[zone]] if is_weekend else 1.0

def price_factor(surge):
    """Surge reduces demand: 1/surge^0.5 (works on scalars or arrays)."""
    return 1.0 / np.sqrt(surge)

class DemandGenerator:
    def __init__(self, rng):
        self.rng, self._next_id = rng, 0
        attract = np.array([[get_base_demand(z, h) for h in range(24)] for z in range(N_ZONES)]).mean(1)
        self._dest_p = np.tile(attract, (N_ZONES, 1))      # destination ~ zone attractiveness
        np.fill_diagonal(self._dest_p, 0.0)                # destination != origin
        self._dest_p /= self._dest_p.sum(1, keepdims=True)

    def rates(self, hour, is_weekend, weather_factor, event_factor, surge):
        """Per-zone Poisson lambda per minute (arrays of length 12 for event_factor/surge)."""
        base = np.array([get_base_demand(z, hour) * day_factor(z, is_weekend) for z in range(N_ZONES)])
        return base * weather_factor * np.asarray(event_factor) * price_factor(np.asarray(surge)) / 60.0

    def generate(self, t, hour, is_weekend, weather_factor, event_factor, surge):
        """Draw this tick's requests; returns list[Request] (SYNTHETIC)."""
        counts = self.rng.poisson(self.rates(hour, is_weekend, weather_factor, event_factor, surge))
        out = []
        for z, n in enumerate(counts):
            for _ in range(int(n)):
                out.append(Request(self._next_id, z, int(self.rng.choice(N_ZONES, p=self._dest_p[z])), t))
                self._next_id += 1
        return out
