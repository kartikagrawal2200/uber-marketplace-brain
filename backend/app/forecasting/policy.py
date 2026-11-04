"""Repositioning policies.  ALL DATA IS SYNTHETIC.

All forecast-driven policies share the same logic; only the forecaster differs:
  baseline arm  -> BaselineForecaster (frozen recent-demand)
  proposed arm  -> HealthMonitor      (LightGBM, with automatic fallback to the baseline)
"""
from . import baseline
from .common import HORIZON
from .supply_model import predict_supply


class BaselineForecaster:
    last_source, last_reason = "baseline", "frozen recent-demand baseline"

    def forecast(self, history):
        return baseline.predict(history), "baseline", "frozen recent-demand baseline"


def no_reposition_policy(engine):
    return []


class ForecastPolicy:
    """Every `interval` minutes, rebalance idle drivers toward where the forecast says requests will appear.

    Desired supply in a zone = (all idle + incoming drivers in the city) x (zone's share of forecast requests).
    Zones below their desired supply are deficits; zones above it with idle drivers are donors.
    """

    def __init__(self, forecaster, interval=3, max_moves=6, max_travel=4, min_gap=4.0):
        self.forecaster = forecaster
        self.interval, self.max_moves, self.max_travel, self.min_gap = interval, max_moves, max_travel, min_gap
        self.last = {"source": "baseline", "reason": "not run yet", "forecast": {}, "supply": {}, "moves": []}

    def __call__(self, engine):
        if engine.t % self.interval or not engine.history:
            return []
        history = engine.history
        forecast, source, reason = self.forecaster.forecast(history)
        snap = history[-1]
        supply = predict_supply(snap)                       # idle + incoming - finishing
        pool = sum(max(0.0, v) for v in supply.values())
        total_f = sum(forecast.values())
        moves = []
        if total_f > 0 and pool >= 2:
            desired = {z: pool * forecast[z] / total_f for z in forecast}
            gap = {z: desired[z] - max(0.0, supply.get(z, 0.0)) for z in forecast}
            spare = {z: min(float(snap["idle"].get(z, 0)), -gap[z]) for z in forecast if gap[z] <= -self.min_gap}
            budget = self.max_moves
            for to_z in sorted((z for z in gap if gap[z] >= self.min_gap), key=lambda z: -gap[z]):
                want = int(gap[to_z])
                donors = sorted((z for z in spare if spare[z] >= 1 and z != to_z),
                                key=lambda z: engine.travel(z, to_z))
                for from_z in donors:
                    if want <= 0 or budget <= 0 or engine.travel(from_z, to_z) > self.max_travel:
                        continue
                    n = min(int(spare[from_z]), want, budget)
                    if n > 0:
                        moves.append((from_z, to_z, n))
                        spare[from_z] -= n
                        want -= n
                        budget -= n
        self.last = {"source": source, "reason": reason, "forecast": forecast, "supply": supply, "moves": moves}
        return moves
