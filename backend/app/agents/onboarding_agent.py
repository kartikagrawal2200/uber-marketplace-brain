"""
agents/onboarding_agent.py — Guides new drivers through their first rides.
"""

import logging
from typing import Optional

logger = logging.getLogger(__name__)

ONBOARDING_STAGES = [
    "account_created",
    "app_tutorial_complete",
    "first_ride_complete",
    "ten_rides_complete",
    "fully_onboarded",
]


class OnboardingAgent:
    SYSTEM_PROMPT = """You are a friendly onboarding guide for a new ride-hailing driver.
Explain things clearly and simply. Use bullet points for steps.
"""

    def __init__(self) -> None:
        pass

    async def respond(self, query: str, context: Optional[dict] = None) -> str:
        return (
            "TODO: implement OnboardingAgent.respond(). "
            "This should return step-by-step onboarding guidance."
        )

    def get_stage(self, completed_rides: int) -> str:
        if completed_rides == 0:
            return "account_created"
        elif completed_rides < 1:
            return "app_tutorial_complete"
        elif completed_rides < 10:
            return "first_ride_complete"
        elif completed_rides < 50:
            return "ten_rides_complete"
        else:
            return "fully_onboarded"
