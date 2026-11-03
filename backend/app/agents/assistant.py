from typing import Any, Dict, Optional

try:
    from app.agents.base import Context
    from app.agents.router import Router
    from app.agents.specialists import EarningsAgent, MarketplaceAgent, OnboardingAgent
    from app.agents.llm.provider import LLMProvider
except ImportError:
    from .base import Context
    from .router import Router
    from .specialists import EarningsAgent, MarketplaceAgent, OnboardingAgent
    from .llm.provider import LLMProvider


class Assistant:
    def __init__(self, provider: Optional[LLMProvider] = None):
        self.provider = provider or LLMProvider()
        self.router = Router(self.provider)
        self.agents = {a.name: a for a in (MarketplaceAgent(self.provider),
                                           EarningsAgent(self.provider),
                                           OnboardingAgent(self.provider))}

    def ask(self, question: str, ctx: Context) -> Dict[str, Any]:
        label, method = self.router.classify(question)
        if label is None:
            return {"route": None, "route_method": method, "tool_calls": [],
                    "answer": "I don't know. Is this about the marketplace, your earnings, or onboarding?"}
        r = self.agents[label].handle(question, ctx)
        return {"route": label, "route_method": method, "answer": r.answer, "tool_calls": r.tool_calls}
