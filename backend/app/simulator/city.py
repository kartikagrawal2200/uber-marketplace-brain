"""city.py -- 12-zone city grid (4 cols x 3 rows) and base demand.
*** SYNTHETIC DATA: every number here is invented for simulation; nothing is real ride-hailing data. ***
Zone id = row*4 + col. Deps: numpy only."""
import numpy as np

COLS, ROWS = 4, 3
N_ZONES = COLS * ROWS
# Layout (row-major):  0 res   1 office  2 mall    3 airport
#                      4 res   5 hub     6 office  7 stadium
#                      8 res   9 hosp    10 mall   11 res
ZONE_TYPES = ["residential", "office", "mall", "airport",
              "residential", "transit_hub", "office", "stadium",
              "residential", "hospital", "mall", "residential"]

# type -> (peak requests/hour, floor fraction of peak, [(center_hour, width_h, weight), ...])
_PROFILE = {
    "residential": (60, 0.25, [(7.5, 1.5, 1.0), (19.0, 2.0, 0.8)]),
    "office":      (90, 0.10, [(9.0, 1.2, 1.0), (18.0, 1.2, 1.0)]),     # peaks 8-10, 17-19
    "mall":        (65, 0.10, [(13.0, 2.0, 0.5), (19.5, 2.0, 1.0)]),    # evening-heavy
    "airport":     (70, 0.50, [(6.0, 2.0, 0.5), (14.0, 3.0, 0.4), (22.0, 2.0, 0.5)]),
    "stadium":     (20, 0.20, [(18.0, 3.0, 0.5)]),                      # spikes come from events
    "hospital":    (45, 0.40, [(8.0, 2.0, 0.7), (15.0, 2.0, 0.7), (20.0, 2.0, 0.5)]),
    "transit_hub": (80, 0.20, [(8.5, 1.3, 1.0), (17.5, 1.3, 1.0)]),
}
# Weekend multiplier per zone type (used as DayFactor by demand.py); malls peak on weekends.
WEEKEND_FACTOR = {"residential": 1.1, "office": 0.35, "mall": 1.5, "airport": 1.1,
                  "stadium": 1.6, "hospital": 0.9, "transit_hub": 0.7}

def _build_table():
    """(12 x 24) weekday base demand table, requests/hour (SYNTHETIC)."""
    tab = np.zeros((N_ZONES, 24))
    for z, t in enumerate(ZONE_TYPES):
        peak, floor, bumps = _PROFILE[t]
        for h in range(24):
            s = sum(w * np.exp(-0.5 * (min(abs(h - c), 24 - abs(h - c)) / sd) ** 2) for c, sd, w in bumps)
            tab[z, h] = peak * (floor + (1 - floor) * min(1.0, s))
    return tab

_TABLE = _build_table()
# Manhattan distance (in zone hops) between every pair of zones.
DIST = np.array([[abs(a // COLS - b // COLS) + abs(a % COLS - b % COLS) for b in range(N_ZONES)]
                 for a in range(N_ZONES)])

def get_neighbors(zone):
    """4-connected neighbor zone ids of `zone`."""
    r, c = divmod(zone, COLS)
    return [rr * COLS + cc for rr, cc in ((r - 1, c), (r + 1, c), (r, c - 1), (r, c + 1))
            if 0 <= rr < ROWS and 0 <= cc < COLS]

def get_base_demand(zone, hour):
    """SYNTHETIC weekday base demand (requests/hour) for `zone` at integer `hour` (0-23)."""
    return float(_TABLE[zone, int(hour) % 24])
