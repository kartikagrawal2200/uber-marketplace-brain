"""demand.py -- Poisson ride-request generation.
*** SYNTHETIC DATA: every request is simulated. ***

    lambda = Base x DayFactor x WeatherFactor x EventFactor x PriceFactor     (per zone, per minute)
"""
from dataclasses import dataclass

import numpy as np

from .city import N_ZONES, MANHATTAN, KM_PER_STEP, get_base_demand, get_day_factor
from .traffic_weather import WEATHER_DEMAND_FACTOR

PRICE_ELASTICITY = -0.5


@dataclass
class Request:
    req_id: int
    orig: int
    dest: int
    created_t: int
    max_wait: int
    fare: float
    surge: float = 1.0
    status: str = "pending"      # pending | assigned | on_trip | completed | expired
    pickup_t: int = -1


def request_rate(zone, hour, day, weather_state, event_factor=1.0, surge=1.0):
    """lambda in requests per MINUTE for one zone."""
    base = get_base_demand(zone, hour)
    day_f = get_day_factor(zone, day)
    weather_f = WEATHER_DEMAND_FACTOR[weather_state]
    price_f = surge ** PRICE_ELASTICITY
    return (base / 60.0) * day_f * weather_f * event_factor * price_f


class DemandGenerator:
    def __init__(self, rng):
        self.rng = rng
        self.next_id = 0

    def step(self, t, hour, day, weather_state, event_factors, surge_factors):
        new = []
        for z in range(N_ZONES):
            lam = request_rate(z, hour, day, weather_state, event_factors[z], surge_factors[z])
            for _ in range(int(self.rng.poisson(lam))):
                w = np.ones(N_ZONES)
                w[z] = 0.15
                dest = int(self.rng.choice(N_ZONES, p=w / w.sum()))
                km = max(1.0, MANHATTAN[z, dest] * KM_PER_STEP)
                fare = round((40 + 14 * km) * surge_factors[z], 2)      # rupees
                max_wait = int(self.rng.integers(6, 13))
                new.append(Request(self.next_id, z, dest, t, max_wait, fare, surge_factors[z]))
                self.next_id += 1
        return new
