"""
Forecasting Service — Generates epidemic demand forecasts using SEIR
projections with uncertainty bands.
"""

import numpy as np
from .epidemic_model import run_seir_simulation


def generate_forecast(
    horizon_days: int = 30,
    population: int = 410,
    current_cases: int = 25,
    transmission_rate: float = 0.3,
):
    """
    Generate epidemic forecast with confidence intervals.

    Creates projections by running SEIR simulations with parameter
    uncertainty to produce confidence bands.
    """
    # Base simulation
    base = run_seir_simulation(
        population=population,
        initial_infected=current_cases,
        transmission_rate=transmission_rate,
        simulation_days=horizon_days + 30,  # include 30 days "history"
    )

    ts = base["time_series"]
    total_days = len(ts["days"])
    history_days = min(30, total_days // 2)

    # Historical data (first 30 days)
    history = {
        "days": ts["days"][:history_days],
        "cases": ts["infected"][:history_days],
        "recovered": ts["recovered"][:history_days],
    }

    # Forecast (remaining days)
    forecast_start = history_days
    forecast = {
        "days": ts["days"][forecast_start:],
        "predicted_cases": ts["infected"][forecast_start:],
        "predicted_recovered": ts["recovered"][forecast_start:],
    }

    # Confidence bands from parameter uncertainty
    rng = np.random.RandomState(42)
    n_samples = 20
    upper_band = np.zeros(len(forecast["days"]))
    lower_band = np.full(len(forecast["days"]), float("inf"))
    all_curves = []

    for _ in range(n_samples):
        perturbed_beta = transmission_rate * rng.uniform(0.8, 1.3)
        perturbed = run_seir_simulation(
            population=population,
            initial_infected=current_cases,
            transmission_rate=perturbed_beta,
            simulation_days=horizon_days + 30,
        )
        curve = perturbed["time_series"]["infected"][forecast_start:]
        if len(curve) >= len(forecast["days"]):
            curve = curve[:len(forecast["days"])]
        else:
            curve = curve + [curve[-1]] * (len(forecast["days"]) - len(curve))
        curve = np.array(curve)
        upper_band = np.maximum(upper_band, curve)
        lower_band = np.minimum(lower_band, curve)
        all_curves.append(curve)

    all_curves = np.array(all_curves)
    mean_curve = np.mean(all_curves, axis=0)

    # Trend analysis
    if len(forecast["predicted_cases"]) >= 2:
        last_val = forecast["predicted_cases"][-1]
        first_val = forecast["predicted_cases"][0]
        if last_val > first_val * 1.1:
            trend = "increasing"
        elif last_val < first_val * 0.9:
            trend = "decreasing"
        else:
            trend = "stable"
    else:
        trend = "stable"

    # Peak demand
    peak_cases = max(forecast["predicted_cases"]) if forecast["predicted_cases"] else 0
    peak_day_idx = forecast["predicted_cases"].index(peak_cases) if peak_cases > 0 else 0
    peak_day = forecast["days"][peak_day_idx] if peak_day_idx < len(forecast["days"]) else 0

    return {
        "horizon_days": horizon_days,
        "history": history,
        "forecast": {
            **forecast,
            "upper_bound": [round(float(v), 2) for v in upper_band],
            "lower_bound": [round(float(v), 2) for v in lower_band],
        },
        "trend": trend,
        "peak_demand": {
            "cases": round(peak_cases, 2),
            "day": round(peak_day, 1),
            "medical_staff_needed": int(peak_cases * 0.3),
            "beds_needed": int(peak_cases * 0.15),
            "test_kits_needed": int(peak_cases * 2.5),
        },
        "confidence_level": 0.9,
    }
