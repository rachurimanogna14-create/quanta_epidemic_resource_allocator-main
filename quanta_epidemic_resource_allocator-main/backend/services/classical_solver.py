"""
Classical Solver — Solves the identical medical-camp optimization problem
using Mixed-Integer Linear Programming (MILP) via PuLP.

Provides a classical baseline for comparison with QAOA.
"""

import time
import numpy as np

try:
    import pulp
    PULP_AVAILABLE = True
except ImportError:
    PULP_AVAILABLE = False

from .data_service import get_areas, haversine
from .risk_model import compute_risk_scores


def run_classical_optimization(
    qubo_result: dict,
    num_camps: int = 5,
):
    """
    Solve the camp placement problem using MILP.

    Uses the same candidate data, objectives, and constraints as QAOA
    for a fair comparison.

    Parameters
    ----------
    qubo_result : dict — Output from build_qubo() with candidate details.
    num_camps : int — Number of camps to select.

    Returns
    -------
    dict with selected facilities, objective value, metrics, and timing.
    """
    if not PULP_AVAILABLE:
        return {
            "error": "PuLP is not installed. Install it with: pip install pulp",
            "success": False,
        }

    start_time = time.time()

    candidates = qubo_result["candidates"]
    n = len(candidates)
    K = num_camps
    risk_areas = compute_risk_scores()
    service_radius = qubo_result["service_radius_km"]
    weights = qubo_result["weights"]

    # Create MILP problem
    prob = pulp.LpProblem("MedicalCampPlacement", pulp.LpMaximize)

    # Decision variables
    x = [pulp.LpVariable(f"x_{i}", cat="Binary") for i in range(n)]

    # Coverage variables (area j covered by at least one selected camp)
    m = len(risk_areas)
    y = [pulp.LpVariable(f"y_{j}", cat="Binary") for j in range(m)]

    # Precompute coverage matrix: which candidates can cover which areas
    coverage_matrix = np.zeros((n, m))
    distance_matrix = np.zeros((n, m))
    for i, cand in enumerate(candidates):
        for j, area in enumerate(risk_areas):
            dist = haversine(cand["lat"], cand["lng"], area["lat"], area["lng"])
            distance_matrix[i, j] = dist
            if dist <= service_radius:
                coverage_matrix[i, j] = max(0, 1 - dist / service_radius)

    # Objective: maximize weighted benefit
    obj = 0.0

    # Risk-weighted coverage
    for j, area in enumerate(risk_areas):
        risk_benefit = area["risk_score"] * area["population"] / 10000
        obj += weights["risk"] * risk_benefit * y[j]

    # Population coverage
    for j, area in enumerate(risk_areas):
        pop_benefit = area["population"] / 50000
        obj += weights["population"] * pop_benefit * y[j]

    # Network coverage (per candidate)
    for i, cand in enumerate(candidates):
        net_benefit = cand.get("network_score", 0.5)
        obj += weights["network"] * net_benefit * x[i]

    # Accessibility (per candidate)
    for i, cand in enumerate(candidates):
        acc = cand.get("accessibility_score", 0.5)
        obj += weights["accessibility"] * acc * x[i]

    # Distance penalty
    for i in range(n):
        avg_dist = float(np.mean(distance_matrix[i])) / 10
        obj -= weights["distance"] * avg_dist * x[i]

    # Cost penalty
    for i, cand in enumerate(candidates):
        cost = cand.get("cost_penalty", 0.5)
        obj -= weights["cost"] * cost * x[i]

    prob += obj

    # Constraint: select exactly K camps
    prob += pulp.lpSum(x) == K, "SelectExactlyK"

    # Coverage linking: area j is covered only if at least one covering camp is selected
    for j in range(m):
        covering_camps = [i for i in range(n) if coverage_matrix[i, j] > 0]
        if covering_camps:
            prob += y[j] <= pulp.lpSum(x[i] for i in covering_camps), f"CoverLink_{j}"
        else:
            prob += y[j] == 0, f"NoCover_{j}"

    # Solve
    solver = pulp.PULP_CBC_CMD(msg=0, timeLimit=30)
    prob.solve(solver)

    end_time = time.time()
    execution_time = round(end_time - start_time, 3)

    # Extract solution
    selected_indices = [i for i in range(n) if pulp.value(x[i]) > 0.5]
    objective_value = pulp.value(prob.objective) if prob.status == 1 else None

    # Build result
    selected_facilities = []
    for idx in selected_indices:
        cand = candidates[idx]
        selected_facilities.append({
            "index": idx,
            "id": cand.get("id", f"candidate_{idx+1}"),
            "name": cand.get("name", f"Candidate {idx+1}"),
            "lat": cand.get("lat"),
            "lng": cand.get("lng"),
            "coverage_score": cand.get("coverage_score", 0),
        })

    # Coverage metrics
    total_pop = sum(a["population"] for a in risk_areas)
    covered_pop = sum(
        risk_areas[j]["population"]
        for j in range(m) if pulp.value(y[j]) > 0.5
    )
    high_risk_pop = sum(
        a["population"] for a in risk_areas
        if a.get("risk_level") in ("HIGH", "CRITICAL")
    )
    covered_high_risk = sum(
        risk_areas[j]["population"]
        for j in range(m)
        if pulp.value(y[j]) > 0.5 and risk_areas[j].get("risk_level") in ("HIGH", "CRITICAL")
    )

    avg_dist = 0
    if selected_indices:
        for idx in selected_indices:
            for j in range(m):
                if pulp.value(y[j]) > 0.5:
                    avg_dist += distance_matrix[idx, j]
        avg_dist /= max(len(selected_indices) * sum(1 for j in range(m) if pulp.value(y[j]) > 0.5), 1)

    total_cost = sum(
        candidates[i].get("cost_penalty", 0.5) * 250000
        for i in selected_indices
    )

    return {
        "success": prob.status == 1,
        "status": pulp.LpStatus[prob.status],
        "selected_indices": selected_indices,
        "selected_facilities": selected_facilities,
        "objective_value": round(float(objective_value), 4) if objective_value else None,
        "coverage": {
            "population_covered": covered_pop,
            "population_coverage_pct": round(covered_pop / max(total_pop, 1) * 100, 1),
            "high_risk_covered": covered_high_risk,
            "high_risk_coverage_pct": round(covered_high_risk / max(high_risk_pop, 1) * 100, 1),
            "avg_distance_km": round(avg_dist, 2),
            "total_deployment_cost": round(total_cost, 0),
        },
        "execution_time_seconds": execution_time,
        "algorithm": "MILP (CBC)",
        "solver": "PuLP CBC",
    }
