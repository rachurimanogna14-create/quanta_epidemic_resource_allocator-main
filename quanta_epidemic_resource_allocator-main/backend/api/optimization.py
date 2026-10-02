"""
Optimization API — QUBO generation, QAOA execution, and Classical MILP baseline.

POST /api/optimization/qubo    — Build QUBO from current scenario
POST /api/optimization/qaoa    — Execute QAOA via Qiskit Aer
POST /api/optimization/classical — Execute classical MILP baseline
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List

from ..services.qubo_builder import build_qubo, evaluate_solution
from ..services.qaoa_solver import run_qaoa
from ..services.classical_solver import run_classical_optimization

router = APIRouter()


class QUBORequest(BaseModel):
    num_camps: int = Field(5, ge=1, le=15)
    risk_weight: float = Field(0.30, ge=0.0, le=1.0)
    population_weight: float = Field(0.20, ge=0.0, le=1.0)
    network_weight: float = Field(0.15, ge=0.0, le=1.0)
    accessibility_weight: float = Field(0.10, ge=0.0, le=1.0)
    distance_weight: float = Field(0.15, ge=0.0, le=1.0)
    cost_weight: float = Field(0.10, ge=0.0, le=1.0)
    service_radius_km: float = Field(3.0, ge=0.5, le=20.0)
    penalty_strength: float = Field(20.0, ge=1.0, le=100.0)
    custom_candidates: Optional[List[dict]] = None


class QAOARequest(BaseModel):
    qubo_matrix: List[List[float]]
    num_camps: int = Field(5, ge=1, le=15)
    p: int = Field(1, ge=1, le=3, description="QAOA circuit depth (layers)")
    shots: int = Field(1024, ge=256, le=8192)
    max_iter: int = Field(50, ge=10, le=200)
    candidate_details: Optional[List[dict]] = None


class ClassicalRequest(BaseModel):
    qubo_result: dict
    num_camps: int = Field(5, ge=1, le=15)


@router.post("/optimization/qubo")
def generate_qubo(req: QUBORequest):
    """Generate the QUBO matrix programmatically from the current scenario."""
    try:
        result = build_qubo(
            num_camps=req.num_camps,
            risk_weight=req.risk_weight,
            population_weight=req.population_weight,
            network_weight=req.network_weight,
            accessibility_weight=req.accessibility_weight,
            distance_weight=req.distance_weight,
            cost_weight=req.cost_weight,
            service_radius_km=req.service_radius_km,
            penalty_strength=req.penalty_strength,
            custom_candidates=req.custom_candidates,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"QUBO generation failed: {str(e)}")


@router.post("/optimization/qaoa")
def run_qaoa_optimization(req: QAOARequest):
    """Execute QAOA using genuine Qiskit Aer simulation."""
    try:
        if not req.qubo_matrix:
            raise HTTPException(status_code=400, detail="qubo_matrix is required")
        result = run_qaoa(
            qubo_matrix=req.qubo_matrix,
            num_camps=req.num_camps,
            p=req.p,
            shots=req.shots,
            max_iter=req.max_iter,
            candidate_details=req.candidate_details,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"QAOA execution failed: {str(e)}")


@router.post("/optimization/classical")
def run_classical(req: ClassicalRequest):
    """Execute classical MILP optimization as a baseline comparison."""
    try:
        result = run_classical_optimization(
            qubo_result=req.qubo_result,
            num_camps=req.num_camps,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Classical optimization failed: {str(e)}")
