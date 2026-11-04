"""world.py -- the live world behind /ws/state.

Runs the REAL (synthetic) simulator, the LightGBM demand model, the health monitor and the repositioning
policy, and turns their state into the JSON the three frontend apps expect.
*** ALL DATA IS SYNTHETIC. ***
"""
import json
import os
import threading
import time
from typing import Any, Dict, List, Optional

from app.agents.base import Context
from app.agents.assistant import Assistant
from app.agents import tools
from app.evaluation import run_eval
from app.forecasting.common import HORIZON
from app.forecasting.demand_model import load_or_train
from app.forecasting.model_health import HealthMonitor
from app.forecasting.policy import ForecastPolicy
from app.recommender.anti_crowding import AntiCrowding
from app.simulator.city import COLS, N_ZONES, STADIUM_ZONE, ZONE_NAMES, zone_col, zone_row
from app.simulator.engine import Engine

BASE_FARE = 120
DEMO_DRIVER_INDEX = 0
DEMO_DRIVER_ID = "driver-042"
DEMO_DRIVER_NAME = "Arjun Singh"
SECONDS_PER_MIN = 3          # the UI shows 1 simulated minute of driving as 3 seconds
SCEN_LABEL = {"stadium": "Stadium ends", "surge": "Surge", "rain": "Rain", "stale": "Stale model"}
SURGE_ZONE = 9               # Business District


def surge_of(pressure):
    return round(min(3.0, max(1.0, 1.0 + max(0.0, pressure - 1.1) * 0.8)), 1)


def make_token(driver_id, secret):
    claims = {"sub": driver_id, "exp": int(time.time()) + 3600}
    try:
        import jwt
        tok = jwt.encode(claims, secret, algorithm="HS256")
    except ImportError:
        from jose import jwt as jose_jwt
        tok = jose_jwt.encode(claims, secret, algorithm="HS256")
    return tok if isinstance(tok, str) else tok.decode()


class LiveWorld:
    def __init__(self, seed=42, n_drivers=110, assistant: Optional[Assistant] = None, jwt_secret="dev-secret"):
        self.model = load_or_train()
        self.monitor = HealthMonitor(self.model)
        self.policy = ForecastPolicy(self.monitor)
        self.engine = Engine(seed=seed, n_drivers=n_drivers, start_hour=8, policy=self.policy,
                             manual_driver=DEMO_DRIVER_INDEX)
        self.assistant = assistant
        self.crowding = AntiCrowding()
        self.stale = False
        self.blocked: Dict[int, int] = {}
        self.cooldown_until = 0
        self.rec: Optional[Dict[str, Any]] = None
        self.rec_seq = 0
        self.drive_total = 0
        self.earn_history: List[float] = [0]
        self.token = make_token(DEMO_DRIVER_ID, jwt_secret)
        self.booking_seq = 0
        self.eval_running = False
        self.eval_runs: List[Dict[str, Any]] = []
        self._load_eval_from_file()
        for _ in range(35):                      # warm up so the model has history on first connect
            self.engine.tick()
        tools.set_backend(_Backend(self))

    # ------------------------------------------------------------------ evaluation results
    def _load_eval_from_file(self):
        path = run_eval.RESULTS_PATH
        if not os.path.exists(path):
            return
        try:
            with open(path, encoding="utf-8") as f:
                r = json.load(f)
        except Exception:
            return
        self.eval_runs.insert(0, {
            "id": int(time.time() * 1000), "ran_at": int(time.time() * 1000),
            "baseline": r["baseline_fulfilment_rate_pct"], "model": r["proposed_fulfilment_rate_pct"],
            "pp": r["gain_pp"], "note": f"Seeded scenario, seed {r['seed']} (SYNTHETIC)",
            "model_status": "healthy", "sample_size": r["baseline"]["total_requests"],
        })
        del self.eval_runs[5:]

    def start_eval(self, on_done):
        """Run the full baseline-vs-proposed evaluation in a background thread."""
        if self.eval_running:
            return False
        self.eval_running = True

        def work():
            try:
                run_eval.main(quiet=True)
                self._load_eval_from_file()
            finally:
                self.eval_running = False
                on_done()
        threading.Thread(target=work, daemon=True).start()
        return True

    # ------------------------------------------------------------------ scenarios
    def scenarios(self):
        t = self.engine.t
        evs = self.engine.events.events
        return {
            "stadium": any(e.kind == "stadium_end" and e.end_t > t for e in evs),
            "surge": any(e.kind == "surge" and e.end_t > t for e in evs),
            "rain": self.engine.weather.forced_state is not None and self.engine.weather.forced_until > t,
            "stale": self.stale,
        }

    def set_scenario(self, name, on=None):
        eng = self.engine
        if name == "reset":
            eng.events.events = [e for e in eng.events.events if e.end_t <= eng.t]
            eng.weather.forced_state = None
            self.stale = False
            eng.input_age_minutes = 0
            return True
        current = self.scenarios()
        if name not in current:
            return False
        want = (not current[name]) if on is None else bool(on)
        if want == current[name]:
            return True
        if name == "stadium":
            if want:
                eng.trigger_stadium_end(STADIUM_ZONE, delay=5, duration=40)
            else:
                eng.events.events = [e for e in eng.events.events if e.kind != "stadium_end"]
        elif name == "surge":
            if want:
                eng.trigger_surge(SURGE_ZONE, duration=40)
            else:
                eng.events.events = [e for e in eng.events.events if e.kind != "surge"]
        elif name == "rain":
            if want:
                eng.trigger_rain(duration=60)
            else:
                eng.weather.forced_state = None
                eng.events.events = [e for e in eng.events.events if e.kind != "rain"]
        elif name == "stale":
            self.stale = want
            eng.input_age_minutes = 45 if want else 0
        return True

    # ------------------------------------------------------------------ clock
    def step(self):
        self.engine.tick()
        d = self.engine.drivers[DEMO_DRIVER_INDEX]
        if self.engine.t % 4 == 0:
            self.earn_history.append(round(d.earnings))
            del self.earn_history[:-45]
        self._update_rec()
        self.engine.hold_manual = self.rec is not None

    # ------------------------------------------------------------------ per-zone numbers
    def _zone_rows(self):
        eng = self.engine
        hist = eng.history
        snap = hist[-1]
        last5 = hist[-5:]
        last60 = hist[-60:]
        pred = self.policy.last.get("forecast") or {}
        rows = []
        for z in range(N_ZONES):
            rate = sum(s["requests"][z] for s in last5) / max(1, len(last5))
            avg = sum(s["requests"][z] for s in last60) / max(1, len(last60))
            supply = snap["idle"][z] + snap["incoming"][z]
            fc = pred.get(z, rate * HORIZON) / HORIZON
            pressure = (snap["pending"][z] + 5.0 * max(rate, fc)) / (supply + 1.0)
            surge = max(surge_of(pressure), snap["surge"][z])
            rows.append({
                "i": z, "id": z + 1, "name": ZONE_NAMES[z], "col": zone_col(z), "row": zone_row(z),
                "demand": round(rate, 1), "supply": supply, "pressure": round(pressure, 2), "surge": round(surge, 1),
                "eta_min": int(min(20, max(2, 2 + 2.2 * pressure + (1.5 if snap["weather"] != "clear" else 0)))),
                "fare_est": round(BASE_FARE * surge), "forecast": round(fc, 1), "avg": round(avg, 1),
                "density": "high" if supply >= 7 else "medium" if supply >= 4 else "low",
            })
        return rows

    # ------------------------------------------------------------------ recommendation
    def _update_rec(self):
        eng = self.engine
        d = eng.drivers[DEMO_DRIVER_INDEX]
        if not d.is_available():
            self.rec = None
            return
        rows = self._zone_rows()
        best = None
        for r in rows:
            i = r["i"]
            if i == d.zone or self.blocked.get(i, 0) > eng.t:
                continue
            drive = eng.travel(d.zone, i)
            crowd = self.crowding.pending(str(i + 1))
            score = r["pressure"] / (1 + 0.12 * drive) / (1 + 0.3 * crowd)
            delta = (r["forecast"] - r["avg"]) / max(r["avg"], 0.3) * 100
            if best is None or score > best[0]:
                best = (score, r, drive, delta)
        if self.rec is not None:
            cur = rows[self.rec["zone"] - 1]
            if cur["i"] == d.zone or cur["pressure"] < 1.0 or self.blocked.get(cur["i"], 0) > eng.t:
                self.rec = None
        if best and (self.rec is None) and eng.t >= self.cooldown_until and best[1]["pressure"] >= 1.5 and best[3] >= 15:
            self.rec = self._make_rec(best)
        elif self.rec is not None and best and best[1]["id"] != self.rec["zone"]:
            cur = rows[self.rec["zone"] - 1]
            cur_score = cur["pressure"] / (1 + 0.12 * eng.travel(d.zone, cur["i"]))
            if best[0] > cur_score * 1.35:
                self.rec = self._make_rec(best)
        if self.rec is not None:
            r = rows[self.rec["zone"] - 1]
            self.rec.update(drivers=r["supply"], surge=r["surge"], source=self._source(), confidence=self._confidence())

    def _make_rec(self, best):
        _, r, drive, delta = best
        self.rec_seq += 1
        return {"id": self.rec_seq, "zone": r["id"], "zone_name": r["name"], "demand_delta_pct": round(delta),
                "drivers": r["supply"], "drive_min": drive, "surge": r["surge"],
                "source": self._source(), "confidence": self._confidence()}

    def _source(self):
        return "model" if self.monitor.last_source == "model" else "fallback"

    def _confidence(self):
        return 0.9 if self.monitor.last_source == "model" else 0.58

    def accept_rec(self):
        d = self.engine.drivers[DEMO_DRIVER_INDEX]
        if not self.rec or not d.is_available():
            return False
        to = self.rec["zone"] - 1
        mins = self.engine.travel(d.zone, to)
        if not self.engine.reposition_driver(DEMO_DRIVER_INDEX, to):
            return False
        self.drive_total = mins * SECONDS_PER_MIN
        self.crowding.record_acceptance(DEMO_DRIVER_ID, str(to + 1))
        self.rec = None
        return True

    def ignore_rec(self):
        if self.rec:
            self.blocked[self.rec["zone"] - 1] = self.engine.t + 40
            self.rec = None
            self.cooldown_until = self.engine.t + 5
            self._update_rec()

    # ------------------------------------------------------------------ booking / login
    def book(self, zone_id):
        zone_id = min(N_ZONES, max(1, int(zone_id or 1)))
        rows = self._zone_rows()
        r = rows[zone_id - 1]
        etas = [self.engine.travel(d.zone, zone_id - 1) for d in self.engine.drivers
                if d.active and d.is_available()]
        eta = min(etas) if etas else 12
        self.booking_seq += 1
        names = ["Meera K.", "Harpreet S.", "Imran A.", "Sunita D."]
        return {"type": "booking", "status": "confirmed", "id": f"BK{1000 + self.booking_seq}", "zone": zone_id,
                "zone_name": r["name"], "eta_min": eta, "surge": r["surge"], "fare_estimate": round(BASE_FARE * r["surge"]),
                "driver": {"name": names[self.booking_seq % len(names)], "vehicle": "White Maruti Dzire",
                           "plate": f"PB 36 AK {1000 + (self.booking_seq * 37) % 8999}"}}

    # ------------------------------------------------------------------ chat
    def chat(self, text, driver_id=None):
        d = self.engine.drivers[DEMO_DRIVER_INDEX]
        started = time.time()
        ctx = Context(driver_id=DEMO_DRIVER_ID, token=self.token, zone=str(d.zone + 1))
        try:
            res = self.assistant.ask(text, ctx)
        except Exception as err:                       # never let chat break the socket
            res = {"route": None, "answer": f"Sorry, the assistant had a problem ({type(err).__name__}).", "tool_calls": []}
        names = {"marketplace": ("Demand Forecaster", "demand"), "earnings": ("Earnings Advisor", "earnings"),
                 "onboarding": ("Onboarding Helper", "onboarding"), None: ("Dispatch Coordinator", "general")}
        specialist, intent = names.get(res.get("route"), names[None])
        ms = int((time.time() - started) * 1000)
        return {"specialist": specialist, "intent": intent, "text": res.get("answer", ""),
                "tools": [{"name": c.get("tool"), "args": c.get("args", {}),
                           "result": "ok" if c.get("ok") else c.get("error", "no data"), "ms": ms}
                          for c in res.get("tool_calls", [])]}

    # ------------------------------------------------------------------ snapshot for /ws/state
    def snapshot(self):
        eng = self.engine
        snap = eng.history[-1]
        rows = self._zone_rows()
        zones = [{k: v for k, v in r.items() if k != "i"} for r in rows]
        d = eng.drivers[DEMO_DRIVER_INDEX]
        status = "enroute" if d.reposition_to is not None else "idle"
        arrive = d.reposition_left * SECONDS_PER_MIN if d.reposition_to is not None else 0
        hours = 5.2 + eng.t / 60.0
        stats = eng.stats()
        fallback = None
        source = self.monitor.last_source
        warm = self.monitor.last_reason.startswith("FALLBACK: warm-up")
        if source != "model" and not warm:
            fallback = {
                "name": "Frozen recent-demand baseline (next 15 min = last 15 min)",
                "reason": self.monitor.last_reason,
                "impact": "Drivers are moved after demand appears instead of ahead of it, so expect lower fulfilment and less certainty.",
            }
        errs = self.monitor._errors
        mae = (sum(e for e, _ in errs) / len(errs) / (N_ZONES * HORIZON)) if errs else 0.0
        last_eval = self.eval_runs[0] if self.eval_runs else None
        ev = {
            "running": self.eval_running, "sample_size": last_eval["sample_size"] if last_eval else 0,
            "ran_at": last_eval["ran_at"] if last_eval else None,
            "baseline": {"name": "Frozen recent-demand baseline", "fulfilment": last_eval["baseline"] if last_eval else None},
            "model": {"name": "LightGBM demand forecast", "fulfilment": last_eval["model"] if last_eval else None,
                      "status": "healthy"},
            "improvement_pp": last_eval["pp"] if last_eval else None,
            "note": last_eval["note"] if last_eval else "Run the evaluation to fill this in",
            "runs": self.eval_runs,
        }
        return {
            "type": "state", "simulated": True, "data_label": "SYNTHETIC", "t": int(time.time() * 1000), "tick": eng.t,
            "scenarios": self.scenarios(),
            "zones": zones,
            "city": {"demand_total": round(sum(r["demand"] for r in rows), 1),
                     "supply_total": sum(r["supply"] for r in rows),
                     "fulfilment_live": round(100 * stats["fulfilment_rate"], 1),
                     "surging_zones": sum(1 for r in rows if r["surge"] > 1),
                     "clock": snap["clock"], "weather": snap["weather"]},
            "model": {"status": "stale" if fallback else "healthy", "version": self.model.version,
                      "age_s": eng.input_age_minutes * 60, "max_age_s": self.monitor.max_age * 60,
                      "mae": round(mae, 2), "source": source, "reason": self.monitor.last_reason,
                      "rolling_wape": self.monitor.rolling_wape, "fallback": fallback},
            "eval": ev,
            "driver": {"id": DEMO_DRIVER_ID, "name": DEMO_DRIVER_NAME, "zone": d.zone + 1, "status": status,
                       "target": (d.reposition_to + 1) if d.reposition_to is not None else None,
                       "arrive_in": arrive, "total": self.drive_total, "state": d.state.value,
                       "last_event": None},
            "earnings": {"today": round(d.earnings), "trips": d.completed, "surge_bonus": round(d.bonus),
                         "hours": round(hours, 1), "per_hour": round(d.earnings / hours),
                         "history": self.earn_history, "last_trip": d.last_trip},
            "recommendation": self.rec,
        }


class _Backend:
    """What the chat assistant's tools are allowed to read."""

    def __init__(self, world):
        self.w = world

    def zone_forecast(self, zone_id):
        try:
            zid = int(str(zone_id).lower().replace("zone", "").strip())
            r = self.w._zone_rows()[zid - 1]
        except Exception:
            return None
        return {"zone": f"Zone {r['id']} ({r['name']})", "demand": r["forecast"], "supply": r["supply"],
                "congestion": self.w.engine.snapshot()["congestion"][r["id"] - 1]}

    def driver_earnings(self, driver_id):
        d = self.w.engine.drivers[DEMO_DRIVER_INDEX]
        hours = round(5.2 + self.w.engine.t / 60.0, 1)
        return {"driver_id": driver_id, "today": round(d.earnings), "trips": d.completed, "hours": hours}

    def onboarding_checklist(self, driver_id):
        return [{"item": "Upload driving licence", "done": True}, {"item": "Vehicle inspection", "done": True},
                {"item": "Background verification", "done": True}]
