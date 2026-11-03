"""traffic_weather.py -- per-zone congestion, Markov weather, travel times."""
import numpy as np

try:
    from app.simulator.city import N_ZONES, SPEED_KMH
except ImportError:
    try:
        from .city import N_ZONES, SPEED_KMH
    except ImportError:
        from city import N_ZONES, SPEED_KMH

WEATHER_STATES = ("clear", "rain", "heavy_rain")


class Weather:
    def __init__(self):
        self.state = "clear"

    def step(self, rng):
        p = rng.uniform()
        if self.state == "clear":
            if p < 0.05:
                self.state = "rain"
        elif self.state == "rain":
            if p < 0.20:
                self.state = "clear"
            elif p < 0.30:
                self.state = "heavy_rain"
        else:
            if p < 0.40:
                self.state = "rain"
        return self.state


def congestion(zone_id, demand, supply):
    ratio = demand / (supply + 1e-3)
    return float(np.clip(0.1 + 0.3 * (ratio - 1.0), 0.0, 1.0))


def travel_time(orig, dest, dist_matrix, cong=0.2):
    dist = dist_matrix[orig, dest]
    eff_speed = SPEED_KMH * (1.0 - 0.5 * cong)
    return max(1, int(round((dist / eff_speed) * 60)))
