"""
simulator/city.py — City layout: 12 zones with types and base demand rates.

Zone types:
  - residential   : high morning/evening demand
  - commercial    : high daytime demand
  - transit_hub   : consistently high demand (airport, train station)
  - entertainment : spiky evening/weekend demand
  - industrial    : low demand
"""

from dataclasses import dataclass, field
from typing import Dict, List


ZONE_TYPES = ("residential", "commercial", "transit_hub", "entertainment", "industrial")


@dataclass
class Zone:
    """Represents one city zone."""

    zone_id: int
    name: str
    zone_type: str                          # one of ZONE_TYPES
    base_demand_rate: float                 # baseline Poisson lambda per tick
    lat: float = 0.0                        # TODO: set real centroid lat
    lng: float = 0.0                        # TODO: set real centroid lng
    adjacent_zones: List[int] = field(default_factory=list)

    def __post_init__(self) -> None:
        assert self.zone_type in ZONE_TYPES, f"Unknown zone type: {self.zone_type}"


ZONES: Dict[int, Zone] = {
    1:  Zone(1,  "Downtown Core",       "commercial",    4.5, adjacent_zones=[2, 3, 6]),
    2:  Zone(2,  "Midtown",             "commercial",    3.8, adjacent_zones=[1, 3, 4]),
    3:  Zone(3,  "Airport",             "transit_hub",   5.2, adjacent_zones=[1, 2]),
    4:  Zone(4,  "University District", "residential",   2.9, adjacent_zones=[2, 5]),
    5:  Zone(5,  "Suburbs North",       "residential",   1.8, adjacent_zones=[4, 6]),
    6:  Zone(6,  "Shopping Mall",       "commercial",    3.1, adjacent_zones=[1, 5, 7]),
    7:  Zone(7,  "Stadium District",    "entertainment", 2.0, adjacent_zones=[6, 8]),
    8:  Zone(8,  "Old Town",            "entertainment", 2.5, adjacent_zones=[7, 9]),
    9:  Zone(9,  "Suburbs South",       "residential",   1.6, adjacent_zones=[8, 10]),
    10: Zone(10, "Industrial Park",     "industrial",    0.8, adjacent_zones=[9, 11]),
    11: Zone(11, "Tech Campus",         "commercial",    3.4, adjacent_zones=[10, 12]),
    12: Zone(12, "Train Station",       "transit_hub",   4.0, adjacent_zones=[11, 1]),
}


def get_zone(zone_id: int) -> Zone:
    return ZONES[zone_id]


def all_zones() -> List[Zone]:
    return list(ZONES.values())
