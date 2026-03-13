from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from routes.dispatch   import router as dispatch_router
from routes.simulation import router as simulation_router
from routes.signals    import router as signals_router
from routes.ai         import router as ai_router
from routes.history    import router as history_router

load_dotenv()

app = FastAPI(
    title="GreenWave API",
    description="Dynamic Green Corridor System — AI-powered Emergency Vehicle Coordination",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dispatch_router)
app.include_router(simulation_router)
app.include_router(signals_router)
app.include_router(ai_router)
app.include_router(history_router)


@app.get("/")
def root():
    return {
        "status":  "GreenWave API v2 online",
        "docs":    "/docs",
        "features": ["AI ETA prediction", "Congestion model", "Supabase persistence"],
    }