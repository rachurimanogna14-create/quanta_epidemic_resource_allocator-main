"""
FastAPI Application — Quanta Epidemic Resource Allocator Backend

Provides REST API endpoints for epidemic modelling, contact-network analysis,
risk intelligence, QUBO generation, QAOA execution, and classical optimization.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import overview, network, epidemic, optimization, forecast

app = FastAPI(
    title="Quanta Epidemic Resource Allocator",
    description="Quantum-classical hybrid optimization for epidemic medical camp placement",
    version="1.0.0",
)

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(overview.router, prefix="/api", tags=["Overview"])
app.include_router(network.router, prefix="/api", tags=["Network"])
app.include_router(epidemic.router, prefix="/api", tags=["Epidemic"])
app.include_router(optimization.router, prefix="/api", tags=["Optimization"])
app.include_router(forecast.router, prefix="/api", tags=["Forecast"])


@app.get("/")
def root():
    return {
        "name": "Quanta Epidemic Resource Allocator",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/api/health")
def health_check():
    return {"status": "healthy"}


@app.on_event("startup")
async def startup():
    """Pre-load dataset and compute initial metrics on startup."""
    from .services.data_service import load_dataset
    try:
        graph, stats = load_dataset()
        print(f"[STARTUP] Dataset loaded: {stats['individuals']} nodes, {stats['edges']} edges ({stats['source']})")
    except Exception as e:
        print(f"[STARTUP] Warning: Could not pre-load dataset: {e}")
