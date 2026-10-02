"""Overview API — Aggregated epidemic and network statistics, KPIs, alerts."""

from fastapi import APIRouter
from ..services.data_service import load_dataset, get_areas, get_facilities
from ..services.network_analysis import get_network_metrics, get_superspreaders
from ..services.risk_model import compute_risk_scores, get_risk_summary
from ..services.epidemic_model import run_seir_simulation

router = APIRouter()


@router.get("/overview")
def get_overview():
    """Return aggregated dashboard data: KPIs, alerts, summaries."""
    graph, stats = load_dataset()
    areas = compute_risk_scores()
    risk_summary = get_risk_summary()
    net_metrics = get_network_metrics()
    facilities = get_facilities()
    superspreaders = get_superspreaders(top_n=5)

    # Quick SEIR for R_eff estimate
    seir = run_seir_simulation(population=stats["individuals"], initial_infected=5)

    # KPIs
    total_population = sum(a["population"] for a in areas)
    total_cases = sum(a["active_cases"] for a in areas)
    high_risk_pop = sum(a["population"] for a in areas if a["risk_level"] in ("HIGH", "CRITICAL"))

    kpis = {
        "active_cases": total_cases,
        "population_at_risk": high_risk_pop,
        "network_connections": net_metrics["summary"]["edges"],
        "high_risk_areas": risk_summary["critical_count"] + risk_summary["high_count"],
        "r_effective": seir["metrics"]["R_effective"],
        "recommended_camps": 5,
        "total_population": total_population,
        "total_individuals": stats["individuals"],
        "communities": net_metrics["summary"]["communities"],
    }

    # Dynamic alerts
    alerts = _generate_alerts(areas, risk_summary, net_metrics, superspreaders)

    # Top risk areas
    top_risk_areas = sorted(areas, key=lambda a: a["risk_score"], reverse=True)[:5]

    return {
        "kpis": kpis,
        "alerts": alerts,
        "top_risk_areas": [
            {
                "name": a["name"],
                "risk_score": a["risk_score"],
                "risk_level": a["risk_level"],
                "population": a["population"],
                "active_cases": a["active_cases"],
                "lat": a["lat"],
                "lng": a["lng"],
            }
            for a in top_risk_areas
        ],
        "risk_distribution": {
            "critical": risk_summary["critical_count"],
            "high": risk_summary["high_count"],
            "medium": risk_summary["medium_count"],
            "low": risk_summary["low_count"],
        },
        "network_summary": {
            "nodes": net_metrics["summary"]["nodes"],
            "edges": net_metrics["summary"]["total_edges_in_graph"],
            "communities": net_metrics["summary"]["communities"],
            "avg_degree": net_metrics["summary"]["avg_degree"],
            "density": net_metrics["summary"]["density"],
        },
        "superspreaders": superspreaders[:5],
        "dataset": stats,
    }


def _generate_alerts(areas, risk_summary, net_metrics, superspreaders):
    """Generate dynamic alerts based on current analysis state."""
    alerts = []
    ts = 1

    # Critical risk zones
    critical_areas = [a for a in areas if a["risk_level"] == "CRITICAL"]
    if critical_areas:
        alerts.append({
            "id": ts,
            "type": "critical",
            "severity": "CRITICAL",
            "title": "Critical Risk Zones Detected",
            "message": f"{len(critical_areas)} area(s) at CRITICAL risk level: {', '.join(a['name'] for a in critical_areas[:3])}",
            "timestamp": "Just now",
        })
        ts += 1

    # High risk zones
    high_areas = [a for a in areas if a["risk_level"] == "HIGH"]
    if high_areas:
        alerts.append({
            "id": ts,
            "type": "warning",
            "severity": "HIGH",
            "title": "High Risk Areas Require Attention",
            "message": f"{len(high_areas)} area(s) at HIGH risk. Population at risk: {sum(a['population'] for a in high_areas):,}",
            "timestamp": "2 min ago",
        })
        ts += 1

    # Super-spreader detection
    if superspreaders:
        top = superspreaders[0]
        alerts.append({
            "id": ts,
            "type": "network",
            "severity": "HIGH",
            "title": "High-Centrality Individual Detected",
            "message": f"Node {top['id']} has spreader score {top['spreader_score']:.3f} with {top['degree']} contacts",
            "timestamp": "5 min ago",
        })
        ts += 1

    # Contact density
    if net_metrics["summary"]["avg_degree"] > 10:
        alerts.append({
            "id": ts,
            "type": "density",
            "severity": "MEDIUM",
            "title": "Contact Density Above Threshold",
            "message": f"Average degree: {net_metrics['summary']['avg_degree']:.1f} — elevated transmission risk",
            "timestamp": "8 min ago",
        })
        ts += 1

    # Insufficient coverage
    alerts.append({
        "id": ts,
        "type": "coverage",
        "severity": "MEDIUM",
        "title": "Medical Coverage Assessment Needed",
        "message": "Run the Medical Camp Optimizer to evaluate coverage gaps",
        "timestamp": "15 min ago",
    })
    ts += 1

    # Forecast alert
    alerts.append({
        "id": ts,
        "type": "forecast",
        "severity": "LOW",
        "title": "Forecast Update Available",
        "message": "New epidemic projections available. Review the Forecasting page for updated demand estimates.",
        "timestamp": "30 min ago",
    })

    return alerts
