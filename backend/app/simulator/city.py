"""city.py -- 12-zone city grid (4 columns x 3 rows), zone types and base demand per hour.

*** SYNTHETIC DATA: every number in this file is invented for simulation.
    Nothing here is real ride-hailing data. ***

Zone ids are 0..11 (row-major).  The UI shows them as Zone 1..12.
"""
import numpy as np

DATA_LABEL = "SYNTHETIC"
COLS, ROWS = 4, 3
N_ZONES = COLS * ROWS

# (name, type).  Names match the three frontend apps so the map lines up.
ZONES = [
    ("Old Town",          "residential"),
    ("Riverside",         "residential"),
    ("Tech Park",         "office"),
    ("Airport Road",      "airport"),
    ("University",        "residential"),
    ("Central Station",   "transit_hub"),
    ("Stadium",           "stadium"),
    ("Harbour",           "office"),
    ("Market Street",     "mall"),
    ("Business District", "office"),
    ("Hospital",          "hospital"),
    ("Lakeside",          "residential"),
]
ZONE_NAMES = [n for n, _ in ZONES]
ZONE_TYPES = [t for _, t in ZONES]
ALL_TYPES = ("residential", "office", "mall", "airport", "stadium", "hospital", "transit_hub")
STADIUM_ZONE = ZONE_TYPES.index("stadium")

# Per-zone size multiplier (a bigger zone makes more requests than a small one).
ZONE_SCALE = np.array([0.9, 0.8, 1.0, 1.0, 0.9, 1.2, 1.0, 0.7, 1.0, 1.1, 0.8, 0.8])


def _profile(night, day, peaks):
    """24 hourly values (requests/hour) for a typical weekday.
    night: level 0-5h, day: level for other hours, peaks: [(start_h, end_h, level)]"""
    p = [night if h < 5 else day for h in range(24)]
    for start, end, level in peaks:
        for h in range(start, end):
            p[h % 24] = level
    return p


# Requests per hour for ONE zone of each type on a weekday.
TYPE_PROFILE = {
    "residential": _profile(4, 14, [(6, 10, 38), (17, 22, 42)]),
    "office":      _profile(3, 18, [(8, 10, 52), (17, 20, 56)]),
    "mall":        _profile(2, 12, [(11, 16, 34), (16, 22, 52)]),
    "airport":     _profile(14, 30, [(5, 9, 40), (19, 24, 38)]),
    "stadium":     _profile(2, 7, [(18, 23, 14)]),
    "hospital":    _profile(10, 16, [(9, 18, 20)]),
    "transit_hub": _profile(5, 26, [(7, 10, 62), (17, 21, 66)]),
}

# DayFactor: (weekday, weekend)
DAY_FACTOR = {
    "residential": (1.0, 1.10),
    "office":      (1.0, 0.45),
    "mall":        (1.0, 1.35),
    "airport":     (1.0, 1.05),
    "stadium":     (1.0, 1.50),
    "hospital":    (1.0, 0.95),
    "transit_hub": (1.0, 0.70),
}

# Grid geometry -----------------------------------------------------------------
def zone_col(z):
    return z % COLS


def zone_row(z):
    return z // COLS


MANHATTAN = np.zeros((N_ZONES, N_ZONES))      # distance in zone steps
for _i in range(N_ZONES):
    for _j in range(N_ZONES):
        MANHATTAN[_i, _j] = abs(zone_col(_i) - zone_col(_j)) + abs(zone_row(_i) - zone_row(_j))

KM_PER_STEP = 1.8


def get_base_demand(zone, hour):
    """Base requests/hour for a zone at an hour of the day (weekday, before DayFactor)."""
    return float(TYPE_PROFILE[ZONE_TYPES[zone]][int(hour) % 24] * ZONE_SCALE[zone])


def get_day_factor(zone, day):
    """DayFactor: weekday vs weekend (day 0=Mon ... 6=Sun)."""
    wk, we = DAY_FACTOR[ZONE_TYPES[zone]]
    return we if (int(day) % 7) >= 5 else wk


def get_neighbors(zone):
    r, c = zone_row(zone), zone_col(zone)
    out = []
    for dr, dc in ((-1, 0), (1, 0), (0, -1), (0, 1)):
        nr, nc = r + dr, c + dc
        if 0 <= nr < ROWS and 0 <= nc < COLS:
            out.append(nr * COLS + nc)
    return out
