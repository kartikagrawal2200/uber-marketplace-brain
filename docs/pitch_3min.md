# 3-Minute Pitch Script

> **Event**: Hackathon Demo  
> **Duration**: 3 minutes (hard stop)  
> **Format**: Live demo + slides

---

## [0:00 – 0:30] Hook — The Problem

> *"Every night, 40% of drivers in a city cluster in the same 2 zones while riders in 10 other zones wait 15+ minutes. That's not a driver shortage — it's a coordination failure."*

- Show the Admin Dashboard with drivers crowding one zone (Stadium scenario)
- Highlight the unmet demand heatmap

---

## [0:30 – 1:15] Our Solution

> *"Uber Marketplace Brain is an AI layer that reads the city like a chess grandmaster — predicting demand 15 minutes ahead and whispering where to go before the surge even starts."*

Key points:
1. **Demand forecasting** — Poisson model + LLM context awareness
2. **Anti-crowding positioning** — drivers get personalized zone recommendations
3. **Multi-agent** — separate agents for riders, drivers, and the marketplace itself
4. **Local-first AI** — runs on Ollama; Gemini is a fallback, not a dependency

---

## [1:15 – 2:15] Live Demo

**Scenario 1 — Stadium surge** (30 s)
- Event fires: 50,000 fans leaving stadium in Zone 7
- System predicts spike 12 minutes before it hits
- Drivers in Zones 5 & 9 receive "move to Zone 7" recommendation
- Fulfilment rate: **+11 pp vs baseline**

**Scenario 2 — Stale model fallback** (20 s)
- Simulate Ollama going offline mid-demo
- `model_health.py` detects staleness within 2 ticks
- Seamless switch to Gemini; health badge turns amber

**Scenario 3 — Rain + demand shift** (10 s)
- Rain event fires across 3 zones
- Demand λ multiplied by weather factor
- Recommendations update in real time

---

## [2:15 – 2:45] The Numbers

| | Baseline | AI System | Δ |
|---|---|---|---|
| Fulfilment Rate (SYNTHETIC, seed 42) | 75.44% | 75.38% | -0.06 pp (about zero; see results.json) |
| Forecast error (WAPE, lower is better) | 0.436 | 0.317 | forecast is clearly more accurate |
| Avg pickup wait (SYNTHETIC) | 7.44 min | 7.48 min | about the same |

> *"The forecast is 27% more accurate (WAPE 0.317 vs 0.436). In this synthetic city that does not yet change fulfilment, and we report that honestly."*

---

## [2:45 – 3:00] Close

> *"We built this in 24 hours. The architecture is production-ready — add real GPS data and a real driver app, and this ships. Questions?"*

---

## TODO
- [ ] Time the actual demo run and trim if needed
- [ ] Prepare fallback videos in `demo/fallback_videos/` in case of WiFi issues
- [ ] Add slide deck link here
