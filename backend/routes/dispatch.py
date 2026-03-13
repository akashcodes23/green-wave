from fastapi import APIRouter
from models.schemas import DispatchRequest
from simulation.engine import engine

router = APIRouter()


@router.post("/dispatch")
def dispatch(req: DispatchRequest):
    engine.dispatch()
    return {
        "status":      "dispatched",
        "origin":      req.origin,
        "destination": req.destination,
        "route_id":    "route-001",
        "message":     "Green corridor activated",
    }