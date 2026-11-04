"""Shared helpers for forecasting.  ALL DATA IS SYNTHETIC.

Snapshots come from simulator.engine.Engine.snapshot(). The key used for "demand" is `requests`: the number
of NEW requests created in that simulated minute, per zone.
"""
import numpy as np

DATA_LABEL = "SYNTHETIC"
HORIZON = 15                  # forecast horizon, minutes
LAGS = (5, 15, 30, 60)        # lag windows, minutes
MIN_HISTORY = 30              # minutes of history before the ML model is trusted

_WEATHER = {"clear": 0.0, "rain": 0.6, "heavy_rain": 1.0}
FEATURE_NAMES = ["zone"] + [f"lag_{l}m" for l in LAGS] + ["hour", "is_weekend", "weather", "event_factor", "event_soon", "event_eta"]


def all_zones(snapshot):
    return sorted(snapshot.get("requests", {}).keys())


def weather_score(name):
    return _WEATHER.get(str(name), 0.0)


def history_arrays(history):
    """Turn a list of snapshots into numpy arrays aligned by tick."""
    zones = all_zones(history[-1])
    R = np.array([[float(s["requests"].get(z, 0)) for z in zones] for s in history])
    hours = np.array([s.get("hour", 0) for s in history], dtype=float)
    days = np.array([s.get("day", 0) for s in history], dtype=float)
    wx = np.array([weather_score(s.get("weather")) for s in history])
    evt = np.array([[float(s.get("event_factor", {}).get(z, 1.0)) for z in zones] for s in history])
    soon = np.array([[float(s.get("event_soon", {}).get(z, 1.0)) for z in zones] for s in history])
    eta = np.array([[float(s.get("event_eta", {}).get(z, 99.0)) for z in zones] for s in history])
    return zones, R, hours, days, wx, np.stack([evt, soon, eta])


def features_at(R, hours, days, wx, evt, i):
    """Feature matrix (n_zones x n_features) using only data up to and including row i."""
    n_zones = R.shape[1]
    cs = np.vstack([np.zeros((1, n_zones)), np.cumsum(R, axis=0)])
    cols = [np.arange(n_zones, dtype=float)]
    for lag in LAGS:
        lo = max(0, i + 1 - lag)
        n = i + 1 - lo
        cols.append((cs[i + 1] - cs[lo]) * (lag / n))       # scaled if history is shorter than the lag
    cols.append(np.full(n_zones, hours[i]))
    cols.append(np.full(n_zones, 1.0 if int(days[i]) % 7 >= 5 else 0.0))
    cols.append(np.full(n_zones, wx[i]))
    cols.append(evt[0][i])
    cols.append(evt[1][i])
    cols.append(evt[2][i])
    return np.column_stack(cols)
