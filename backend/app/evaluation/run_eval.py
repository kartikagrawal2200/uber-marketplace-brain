"""
evaluation/run_eval.py — Reproducible evaluation runner.
"""

import json
import time
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

EVAL_SEED       = 42
N_TICKS         = 720
RESULTS_PATH    = Path(__file__).parent / "results.json"


def baseline_run() -> dict:
    logger.info("Running baseline simulation...")
    return {
        "total_requests": 0,
        "completed_requests": 0,
        "fulfilment_rate": 0.0,
        "avg_wait_ticks": 0.0,
        "note": "TODO: implement baseline_run()",
    }


def ai_run() -> dict:
    logger.info("Running AI system simulation...")
    return {
        "total_requests": 0,
        "completed_requests": 0,
        "fulfilment_rate": 0.0,
        "avg_wait_ticks": 0.0,
        "note": "TODO: implement ai_run()",
    }


def compute_metrics(baseline: dict, ai: dict) -> dict:
    delta_fr = ai["fulfilment_rate"] - baseline["fulfilment_rate"]
    return {
        "baseline_fulfilment_rate": baseline["fulfilment_rate"],
        "ai_fulfilment_rate": ai["fulfilment_rate"],
        "delta_fr_pp": round(delta_fr * 100, 2),
        "baseline_avg_wait_ticks": baseline["avg_wait_ticks"],
        "ai_avg_wait_ticks": ai["avg_wait_ticks"],
        "eval_seed": EVAL_SEED,
        "n_ticks": N_TICKS,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }


def run_eval() -> dict:
    baseline = baseline_run()
    ai = ai_run()
    metrics = compute_metrics(baseline, ai)

    print("\n=== Evaluation Results ===")
    print(f"  Baseline Fulfilment Rate : {metrics['baseline_fulfilment_rate']:.1%}")
    print(f"  AI System Fulfilment Rate: {metrics['ai_fulfilment_rate']:.1%}")
    print(f"  Improvement              : +{metrics['delta_fr_pp']:.1f} pp")
    print("=" * 28)

    RESULTS_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(RESULTS_PATH, "w") as f:
        json.dump(metrics, f, indent=2)
    print(f"\nResults saved to {RESULTS_PATH}")

    return metrics


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run_eval()
