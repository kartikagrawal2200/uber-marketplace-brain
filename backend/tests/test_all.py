import pytest
from app.agents.assistant import Assistant
from app.agents.base import Context
from app.agents.router import Router, classify_intent
from app.recommender.anti_crowding import AntiCrowding
from app.agents.llm.cache import LLMCache
from app.agents.llm.key_rotator import GeminiKeyRotator


def test_key_rotator():
    rotator = GeminiKeyRotator(["key1", "key2"])
    assert rotator.next_key() in ["key1", "key2"]


def test_cache():
    cache = LLMCache()
    cache.set("p1", "ans1")
    assert cache.get("p1") == "ans1"
    assert cache.get("p2") is None


def test_anti_crowding():
    ac = AntiCrowding(max_drivers_per_zone=2)
    ac.record_acceptance(1)
    ac.record_acceptance(1)
    counts = ac.get_inflight_counts()
    assert counts.get(1) == 2


def test_router():
    assert classify_intent("where is the surge zone?") == "marketplace"
    assert classify_intent("what are my earnings?") == "earnings"
    assert classify_intent("how to get onboarded as driver?") == "onboarding"
