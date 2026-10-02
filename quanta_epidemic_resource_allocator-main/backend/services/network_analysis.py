"""
Network Analysis Service — Computes graph metrics, detects communities,
and identifies super-spreader candidates from the contact network.
"""

import networkx as nx
import numpy as np
from collections import Counter

try:
    import community as community_louvain  # python-louvain
except ImportError:
    community_louvain = None

from .data_service import load_dataset


# ---------------------------------------------------------------------------
# Cache
# ---------------------------------------------------------------------------
_cache = {}


def get_network_metrics():
    """Compute and cache full network analysis."""
    if "metrics" in _cache:
        return _cache["metrics"]

    G, stats = load_dataset()

    # --- Basic stats ---
    n_nodes = G.number_of_nodes()
    n_edges = G.number_of_edges()
    density = nx.density(G)
    avg_degree = sum(dict(G.degree()).values()) / max(n_nodes, 1)
    avg_weighted_degree = sum(dict(G.degree(weight="weight")).values()) / max(n_nodes, 1)

    # --- Centrality metrics (compute on full graph) ---
    weighted_degree = dict(G.degree(weight="weight"))
    betweenness = nx.betweenness_centrality(G, weight="weight", k=min(100, n_nodes))
    try:
        eigenvector = nx.eigenvector_centrality_numpy(G, weight="weight")
    except Exception:
        eigenvector = {n: 0.0 for n in G.nodes()}
    clustering = nx.clustering(G, weight="weight")

    # --- Community detection ---
    if community_louvain is not None:
        partition = community_louvain.best_partition(G, weight="weight", random_state=42)
    else:
        # Fallback: use connected components or label propagation
        try:
            communities_gen = nx.community.label_propagation_communities(G)
            partition = {}
            for idx, comm in enumerate(communities_gen):
                for node in comm:
                    partition[node] = idx
        except Exception:
            partition = {n: 0 for n in G.nodes()}

    n_communities = len(set(partition.values()))

    # --- Build per-node data ---
    nodes_data = []
    max_wd = max(weighted_degree.values()) if weighted_degree else 1

    for node in G.nodes():
        wd = weighted_degree.get(node, 0)
        bc = betweenness.get(node, 0)
        ev = eigenvector.get(node, 0)
        cl = clustering.get(node, 0)
        comm = partition.get(node, 0)

        nodes_data.append({
            "id": int(node),
            "weighted_degree": round(float(wd), 2),
            "normalized_degree": round(float(wd / max_wd), 4),
            "betweenness": round(float(bc), 6),
            "eigenvector": round(float(ev), 6),
            "clustering": round(float(cl), 4),
            "community": int(comm),
            "degree": int(G.degree(node)),
            "risk_level": _node_risk_level(wd, bc, max_wd),
        })

    # --- Build edges data (limit for frontend performance) ---
    edges_data = []
    sorted_edges = sorted(G.edges(data=True), key=lambda e: e[2].get("weight", 1), reverse=True)
    max_edges_to_send = min(500, len(sorted_edges))  # cap for UI performance
    max_w = sorted_edges[0][2].get("weight", 1) if sorted_edges else 1

    for u, v, data in sorted_edges[:max_edges_to_send]:
        edges_data.append({
            "source": int(u),
            "target": int(v),
            "weight": round(float(data.get("weight", 1)), 2),
            "normalized_weight": round(float(data.get("weight", 1) / max_w), 4),
        })

    # --- Community summary ---
    community_counts = Counter(partition.values())
    communities_summary = [
        {"id": int(cid), "size": count, "color": _community_color(cid)}
        for cid, count in sorted(community_counts.items())
    ]

    metrics = {
        "summary": {
            "nodes": n_nodes,
            "edges": n_edges,
            "density": round(density, 6),
            "avg_degree": round(avg_degree, 2),
            "avg_weighted_degree": round(avg_weighted_degree, 2),
            "communities": n_communities,
            "total_edges_in_graph": n_edges,
            "edges_sent": max_edges_to_send,
        },
        "nodes": nodes_data,
        "edges": edges_data,
        "communities": communities_summary,
    }

    _cache["metrics"] = metrics
    return metrics


def get_superspreaders(top_n: int = 20):
    """Return the top-N super-spreader candidates by centrality."""
    metrics = get_network_metrics()
    nodes = metrics["nodes"]
    # Composite score: weighted_degree * 0.4 + betweenness * 0.3 + eigenvector * 0.3
    max_bc = max(n["betweenness"] for n in nodes) if nodes else 1
    max_ev = max(n["eigenvector"] for n in nodes) if nodes else 1

    for n in nodes:
        bc_norm = n["betweenness"] / max_bc if max_bc > 0 else 0
        ev_norm = n["eigenvector"] / max_ev if max_ev > 0 else 0
        n["_spreader_score"] = (
            0.4 * n["normalized_degree"] +
            0.3 * bc_norm +
            0.3 * ev_norm
        )

    sorted_nodes = sorted(nodes, key=lambda x: x["_spreader_score"], reverse=True)

    result = []
    for n in sorted_nodes[:top_n]:
        result.append({
            "id": n["id"],
            "weighted_degree": n["weighted_degree"],
            "betweenness": n["betweenness"],
            "eigenvector": n["eigenvector"],
            "community": n["community"],
            "degree": n["degree"],
            "spreader_score": round(n["_spreader_score"], 4),
            "risk_level": n["risk_level"],
        })

    return result


def get_area_network_metrics(area_node_ids: list[int]):
    """Aggregate network metrics for nodes belonging to a specific area."""
    G, _ = load_dataset()
    if not area_node_ids:
        return {"avg_centrality": 0, "avg_degree": 0, "contact_intensity": 0}

    valid_nodes = [n for n in area_node_ids if G.has_node(n)]
    if not valid_nodes:
        return {"avg_centrality": 0, "avg_degree": 0, "contact_intensity": 0}

    metrics = get_network_metrics()
    node_map = {n["id"]: n for n in metrics["nodes"]}

    centralities = [node_map[n]["betweenness"] for n in valid_nodes if n in node_map]
    degrees = [node_map[n]["weighted_degree"] for n in valid_nodes if n in node_map]

    return {
        "avg_centrality": round(float(np.mean(centralities)) if centralities else 0, 6),
        "avg_degree": round(float(np.mean(degrees)) if degrees else 0, 2),
        "contact_intensity": round(float(sum(degrees)), 2),
        "num_nodes": len(valid_nodes),
    }


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _node_risk_level(weighted_degree, betweenness, max_wd):
    """Simple risk classification based on network position."""
    norm_wd = weighted_degree / max_wd if max_wd > 0 else 0
    score = 0.6 * norm_wd + 0.4 * min(betweenness * 100, 1.0)
    if score > 0.75:
        return "CRITICAL"
    elif score > 0.55:
        return "HIGH"
    elif score > 0.32:
        return "MEDIUM"
    return "LOW"


COMMUNITY_COLORS = [
    "#06b6d4", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444",
    "#3b82f6", "#ec4899", "#f97316", "#14b8a6", "#a855f7",
    "#64748b", "#84cc16", "#e11d48", "#0ea5e9", "#d946ef",
]


def _community_color(community_id: int) -> str:
    return COMMUNITY_COLORS[community_id % len(COMMUNITY_COLORS)]
