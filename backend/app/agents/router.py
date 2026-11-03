"""Classify a driver question as marketplace / earnings / onboarding.
Rule-based keywords first; the LLM is asked only when the rules are unclear."""
from __future__ import annotations

import re
from typing import Optional, Tuple

LABELS = ("marketplace", "earnings", "onboarding")

KEYWORDS = {
    "marketplace": [r"demand", r"supply", r"surge", r"zone", r"busy", r"hot ?spot", r"traffic",
                    r"congest\w*", r"forecast", r"where should i", r"idle", r"position\w*"],
    "earnings": [r"earn\w*", r"income", r"pay\w*", r"paid", r"money", r"fare", r"tips?",
                 r"how much did i", r"balance", r"commission", r"bonus\w*", r"weekly total"],
    "onboarding": [r"onboard\w*", r"sign ?up", r"regist\w*", r"documents?", r"licen[sc]e",
                   r"verif\w*", r"background check", r"checklist", r"activat\w*",
                   r"inspection", r"training", r"getting started", r"approv\w*"],
}
_COMPILED = {k: [re.compile(rf"\b{p}\b", re.I) for p in v] for k, v in KEYWORDS.items()}


def rule_classify(question: str) -> Optional[str]:
    scores = {k: sum(1 for p in pats if p.search(question)) for k, pats in _COMPILED.items()}
    ranked = sorted(scores.items(), key=lambda kv: -kv[1])
    (top, s1), (_, s2) = ranked[0], ranked[1]
    return top if s1 > 0 and s1 > s2 else None


class Router:
    def __init__(self, provider):
        self.provider = provider

    def classify(self, question: str) -> Tuple[Optional[str], str]:
        """-> (label or None, method: "rules" | "llm" | "unclear")"""
        label = rule_classify(question)
        if label:
            return label, "rules"
        res = self.provider.generate(
            f"Classify this driver question as exactly one of: marketplace, earnings, onboarding.\n"
            f"Question: {question}\nReply with the single word only.",
            system="You are a strict classifier.", fallback="unclear")
        found = next((l for l in LABELS if l in res.text.lower()), None) if res.source != "template" else None
        return (found, "llm") if found else (None, "unclear")
