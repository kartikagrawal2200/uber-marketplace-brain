"""LightGBM demand model: requests per zone over the NEXT 15 minutes.  ALL DATA IS SYNTHETIC.

Features: zone, lagged request counts (5/15/30/60 min), hour, weekend flag, weather, scheduled-event features (active factor, announced peak, minutes until start).
Trained on its own seeded simulator run (never the evaluation seed).
"""
import os

import numpy as np

from .common import FEATURE_NAMES, HORIZON, history_arrays, features_at

MODEL_PATH = os.path.join(os.path.dirname(__file__), "lgb_demand.txt")
TRAIN_SEED = 1234
MODEL_VERSION = "lgbm-demand-v1"


class DemandModel:
    version = MODEL_VERSION

    def __init__(self):
        self.booster = None

    # -- training ------------------------------------------------------------
    def fit(self, history, stride=3):
        import lightgbm as lgb
        zones, R, hours, days, wx, evt = history_arrays(history)
        T = R.shape[0]
        cs = np.vstack([np.zeros((1, R.shape[1])), np.cumsum(R, axis=0)])
        X, y = [], []
        for i in range(60, T - HORIZON, stride):
            X.append(features_at(R, hours, days, wx, evt, i))
            y.append(cs[i + 1 + HORIZON] - cs[i + 1])          # requests in minutes i+1 .. i+15
        X, y = np.vstack(X), np.concatenate(y)
        ds = lgb.Dataset(X, label=y, feature_name=FEATURE_NAMES, categorical_feature=["zone"])
        params = {"objective": "poisson", "learning_rate": 0.05, "num_leaves": 15, "min_data_in_leaf": 30,
                  "feature_fraction": 0.9, "seed": 42, "deterministic": True, "num_threads": 1, "verbosity": -1}
        self.booster = lgb.train(params, ds, num_boost_round=250)
        return self

    # -- inference -----------------------------------------------------------
    def predict(self, history):
        if self.booster is None:
            raise RuntimeError("demand model is not trained")
        zones, R, hours, days, wx, evt = history_arrays(history)
        X = features_at(R, hours, days, wx, evt, R.shape[0] - 1)
        p = np.clip(self.booster.predict(X), 0.0, None)
        return {z: float(p[i]) for i, z in enumerate(zones)}

    def save(self, path=MODEL_PATH):
        self.booster.save_model(path)

    @classmethod
    def load(cls, path=MODEL_PATH):
        import lightgbm as lgb
        m = cls()
        m.booster = lgb.Booster(model_file=path)
        return m


def generate_training_history(seed=TRAIN_SEED, days=3):
    """Run the simulator with a mix of scheduled stress events and return the full snapshot history."""
    from app.simulator.engine import Engine
    eng = Engine(seed=seed, history_limit=None)
    rng = np.random.default_rng(seed)
    total = days * 1440
    plan = {}
    for _ in range(days * 3):
        plan.setdefault(int(rng.integers(30, total - 60)), []).append(rng.choice(["stadium", "surge", "rain"]))
    for _ in range(total):
        for kind in plan.get(eng.t, []):
            if kind == "stadium":
                eng.trigger_stadium_end(delay=int(rng.choice([0, 10, 15])))
            elif kind == "surge":
                eng.trigger_surge(int(rng.integers(0, 12)))
            else:
                eng.trigger_rain(heavy=bool(rng.integers(0, 2)))
        eng.tick()
    return eng.history


def train_and_save(path=MODEL_PATH):
    model = DemandModel().fit(generate_training_history())
    model.save(path)
    return model


def load_or_train(path=MODEL_PATH):
    if os.path.exists(path):
        try:
            return DemandModel.load(path)
        except Exception:
            pass
    return train_and_save(path)


if __name__ == "__main__":
    train_and_save()
    print("trained on SYNTHETIC data ->", MODEL_PATH)
