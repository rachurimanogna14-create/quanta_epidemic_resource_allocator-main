"""Network API — Contact network data, metrics, and super-spreader endpoints."""

from fastapi import APIRouter, Query
from ..services.network_analysis import get_network_metrics, get_superspreaders

router = APIRouter()


@router.get("/network")
def get_network(
    max_edges: int = Query(500, ge=50, le=3000),
    min_weight: float = Query(0.0, ge=0.0),
):
    """Return network nodes, edges, communities, and metrics."""
    metrics = get_network_metrics()

    # Apply optional edge filtering
    edges = metrics["edges"]
    if min_weight > 0:
        edges = [e for e in edges if e["weight"] >= min_weight]
    edges = edges[:max_edges]

    return {
        "summary": metrics["summary"],
        "nodes": metrics["nodes"],
        "edges": edges,
        "communities": metrics["communities"],
    }


@router.get("/network/superspreaders")
def get_superspreaders_endpoint(
    top_n: int = Query(20, ge=5, le=50),
):
    """Return top super-spreader candidates by centrality score."""
    return {"superspreaders": get_superspreaders(top_n=top_n)}
