"""
simulator/demand.py — Poisson ride-request generation.
"""

import numpy as np
from typing import Dict

from app.simulator.city import Zone


def time_of_day_factor(hour: float) -> float:
    return 1.0


def weather_factor(weather: str) -> float:
    factors = {
        "clear":      1.0,
        "cloudy":     1.05,
        "rain":       1.3,
        "heavy_rain": 1.6,
        "storm":      1.8,
    }
    return factors.get(weather, 1.0)


def compute_lambda(
    zone: Zone,
    hour: float,
    weather: str,
    event_multiplier: float = 1.0,
) -> float:
    lam = (
        zone.base_demand_rate
        * time_of_day_factor(hour)
        * weather_factor(weather)
        * event_multiplier
    )
    return max(0.0, lam)


def generate_requests(
    zone: Zone,
    hour: float,
    weather: str,
    event_multiplier: float,
    rng: np.random.Generator,
) -> int:
    lam = compute_lambda(zone, hour, weather, event_multiplier)
    return int(rng.poisson(lam))
