"""
agents/router.py — Agent router: picks the right specialist agent.
"""

import logging
from typing import Optional

logger = logging.getLogger(__name__)

AGENT_MARKETPLACE = "marketplace"
AGENT_EARNINGS    = "earnings"
AGENT_ONBOARDING  = "onboarding"


def classify_intent(query: str) -> str:
    q = query.lower()
    if any(w in q for w in ["zone", "where", "move", "surge", "demand", "busy"]):
        return AGENT_MARKETPLACE
    if any(w in q for w in ["earn", "money", "income", "shift", "hour", "pay"]):
        return AGENT_EARNINGS
    if any(w in q for w in ["start", "new", "first", "onboard", "begin", "how to"]):
        return AGENT_ONBOARDING
    return AGENT_MARKETPLACE


async def route(
    query: str,
    context: Optional[dict] = None,
) -> dict:
    agent_type = classify_intent(query)
    logger.info(f"Routing to {agent_type} agent: '{query[:60]}...'")

    if agent_type == AGENT_MARKETPLACE:
        response = f"[{AGENT_MARKETPLACE} stub] TODO: implement MarketplaceAgent"
    elif agent_type == AGENT_EARNINGS:
        response = f"[{AGENT_EARNINGS} stub] TODO: implement EarningsAgent"
    else:
        response = f"[{AGENT_ONBOARDING} stub] TODO: implement OnboardingAgent"

    return {
        "agent_type": agent_type,
        "response": response,
        "query": query,
        "context": context,
    }
