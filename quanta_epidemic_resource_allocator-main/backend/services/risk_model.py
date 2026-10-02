"""
Risk Model Service — Calculates normalized epidemic risk scores.

Uses a transparent mathematical scoring model (NOT falsely labelled as
trained ML).  Features: population, density, cases, growth, mobility,
contact intensity, network centrality.
"""

import numpy as np
from .data_service import get_areas, get_facilities, haversine
from .network_analysis import get_area_network_metrics, get_network_metrics


_cache = {}

# Risk level thresholds
RISK_THRESHOLDS = {
    "LOW":      (0.00, 0.32),
    "MEDIUM":   (0.32, 0.55),
    "HIGH":     (0.55, 0.75),
    "CRITICAL": (0.75, 1.00),
}


def compute_risk_scores():
    """Compute risk scores for all areas.  Returns enriched area list."""
    if "risk" in _cache:
        return _cache["risk"]

    areas = get_areas()
    if not areas:
        return []

    # Collect raw feature vectors
    features = {
        "population": [],
        "population_density": [],
        "active_cases": [],
        "case_rate": [],
        "recent_growth": [],
        "mobility": [],
        "contact_intensity": [],
        "centrality": [],
    }

    for area in areas:
        net = get_area_network_metrics(area.get("node_ids", []))
        features["population"].append(area["population"])
        features["population_density"].append(area.get("population_density", 5000))
        features["active_cases"].append(area["active_cases"])
        features["case_rate"].append(area["active_cases"] / max(area["population"], 1))
        features["recent_growth"].append(max(0, area.get("recent_case_growth", 0)))
        features["mobility"].append(area.get("mobility_index", 0.5))
        features["contact_intensity"].append(net["contact_intensity"])
        features["centrality"].append(net["avg_centrality"])

    # Normalize each feature to [0, 1]
    normalized = {}
    for key, vals in features.items():
        arr = np.array(vals, dtype=float)
        mn, mx = arr.min(), arr.max()
        if mx - mn > 1e-9:
            normalized[key] = (arr - mn) / (mx - mn)
        else:
            normalized[key] = np.zeros_like(arr)

    # Weighted combination
    weights = {
        "population": 0.08,
        "population_density": 0.10,
        "active_cases": 0.15,
        "case_rate": 0.18,
        "recent_growth": 0.15,
        "mobility": 0.10,
        "contact_intensity": 0.14,
        "centrality": 0.10,
    }

    risk_scores = np.zeros(len(areas))
    for key, w in weights.items():
        risk_scores += w * normalized[key]

    # Normalize final scores to [0, 1]
    mn, mx = risk_scores.min(), risk_scores.max()
    if mx - mn > 1e-9:
        risk_scores = (risk_scores - mn) / (mx - mn)

    # Enrich areas with risk data
    enriched = []
    for i, area in enumerate(areas):
        score = float(risk_scores[i])
        level = _risk_level(score)
        net = get_area_network_metrics(area.get("node_ids", []))
        enriched.append({
            **area,
            "risk_score": round(score, 4),
            "risk_level": level,
            "network_centrality": net["avg_centrality"],
            "network_degree": net["avg_degree"],
            "network_nodes": net["num_nodes"],
        })

    _cache["risk"] = enriched

    # Also update candidate facility risk scores
    _update_candidate_risks(enriched)

    return enriched


def _update_candidate_risks(risk_areas):
    """Set risk_score on candidate facilities based on nearest area."""
    facilities = get_facilities()
    area_map = {a["id"]: a for a in risk_areas}

    for cand in facilities["candidates"]:
        area = area_map.get(cand.get("area_id"))
        if area:
            cand["risk_score"] = area["risk_score"]
            cand["risk_level"] = area["risk_level"]
        else:
            # Find nearest area
            min_dist = float("inf")
            nearest = None
            for a in risk_areas:
                d = haversine(cand["lat"], cand["lng"], a["lat"], a["lng"])
                if d < min_dist:
                    min_dist = d
                    nearest = a
            if nearest:
                cand["risk_score"] = nearest["risk_score"]
                cand["risk_level"] = nearest["risk_level"]


def get_risk_summary():
    """Return summary statistics of risk across areas."""
    areas = compute_risk_scores()
    if not areas:
        return {}

    scores = [a["risk_score"] for a in areas]
    levels = [a["risk_level"] for a in areas]

    return {
        "total_areas": len(areas),
        "avg_risk": round(float(np.mean(scores)), 4),
        "max_risk": round(float(max(scores)), 4),
        "min_risk": round(float(min(scores)), 4),
        "critical_count": levels.count("CRITICAL"),
        "high_count": levels.count("HIGH"),
        "medium_count": levels.count("MEDIUM"),
        "low_count": levels.count("LOW"),
        "total_population_at_risk": sum(
            a["population"] for a in areas if a["risk_level"] in ("HIGH", "CRITICAL")
        ),
    }


def _risk_level(score: float) -> str:
    for level, (lo, hi) in RISK_THRESHOLDS.items():
        if lo <= score < hi:
            return level
    return "CRITICAL" if score >= 0.75 else "LOW"
