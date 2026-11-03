"""
forecasting/baseline.py — FROZEN baseline: recent-demand forecast.

Definition (from docs/baseline_and_metric.md):
    baseline_forecast(zone, t) = actual_demand(zone, t-15min .. t)

This file must not be modified after Hour 1.
"""

from collections import deque
from typing import Dict, Deque

LOOKBACK_TICKS = 30


class BaselineForecaster:
    def __init__(self, zone_ids: list) -> None:
        self.history: Dict[int, Deque[int]] = {
            z: deque([0] * LOOKBACK_TICKS, maxlen=LOOKBACK_TICKS)
            for z in zone_ids
        }

    def record(self, zone_id: int, actual_demand: int) -> None:
        self.history[zone_id].append(actual_demand)

    def forecast(self, zone_id: int) -> float:
        return float(sum(self.history[zone_id]))

    def forecast_all(self) -> Dict[int, float]:
        return {z: self.forecast(z) for z in self.history}
