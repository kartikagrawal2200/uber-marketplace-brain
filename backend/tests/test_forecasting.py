"""Forecasting, baseline, health fallback and evaluation.  ALL DATA IS SYNTHETIC."""
import numpy as np

from app.forecasting import baseline
from app.forecasting.demand_model import load_or_train
from app.forecasting.model_health import HealthMonitor
from app.forecasting.policy import BaselineForecaster, ForecastPolicy, no_reposition_policy
from app.forecasting.supply_model import predict_supply
from app.simulator.engine import Engine


def _history(ticks=90, seed=21):
    e = Engine(seed=seed, history_limit=None)
    e.run(ticks)
    return e, e.history


def test_baseline_is_last_15_minutes():
    _, h = _history()
    expected = {z: float(sum(s["requests"][z] for s in h[-15:])) for z in range(12)}
    assert baseline.predict(h) == expected


def test_supply_formula():
    snap = {"idle": {0: 3}, "incoming": {0: 2}, "finishing": {0: 1}}
    assert predict_supply(snap) == {0: 4.0}


def test_model_predicts_a_number_per_zone():
    _, h = _history()
    pred = load_or_train().predict(h)
    assert len(pred) == 12 and all(np.isfinite(v) and v >= 0 for v in pred.values())


def test_healthy_model_is_used():
    _, h = _history()
    _, source, reason = HealthMonitor(load_or_train()).forecast(h)
    assert (source, reason) == ("model", "OK")


def test_stale_inputs_fall_back_with_reason():
    _, h = _history()
    h[-1]["age_minutes"] = 30
    _, source, reason = HealthMonitor(load_or_train()).forecast(h)
    assert source == "baseline" and reason.startswith("FALLBACK: stale inputs")


def test_missing_zone_falls_back():
    _, h = _history()
    del h[-1]["requests"][4]
    _, source, reason = HealthMonitor(load_or_train()).forecast(h)
    assert source == "baseline" and "missing zones" in reason


def test_warmup_falls_back():
    _, h = _history(ticks=10)
    _, source, reason = HealthMonitor(load_or_train()).forecast(h)
    assert source == "baseline" and "warm-up" in reason


def test_high_error_falls_back_and_recovers():
    class Bad:
        version = "bad"
        def predict(self, history):
            return {z: 500.0 for z in range(12)}          # wildly wrong forecasts
    e = Engine(seed=8, history_limit=240)
    mon = HealthMonitor(Bad())
    last = None
    for _ in range(120):
        e.tick()
        last = mon.forecast(e.history)
    assert last[1] == "baseline" and "rolling WAPE" in last[2]


def test_model_exception_falls_back():
    class Broken:
        version = "broken"
        def predict(self, history):
            raise RuntimeError("boom")
    _, h = _history()
    _, source, reason = HealthMonitor(Broken()).forecast(h)
    assert source == "baseline" and "model unavailable" in reason


def test_policy_returns_valid_moves():
    e = Engine(seed=9, n_drivers=60, policy=ForecastPolicy(BaselineForecaster()))
    e.run(60)
    for from_z, to_z, n in e.policy.last["moves"]:
        assert from_z != to_z and n >= 1


def test_same_seed_same_requests_for_every_policy():
    a = Engine(seed=13, n_drivers=40, policy=no_reposition_policy)
    b = Engine(seed=13, n_drivers=40, policy=ForecastPolicy(BaselineForecaster()))
    a.run(100)
    b.run(100)
    assert a.total_requests == b.total_requests


def test_eval_arm_is_reproducible():
    from app.evaluation import run_eval
    s1 = run_eval.run_arm(no_reposition_policy, seed=5, ticks=90)
    s2 = run_eval.run_arm(no_reposition_policy, seed=5, ticks=90)
    assert s1 == s2
