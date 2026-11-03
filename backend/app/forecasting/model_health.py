"""Model health checks + automatic fallback to the frozen baseline.  ALL DATA IS SYNTHETIC."""
import numpy as np

from .baseline import predict as baseline_predict
from .common import MAX_LAG, all_zones

DEFAULT_STALENESS_MINUTES = 10
CV_SPIKE_THRESHOLD = 3.0


class HealthMonitor:
    def __init__(self, model, max_staleness_minutes=DEFAULT_STALENESS_MINUTES,
                 cv_threshold=CV_SPIKE_THRESHOLD):
        self.model = model
        self.max_staleness = max_staleness_minutes
        self.cv_threshold = cv_threshold
        self.last_healthy = True
        self.last_reason = "OK"

    def _check(self, snapshot_history):
        if not snapshot_history:
            return False, "EMPTY_HISTORY"

        if len(snapshot_history) < MAX_LAG:
            return False, f"WARMUP: need {MAX_LAG} ticks, have {len(snapshot_history)}"

        current = snapshot_history[-1]
        age = current.get("age_minutes", 0)
        if age > self.max_staleness:
            return False, f"STALE_INPUTS: snapshot age {age}m > {self.max_staleness}m"

        expected_zones = set(all_zones(snapshot_history[-MAX_LAG]))
        current_zones = set(all_zones(current))
        missing = expected_zones - current_zones
        if missing:
            return False, f"MISSING_ZONES: {sorted(missing)}"

        try:
            preds = self.model.predict(snapshot_history)
        except Exception as err:
            return False, f"PREDICT_EXCEPTION: {err}"

        vals = np.array(list(preds.values()), dtype=float)
        if not len(vals):
            return False, "EMPTY_PREDICTIONS"

        if np.any(np.isnan(vals)) or np.any(np.isinf(vals)):
            return False, "NAN_OR_INF_IN_OUTPUT"

        if np.all(vals == 0.0):
            return False, "ALL_ZERO_PREDICTIONS"

        mean = np.mean(vals)
        if mean > 0:
            cv = np.std(vals) / mean
            if cv > self.cv_threshold:
                return False, f"HIGH_VARIANCE_SPIKE: CV {cv:.2f} > {self.cv_threshold}"

        return True, "OK"

    def get_forecast(self, snapshot_history):
        healthy, reason = self._check(snapshot_history)
        self.last_healthy = healthy
        self.last_reason = reason

        if healthy:
            return self.model.predict(snapshot_history), "model", "OK"
        return baseline_predict(snapshot_history), "baseline", f"FALLBACK: {reason}"
