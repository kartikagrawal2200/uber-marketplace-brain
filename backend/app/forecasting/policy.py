"""Repositioning policies.  ALL DATA IS SYNTHETIC."""
import math
from collections import deque

from .model_health import HealthMonitor
from .supply_model import predict_supply


def baseline_policy(snapshot):
    return []


def proposed_policy(snapshot, monitor=None):
    if monitor is None:
        return []

    forecast, source, reason = monitor.get_forecast(snapshot.get("history", [snapshot]))
    supply = predict_supply(snapshot)

    gaps = {}
    for z in forecast:
        gaps[z] = forecast[z] - supply.get(z, 0.0)

    surplus = [(z, -g) for z, g in gaps.items() if g < 0]
    deficit = [(z, g) for z, g in gaps.items() if g > 0]

    surplus.sort(key=lambda x: -x[1])
    deficit.sort(key=lambda x: -x[1])

    actions = []
    d_idx = 0
    for from_z, s_avail in surplus:
        idle_count = snapshot.get("idle", {}).get(from_z, 0)
        s_avail = min(s_avail, idle_count)
        while s_avail >= 1.0 and d_idx < len(deficit):
            to_z, d_needed = deficit[d_idx]
            move = min(s_avail, d_needed)
            n_int = int(math.floor(move))
            if n_int > 0:
                actions.append((from_z, to_z, n_int))
                s_avail -= n_int
                deficit[d_idx] = (to_z, d_needed - n_int)
                if deficit[d_idx][1] < 1.0:
                    d_idx += 1
            else:
                d_idx += 1
    return actions
