"""
forecasting/supply_model.py — Driver supply forecasting.
"""

from typing import Dict


class SupplyModel:
    def __init__(self) -> None:
        pass

    def predict_idle_drivers(
        self,
        zone_id: int,
        current_idle: int,
        current_en_route: int,
        horizon_ticks: int = 30,
    ) -> float:
        return float(current_idle + current_en_route * 0.5)

    def supply_gap(
        self,
        zone_id: int,
        predicted_demand: float,
        predicted_supply: float,
    ) -> float:
        return predicted_supply - predicted_demand
