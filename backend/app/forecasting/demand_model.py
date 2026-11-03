"""LightGBM next-15-min demand model per zone.  ALL DATA IS SYNTHETIC."""
import argparse
import os
import pickle
import numpy as np
import pandas as pd

from .common import (DATA_LABEL, HORIZON, LAGS, MAX_LAG, all_zones,
                     event_count, make_features, request_matrix, weather_score)

FEATURE_NAMES = [f"mean_{lag}m" for lag in LAGS] + ["weather", "events", "hour"]
MODEL_DIR = os.path.dirname(__file__)
MODEL_PATH = os.path.join(MODEL_DIR, "lgb_demand.pkl")


class DemandModel:
    def __init__(self):
        self.models = {}

    def fit(self, snapshot_history):
        zones = all_zones(snapshot_history[-1])
        mat = request_matrix(snapshot_history)
        n_ticks, n_zones = mat.shape
        usable = n_ticks - MAX_LAG - HORIZON
        if usable < 10:
            raise ValueError(f"Need at least {MAX_LAG + HORIZON + 10} ticks of history, got {n_ticks}")

        X_by_zone = {z: [] for z in range(n_zones)}
        y_by_zone = {z: [] for z in range(n_zones)}

        for t in range(MAX_LAG, n_ticks - HORIZON):
            sub = snapshot_history[:t]
            for zi in range(n_zones):
                feats = make_features(sub, zi)
                target = float(np.sum(mat[t:t + HORIZON, zi]))
                X_by_zone[zi].append(feats)
                y_by_zone[zi].append(target)

        for zi in range(n_zones):
            X = np.array(X_by_zone[zi], dtype=float)
            y = np.array(y_by_zone[zi], dtype=float)
            try:
                import lightgbm as lgb
                ds = lgb.Dataset(X, label=y, feature_name=FEATURE_NAMES, free_raw_data=False)
                params = {"objective": "regression", "metric": "rmse", "learning_rate": 0.08,
                          "num_leaves": 15, "min_child_samples": 5, "verbosity": -1, "seed": 42}
                self.models[zones[zi]] = lgb.train(params, ds, num_boost_round=60)
            except Exception:
                self.models[zones[zi]] = np.mean(y) if len(y) else 10.0
        return self

    def predict(self, snapshot_history):
        if not snapshot_history:
            return {}
        zones = all_zones(snapshot_history[-1])
        preds = {}
        for zi, zid in enumerate(zones):
            model = self.models.get(zid)
            if model is None:
                preds[zid] = 0.0
                continue
            feats = make_features(snapshot_history, zi).reshape(1, -1)
            try:
                p = float(model.predict(feats)[0])
            except Exception:
                p = float(model) if isinstance(model, (int, float)) else 0.0
            preds[zid] = max(0.0, p)
        return preds

    def save(self, path=MODEL_PATH):
        with open(path, "wb") as f:
            pickle.dump(self.models, f)

    @classmethod
    def load(cls, path=MODEL_PATH):
        inst = cls()
        with open(path, "rb") as f:
            inst.models = pickle.load(f)
        return inst
