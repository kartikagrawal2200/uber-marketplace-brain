"""
simulator/events.py — Special events: stadium ends, surge zones, rain bursts.
"""

from dataclasses import dataclass
from typing import List, Dict
from enum import Enum


class EventType(str, Enum):
    STADIUM_END   = "stadium_end"
    SURGE_ZONE    = "surge_zone"
    RAIN_BURST    = "rain_burst"
    ROAD_CLOSURE  = "road_closure"


@dataclass
class CityEvent:
    event_id: str
    event_type: EventType
    zone_id: int
    start_tick: int
    duration_ticks: int
    demand_multiplier: float = 1.0
    traffic_delta: float = 0.0
    description: str = ""

    def is_active(self, tick: int) -> bool:
        return self.start_tick <= tick < self.start_tick + self.duration_ticks


class EventEngine:
    def __init__(self) -> None:
        self.events: List[CityEvent] = []
        self._load_default_events()

    def _load_default_events(self) -> None:
        self.events = [
            CityEvent(
                event_id="evt_stadium_1",
                event_type=EventType.STADIUM_END,
                zone_id=7,
                start_tick=60,
                duration_ticks=24,
                demand_multiplier=5.0,
                traffic_delta=0.3,
                description="Stadium event ends — 50,000 fans leaving Zone 7",
            ),
            CityEvent(
                event_id="evt_rain_1",
                event_type=EventType.RAIN_BURST,
                zone_id=0,
                start_tick=150,
                duration_ticks=18,
                demand_multiplier=1.4,
                traffic_delta=0.15,
                description="Sudden rain across all zones",
            ),
            CityEvent(
                event_id="evt_surge_1",
                event_type=EventType.SURGE_ZONE,
                zone_id=3,
                start_tick=240,
                duration_ticks=12,
                demand_multiplier=2.5,
                traffic_delta=0.1,
                description="Airport surge — flight cluster landing",
            ),
        ]

    def get_active_events(self, tick: int) -> List[CityEvent]:
        return [e for e in self.events if e.is_active(tick)]

    def get_demand_multipliers(self, tick: int) -> Dict[int, float]:
        multipliers: Dict[int, float] = {}
        for event in self.get_active_events(tick):
            if event.zone_id == 0:
                for z in range(1, 13):
                    multipliers[z] = multipliers.get(z, 1.0) * event.demand_multiplier
            else:
                multipliers[event.zone_id] = (
                    multipliers.get(event.zone_id, 1.0) * event.demand_multiplier
                )
        return multipliers

    def get_traffic_deltas(self, tick: int) -> Dict[int, float]:
        deltas: Dict[int, float] = {}
        for event in self.get_active_events(tick):
            if event.zone_id == 0:
                for z in range(1, 13):
                    deltas[z] = deltas.get(z, 0.0) + event.traffic_delta
            else:
                deltas[event.zone_id] = deltas.get(event.zone_id, 0.0) + event.traffic_delta
        return deltas

    def trigger_event(self, event: CityEvent) -> None:
        self.events.append(event)
