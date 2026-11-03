# 🧠 Uber Marketplace Brain

> AI-powered ride-hailing marketplace simulator with demand forecasting, driver positioning recommendations, and multi-agent intelligence.

## Overview

This project demonstrates an intelligent marketplace layer on top of a simulated Uber-like ride-hailing platform. It uses:
- **Demand forecasting** (LLM + statistical models) to predict ride requests
- **Driver positioning recommendations** with anti-crowding logic
- **Multi-agent system** for rider, driver, and marketplace intelligence
- **Real-time WebSocket** state broadcasting
- **Baseline comparison** to measure actual improvement

## Architecture

```
uber-marketplace-brain/
├── backend/        FastAPI + WebSocket + AI agents
├── frontend/       3 React/Vite apps (rider, driver, admin)
├── docs/           Architecture, metrics, pitch
├── data/           Synthetic datasets (clearly labelled)
├── demo/           Scripted demo scenarios
└── scripts/        Startup scripts
```

## Quick Start

```bash
# 1. Copy env vars
cp .env.example .env
# Fill in your GEMINI_KEY_1..4, OLLAMA_URL, JWT_SECRET

# 2. Install backend deps
cd backend && pip install -r requirements.txt

# 3. Install frontend deps
cd frontend/shared && npm install
cd ../rider-app && npm install
cd ../driver-app && npm install
cd ../admin-dashboard && npm install

# 4. Launch everything
# On Windows (One-Click):
start_all.bat

# On Linux / macOS:
bash scripts/start_all.sh
```

## Apps

| App              | URL                    | Description                        |
|------------------|------------------------|------------------------------------|
| Rider App        | http://localhost:5173  | Request rides, see ETAs            |
| Driver App       | http://localhost:5174  | Accept rides, get positioning hints|
| Admin Dashboard  | http://localhost:5175  | Scenarios, health, baseline compare|
| Backend API      | http://localhost:8000  | FastAPI + WebSocket                |
| API Docs         | http://localhost:8000/docs | Swagger UI                    |

## Metric

**Fulfilment Rate** = (Completed Requests / Total Requests) × 100%

We compare against the **frozen baseline** (recent-demand: next 15 min = last 15 min).  
See [docs/baseline_and_metric.md](docs/baseline_and_metric.md).

## Team

- TODO: Add team members here

## License

MIT
