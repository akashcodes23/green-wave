"""
AI/ML Layer — GreenWave
-----------------------
1. ETAPredictor      — predicts arrival time using speed + congestion
2. CongestionModel   — scores congestion per road segment (0.0–1.0)
3. RouteOptimizer    — picks the best corridor path
4. SurvivalImpact    — estimates survival probability improvement
"""

import math
import random
import time
from dataclasses import dataclass


@dataclass
class ETAPrediction:
    eta_seconds:      int
    baseline_seconds: int
    time_saved:       int
    confidence:       float
    congestion_score: float
    speed_kmh:        float


class CongestionModel:
    """
    Simulates real-time traffic congestion per segment.
    Uses a time-seeded noise model so values feel live but are stable per minute.
    """
    BASE = {
        (1, 2): 0.65,
        (2, 3): 0.50,
        (3, 4): 0.72,
        (4, 5): 0.45,
        (5, 6): 0.38,
        (6, 7): 0.20,
    }

    def get(self, a: int, b: int) -> float:
        base = self.BASE.get((a, b), 0.5)
        seed = int(time.time() / 60)
        rng  = random.Random(seed + a * 7)
        return max(0.05, min(0.95, base + rng.uniform(-0.12, 0.12)))

    def route_score(self, nodes: list) -> float:
        pairs  = list(zip(nodes, nodes[1:]))
        scores = [self.get(a, b) for a, b in pairs]
        return round(sum(scores) / len(scores), 3) if scores else 0.0

    def heatmap(self) -> list:
        return [{"from_node": a, "to_node": b, "congestion": self.get(a, b)} for a, b in self.BASE]


class ETAPredictor:
    DISTANCES = {(1,2):1.8,(2,3):1.7,(3,4):1.6,(4,5):1.5,(5,6):1.4,(6,7):1.2}
    BASELINE_SPEED = 28.0
    MAX_SPEED      = 75.0
    MIN_SPEED      = 15.0

    def __init__(self):
        self.cong = CongestionModel()

    def _speed(self, cong: float, corridor: bool) -> float:
        if corridor:
            return self.MAX_SPEED * (1 - cong * 0.1)
        return max(self.MIN_SPEED, self.BASELINE_SPEED * (1 - cong * 0.7))

    def predict(self, step: int, total: int, current_speed: float, nodes: list = None) -> ETAPrediction:
        nodes    = nodes or [1,2,3,4,5,6,7]
        progress = min(step / total, 1.0)
        n        = len(nodes) - 1
        cur_seg  = min(int(progress * n), n - 1)
        remaining = nodes[cur_seg:]

        corr_t = base_t = 0.0
        for i in range(len(remaining) - 1):
            a, b = remaining[i], remaining[i+1]
            d    = self.DISTANCES.get((a, b), 1.5)
            c    = self.cong.get(a, b)
            corr_t += (d / self._speed(c, True))  * 240
            base_t += (d / self._speed(c, False)) * 240

        eta      = max(0, round(corr_t))
        baseline = max(0, round(base_t))
        saved    = max(0, baseline - eta)
        cong_avg = self.cong.route_score(nodes)

        return ETAPrediction(
            eta_seconds      = eta,
            baseline_seconds = baseline,
            time_saved       = saved,
            confidence       = round(0.92 - cong_avg * 0.08, 2),
            congestion_score = cong_avg,
            speed_kmh        = round(current_speed, 1),
        )


class RouteOptimizer:
    ROUTES = {
        "primary":   [1,2,3,4,5,6,7],
        "alternate": [1,2,4,5,6,7],
    }

    def __init__(self):
        self.cong = CongestionModel()

    def best_route(self) -> tuple:
        best = min(self.ROUTES.items(), key=lambda kv: self.cong.route_score(kv[1]))
        return best[0], best[1], round(self.cong.route_score(best[1]), 3)


class SurvivalImpact:
    RATES = {
        "cardiac_arrest": 0.10,
        "stroke":         0.08,
        "trauma":         0.05,
        "default":        0.07,
    }

    def estimate(self, time_saved_seconds: int, condition: str = "default") -> dict:
        mins  = time_saved_seconds / 60
        rate  = self.RATES.get(condition, self.RATES["default"])
        gain  = round(min(mins * rate * 100, 45.0), 1)
        return {
            "time_saved_seconds": time_saved_seconds,
            "minutes_saved":      round(mins, 2),
            "survival_gain_pct":  gain,
            "condition":          condition,
            "message": f"Arriving {round(mins,1)} min earlier → survival +{gain:.0f}%",
        }


# Shared singletons
eta_predictor    = ETAPredictor()
congestion_model = CongestionModel()
route_optimizer  = RouteOptimizer()
survival_impact  = SurvivalImpact()