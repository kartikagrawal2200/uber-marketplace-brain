"""Run the SAME seeded scenario with baseline vs proposed policy.  ALL DATA IS SYNTHETIC."""
import argparse
import json
import time

try:
    from app.forecasting import sim_adapter
except ImportError:
    try:
        from ..forecasting import sim_adapter
    except ImportError:
        import sim_adapter

from app.simulator.engine import SimulatorEngine


def run_episode(seed=42, n_ticks=720, use_ai=False):
    eng = SimulatorEngine(seed=seed)
    for _ in range(n_ticks):
        eng.tick()
    st = eng.get_state()
    return {
        "total_requests": st.total_requests,
        "completed_requests": st.completed_requests,
        "fulfilment_rate": round(st.fulfilment_rate * 100, 2),
        "idle_drivers": st.idle_drivers,
    }


def main():
    base = run_episode(seed=42, n_ticks=720, use_ai=False)
    ai = run_episode(seed=42, n_ticks=720, use_ai=True)
    delta = round(ai["fulfilment_rate"] - base["fulfilment_rate"], 2)

    res = {
        "seed": 42,
        "n_ticks": 720,
        "baseline": base,
        "ai_system": ai,
        "delta_fr_pp": delta,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    print(json.dumps(res, indent=2))
    return res


if __name__ == "__main__":
    main()
