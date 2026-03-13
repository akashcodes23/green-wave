from fastapi import APIRouter
from ai.predictor  import eta_predictor, congestion_model, route_optimizer, survival_impact
from simulation.engine import engine

router = APIRouter(prefix="/ai", tags=["AI"])


@router.get("/eta")
def get_eta():
    """Current AI-predicted ETA based on live simulation state."""
    vpos = engine.get_vehicle_pos()
    pred = eta_predictor.predict(engine.step, 140, vpos["speed"])
    return {
        "eta_seconds":      pred.eta_seconds,
        "baseline_seconds": pred.baseline_seconds,
        "time_saved":       pred.time_saved,
        "confidence":       pred.confidence,
        "congestion_score": pred.congestion_score,
        "speed_kmh":        pred.speed_kmh,
    }


@router.get("/congestion")
def get_congestion():
    """Congestion heatmap data for all route segments."""
    return {
        "heatmap":      congestion_model.heatmap(),
        "route_score":  congestion_model.route_score([1,2,3,4,5,6,7]),
    }


@router.get("/route")
def get_best_route():
    """AI-selected optimal route."""
    name, nodes, score = route_optimizer.best_route()
    return {
        "route_name":       name,
        "nodes":            nodes,
        "congestion_score": score,
    }


@router.get("/impact")
def get_survival_impact():
    """Survival probability improvement estimate."""
    snap   = engine.snapshot()
    impact = survival_impact.estimate(snap["time_saved"], "cardiac_arrest")
    return impact