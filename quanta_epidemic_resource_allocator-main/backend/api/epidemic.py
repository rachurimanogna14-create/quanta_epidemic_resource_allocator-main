"""Epidemic API — SEIR simulation, risk scores, and facilities."""

from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Optional
from ..services.epidemic_model import run_seir_simulation
from ..services.risk_model import compute_risk_scores
from ..services.data_service import get_facilities

router = APIRouter()


class SimulationRequest(BaseModel):
    population: int = Field(410, ge=10, le=100000)
    initial_infected: int = Field(5, ge=1, le=10000)
    initial_exposed: int = Field(10, ge=0, le=10000)
    transmission_rate: float = Field(0.3, ge=0.01, le=1.0)
    contact_intensity: float = Field(1.0, ge=0.1, le=5.0)
    incubation_days: float = Field(5.0, ge=1.0, le=30.0)
    recovery_days: float = Field(10.0, ge=1.0, le=60.0)
    intervention_level: float = Field(0.0, ge=0.0, le=1.0)
    simulation_days: int = Field(160, ge=10, le=365)


@router.post("/epidemic/simulate")
def simulate_epidemic(params: SimulationRequest):
    """Run a configurable SEIR epidemic simulation."""
    return run_seir_simulation(
        population=params.population,
        initial_infected=params.initial_infected,
        initial_exposed=params.initial_exposed,
        transmission_rate=params.transmission_rate,
        contact_intensity=params.contact_intensity,
        incubation_days=params.incubation_days,
        recovery_days=params.recovery_days,
        intervention_level=params.intervention_level,
        simulation_days=params.simulation_days,
    )


@router.get("/risk")
def get_risk():
    """Return area-level epidemic risk scores."""
    areas = compute_risk_scores()
    return {"areas": areas}


@router.get("/facilities")
def get_facilities_endpoint():
    """Return candidate, existing, and hospital facilities."""
    return get_facilities()
