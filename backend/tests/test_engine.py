"""
tests/test_engine.py — Smoke tests for the simulator engine.
"""

from app.simulator.engine import SimulatorEngine


def test_engine_initialises():
    engine = SimulatorEngine(seed=42, n_drivers=10)
    assert engine.tick_count == 0
    assert len(engine.drivers) == 10


def test_single_tick():
    engine = SimulatorEngine(seed=42, n_drivers=5)
    state = engine.tick()
    assert state.tick == 1
    assert 0.0 <= state.fulfilment_rate <= 1.0
    assert len(state.zones) == 12


def test_reproducibility():
    engine_a = SimulatorEngine(seed=99, n_drivers=20)
    engine_b = SimulatorEngine(seed=99, n_drivers=20)
    for _ in range(10):
        state_a = engine_a.tick()
        state_b = engine_b.tick()
    assert state_a.total_requests == state_b.total_requests
    assert state_a.completed_requests == state_b.completed_requests


def test_fulfilment_rate_range():
    engine = SimulatorEngine(seed=7, n_drivers=15)
    for _ in range(50):
        state = engine.tick()
        assert 0.0 <= state.fulfilment_rate <= 1.0
