"""
Forecast API — Epidemic forecasting and contact anomaly detection.

GET /api/forecast   — Return epidemic forecasts with confidence bands
GET /api/anomalies  — Return detected contact density anomalies
"""

from fastapi import APIRouter, Query
from ..services.forecasting import generate_forecast
from ..services.anomaly_detection import detect_anomalies
from ..services.data_service import load_dataset

router = APIRouter()


@router.get("/forecast")
def get_forecast(
    horizon_days: int = Query(30, ge=7, le=90),
    current_cases: int = Query(25, ge=1, le=10000),
    transmission_rate: float = Query(0.3, ge=0.01, le=1.0),
):
    """Return epidemic forecast with confidence intervals and peak demand estimates."""
    _, stats = load_dataset()
    population = stats.get("individuals", 410)

    return generate_forecast(
        horizon_days=horizon_days,
        population=population,
        current_cases=current_cases,
        transmission_rate=transmission_rate,
    )


@router.get("/anomalies")
def get_anomalies(
    z_threshold: float = Query(2.0, ge=1.0, le=5.0),
):
    """Return detected contact density anomalies using Z-score analysis."""
    return detect_anomalies(z_threshold=z_threshold)
