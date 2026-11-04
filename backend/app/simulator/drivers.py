"""drivers.py -- driver state machine, stale-GPS removal and nearest-idle matching.
*** SYNTHETIC DATA ***

State machine:
    IDLE -> ASSIGNED -> TO_PICKUP -> WAITING -> ON_TRIP -> DROPOFF -> IDLE
An IDLE driver can also be repositioning (moving to another zone); a repositioning driver is not matchable.
"""
from enum import Enum

DEFAULT_GPS_STALE_MINUTES = 5


class State(Enum):
    IDLE = "idle"
    ASSIGNED = "assigned"
    TO_PICKUP = "driving_to_pickup"
    WAITING = "waiting"
    ON_TRIP = "on_trip"
    DROPOFF = "drop_off"


class Driver:
    def __init__(self, driver_id, zone):
        self.id = driver_id
        self.zone = zone
        self.state = State.IDLE
        self.req = None
        self.time_left = 0
        self.completed = 0
        self.earnings = 0.0
        self.bonus = 0.0                 # extra earned from surge pricing
        self.last_trip = None
        self.last_gps_t = 0
        self.gps_blackout_until = -1     # fault injection: no GPS pings before this tick
        self.active = True               # False while GPS is stale (removed from the pool)
        self.reposition_to = None
        self.reposition_left = 0
        self.manual = False              # the demo driver: the auto policy never moves him

    # -- GPS ---------------------------------------------------------------
    def update_gps(self, t):
        self.last_gps_t = t

    def is_gps_stale(self, t, threshold=DEFAULT_GPS_STALE_MINUTES):
        return (t - self.last_gps_t) > threshold

    # -- availability --------------------------------------------------------
    def is_available(self):
        return self.state == State.IDLE and self.reposition_to is None

    def start_reposition(self, to_zone, minutes):
        self.reposition_to = int(to_zone)
        self.reposition_left = max(1, int(minutes))

    # -- state machine -------------------------------------------------------
    def assign(self, req):
        self.state = State.ASSIGNED
        self.req = req
        req.status = "assigned"

    def advance(self, t, travel):
        """Advance one simulated minute. `travel(a, b)` gives minutes between zones.
        Returns the Request completed this tick, or None."""
        if self.state == State.IDLE:
            if self.reposition_to is not None:
                self.reposition_left -= 1
                if self.reposition_left <= 0:
                    self.zone, self.reposition_to = self.reposition_to, None
            return None

        if self.state == State.ASSIGNED:
            self.state = State.TO_PICKUP
            self.time_left = travel(self.zone, self.req.orig)
            return None

        self.time_left -= 1
        if self.time_left > 0:
            return None

        if self.state == State.TO_PICKUP:
            self.zone = self.req.orig
            self.state, self.time_left = State.WAITING, 1       # rider boards
            self.req.pickup_t = t
        elif self.state == State.WAITING:
            self.state = State.ON_TRIP
            self.time_left = travel(self.req.orig, self.req.dest)
            self.req.status = "on_trip"
        elif self.state == State.ON_TRIP:
            self.zone = self.req.dest
            self.state, self.time_left = State.DROPOFF, 1
        elif self.state == State.DROPOFF:
            req, self.req = self.req, None
            req.status = "completed"
            self.completed += 1
            self.earnings += req.fare
            self.bonus += req.fare - req.fare / req.surge
            self.last_trip = {"fare": round(req.fare), "surge": req.surge, "zone": req.orig + 1, "at": int(__import__("time").time() * 1000)}
            self.state = State.IDLE
            return req
        return None

    def eta_free(self, travel):
        """Minutes until this driver is idle again, and the zone where that happens."""
        if self.state == State.IDLE:
            return (self.reposition_left, self.reposition_to) if self.reposition_to is not None else (0, self.zone)
        r = self.req
        if self.state == State.ASSIGNED:
            return travel(self.zone, r.orig) + 1 + travel(r.orig, r.dest) + 1, r.dest
        if self.state == State.TO_PICKUP:
            return self.time_left + 1 + travel(r.orig, r.dest) + 1, r.dest
        if self.state == State.WAITING:
            return self.time_left + travel(r.orig, r.dest) + 1, r.dest
        if self.state == State.ON_TRIP:
            return self.time_left + 1, r.dest
        return self.time_left, r.dest          # DROPOFF


def drop_stale(drivers, t, threshold=DEFAULT_GPS_STALE_MINUTES):
    """Stale-GPS removal: return only drivers whose last GPS ping is fresh."""
    return [d for d in drivers if not d.is_gps_stale(t, threshold)]


def match(available, pending, travel, now=None):
    """Nearest-idle-driver matching, oldest request first. Returns [(driver, request)].
    A rider only accepts a driver who can arrive before they give up waiting (their max_wait)."""
    pool = sorted(available, key=lambda d: d.id)
    out = []
    for req in sorted(pending, key=lambda r: (r.created_t, r.req_id)):
        if not pool:
            break
        remaining = (req.max_wait - (now - req.created_t)) if now is not None else 10**6
        reachable = [d for d in pool if travel(d.zone, req.orig) <= remaining]
        if not reachable:
            continue
        best = min(reachable, key=lambda d: (travel(d.zone, req.orig), d.id))
        out.append((best, req))
        pool.remove(best)
    return out
