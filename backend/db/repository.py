"""
All database operations. Falls back gracefully if Supabase is not configured.
"""
from datetime import datetime, timezone
from db.supabase_client import supabase


# ── Helpers ───────────────────────────────────────────────────────────────────

def _ok() -> bool:
    """Returns True if Supabase is available."""
    return supabase is not None


# ── Routes ────────────────────────────────────────────────────────────────────

def create_route(origin: str, destination: str, eta: int) -> str | None:
    if not _ok():
        return None
    try:
        # get or create vehicle
        v = supabase.table("vehicles").select("id").eq("call_sign", "AMB-07").limit(1).execute()
        vehicle_id = v.data[0]["id"] if v.data else None

        res = supabase.table("routes").insert({
            "vehicle_id":  vehicle_id,
            "origin":      origin,
            "destination": destination,
            "eta_seconds": eta,
            "status":      "active",
        }).execute()
        return res.data[0]["id"] if res.data else None
    except Exception as e:
        print(f"DB create_route error: {e}")
        return None


def update_route_progress(route_id: str, progress: int, eta: int, time_saved: int):
    if not _ok() or not route_id:
        return
    try:
        supabase.table("routes").update({
            "progress_pct":      progress,
            "eta_seconds":       eta,
            "time_saved_seconds": time_saved,
        }).eq("id", route_id).execute()
    except Exception as e:
        print(f"DB update_route_progress error: {e}")


def complete_route(route_id: str, time_saved: int):
    if not _ok() or not route_id:
        return
    try:
        supabase.table("routes").update({
            "status":            "completed",
            "progress_pct":      100,
            "time_saved_seconds": time_saved,
            "completed_at":      datetime.now(timezone.utc).isoformat(),
        }).eq("id", route_id).execute()
    except Exception as e:
        print(f"DB complete_route error: {e}")


def get_route_history(limit: int = 10) -> list:
    if not _ok():
        return []
    try:
        res = supabase.table("routes") \
            .select("*") \
            .order("created_at", desc=True) \
            .limit(limit) \
            .execute()
        return res.data or []
    except Exception as e:
        print(f"DB get_route_history error: {e}")
        return []


# ── Alerts / Events ───────────────────────────────────────────────────────────

def log_alert(route_id: str | None, event_type: str, message: str, severity: str = "info"):
    if not _ok():
        return
    try:
        supabase.table("alerts").insert({
            "route_id":   route_id,
            "event_type": event_type,
            "message":    message,
            "severity":   severity,
        }).execute()
    except Exception as e:
        print(f"DB log_alert error: {e}")


def get_recent_alerts(limit: int = 20) -> list:
    if not _ok():
        return []
    try:
        res = supabase.table("alerts") \
            .select("*") \
            .order("created_at", desc=True) \
            .limit(limit) \
            .execute()
        return res.data or []
    except Exception as e:
        print(f"DB get_recent_alerts error: {e}")
        return []


# ── Signals ───────────────────────────────────────────────────────────────────

def update_signal_state(node_id: int, state: str):
    if not _ok():
        return
    try:
        supabase.table("signals").update({
            "state":           state,
            "corridor_active": state == "green",
            "last_changed":    datetime.now(timezone.utc).isoformat(),
        }).eq("node_id", node_id).execute()
    except Exception as e:
        print(f"DB update_signal_state error: {e}")