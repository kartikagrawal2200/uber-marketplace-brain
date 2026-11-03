"""Shared helpers for the forecasting package.  ALL DATA IS SYNTHETIC."""
import numpy as np

DATA_LABEL = "SYNTHETIC"
HORIZON = 15                 # forecast horizon, minutes
LAGS = (5, 15, 30, 60)       # lag windows, minutes
MAX_LAG = max(LAGS)

_WEATHER = {"clear": 0.0, "cloudy": 0.1, "drizzle": 0.3, "rain": 0.6, "heavy_rain": 1.0}


def all_zones(snapshot):
    """Return sorted unique zone IDs from a snapshot's demand dict."""
    return sorted(snapshot.get("demand", {}).keys())


def request_matrix(snapshot_history, key="demand"):
    """(n_ticks, n_zones) float array of past values, ordered by sorted zone ID."""
    if not snapshot_history:
        return np.zeros((0, 0), dtype=float)
    zones = all_zones(snapshot_history[-1])
    rows = []
    for snap in snapshot_history:
        row_dict = snap.get(key, {})
        rows.append([float(row_dict.get(z, 0.0)) for z in zones])
    return np.array(rows, dtype=float)


def weather_score(snap):
    return _WEATHER.get(str(snap.get("weather", "clear")).lower(), 0.0)


def event_count(snap):
    return float(len(snap.get("events", [])))


def make_features(snapshot_history, zone_idx):
    matrix = request_matrix(snapshot_history)
    n_ticks = matrix.shape[0]
    series = matrix[:, zone_idx]
    feats = []
    for lag in LAGS:
        window = series[max(0, n_ticks - lag):]
        feats.append(float(np.mean(window)) if len(window) else 0.0)
    last = snapshot_history[-1]
    feats.append(weather_score(last))
    feats.append(event_count(last))
    feats.append(float(last.get("hour", 0)))
    return np.array(feats, dtype=float)
