from fastapi import APIRouter
from db.repository import get_route_history, get_recent_alerts

router = APIRouter(prefix="/history", tags=["History"])


@router.get("/routes")
def route_history():
    """Past emergency runs stored in Supabase."""
    return get_route_history(limit=10)


@router.get("/alerts")
def recent_alerts():
    """Recent system events / alerts from DB."""
    return get_recent_alerts(limit=20)