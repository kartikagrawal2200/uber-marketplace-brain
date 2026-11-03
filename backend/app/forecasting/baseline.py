"""Frozen recent-demand baseline (no learning).  ALL DATA IS SYNTHETIC."""
from .common import HORIZON, all_zones, request_matrix

N_MINUTES = 30


def predict(snapshot_history, n_minutes=N_MINUTES):
    recent = snapshot_history[-n_minutes:] if len(snapshot_history) >= n_minutes else snapshot_history
    if not recent:
        return {}
    zones = all_zones(recent[-1])
    mat = request_matrix(recent)
    means = np.mean(mat, axis=0) if mat.shape[0] else np.zeros(len(zones))
    return {z: float(means[i] * HORIZON) for i, z in enumerate(zones)}
