"""Frozen recent-demand baseline: next 15 min = the last 15 min.  No learning.  ALL DATA IS SYNTHETIC."""
import numpy as np

from .common import HORIZON, history_arrays


def predict(snapshot_history, window=HORIZON):
    """Expected requests per zone over the next HORIZON minutes."""
    if not snapshot_history:
        return {}
    zones, R, *_ = history_arrays(snapshot_history)
    recent = R[-window:]
    scale = HORIZON / len(recent)
    totals = recent.sum(axis=0) * scale
    return {z: float(totals[i]) for i, z in enumerate(zones)}
