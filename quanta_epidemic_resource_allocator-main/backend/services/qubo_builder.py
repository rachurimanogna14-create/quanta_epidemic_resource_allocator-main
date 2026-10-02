"""
QUBO Builder — Programmatically constructs the Quadratic Unconstrained
Binary Optimization problem for medical camp placement.

Q(x) = -Coverage(x) + λ1·TravelCost(x) + λ2·DeploymentCost(x) + P·(Σx_i − K)²

Decision variable: x_i ∈ {0,1} — 1 if candidate i is selected.
"""

import numpy as np
from .data_service import get_candidate_list, get_areas, haversine
from .risk_model import compute_risk_scores


def build_qubo(
    num_camps: int = 5,
    risk_weight: float = 0.30,
    population_weight: float = 0.20,
    network_weight: float = 0.15,
    accessibility_weight: float = 0.10,
    distance_weight: float = 0.15,
    cost_weight: float = 0.10,
    service_radius_km: float = 3.0,
    penalty_strength: float = 20.0,
    custom_candidates: list = None,
):
    """
    Build the QUBO matrix from the current scenario.

    Parameters
    ----------
    num_camps : int — Number of camps to select (K).
    risk_weight .. cost_weight : float — Objective term weights.
    service_radius_km : float — Service radius for coverage calculation.
    penalty_strength : float — Penalty multiplier P for the constraint.
    custom_candidates : list — Optional custom candidate list (from user map clicks).

    Returns
    -------
    dict with QUBO matrix, metadata, and human-readable formulation.
    """
    # Get data
    candidates = custom_candidates if custom_candidates else get_candidate_list()
    risk_areas = compute_risk_scores()

    n = len(candidates)
    if n < num_camps:
        raise ValueError(f"Need at least {num_camps} candidates, got {n}")

    K = num_camps

    # ========================  COMPUTE SCORES  ========================

    # 1. Risk-weighted coverage score per candidate
    coverage_scores = np.zeros(n)
    for i, cand in enumerate(candidates):
        total_cov = 0
        for area in risk_areas:
            dist = haversine(cand["lat"], cand["lng"], area["lat"], area["lng"])
            if dist <= service_radius_km:
                # Coverage decays with distance
                decay = max(0, 1 - dist / service_radius_km)
                total_cov += area["risk_score"] * area["population"] * decay / 10000
        coverage_scores[i] = total_cov

    # 2. Population coverage score
    pop_scores = np.zeros(n)
    for i, cand in enumerate(candidates):
        pop = cand.get("nearby_population", 10000)
        pop_scores[i] = pop / 50000  # normalize

    # 3. Network coverage score
    net_scores = np.zeros(n)
    for i, cand in enumerate(candidates):
        # Find the area this candidate is in
        area_id = cand.get("area_id", "")
        for area in risk_areas:
            if area["id"] == area_id:
                net_scores[i] = area.get("network_centrality", 0) * 1000 + \
                                area.get("contact_intensity", 0) / 1000
                break

    # 4. Accessibility score
    access_scores = np.array([c.get("accessibility_score", 0.5) for c in candidates])

    # 5. Travel distance penalty (avg distance to all areas)
    distance_penalties = np.zeros(n)
    for i, cand in enumerate(candidates):
        total_dist = 0
        for area in risk_areas:
            total_dist += haversine(cand["lat"], cand["lng"], area["lat"], area["lng"])
        distance_penalties[i] = total_dist / len(risk_areas) / 10  # normalize

    # 6. Deployment cost penalty
    cost_penalties = np.array([c.get("setup_cost", 100000) / 250000 for c in candidates])

    # Normalize all to [0, 1]
    for arr in [coverage_scores, pop_scores, net_scores, access_scores,
                distance_penalties, cost_penalties]:
        mn, mx = arr.min(), arr.max()
        if mx - mn > 1e-9:
            arr[:] = (arr - mn) / (mx - mn)

    # ========================  BUILD QUBO MATRIX  ========================

    Q = np.zeros((n, n), dtype=float)

    # Linear (diagonal) terms: benefit of selecting candidate i
    for i in range(n):
        benefit = (
            risk_weight * coverage_scores[i] +
            population_weight * pop_scores[i] +
            network_weight * net_scores[i] +
            accessibility_weight * access_scores[i]
        )
        penalty = (
            distance_weight * distance_penalties[i] +
            cost_weight * cost_penalties[i]
        )
        # QUBO minimizes, so negate benefits
        Q[i, i] = -(benefit - penalty)

    # Constraint penalty: P * (Σx_i - K)²
    # Expand: P * (Σx_i² + 2·Σ_{i<j} x_i·x_j - 2K·Σx_i + K²)
    # Since x_i ∈ {0,1}: x_i² = x_i
    for i in range(n):
        Q[i, i] += penalty_strength * (1 - 2 * K)

    for i in range(n):
        for j in range(i + 1, n):
            Q[i, j] += 2 * penalty_strength
            Q[j, i] += 2 * penalty_strength

    # Make symmetric (average upper and lower)
    Q = (Q + Q.T) / 2

    # ========================  METADATA  ========================

    # Human-readable formulation
    formulation = {
        "objective": "Minimize Q(x) = -Coverage(x) + λ₁·Distance(x) + λ₂·Cost(x) + P·(Σxᵢ − K)²",
        "decision_variable": "xᵢ ∈ {0,1} — 1 if candidate i is selected",
        "constraint": f"Σxᵢ = {K} (select exactly {K} camps)",
        "terms": {
            "risk_weighted_coverage": f"weight = {risk_weight}",
            "population_coverage": f"weight = {population_weight}",
            "network_coverage": f"weight = {network_weight}",
            "accessibility": f"weight = {accessibility_weight}",
            "travel_distance": f"weight = {distance_weight} (penalty)",
            "deployment_cost": f"weight = {cost_weight} (penalty)",
        },
        "penalty_strength": penalty_strength,
    }

    candidate_details = []
    for i, cand in enumerate(candidates):
        candidate_details.append({
            "index": i,
            "id": cand["id"],
            "name": cand.get("name", f"Candidate {i+1}"),
            "lat": cand["lat"],
            "lng": cand["lng"],
            "coverage_score": round(float(coverage_scores[i]), 4),
            "population_score": round(float(pop_scores[i]), 4),
            "network_score": round(float(net_scores[i]), 4),
            "accessibility_score": round(float(access_scores[i]), 4),
            "distance_penalty": round(float(distance_penalties[i]), 4),
            "cost_penalty": round(float(cost_penalties[i]), 4),
            "diagonal_coeff": round(float(Q[i, i]), 4),
        })

    return {
        "qubo_matrix": Q.tolist(),
        "size": n,
        "num_camps": K,
        "formulation": formulation,
        "candidates": candidate_details,
        "weights": {
            "risk": risk_weight,
            "population": population_weight,
            "network": network_weight,
            "accessibility": accessibility_weight,
            "distance": distance_weight,
            "cost": cost_weight,
        },
        "service_radius_km": service_radius_km,
        "penalty_strength": penalty_strength,
        "qubo_stats": {
            "matrix_size": f"{n}x{n}",
            "num_variables": n,
            "num_quadratic_terms": n * (n - 1) // 2,
            "min_coefficient": round(float(Q.min()), 4),
            "max_coefficient": round(float(Q.max()), 4),
            "density": round(float(np.count_nonzero(Q)) / (n * n), 4),
        },
    }


def evaluate_solution(selected_indices: list, qubo_result: dict):
    """Evaluate a solution's objective value and coverage metrics."""
    Q = np.array(qubo_result["qubo_matrix"])
    n = Q.shape[0]
    x = np.zeros(n)
    for idx in selected_indices:
        if 0 <= idx < n:
            x[idx] = 1

    # Objective value
    obj_value = float(x @ Q @ x)

    # Coverage metrics
    candidates = qubo_result["candidates"]
    risk_areas = compute_risk_scores()
    service_radius = qubo_result["service_radius_km"]

    selected_cands = [candidates[i] for i in selected_indices if i < len(candidates)]

    total_pop_covered = 0
    high_risk_pop_covered = 0
    total_distance = 0

    for area in risk_areas:
        for sc in selected_cands:
            dist = haversine(sc["lat"], sc["lng"], area["lat"], area["lng"])
            if dist <= service_radius:
                total_pop_covered += area["population"]
                if area.get("risk_level", "") in ("HIGH", "CRITICAL"):
                    high_risk_pop_covered += area["population"]
                total_distance += dist
                break  # area covered by at least one camp

    total_pop = sum(a["population"] for a in risk_areas)
    total_cost = sum(
        qubo_result["candidates"][i].get("cost_penalty", 0) * 250000
        for i in selected_indices if i < len(candidates)
    )

    return {
        "objective_value": round(obj_value, 4),
        "population_covered": total_pop_covered,
        "population_coverage_pct": round(total_pop_covered / max(total_pop, 1) * 100, 1),
        "high_risk_covered": high_risk_pop_covered,
        "high_risk_coverage_pct": round(
            high_risk_pop_covered / max(
                sum(a["population"] for a in risk_areas if a.get("risk_level") in ("HIGH", "CRITICAL")), 1
            ) * 100, 1
        ),
        "avg_distance_km": round(total_distance / max(len(selected_cands), 1), 2),
        "total_deployment_cost": round(total_cost, 0),
        "camps_selected": len(selected_cands),
    }
