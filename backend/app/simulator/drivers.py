"""
simulator/drivers.py — Driver state machine.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional
import uuid


class DriverState(str, Enum):
    IDLE = "idle"
    MATCHED = "matched"
    EN_ROUTE = "en_route"
    COMPLETED = "completed"
    OFFLINE = "offline"


@dataclass
class Driver:
    driver_id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    zone_id: int = 1
    state: DriverState = DriverState.IDLE
    current_request_id: Optional[str] = None
    ticks_in_state: int = 0
    total_completed: int = 0
    total_earnings: float = 0.0
    accepted_hint: bool = False

    def assign(self, request_id: str) -> None:
        assert self.state == DriverState.IDLE
        self.current_request_id = request_id
        self.state = DriverState.MATCHED
        self.ticks_in_state = 0

    def pickup(self) -> None:
        assert self.state == DriverState.MATCHED
        self.state = DriverState.EN_ROUTE
        self.ticks_in_state = 0

    def complete(self, fare: float = 0.0) -> None:
        assert self.state == DriverState.EN_ROUTE
        self.state = DriverState.COMPLETED
        self.ticks_in_state = 0
        self.total_completed += 1
        self.total_earnings += fare
        self.current_request_id = None

    def reset_to_idle(self) -> None:
        assert self.state == DriverState.COMPLETED
        self.state = DriverState.IDLE
        self.ticks_in_state = 0

    def go_offline(self) -> None:
        self.state = DriverState.OFFLINE
        self.ticks_in_state = 0

    def go_online(self) -> None:
        assert self.state == DriverState.OFFLINE
        self.state = DriverState.IDLE
        self.ticks_in_state = 0

    def tick(self) -> None:
        self.ticks_in_state += 1
        if self.state == DriverState.COMPLETED:
            self.reset_to_idle()

    def move_to_zone(self, target_zone_id: int) -> None:
        self.zone_id = target_zone_id

    def to_dict(self) -> dict:
        return {
            "driver_id": self.driver_id,
            "zone_id": self.zone_id,
            "state": self.state.value,
            "current_request_id": self.current_request_id,
            "total_completed": self.total_completed,
            "total_earnings": self.total_earnings,
        }
