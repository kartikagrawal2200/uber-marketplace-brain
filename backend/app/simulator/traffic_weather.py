"""
simulator/traffic_weather.py — Traffic and weather state machine.
"""

import numpy as np
from typing import Dict

WEATHER_STATES = ["clear", "cloudy", "rain", "heavy_rain", "storm"]

WEATHER_TRANSITIONS = np.array([
    [0.70,   0.20,  0.08,  0.02,  0.00],
    [0.30,   0.40,  0.20,  0.08,  0.02],
    [0.10,   0.25,  0.45,  0.15,  0.05],
    [0.05,   0.10,  0.30,  0.40,  0.15],
    [0.02,   0.08,  0.20,  0.30,  0.40],
])


class WeatherEngine:
    def __init__(self, rng: np.random.Generator, initial: str = "clear") -> None:
        self.rng = rng
        self.current = initial

    def tick(self) -> str:
        idx = WEATHER_STATES.index(self.current)
        probs = WEATHER_TRANSITIONS[idx]
        self.current = self.rng.choice(WEATHER_STATES, p=probs)
        return self.current


class TrafficEngine:
    def __init__(self, rng: np.random.Generator) -> None:
        self.rng = rng
        self.congestion: Dict[int, float] = {z: 0.3 for z in range(1, 13)}

    def tick(self, hour: float, event_zones: Dict[int, float]) -> None:
        for zone_id in self.congestion:
            delta = self.rng.normal(0, 0.05)
            self.congestion[zone_id] = float(
                np.clip(self.congestion[zone_id] + delta + event_zones.get(zone_id, 0.0), 0.0, 1.0)
            )

    def get_congestion(self, zone_id: int) -> float:
        return self.congestion.get(zone_id, 0.3)

    def eta_multiplier(self, zone_id: int) -> float:
        c = self.get_congestion(zone_id)
        return 1.0 + 2.0 * c
