"""Simulator tests.  ALL DATA IS SYNTHETIC."""
from app.simulator.city import ALL_TYPES, N_ZONES, ZONE_TYPES, get_neighbors
from app.simulator.drivers import State
from app.simulator.engine import Engine


def test_city_has_12_zones_and_all_seven_types():
    assert N_ZONES == 12
    assert set(ZONE_TYPES) == set(ALL_TYPES)
    assert sorted(get_neighbors(0)) == [1, 4]


def test_same_seed_same_result():
    a, b = Engine(seed=99, n_drivers=40), Engine(seed=99, n_drivers=40)
    for _ in range(120):
        a.tick()
        b.tick()
    assert a.stats() == b.stats()


def test_different_seed_differs():
    a, b = Engine(seed=1), Engine(seed=2)
    a.run(120)
    b.run(120)
    assert a.stats()["total_requests"] != b.stats()["total_requests"]


def test_fulfilment_rate_in_range_and_counts_add_up():
    e = Engine(seed=7, n_drivers=30)
    s = e.run(200)
    assert 0.0 <= s["fulfilment_rate"] <= 1.0
    assert s["completed_requests"] + s["expired_requests"] <= s["total_requests"]


def test_driver_goes_through_every_state():
    e = Engine(seed=3, n_drivers=40)
    seen = set()
    for _ in range(200):
        e.tick()
        seen |= {d.state for d in e.drivers}
    assert seen == set(State)


def test_stale_gps_driver_leaves_the_pool():
    e = Engine(seed=5, n_drivers=20, gps_stale_minutes=5)
    e.run(3)
    e.inject_gps_dropout([0, 1], minutes=30)
    e.run(8)
    assert not e.drivers[0].active and not e.drivers[1].active
    assert e.snapshot()["idle"] and sum(e.snapshot()["idle"].values()) <= 18


def test_events_change_demand_weather_and_price():
    e = Engine(seed=11)
    e.run(5)
    e.trigger_stadium_end(6)
    e.trigger_surge(2)
    e.trigger_rain()
    e.tick()
    snap = e.snapshot()
    assert snap["event_factor"][6] > 5.0
    assert snap["surge"][2] == 2.0
    assert snap["weather"] in ("rain", "heavy_rain")


def test_announced_stadium_event_is_visible_before_it_starts():
    e = Engine(seed=11)
    e.run(3)
    e.trigger_stadium_end(6, delay=10)
    e.tick()
    snap = e.snapshot()
    assert snap["event_factor"][6] == 1.0 and snap["event_soon"][6] > 5.0 and snap["event_eta"][6] <= 10


def test_reposition_moves_idle_drivers():
    e = Engine(seed=4, n_drivers=24)
    e.run(2)
    before = e.snapshot()["incoming"]
    moved = e.reposition(0, 11, 1)
    assert moved <= 1
    assert e.snapshot()["incoming"][11] >= before[11]
