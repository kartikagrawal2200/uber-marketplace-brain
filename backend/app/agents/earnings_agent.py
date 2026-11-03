"""
agents/earnings_agent.py — Answers driver earnings and shift strategy questions.
"""

import logging
from typing import Optional

logger = logging.getLogger(__name__)


class EarningsAgent:
    SYSTEM_PROMPT = """You are a personal earnings coach for a ride-hailing driver.
You have access to this driver's earnings history, completed rides, and shift data.
Give specific, motivating advice based on their actual numbers.
"""

    def __init__(self) -> None:
        pass

    async def respond(self, query: str, context: Optional[dict] = None) -> str:
        return (
            "TODO: implement EarningsAgent.respond(). "
            "This should return personalized earnings analysis and advice."
        )
