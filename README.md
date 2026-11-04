# Uber Marketplace Brain  (all data is SYNTHETIC)

A ride-hailing marketplace **simulator + demand forecaster + driver-repositioning policy**, with three small web apps
(rider, driver, admin). Everything runs on invented, seeded data.

## Run it (no API keys needed)
**Windows:** double-click `start_all.bat`  |  **Mac/Linux:** `bash scripts/start_all.sh`

| App | URL |
|---|---|
| Rider | http://localhost:5173 |
| Driver | http://localhost:5174 |
| Admin | http://localhost:5175 |
| API docs | http://localhost:8000/docs |

The first run installs the packages. If the backend is not running, the apps fall back to a small built-in JavaScript demo
(not the Python model), so always start the backend to see the real simulator.

## What is inside
```
backend/app/
  simulator/    city.py  demand.py  drivers.py  traffic_weather.py  events.py  engine.py
  forecasting/  demand_model.py (LightGBM)  supply_model.py  baseline.py  model_health.py  policy.py
  evaluation/   run_eval.py -> results.json
  world.py      turns the engine state into the JSON the apps use (WebSocket /ws/state)
  main.py       FastAPI app + REST routers in api/
frontend/       rider-app, driver-app, admin-dashboard, shared
```

* **Simulator:** 12 zones, Poisson requests, driver state machine `Idle -> Assigned -> Driving to pickup -> Waiting -> On trip -> Drop-off -> Idle`, stale-GPS removal, weather and congestion, events (`trigger_stadium_end`, `trigger_surge`, `trigger_rain`), fixed seed.
* **Forecasting:** LightGBM predicts requests per zone for the next 15 minutes. `supply = idle + incoming - finishing`. `baseline.py` is the frozen recent-demand baseline. `model_health.py` switches to the baseline and gives a reason string (stale inputs, missing zones, warm-up, rolling error too high, model error).
* **Evaluation:** `cd backend && python -m app.evaluation.run_eval` runs the same seeded scenario with baseline vs proposed and writes `results.json`.

## Current results (seed 42, SYNTHETIC)
* Forecast error (WAPE): LightGBM **0.317** vs baseline **0.436**, so the forecast is clearly better.
* Fulfilment: baseline 75.44%, proposed 75.38%, gain **-0.06 pp**. Across 5 other seeds the mean gain is about 0.
  In this simulator, nearest-driver dispatch already does most of the work, so better forecasts do not turn into more completed rides.
  Do not present this as an improvement; see `results.json` for the exact numbers.

## Tests
`cd backend && python -m pytest -q` (28 tests)

## Optional
Put Gemini keys in `.env` for nicer chat answers. Without keys the chat uses built-in templates.
