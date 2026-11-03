"""demand.py -- Poisson ride-request generation.
*** SYNTHETIC DATA: all requests generated here are simulated, not real. ***"""
from dataclasses import dataclass
import numpy as np

try:
    from app.simulator.city import N_ZONES, get_base_demand, ZONE_TYPES, MANHATTAN
except ImportError:
    try:
        from .city import N_ZONES, get_base_demand, ZONE_TYPES, MANHATTAN
    except ImportError:
        from city import N_ZONES, get_base_demand, ZONE_TYPES, MANHATTAN


@dataclass
class Request:
    req_id: int
    t: int
    orig: int
    dest: int
    created_t: int
    pickup_lat: float = 0.0
    pickup_lon: float = 0.0
    dest_lat: float = 0.0
    dest_lon: float = 0.0
    max_wait: int = 10
    fare: float = 0.0
    status: str = "pending"


class DemandGenerator:
    def __init__(self, rng=None):
        self.rng = rng or np.random.default_rng(42)
        self.next_req_id = 0

    def step(self, t, hour, weather_factor=1.0, event_factors=None, surge_factors=None):
        if event_factors is None:
            event_factors = [1.0] * N_ZONES
        if surge_factors is None:
            surge_factors = [1.0] * N_ZONES

        new_requests = []
        for z in range(N_ZONES):
            base_hourly = get_base_demand(z, hour)
            lam_per_min = (base_hourly / 60.0) * weather_factor * event_factors[z]
            surge = surge_factors[z]
            price_elasticity = -0.5
            lam_per_min *= (surge ** price_elasticity)

            count = self.rng.poisson(lam_per_min)
            for _ in range(count):
                dest_weights = np.ones(N_ZONES)
                dest_weights[z] = 0.2
                probs = dest_weights / dest_weights.sum()
                dest = self.rng.choice(N_ZONES, p=probs)

                dist_km = MANHATTAN[z, dest]
                base_fare = 2.50 + 1.20 * dist_km
                fare = round(base_fare * surge, 2)

                req = Request(
                    req_id=self.next_req_id,
                    t=t,
                    orig=z,
                    dest=dest,
                    created_t=t,
                    max_wait=int(self.rng.uniform(6, 12)),
                    fare=fare,
                )
                self.next_req_id += 1
                new_requests.append(req)
        return new_requests
