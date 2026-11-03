"""drivers.py -- driver state machine, stale-GPS filtering, nearest-idle matching.
*** SYNTHETIC DATA: drivers are simulated entities, not real people. ***
Idle -> Assigned -> Driving_to_pickup -> Waiting -> On_trip -> Drop_off -> Idle. Deps: stdlib + city."""
from enum import Enum
from city import DIST

class State(Enum):
    IDLE = "Idle"; ASSIGNED = "Assigned"; DRIVING_TO_PICKUP = "Driving_to_pickup"
    WAITING = "Waiting"; ON_TRIP = "On_trip"; DROP_OFF = "Drop_off"

class Driver:
    """SYNTHETIC driver. `timer` counts minutes left in the current state (or reposition leg)."""
    __slots__ = ("id", "zone", "state", "last_gps_ping", "stale", "req", "timer",
                 "eta", "wait", "trip", "move_target")
    def __init__(self, driver_id, zone, t=0):
        self.id, self.zone, self.state, self.last_gps_ping = driver_id, zone, State.IDLE, t
        self.stale, self.req, self.timer, self.eta, self.wait, self.trip = False, None, 0, 0, 0, 0
        self.move_target = None            # set while repositioning (state stays IDLE)

    @property
    def available(self):
        """In the matchable pool: idle, fresh GPS, not mid-reposition."""
        return self.state is State.IDLE and not self.stale and self.move_target is None

    def ping(self, t):
        self.last_gps_ping = t

    def assign(self, req, eta, wait, trip):
        """Idle -> Assigned; eta/wait/trip are minutes for pickup drive, rider wait, trip."""
        self.state, self.req, self.eta, self.wait, self.trip = State.ASSIGNED, req, eta, wait, trip

    def reposition(self, zone, eta):
        if self.state is State.IDLE:
            self.move_target, self.timer = zone, eta

    def remaining(self):
        """Minutes until this driver finishes its current request (0 if none)."""
        s = self.state
        if self.req is None: return 0
        if s is State.ASSIGNED: return self.eta + self.wait + self.trip + 1
        if s is State.DRIVING_TO_PICKUP: return self.timer + self.wait + self.trip + 1
        if s is State.WAITING: return self.timer + self.trip + 1
        if s is State.ON_TRIP: return self.timer + 1
        return self.timer                                    # DROP_OFF

    def advance(self):
        """Advance one minute. Returns the finished Request on completion, else None."""
        s = self.state
        if s is State.IDLE:
            if self.move_target is not None:
                self.timer -= 1
                if self.timer <= 0: self.zone, self.move_target = self.move_target, None
        elif s is State.ASSIGNED:
            self.state, self.timer = State.DRIVING_TO_PICKUP, self.eta
        else:
            self.timer -= 1
            if self.timer <= 0:
                if s is State.DRIVING_TO_PICKUP: self.zone, self.state, self.timer = self.req.zone, State.WAITING, self.wait
                elif s is State.WAITING: self.state, self.timer = State.ON_TRIP, self.trip
                elif s is State.ON_TRIP: self.zone, self.state, self.timer = self.req.dest_zone, State.DROP_OFF, 1
                else:
                    done, self.req, self.state = self.req, None, State.IDLE
                    return done
        return None

def drop_stale(drivers, now, stale_minutes=5):
    """Flag drivers with no GPS ping for > stale_minutes (removed from pool; re-added when pings resume).
    Returns number of drivers newly flagged this call."""
    new = 0
    for d in drivers:
        s = (now - d.last_gps_ping) > stale_minutes
        new += s and not d.stale
        d.stale = s
    return new

def match(requests, drivers):
    """Greedy: each request (in order) gets the nearest available driver (zone Manhattan distance).
    Returns list of (request, driver) pairs; unmatched requests are simply absent."""
    pool, pairs = [d for d in drivers if d.available], []
    for r in requests:
        if not pool: break
        d = min(pool, key=lambda x: DIST[x.zone, r.zone])
        pool.remove(d); pairs.append((r, d))
    return pairs
