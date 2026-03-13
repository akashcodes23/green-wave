import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from simulation.engine import engine

router = APIRouter()


@router.post("/simulation/start")
def start():
    engine.running = True
    return {"status": "started"}


@router.post("/simulation/pause")
def pause():
    engine.pause()
    return {"status": "paused"}


@router.post("/simulation/reset")
def reset():
    engine.reset()
    return {"status": "reset"}


@router.get("/simulation/state")
def state():
    return engine.snapshot()


# ── WebSocket — streams live snapshots to frontend ────────────────────────────
@router.websocket("/ws/live")
async def websocket_live(ws: WebSocket):
    await ws.accept()
    try:
        while True:
            engine.tick()                      # advance one simulation step
            await ws.send_json(engine.snapshot())
            await asyncio.sleep(0.11)          # ~9 updates/sec  ≈ smooth 60fps feel
    except WebSocketDisconnect:
        pass
    except Exception:
        pass