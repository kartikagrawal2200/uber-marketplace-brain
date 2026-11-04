"""Model health checks and automatic fallback to the frozen baseline.  ALL DATA IS SYNTHETIC.

HealthMonitor.forecast(history) -> (forecast, source, reason)
  source "model"    -> reason "OK"
  source "baseline" -> reason starts with "FALLBACK: ..." and says why

It falls back when:
  * inputs are stale     (snapshot older than max_age_minutes)
  * inputs are incomplete (a zone is missing from the latest snapshot)
  * there is too little history to trust the model yet (warm-up)
  * the model's own error is above a threshold (rolling WAPE of its past 15-min forecasts vs what happened)
  * the model raises an error or returns NaN / infinity
The error check keeps scoring the model while on fallback, so it switches back once the error recovers.
"""
from collections import Counter

import numpy as np

from . import baseline
from .common import HORIZON, MIN_HISTORY, history_arrays

DEFAULT_MAX_AGE_MIN = 10
DEFAULT_ERROR_THRESHOLD = 0.55      # rolling WAPE; a healthy model sits near 0.30 on this synthetic data
DEFAULT_WINDOW = 30                 # how many matured forecasts the error check looks at
MIN_SCORED = 12


class HealthMonitor:
    def __init__(self, model, max_age_minutes=DEFAULT_MAX_AGE_MIN, error_threshold=DEFAULT_ERROR_THRESHOLD,
                 window=DEFAULT_WINDOW, expected_zones=12):
        self.model = model
        self.max_age = max_age_minutes
        self.error_threshold = error_threshold
        self.window = window
        self.expected_zones = expected_zones
        self._preds = []                 # (tick, np.array of model forecasts)
        self._errors = []                # (abs_error_sum, actual_sum) for matured forecasts
        self._error_fallback = False
        self.last_reason = "OK"
        self.last_source = "model"
        self.rolling_wape = None
        self.calls = 0
        self.fallback_calls = 0
        self.reasons = Counter()

    # -- scoring the model against what actually happened ------------------------------
    def _score(self, history):
        zones, R, *_ = history_arrays(history)
        now = history[-1]["tick"]
        first_tick = history[0]["tick"]
        keep = []
        for tick, vec in self._preds:
            if tick + HORIZON <= now:
                lo = tick - first_tick + 1
                if lo >= 0 and lo + HORIZON <= R.shape[0]:
                    actual = R[lo:lo + HORIZON].sum(axis=0)
                    self._errors.append((float(np.abs(vec - actual).sum()), float(actual.sum())))
            else:
                keep.append((tick, vec))
        self._preds = keep
        self._errors = self._errors[-self.window:]
        if len(self._errors) >= MIN_SCORED:
            err = sum(e for e, _ in self._errors)
            act = max(1.0, sum(a for _, a in self._errors))
            self.rolling_wape = err / act

    def _input_problem(self, history):
        snap = history[-1]
        age = snap.get("age_minutes", 0)
        if age > self.max_age:
            return f"stale inputs (snapshot is {age} min old, limit {self.max_age} min)"
        missing = [z for z in range(self.expected_zones) if z not in snap.get("requests", {})]
        if missing:
            return f"missing zones {missing} in the latest snapshot"
        if len(history) < MIN_HISTORY:
            return f"warm-up (only {len(history)} min of history, need {MIN_HISTORY})"
        return None

    # -- main entry ---------------------------------------------------------------------
    def forecast(self, history):
        self.calls += 1
        if not history:
            return self._use_baseline(history, "no history yet")

        problem = self._input_problem(history)
        model_pred = None
        if problem is None or problem.startswith("warm-up"):
            try:
                model_pred = self.model.predict(history)
                vec = np.array(list(model_pred.values()), dtype=float)
                if not np.all(np.isfinite(vec)):
                    model_pred, problem = None, "model output has NaN/infinity"
                else:
                    self._preds.append((history[-1]["tick"], vec))
                    self._score(history)
            except Exception as err:
                model_pred, problem = None, f"model unavailable ({type(err).__name__}: {err})"

        if problem is None and self.rolling_wape is not None:
            if self.rolling_wape > self.error_threshold:
                self._error_fallback = True
            elif self.rolling_wape < 0.8 * self.error_threshold:
                self._error_fallback = False
            if self._error_fallback:
                problem = (f"rolling WAPE {self.rolling_wape:.2f} above threshold {self.error_threshold:.2f} "
                           f"over the last {len(self._errors)} forecasts")

        if problem is not None:
            return self._use_baseline(history, problem)
        self.last_source, self.last_reason = "model", "OK"
        return model_pred, "model", "OK"

    def _use_baseline(self, history, problem):
        self.fallback_calls += 1
        reason = f"FALLBACK: {problem}"
        self.reasons[problem.split(" (")[0].split(" over")[0]] += 1
        self.last_source, self.last_reason = "baseline", reason
        return baseline.predict(history), "baseline", reason

    def summary(self):
        return {"calls": self.calls, "fallback_calls": self.fallback_calls,
                "reasons": dict(self.reasons), "last_reason": self.last_reason,
                "rolling_wape": None if self.rolling_wape is None else round(self.rolling_wape, 3)}
