"""
Simulation Engine v2 — now powered by AI ETA predictor + Supabase logging.
"""
import math
from ai.predictor   import eta_predictor, route_optimizer, survival_impact
from db.repository  import create_route, update_route_progress, complete_route, log_alert, update_signal_state

SIGNALS = [
    {"id": 1, "name": "5th & Main",    "x": 14.0, "y": 76.0},
    {"id": 2, "name": "5th & Oak",     "x": 26.0, "y": 64.0},
    {"id": 3, "name": "7th & Oak",     "x": 38.0, "y": 53.0},
    {"id": 4, "name": "7th & Elm",     "x": 51.0, "y": 43.0},
    {"id": 5, "name": "9th & Elm",     "x": 62.0, "y": 33.0},
    {"id": 6, "name": "9th & Park",    "x": 74.0, "y": 23.0},
    {"id": 7, "name": "Hospital Gate", "x": 84.0, "y": 14.0},
]

TOTAL_STEPS = 140
PRE_CLEAR   = 20
REVERT_HOLD = 22


def _lerp(a, b, t):
    return a + (b - a) * t


class SimulationEngine:
    def __init__(self):
        self.step:        int   = 0
        self.running:     bool  = False
        self.dispatched:  bool  = False
        self.route_id:    str | None = None
        self.route_nodes: list  = [1,2,3,4,5,6,7]
        self._last_db_step: int = -1     # throttle DB writes to every 10 steps

    # ── Control ───────────────────────────────────────────────────────────────

    def dispatch(self, origin: str = "5th & Main Street", destination: str = "City General Hospital"):
        # Pick best route via AI optimizer
        route_name, self.route_nodes, cong = route_optimizer.best_route()

        # Initial ETA prediction
        pred = eta_predictor.predict(0, TOTAL_STEPS, 60.0, self.route_nodes)

        # Persist to DB (non-blocking — errors are caught inside)
        self.route_id = create_route(origin, destination, pred.eta_seconds)
        log_alert(self.route_id, "dispatch",
                  f"AMB-07 dispatched via {route_name} route (congestion: {cong})",
                  severity="critical")

        self.step       = 0
        self.running    = True
        self.dispatched = True
        self._last_db_step = -1

        print(f"🚨 Dispatched — route: {route_name}, congestion: {cong}, ETA: {pred.eta_seconds}s")

    def pause(self):
        self.running = False

    def resume(self):
        if self.dispatched:
            self.running = True

    def reset(self):
        self.step       = 0
        self.running    = False
        self.dispatched = False
        self.route_id   = None
        self._last_db_step = -1

    # ── Tick ──────────────────────────────────────────────────────────────────

    def tick(self) -> bool:
        if not self.running or self.step >= TOTAL_STEPS:
            if self.step >= TOTAL_STEPS:
                self.running = False
            return False

        self.step += 1

        # Log signal state changes to DB
        for i, sig in enumerate(SIGNALS):
            arr    = round((i / (len(SIGNALS) - 1)) * TOTAL_STEPS)
            if self.step == arr - PRE_CLEAR:
                update_signal_state(sig["id"], "green")
                log_alert(self.route_id, "signal_clear",
                          f"Signal pre-cleared: {sig['name']}", "info")
            elif self.step == arr + REVERT_HOLD:
                update_signal_state(sig["id"], "done")
                log_alert(self.route_id, "signal_restore",
                          f"Signal restored: {sig['name']}", "info")

        # Write progress to DB every 10 steps
        if self.step - self._last_db_step >= 10:
            snap = self._build_snapshot()
            update_route_progress(
                self.route_id,
                snap["progress"],
                snap["eta"],
                snap["time_saved"],
            )
            self._last_db_step = self.step

        # On arrival
        if self.step >= TOTAL_STEPS:
            snap = self._build_snapshot()
            complete_route(self.route_id, snap["time_saved"])
            log_alert(self.route_id, "arrived",
                      f"AMB-07 arrived at destination. Time saved: {snap['time_saved']}s",
                      "info")
            self.running = False

        return True

    # ── State ─────────────────────────────────────────────────────────────────

    def get_signal_state(self, idx: int) -> str:
        if not self.dispatched:
            return "idle"
        arrival = round((idx / (len(SIGNALS) - 1)) * TOTAL_STEPS)
        pre     = arrival - PRE_CLEAR
        revert  = arrival + REVERT_HOLD
        if pre <= self.step < revert:  return "green"
        if self.step >= revert:        return "done"
        return "red"

    def get_vehicle_pos(self) -> dict:
        t   = min(self.step / TOTAL_STEPS, 1.0)
        n   = len(SIGNALS) - 1
        seg = min(int(t * n), n - 1)
        u   = t * n - seg
        a, b = SIGNALS[seg], SIGNALS[seg + 1]
        speed = 55 + math.sin(self.step * 0.3) * 12 + (self.step / TOTAL_STEPS) * 8
        return {
            "x":     round(_lerp(a["x"], b["x"], u), 3),
            "y":     round(_lerp(a["y"], b["y"], u), 3),
            "speed": round(speed, 1),
            "step":  self.step,
        }

    def get_all_signals(self) -> list:
        return [
            {**sig, "state": self.get_signal_state(i), "corridor_active": self.get_signal_state(i) == "green"}
            for i, sig in enumerate(SIGNALS)
        ]

    def _build_snapshot(self) -> dict:
        vpos = self.get_vehicle_pos()

        # Use AI predictor for ETA
        pred = eta_predictor.predict(
            self.step, TOTAL_STEPS, vpos["speed"], self.route_nodes
        )

        # Survival impact
        impact = survival_impact.estimate(pred.time_saved, "cardiac_arrest")

        return {
            "vehicle":        vpos,
            "signals":        self.get_all_signals(),
            "eta":            pred.eta_seconds,
            "baseline_eta":   pred.baseline_seconds,
            "time_saved":     pred.time_saved,
            "congestion":     pred.congestion_score,
            "confidence":     pred.confidence,
            "progress":       round(min(self.step / TOTAL_STEPS, 1.0) * 100),
            "arrived":        self.step >= TOTAL_STEPS,
            "step":           self.step,
            "survival_gain":  impact["survival_gain_pct"],
            "ai_message":     impact["message"],
            "route_nodes":    self.route_nodes,
        }

    def snapshot(self) -> dict:
        return self._build_snapshot()


# Single shared instance
engine = SimulationEngine()