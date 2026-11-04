"""Run the SAME seeded scenario with baseline vs proposed policy and write results.json.
*** ALL DATA IS SYNTHETIC. ***

    python -m app.evaluation.run_eval            (run from the backend/ folder)

Three arms see exactly the same requests and weather (same seed):
  no_repositioning  reference: drivers stay where they finish a trip
  baseline          repositions drivers using the frozen recent-demand forecast (next 15 min = last 15 min)
  proposed          repositions drivers using the LightGBM forecast, with automatic fallback to the baseline
Fulfilment rate = completed requests / total requests.  Gain = proposed - baseline, in percentage points.
"""
import json
import os
import time

from app.forecasting.demand_model import load_or_train
from app.forecasting.model_health import HealthMonitor
from app.forecasting.policy import BaselineForecaster, ForecastPolicy, no_reposition_policy
from app.simulator.city import ZONE_NAMES, STADIUM_ZONE
from app.simulator.engine import Engine

RESULTS_PATH = os.path.join(os.path.dirname(__file__), "results.json")

SEED = 42
TICKS = 480                    # 8 simulated hours, 16:00 -> 24:00 on a weekday
N_DRIVERS = 110
START_HOUR = 16
SCENARIO = [                   # (tick, event, zone)
    (60, "stadium_end", STADIUM_ZONE),
    (150, "surge", 9),
    (210, "rain", None),
    (330, "stadium_end", STADIUM_ZONE),
]
STADIUM_ANNOUNCE_MIN = 15      # the stadium end time is known 15 minutes ahead (scheduled events)
ROBUSTNESS_SEEDS = [101, 102, 103, 104, 105]


def run_arm(policy, seed=SEED, ticks=TICKS):
    eng = Engine(seed=seed, n_drivers=N_DRIVERS, start_hour=START_HOUR, policy=policy)
    plan = {}
    for t, kind, zone in SCENARIO:
        plan.setdefault(t, []).append((kind, zone))
    for _ in range(ticks):
        for kind, zone in plan.get(eng.t, []):
            if kind == "stadium_end":
                eng.trigger_stadium_end(zone, delay=STADIUM_ANNOUNCE_MIN)
            elif kind == "surge":
                eng.trigger_surge(zone)
            elif kind == "rain":
                eng.trigger_rain()
        eng.tick()
    return eng.stats()


def run_all(model, seed=SEED):
    monitor = HealthMonitor(model)
    arms = {
        "no_repositioning": run_arm(no_reposition_policy, seed),
        "baseline": run_arm(ForecastPolicy(BaselineForecaster()), seed),
        "proposed": run_arm(ForecastPolicy(monitor), seed),
    }
    return arms, monitor


def forecast_accuracy(model, seed=SEED, ticks=TICKS):
    """Forecast error (WAPE) of the LightGBM model vs the frozen baseline on the same scenario."""
    import numpy as np
    from app.forecasting import baseline
    from app.forecasting.common import HORIZON, history_arrays
    eng = Engine(seed=seed, n_drivers=N_DRIVERS, start_hour=START_HOUR, history_limit=None)
    plan = {}
    for t, kind, zone in SCENARIO:
        plan.setdefault(t, []).append((kind, zone))
    for _ in range(ticks):
        for kind, zone in plan.get(eng.t, []):
            if kind == "stadium_end":
                eng.trigger_stadium_end(zone, delay=STADIUM_ANNOUNCE_MIN)
            elif kind == "surge":
                eng.trigger_surge(zone)
            else:
                eng.trigger_rain()
        eng.tick()
    H = eng.history
    _, R, *_ = history_arrays(H)
    err_m = err_b = act = 0.0
    for i in range(60, len(H) - HORIZON, 3):
        actual = R[i + 1:i + 1 + HORIZON].sum(axis=0)
        pm = np.array(list(model.predict(H[:i + 1]).values()))
        pb = np.array(list(baseline.predict(H[:i + 1]).values()))
        err_m += np.abs(pm - actual).sum()
        err_b += np.abs(pb - actual).sum()
        act += actual.sum()
    return {"model_wape": round(err_m / act, 3), "baseline_wape": round(err_b / act, 3)}


def _pct(x):
    return round(100.0 * x, 2)


def main(path=RESULTS_PATH, quiet=False):
    started = time.time()
    model = load_or_train()
    arms, monitor = run_all(model, SEED)
    base, prop, ref = arms["baseline"], arms["proposed"], arms["no_repositioning"]
    gain = round(_pct(prop["fulfilment_rate"]) - _pct(base["fulfilment_rate"]), 2)

    robust = []
    for s in ROBUSTNESS_SEEDS:
        a, _ = run_all(model, s)
        robust.append(round(_pct(a["proposed"]["fulfilment_rate"]) - _pct(a["baseline"]["fulfilment_rate"]), 2))

    def pack(stats):
        return {"total_requests": stats["total_requests"], "completed_requests": stats["completed_requests"],
                "expired_requests": stats["expired_requests"],
                "fulfilment_rate_pct": _pct(stats["fulfilment_rate"]),
                "avg_wait_min": round(stats["avg_wait_min"], 2)}

    results = {
        "data": "SYNTHETIC",
        "note": "All numbers come from a seeded simulator. They are not real ride-hailing data.",
        "seed": SEED,
        "ticks": TICKS,
        "n_drivers": N_DRIVERS,
        "scenario": [f"minute {t}: {k}" + (f" in {ZONE_NAMES[z]}" if z is not None else " (city-wide)")
                     for t, k, z in SCENARIO],
        "baseline": pack(base),
        "proposed": pack(prop),
        "reference_no_repositioning": pack(ref),
        "baseline_fulfilment_rate_pct": _pct(base["fulfilment_rate"]),
        "proposed_fulfilment_rate_pct": _pct(prop["fulfilment_rate"]),
        "gain_pp": gain,
        "forecast_accuracy_wape": forecast_accuracy(model),
        "fallback": monitor.summary(),
        "robustness_gain_pp_other_seeds": {"seeds": ROBUSTNESS_SEEDS, "gain_pp": robust,
                                           "mean_gain_pp": round(sum(robust) / len(robust), 2)},
        "model_version": model.version,
        "run_seconds": round(time.time() - started, 1),
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    with open(path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    if not quiet:
        print("SYNTHETIC DATA -- seeded simulation, not real ride-hailing data")
        print(f"baseline  fulfilment: {results['baseline_fulfilment_rate_pct']}%")
        print(f"proposed  fulfilment: {results['proposed_fulfilment_rate_pct']}%")
        print(f"gain: {gain:+.2f} percentage points   (other seeds: {robust})")
        print(f"written to {path}")
    return results


if __name__ == "__main__":
    main()
