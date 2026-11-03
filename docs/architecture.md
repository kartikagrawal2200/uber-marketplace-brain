# Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)                   │
│  ┌────────────┐  ┌────────────┐  ┌──────────────────────┐  │
│  │ rider-app  │  │ driver-app │  │   admin-dashboard    │  │
│  │ :5173      │  │ :5174      │  │   :5175              │  │
│  └─────┬──────┘  └─────┬──────┘  └──────────┬───────────┘  │
│        │               │                     │              │
│        └───────────────┴─────────────────────┘              │
│                         │  REST + WebSocket                  │
└─────────────────────────┼───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                  Backend (FastAPI :8000)                     │
│  ┌──────────┐  ┌─────────────┐  ┌──────────────────────┐   │
│  │Simulator │  │ Forecasting │  │   Agent Router       │   │
│  │ Engine   │  │  Models     │  │ marketplace_agent    │   │
│  │ (tick    │  │  + Baseline │  │ earnings_agent       │   │
│  │  loop)   │  │             │  │ onboarding_agent     │   │
│  └──────────┘  └─────────────┘  └──────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                   LLM Provider                       │   │
│  │   Local (Ollama/llama3.2)  →  Gemini fallback        │   │
│  │   Key rotation across GEMINI_KEY_1..4                │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Simulator Tick Loop

Every `TICK_INTERVAL_SECONDS` (default 5 s):
1. **City** advances time, updates traffic & weather
2. **Events** fire (stadium end, rain start, surge zones)
3. **Demand** generates Poisson ride requests per zone
4. **Drivers** transition states (idle → matched → en_route → completed)
5. **Forecasting** updates predictions
6. **Recommender** issues positioning hints
7. **State** broadcast via `/ws/state` WebSocket

## Data Flow

```
Simulator Engine
      │
      ▼
MarketplaceState (Pydantic model)
      │
      ├──▶ /ws/state  (all connected clients)
      ├──▶ /api/rider/*
      ├──▶ /api/driver/*
      └──▶ /api/admin/*
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.11, FastAPI, Uvicorn |
| WebSocket | FastAPI native WebSockets |
| Auth | JWT (python-jose) |
| DB | SQLite (dev) / PostgreSQL (prod) |
| Frontend | React 18, Vite, Tailwind CSS |
| State | Zustand |
| Maps | Leaflet.js (react-leaflet) |
| Local LLM | Ollama (llama3.2) |
| Cloud LLM | Google Gemini 1.5 Flash |

## TODO Items (Architecture)
- [ ] Define zone adjacency graph for routing
- [ ] Add Redis pub/sub for multi-worker WebSocket scaling
- [ ] Design driver auth flow (phone OTP mock)
- [ ] Finalize agent tool schemas
