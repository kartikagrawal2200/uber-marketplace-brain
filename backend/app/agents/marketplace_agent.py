"""
agents/marketplace_agent.py — Answers zone-level supply/demand questions.
"""

import logging
from typing import Optional

logger = logging.getLogger(__name__)


class MarketplaceAgent:
    SYSTEM_PROMPT = """You are an expert ride-hailing marketplace analyst.
You have access to real-time data about supply, demand, and events across 12 city zones.
Answer driver questions with specific, actionable advice backed by the data provided.
"""

    def __init__(self) -> None:
        pass

    async def respond(self, query: str, context: Optional[dict] = None) -> str:
        return (
            "TODO: implement MarketplaceAgent.respond(). "
            "This should return LLM-generated zone demand advice."
        )

    def _build_context_block(self, context: dict) -> str:
        return "TODO: format zone states, weather, events into prompt context"
