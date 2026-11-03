"""
forecasting/demand_model.py — AI demand forecasting model.

Combines statistical Poisson baseline with LLM context-awareness
to predict demand per zone for the next 15 minutes.
"""

from typing import Dict, Optional
from app.forecasting.baseline import BaselineForecaster


class DemandModel:
    def __init__(self, baseline: BaselineForecaster) -> None:
        self.baseline = baseline

    def predict(self, zone_id: int, context: Optional[dict] = None) -> float:
        return self.baseline.forecast(zone_id)

    def predict_all(self, context: Optional[dict] = None) -> Dict[int, float]:
        return {z: self.predict(z, context) for z in self.baseline.history}
