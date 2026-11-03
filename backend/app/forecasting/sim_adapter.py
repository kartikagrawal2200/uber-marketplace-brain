"""Thin adapter between this package and simulator."""
from .common import all_zones

def parse_snapshot(engine_state):
    return {
        "demand": {z.zone_id: z.pending_requests for z in engine_state.zones},
        "idle": {z.zone_id: z.idle_drivers for z in engine_state.zones},
        "incoming": {z.zone_id: 0 for z in engine_state.zones},
        "trips": {z.zone_id: 0 for z in engine_state.zones},
        "congestion": {z.zone_id: z.congestion for z in engine_state.zones},
        "weather": engine_state.weather,
        "hour": engine_state.simulated_hour,
        "age_minutes": 0,
        "events": engine_state.events,
    }
