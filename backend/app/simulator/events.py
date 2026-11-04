"""events.py -- stadium end, price surge and forced rain.
*** SYNTHETIC DATA ***

Public functions (module level, plus the same names as Engine methods):
    trigger_stadium_end(engine, zone=None)
    trigger_surge(engine, zone)
    trigger_rain(engine)
"""
from dataclasses import dataclass

from .city import N_ZONES, STADIUM_ZONE, get_neighbors


@dataclass
class Event:
    kind: str            # "stadium_end" | "surge" | "rain"
    zone: int            # -1 for city-wide events
    start_t: int
    end_t: int
    peak: float = 1.0    # demand multiplier at the start (stadium) or price surge (surge)
    announce_t: int = 0  # when the platform learns about it (stadium schedules are known in advance)


class EventManager:
    def __init__(self):
        self.events = []

    def add(self, event):
        self.events.append(event)

    def active(self, t):
        return [e for e in self.events if e.start_t <= t < e.end_t]

    def upcoming(self, t, horizon=15):
        """Announced stadium events that have not started yet but start within `horizon` minutes."""
        return [e for e in self.events if e.kind == "stadium_end" and e.announce_t <= t < e.start_t
                and e.start_t - t <= horizon]

    def scheduled_features(self, t, horizon=15):
        """(event_soon, event_eta) per zone: expected peak multiplier and minutes until it starts."""
        soon, eta = [1.0] * N_ZONES, [99.0] * N_ZONES
        for e in self.upcoming(t, horizon):
            mins = e.start_t - t
            soon[e.zone] = max(soon[e.zone], e.peak)
            eta[e.zone] = min(eta[e.zone], mins)
            for nb in get_neighbors(e.zone):
                soon[nb] = max(soon[nb], 1.0 + (e.peak - 1.0) * 0.12)
                eta[nb] = min(eta[nb], mins)
        return soon, eta

    def demand_factors(self, t):
        """EventFactor per zone. Stadium crowds leave gradually: factor decays linearly to 1."""
        f = [1.0] * N_ZONES
        for e in self.active(t):
            if e.kind != "stadium_end":
                continue
            frac = 1.0 - (t - e.start_t) / max(1, e.end_t - e.start_t)
            f[e.zone] *= 1.0 + (e.peak - 1.0) * frac
            for nb in get_neighbors(e.zone):
                f[nb] *= 1.0 + (e.peak - 1.0) * 0.12 * frac
        return f

    def surge_factors(self, t):
        """PriceFactor input (surge multiplier) per zone."""
        s = [1.0] * N_ZONES
        for e in self.active(t):
            if e.kind == "surge":
                s[e.zone] = max(s[e.zone], e.peak)
        return s

    def congestion_extra(self, t):
        extra = {}
        for e in self.active(t):
            if e.kind == "stadium_end":
                extra[e.zone] = extra.get(e.zone, 0.0) + 0.6
                for nb in get_neighbors(e.zone):
                    extra[nb] = extra.get(nb, 0.0) + 0.2
        return extra

    def snapshot(self, t):
        return [{"kind": e.kind, "zone": e.zone, "ends_in": e.end_t - t} for e in self.active(t)]


def trigger_stadium_end(engine, zone=None, duration=30, peak=25.0, delay=0):
    """Stadium event ends: demand spike (about 25x the quiet-hour level, fading over `duration` min) in the zone, a smaller bump next door."""
    zone = STADIUM_ZONE if zone is None else int(zone)
    start = engine.t + delay          # delay > 0: the end time is announced `delay` minutes ahead
    engine.events.add(Event("stadium_end", zone, start, start + duration, peak, announce_t=engine.t))


def trigger_surge(engine, zone, duration=30, multiplier=2.0):
    """Price surge in one zone. Higher price lowers demand (PriceFactor) and raises the fare."""
    engine.events.add(Event("surge", int(zone), engine.t, engine.t + duration, multiplier))


def trigger_rain(engine, duration=45, heavy=False):
    """Force rain (or heavy rain) city-wide for `duration` minutes."""
    engine.weather.force("heavy_rain" if heavy else "rain", engine.t + duration)
    engine.events.add(Event("rain", -1, engine.t, engine.t + duration))
