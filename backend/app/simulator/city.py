"""city.py -- 12-zone city grid (4 cols x 3 rows) and base demand.
*** SYNTHETIC DATA: every number here is invented for simulation; nothing is real ride-hailing data. ***"""
import numpy as np

COLS, ROWS = 4, 3
N_ZONES = COLS * ROWS

ZONE_NAMES = [
    "Downtown", "Uptown", "Midtown", "Financial",
    "OldTown", "Harbor", "SuburbsN", "SuburbsE",
    "Industrial", "Airport", "SuburbsS", "SuburbsW",
]

ZONE_TYPES = [
    "commercial", "residential", "commercial", "commercial",
    "entertainment", "industrial", "residential", "residential",
    "industrial", "transit_hub", "residential", "residential",
]

X = np.array([(i % COLS) * 2.0 for i in range(N_ZONES)])
Y = np.array([(i // COLS) * 2.0 for i in range(N_ZONES)])
DIST = np.zeros((N_ZONES, N_ZONES))
for i in range(N_ZONES):
    for j in range(N_ZONES):
        DIST[i, j] = np.sqrt((X[i] - X[j])**2 + (Y[i] - Y[j])**2)

MANHATTAN = np.zeros((N_ZONES, N_ZONES))
for i in range(N_ZONES):
    for j in range(N_ZONES):
        MANHATTAN[i, j] = abs(X[i] - X[j]) + abs(Y[i] - Y[j])

SPEED_KMH = 30.0

BASE_DEMAND = np.array([
    [10, 8, 5, 4, 3, 5, 12, 28, 45, 38, 30, 28, 30, 32, 35, 42, 55, 60, 52, 40, 30, 24, 18, 14],
    [12, 8, 5, 3, 3, 6, 18, 40, 30, 20, 18, 16, 18, 18, 20, 25, 35, 45, 50, 42, 32, 25, 20, 15],
    [8, 5, 3, 2, 2, 4, 10, 25, 40, 35, 32, 30, 32, 34, 38, 45, 58, 62, 48, 35, 25, 20, 15, 10],
    [5, 3, 2, 1, 1, 3, 8, 22, 50, 45, 38, 35, 38, 38, 40, 48, 60, 55, 35, 22, 15, 10, 8, 6],
    [15, 12, 8, 5, 3, 3, 6, 10, 15, 18, 20, 22, 25, 25, 28, 32, 40, 48, 55, 60, 58, 45, 30, 20],
    [4, 3, 2, 2, 2, 4, 8, 15, 18, 16, 15, 14, 15, 15, 16, 18, 20, 18, 14, 10, 8, 6, 5, 4],
    [18, 12, 7, 4, 4, 8, 25, 50, 32, 18, 14, 12, 14, 14, 16, 20, 28, 38, 48, 52, 42, 35, 28, 22],
    [16, 10, 6, 3, 3, 7, 22, 48, 28, 16, 12, 12, 12, 14, 15, 18, 25, 35, 45, 48, 40, 32, 25, 20],
    [3, 2, 2, 2, 2, 5, 10, 18, 20, 16, 14, 14, 15, 15, 15, 18, 22, 18, 12, 8, 6, 5, 4, 3],
    [20, 15, 12, 10, 8, 12, 18, 25, 30, 32, 30, 30, 32, 34, 35, 38, 42, 45, 42, 38, 35, 32, 28, 24],
    [14, 10, 6, 3, 3, 6, 20, 45, 28, 16, 12, 12, 12, 12, 14, 18, 25, 35, 44, 48, 38, 30, 24, 18],
    [15, 10, 6, 3, 3, 6, 20, 46, 30, 16, 12, 12, 12, 14, 15, 18, 26, 36, 45, 50, 40, 32, 25, 18],
], dtype=float)


def get_base_demand(zone_id, hour):
    return BASE_DEMAND[zone_id, int(hour) % 24]


def get_neighbors(zone_id):
    r, c = zone_id // COLS, zone_id % COLS
    nbrs = []
    for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
        nr, nc = r + dr, c + dc
        if 0 <= nr < ROWS and 0 <= nc < COLS:
            nbrs.append(nr * COLS + nc)
    return nbrs
