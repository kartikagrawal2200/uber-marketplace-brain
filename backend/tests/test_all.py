"""Agents, recommender helpers and the live world contract.  ALL DATA IS SYNTHETIC."""
from app.agents.llm.cache import ResponseCache
from app.agents.llm.key_rotator import KeyRotator
from app.agents.router import rule_classify
from app.recommender.anti_crowding import AntiCrowding


def test_key_rotator_round_robin():
    r = KeyRotator(["key1", "key2"])
    assert len(r) == 2
    assert {r.acquire(), r.acquire()} == {"key1", "key2"}


def test_key_rotator_empty_is_ok():
    assert KeyRotator([]).acquire() is None          # no keys -> templates are used, nothing crashes


def test_cache():
    c = ResponseCache()
    key = c.make_key("ns", "p1")
    c.set(key, "ans1", "template")
    assert c.get(key) == ("ans1", "template")
    assert c.get(c.make_key("ns", "p2")) is None


def test_anti_crowding():
    ac = AntiCrowding()
    ac.record_acceptance("d1", "7")
    ac.record_acceptance("d2", "7")
    assert ac.pending("7") == 2
    assert ac.pending("7", exclude_driver="d1") == 1
    ac.release("d1")
    assert ac.pending("7") == 1


def test_router_rules():
    assert rule_classify("where is the surge zone?") == "marketplace"
    assert rule_classify("what are my earnings today?") == "earnings"
    assert rule_classify("how do I upload my licence document?") == "onboarding"


def test_world_matches_ui_contract():
    from app.world import LiveWorld
    from app.agents.assistant import Assistant
    w = LiveWorld(assistant=Assistant())
    for _ in range(5):
        w.step()
    s = w.snapshot()
    for key in ("type", "zones", "city", "model", "eval", "driver", "earnings", "recommendation", "scenarios"):
        assert key in s
    assert len(s["zones"]) == 12
    assert {"id", "name", "col", "row", "demand", "supply", "pressure", "surge", "eta_min", "fare_est",
            "forecast", "avg", "density"} <= set(s["zones"][0])


def test_world_scenarios_and_stale_fallback():
    from app.world import LiveWorld
    from app.agents.assistant import Assistant
    w = LiveWorld(assistant=Assistant())
    w.set_scenario("stale", True)
    for _ in range(4):
        w.step()
    s = w.snapshot()
    assert s["scenarios"]["stale"] and s["model"]["status"] == "stale"
    assert s["model"]["fallback"]["reason"].startswith("FALLBACK: stale inputs")
    w.set_scenario("reset")
    assert not any(w.snapshot()["scenarios"].values())
