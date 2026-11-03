"""engine.py -- tick-based ride-hailing simulation engine (1 tick = 1 simulated minute).
*** SYNTHETIC DATA: all output (snapshots, logs, CSVs, summaries) is simulated, not real. ***
Deps: numpy, pandas, stdlib."""
import time
import numpy as np
import pandas as pd
from city import N_ZONES, ZONE_TYPES, get_base_demand
from demand import DemandGenerator
from drivers import Driver, State, drop_stale, match
from traffic_weather import Weather, congestion, travel_time
from events import EventManager

LABEL = "SYNTHETIC DATA - simulated, not real ride-hailing data"

class Engine:
    """policy(engine, snapshot) is called at the start of each tick; it may call
    engine.reposition(driver_id, zone) and engine.set_surge(zone, mult). Default: do nothing.
    speed = simulated minutes per real second (0 = run as fast as possible)."""
    def __init__(self, seed=42, n_drivers=550, speed=0.0, stale_minutes=5, start_hour=6,
                 start_weekday=0, policy=None, patience=10, dropout_prob=0.002):
        self.rng = np.random.default_rng(seed)
        self.speed, self.stale_minutes, self.policy = speed, stale_minutes, policy
        self.start_min, self.start_weekday = start_hour * 60, start_weekday
        self.patience, self.dropout_prob = patience, dropout_prob
        self.t, self.is_weekend, self.hour = 0, False, start_hour
        self.events, self.weather, self.demand = EventManager(), Weather(), DemandGenerator(self.rng)
        w = np.array([sum(get_base_demand(z, h) for h in range(24)) for z in range(N_ZONES)])
        zones = self.rng.choice(N_ZONES, n_drivers, p=w / w.sum())
        self.drivers = [Driver(i, int(z)) for i, z in enumerate(zones)]
        self.pending, self.policy_surge = [], np.ones(N_ZONES)
        self.cong, self.last_requests, self.demand_ewma = congestion(start_hour), np.zeros(N_ZONES, int), np.zeros(N_ZONES)
        self._offline, self._snaps = {}, []                 # driver id -> tick GPS returns; per-tick snapshots
        self.stats = dict(requests=0, matched=0, abandoned=0, completed=0, stale_flagged=0, wait_sum=0)

    # ---- policy-facing API ----
    def set_surge(self, zone, mult):
        self.policy_surge[zone] = float(np.clip(mult, 1.0, 5.0))
    def idle_ids(self, zone):
        return [d.id for d in self.drivers if d.available and d.zone == zone]
    def reposition(self, driver_id, zone):
        d = self.drivers[driver_id]
        if d.available and d.zone != zone:
            d.reposition(zone, travel_time(d.zone, zone, self.cong, self.weather.slowdown))

    # ---- state snapshot ----
    def snapshot(self):
        """Per-zone arrays (length 12). incoming = idle drivers repositioning to the zone + drivers on
        trip/drop-off whose destination is the zone; finishing_15 = drivers whose request ends in that
        zone within 15 min. unfulfilled = requests still waiting for a driver."""
        idle, inc, fin = (np.zeros(N_ZONES, int) for _ in range(3))
        for d in self.drivers:
            if d.available: idle[d.zone] += 1
            if d.move_target is not None: inc[d.move_target] += 1
            elif d.state in (State.ON_TRIP, State.DROP_OFF): inc[d.req.dest_zone] += 1
            if d.req is not None and d.remaining() <= 15: fin[d.req.dest_zone] += 1
        return dict(t=self.t, hour=self.hour, weather=self.weather.state, requests=self.last_requests.copy(),
                    idle_drivers=idle, incoming_drivers=inc, finishing_15=fin,
                    unfulfilled=np.bincount([r.zone for r in self.pending], minlength=N_ZONES),
                    surge=np.maximum(self.events.surge_array(), self.policy_surge), congestion=self.cong.copy(),
                    active_events=self.events.active(), stale_drivers=sum(d.stale for d in self.drivers),
                    label="SYNTHETIC")

    # ---- one tick ----
    def step(self):
        t, st = self.t, self.stats
        m = self.start_min + t
        self.hour, hf = int(m // 60 % 24), m / 60 % 24
        self.is_weekend = (self.start_weekday + m // 1440) % 7 >= 5
        self.events.advance(t)                                          # 1. weather/traffic/events
        forced = self.events.forced_weather()
        if forced: self.weather.state = forced
        else: self.weather.step(self.rng)
        self.cong = congestion(hf)
        if self.policy: self.policy(self, self.snapshot())              # 2. policy hook
        surge = np.maximum(self.events.surge_array(), self.policy_surge)
        reqs = self.demand.generate(t, self.hour, self.is_weekend, self.weather.demand_factor,
                                    self.events.demand_factors(), surge)  # 3. demand
        self.last_requests = np.bincount([r.zone for r in reqs], minlength=N_ZONES)
        self.demand_ewma = 0.9 * self.demand_ewma + 0.1 * self.last_requests
        st["requests"] += len(reqs)
        self.pending += reqs
        alive = [r for r in self.pending if t - r.time <= self.patience]  # riders give up after `patience`
        st["abandoned"] += len(self.pending) - len(alive)
        self.pending = alive
        for d in self.drivers:                                          # 4. GPS pings (+ random dropouts)
            back = self._offline.get(d.id)
            if back is not None:
                if t < back: continue
                del self._offline[d.id]
            elif self.rng.random() < self.dropout_prob:
                self._offline[d.id] = t + int(self.rng.integers(5, 26)); continue
            d.ping(t)
        st["stale_flagged"] += drop_stale(self.drivers, t, self.stale_minutes)  # 5. stale-GPS removal
        pairs = match(self.pending, self.drivers)                       # 6. matching
        for r, d in pairs:
            d.assign(r, travel_time(d.zone, r.zone, self.cong, self.weather.slowdown),
                     int(self.rng.integers(1, 4)),
                     travel_time(r.zone, r.dest_zone, self.cong, self.weather.slowdown))
            st["wait_sum"] += t - r.time
        done = {r.id for r, _ in pairs}
        self.pending = [r for r in self.pending if r.id not in done]
        st["matched"] += len(pairs)
        for d in self.drivers:                                          # 7. advance driver states
            st["completed"] += d.advance() is not None
        self._snaps.append(self.snapshot())
        self.t += 1

    def run(self, minutes, scripted=None):
        """Run `minutes` ticks. scripted = {tick: fn(engine)} for demo/scenario events. Returns history()."""
        for _ in range(minutes):
            self.events.advance(self.t)
            if scripted and self.t in scripted: scripted[self.t](self)
            self.step()
            if self.speed > 0: time.sleep(1.0 / self.speed)
        return self.history()

    # ---- output ----
    def history(self):
        """Long DataFrame (one row per tick x zone), every row labeled SYNTHETIC."""
        rows = [dict(t=s["t"], hour=s["hour"], zone=z, zone_type=ZONE_TYPES[z], weather=s["weather"],
                     requests=int(s["requests"][z]), idle_drivers=int(s["idle_drivers"][z]),
                     incoming_drivers=int(s["incoming_drivers"][z]), finishing_15=int(s["finishing_15"][z]),
                     unfulfilled=int(s["unfulfilled"][z]), surge=float(s["surge"][z]),
                     congestion=round(float(s["congestion"][z]), 3), active_events="; ".join(s["active_events"]),
                     data_label="SYNTHETIC") for s in self._snaps for z in range(N_ZONES)]
        return pd.DataFrame(rows)

    def save_csv(self, path="synthetic_sim_log.csv"):
        """Save history with a SYNTHETIC banner as line 1 (read with pd.read_csv(path, comment='#'))."""
        with open(path, "w") as f:
            f.write(f"# {LABEL}\n")
            self.history().to_csv(f, index=False)
        return path

def print_summary(e, title=""):
    h, s = e.history(), e.stats
    print(f"\n=== {LABEL} ===\n--- {title} | {e.t} min simulated, {len(e.drivers)} drivers ---")
    print(f"requests {s['requests']} | matched {s['matched']} ({s['matched']/max(1,s['requests']):.1%}) | "
          f"abandoned {s['abandoned']} | completed trips {s['completed']} | "
          f"avg match wait {s['wait_sum']/max(1,s['matched']):.2f} min | stale-GPS flags {s['stale_flagged']}")
    per = h.groupby(["zone", "zone_type"]).agg(requests=("requests", "sum"), avg_idle=("idle_drivers", "mean"),
                                               avg_unfulfilled=("unfulfilled", "mean")).round(2)
    print(per.to_string())
    print("weather minutes:", h[h.zone == 0].weather.value_counts().to_dict(), "(SYNTHETIC)")

def rebalance_policy(engine, snap):
    """Example policy: every 5 ticks, send 2 idle drivers from the zone with most idle drivers
    to the zone with the biggest expected-demand gap."""
    if engine.t % 5: return
    gap = engine.demand_ewma * 10 - snap["idle_drivers"] - snap["incoming_drivers"]
    dst, src = int(np.argmax(gap)), int(np.argmax(snap["idle_drivers"]))
    if gap[dst] > 0 and src != dst:
        for i in engine.idle_ids(src)[:2]: engine.reposition(i, dst)

if __name__ == "__main__":
    # Demo: 6 simulated hours from 15:00 on a Wednesday, same seed + same scripted events for both runs.
    script = {60: lambda e: e.events.trigger_surge(1, 2.0, 60),            # 16:00 office surge
              180: lambda e: e.events.trigger_stadium_end(7),              # 18:00 stadium lets out
              240: lambda e: e.events.trigger_rain(heavy=True, duration=45)}  # 19:00 heavy rain
    for name, pol in (("baseline (no policy)", None), ("rebalance policy", rebalance_policy)):
        eng = Engine(seed=7, start_hour=15, start_weekday=2, policy=pol)
        eng.run(360, script)
        print_summary(eng, name)
    print("\nSaved:", eng.save_csv(), "(SYNTHETIC)")
