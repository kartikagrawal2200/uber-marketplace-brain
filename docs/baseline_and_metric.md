# Baseline & Metric Definition
> **STATUS: FROZEN after Hour 1 — do not edit without team consensus**

## 1. Frozen Baseline: Recent-Demand Forecast

The baseline is intentionally simple and reproducible.

### Definition
> **Next 15 minutes of demand in zone Z = demand observed in the previous 15 minutes of zone Z**

```
baseline_forecast(zone, t) = actual_demand(zone, t-15min .. t)
```

### Properties
- **No ML required** — pure look-back average
- **Per-zone, not city-wide** — each of the 12 zones is forecasted independently
- **Seeded & reproducible** — simulation seed is fixed (`SIMULATION_SEED=42` in `.env`)
- **No driver positioning** — baseline assumes uniform driver distribution; no recommendations are issued

### Implementation
See [`backend/app/forecasting/baseline.py`](../backend/app/forecasting/baseline.py)

---

## 2. Primary Metric: Fulfilment Rate

### Definition
$$
\text{Fulfilment Rate} = \frac{\text{Completed Requests}}{\text{Total Requests}} \times 100\%
$$

- **Completed Request**: a rider request that was matched to a driver AND the ride finished successfully
- **Total Requests**: all ride requests submitted (including timed-out, cancelled, or unmatched)

### Reported As
We report the **percentage-point (pp) improvement** over the baseline:

$$
\Delta \text{FR} = \text{FR}_{\text{AI system}} - \text{FR}_{\text{baseline}} \quad [\text{pp}]
$$

Example: Baseline FR = 71%, AI system FR = 79% → **+8 pp improvement**

---

## 3. Secondary Metrics (informational only, not used for win/loss)

| Metric | Description |
|--------|-------------|
| Avg wait time (s) | Seconds from request to driver arrival |
| Surge accuracy | % of surge zones correctly predicted 5 min ahead |
| Driver idle time (%) | Fraction of time drivers are unmatched |
| Recommendation acceptance rate | % of positioning hints accepted by drivers |
| LLM fallback rate | % of requests served by Gemini (vs local model) |

---

## 4. Evaluation Protocol

1. Run simulation for **60 simulated minutes** (720 ticks at 5 s/tick)
2. Use fixed seed `42` for Poisson demand, traffic, and events
3. Record `completed_requests` and `total_requests` from the engine
4. Compute FR for **baseline run** (no AI recommendations)
5. Compute FR for **AI system run** (with forecasting + positioning)
6. Report Δ FR in pp

See [`backend/app/evaluation/run_eval.py`](../backend/app/evaluation/run_eval.py)

---

## 5. What is NOT Measured

- Absolute revenue (simulated money has no real-world calibration)
- Driver satisfaction scores (qualitative, out of scope)
- LLM response quality (assessed separately via human review)
