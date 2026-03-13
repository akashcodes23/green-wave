from pydantic import BaseModel
from typing import List

class DispatchRequest(BaseModel):
    origin: str = "5th & Main Street"
    destination: str = "City General Hospital"

class SignalData(BaseModel):
    id: int
    name: str
    x: float
    y: float
    state: str            # idle | red | green | done
    corridor_active: bool

class VehicleData(BaseModel):
    x: float
    y: float
    speed: float
    step: int

class SimSnapshot(BaseModel):
    vehicle: VehicleData
    signals: List[SignalData]
    eta: int              # seconds remaining
    time_saved: int       # seconds saved vs normal
    progress: int         # 0-100
    arrived: bool
    step: int