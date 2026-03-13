from fastapi import APIRouter
from simulation.engine import engine

router = APIRouter()


@router.get("/signals")
def get_signals():
    return engine.get_signals()


@router.get("/metrics")
def get_metrics():
    snap = engine.snapshot()
    return {
        "eta":        snap["eta"],
        "time_saved": snap["time_saved"],
        "progress":   snap["progress"],
        "arrived":    snap["arrived"],
        "step":       snap["step"],
    }