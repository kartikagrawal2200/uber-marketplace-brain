"""Classify a driver question as marketplace / earnings / onboarding."""
from __future__ import annotations

import re
from typing import Optional, Tuple

LABELS = ("marketplace", "earnings", "onboarding")

KEYWORDS = {
    "marketplace": ("demand", "surge", "busy", "crowded", "quiet", "zone",
                    "relocate", "reposition", "where", "destination", "traffic", "heat"),
    "earnings":    ("earn", "earning", "earnings", "money", "fare", "fares",
                    "payout", "payouts", "paid", "trip", "trips", "bonus", "bonuses",
                    "incentive", "incentives", "tip", "tips", "hour", "hours"),
    "onboarding":  ("sign up", "signup", "register", "registration", "document",
                    "documents", "licence", "license", "upload", "onboard",
                    "onboarding", "checklist", "verify", "verification", "approved", "start driving"),
}

_WORD = re.compile(r"[a-z0-9_]+")


def rule_classify(question: str) -> Optional[str]:
    q = question.lower()
    scores = {}
    for label, words in KEYWORDS.items():
        s = 0
        for w in words:
            if " " in w:
                if w in q:
                    s += 2
            elif w in _WORD.findall(q):
                s += 1
        scores[label] = s
    best, top = max(scores.items(), key=lambda kv: kv[1])
    others = [v for k, v in scores.items() if k != best]
    if top >= 1 and top > max(others):
        return best
    return None


class Router:
    def __init__(self, provider):
        self.provider = provider

    def classify(self, question: str) -> Tuple[Optional[str], str]:
        rule = rule_classify(question)
        if rule:
            return rule, "rule"

        prompt = (f"Categorise this driver question into exactly ONE of: marketplace, earnings, onboarding.\n"
                  f"Question: \"{question}\"\n"
                  f"Reply with just the single lowercase word.")
        res = self.provider.generate(prompt, fallback="")
        cleaned = re.sub(r"[^a-z]", "", res.text.lower())
        for label in LABELS:
            if label in cleaned:
                return label, "llm"
        return None, "fallback"
