"""
Anomaly Detection Service — Detects unusual contact density patterns
using statistical methods (Z-score based deviation detection).
"""

import numpy as np
from .data_service import get_contact_events, get_areas


def detect_anomalies(z_threshold: float = 2.0):
    """
    Detect anomalous contact density windows.

    Uses Z-score deviation from a rolling baseline to identify
    statistically unusual contact volume spikes.
    """
    events = get_contact_events()
    areas = get_areas()

    contacts = np.array([e["contacts"] for e in events])
    hours = np.array([e["hour"] for e in events])

    # Compute rolling baseline (window of 6 periods)
    window = 6
    baseline = np.convolve(contacts, np.ones(window) / window, mode="same")

    # Z-scores
    residuals = contacts - baseline
    std = np.std(residuals)
    if std < 1e-6:
        std = 1.0
    z_scores = residuals / std

    # Classify anomalies
    anomalies = []
    normal_points = []

    for i, event in enumerate(events):
        point = {
            "window": event["window"],
            "hour": event["hour"],
            "contacts": event["contacts"],
            "baseline": round(float(baseline[i]), 1),
            "z_score": round(float(z_scores[i]), 3),
            "deviation": round(float(residuals[i]), 1),
            "is_anomaly": abs(z_scores[i]) > z_threshold,
        }

        if point["is_anomaly"]:
            # Find nearest area for context
            area_idx = i % len(areas)
            area = areas[area_idx]
            point["severity"] = "HIGH" if abs(z_scores[i]) > 3.0 else "MEDIUM"
            point["affected_area"] = area["name"]
            point["area_id"] = area["id"]
            point["description"] = (
                f"Contact density spike of {point['contacts']} contacts "
                f"(baseline: {point['baseline']}, z-score: {point['z_score']})"
            )
            anomalies.append(point)
        else:
            normal_points.append(point)

    # Summary stats
    total_contacts = int(contacts.sum())
    avg_contacts = round(float(contacts.mean()), 1)
    max_contacts = int(contacts.max())

    return {
        "anomalies": anomalies,
        "normal_points": normal_points,
        "all_points": [
            {
                "hour": events[i]["hour"],
                "contacts": events[i]["contacts"],
                "baseline": round(float(baseline[i]), 1),
                "is_anomaly": abs(z_scores[i]) > z_threshold,
                "z_score": round(float(z_scores[i]), 3),
            }
            for i in range(len(events))
        ],
        "summary": {
            "total_windows": len(events),
            "anomaly_count": len(anomalies),
            "anomaly_rate": round(len(anomalies) / max(len(events), 1) * 100, 1),
            "total_contacts": total_contacts,
            "avg_contacts": avg_contacts,
            "max_contacts": max_contacts,
            "z_threshold": z_threshold,
            "std_deviation": round(float(std), 2),
        },
    }
