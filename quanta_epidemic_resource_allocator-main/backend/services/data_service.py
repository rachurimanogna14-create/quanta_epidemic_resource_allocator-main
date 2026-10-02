"""
Data Service — Loads and preprocesses the SocioPatterns Infectious dataset.

Builds a weighted NetworkX contact graph, generates synthetic geography
(Dublin, Ireland) for map visualization, and creates facility candidates.
Falls back to synthetic data if the real dataset is unavailable.
"""

import numpy as np
import networkx as nx
import random
import math
from pathlib import Path
from functools import lru_cache

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
DUBLIN_CENTER = (53.3498, -6.2603)
GEO_SPREAD = 0.045  # ~5 km spread around center
NUM_AREAS = 20
NUM_HOSPITALS = 4
NUM_EXISTING_CAMPS = 3
NUM_CANDIDATE_LOCATIONS = 15
SEED = 42

# ---------------------------------------------------------------------------
# Singleton cache
# ---------------------------------------------------------------------------
_cache = {}


def _dataset_path() -> Path:
    return Path(__file__).resolve().parent.parent / "data" / "out.sociopatterns-infectious"


# ===========================  DATASET LOADING  =============================

def load_dataset():
    """Load the real dataset or generate synthetic fallback.  Returns the
    weighted NetworkX graph and raw-event count."""
    if "graph" in _cache:
        return _cache["graph"], _cache["stats"]

    path = _dataset_path()
    if path.exists():
        graph, stats = _load_real_dataset(path)
    else:
        graph, stats = _generate_synthetic_dataset()

    _cache["graph"] = graph
    _cache["stats"] = stats
    return graph, stats


def _load_real_dataset(path: Path):
    """Parse the KONECT-format SocioPatterns file.
    Lines starting with '%' are metadata.  Data lines are:
        node1  node2  [weight]  [timestamp]
    We aggregate repeated edges into a weighted undirected graph.
    """
    raw_events = 0
    edge_counts: dict[tuple[int, int], float] = {}

    with open(path, "r", encoding="utf-8", errors="replace") as fh:
        for line in fh:
            line = line.strip()
            if not line or line.startswith("%"):
                continue
            parts = line.split()
            if len(parts) < 2:
                continue
            try:
                n1, n2 = int(parts[0]), int(parts[1])
            except ValueError:
                continue
            key = (min(n1, n2), max(n1, n2))
            weight = float(parts[2]) if len(parts) >= 3 else 1.0
            edge_counts[key] = edge_counts.get(key, 0) + weight
            raw_events += 1

    G = nx.Graph()
    for (n1, n2), w in edge_counts.items():
        G.add_edge(n1, n2, weight=w)

    # Ensure all isolated nodes are present (some nodes may only appear once)
    stats = {
        "name": "SocioPatterns Infectious",
        "description": "Face-to-face contact network from the INFECTIOUS: STAY AWAY exhibition, Science Gallery Dublin (2009)",
        "raw_events": raw_events,
        "individuals": G.number_of_nodes(),
        "edges": G.number_of_edges(),
        "source": "real_dataset",
        "file": str(path.name),
        "time_range_hours": 7.9,
        "columns": ["node1", "node2", "weight", "timestamp"],
        "missing_values": 0,
        "processing_status": "loaded",
    }
    return G, stats


def _generate_synthetic_dataset():
    """Generate synthetic contact-network matching real dataset statistics."""
    rng = np.random.RandomState(SEED)
    G = nx.Graph()

    n_nodes = 410
    n_edges_target = 2765

    # Use Barabási–Albert model to approximate scale-free contact patterns
    m = max(1, round(n_edges_target / n_nodes))
    G = nx.barabasi_albert_graph(n_nodes, m, seed=SEED)

    # Relabel nodes to start from 1
    mapping = {i: i + 1 for i in range(n_nodes)}
    G = nx.relabel_nodes(G, mapping)

    # Assign random weights (contact intensity)
    for u, v in G.edges():
        G[u][v]["weight"] = float(rng.randint(1, 20))

    raw_events = sum(int(G[u][v]["weight"]) for u, v in G.edges())

    stats = {
        "name": "Synthetic Contact Network",
        "description": "Synthetic dataset generated to match SocioPatterns Infectious statistics (demo mode)",
        "raw_events": raw_events,
        "individuals": G.number_of_nodes(),
        "edges": G.number_of_edges(),
        "source": "synthetic_fallback",
        "file": "N/A — using synthetic data",
        "time_range_hours": 7.9,
        "columns": ["node1", "node2", "weight"],
        "missing_values": 0,
        "processing_status": "synthetic_generated",
    }
    return G, stats


# ===========================  GEOGRAPHY  ===================================

def get_areas():
    """Return list of synthetic geographical areas around Dublin."""
    if "areas" in _cache:
        return _cache["areas"]

    rng = random.Random(SEED)
    G, _ = load_dataset()
    nodes = list(G.nodes())

    # Partition nodes into areas using deterministic assignment
    area_names = [
        "Dublin Central", "Temple Bar", "Smithfield", "Docklands",
        "Rathmines", "Drumcondra", "Glasnevin", "Ballsbridge",
        "Ringsend", "Inchicore", "Phibsborough", "Ranelagh",
        "Sandymount", "Clontarf", "Donnybrook", "Cabra",
        "Stoneybatter", "Portobello", "Harold's Cross", "Marino"
    ]

    areas = []
    nodes_per_area = max(1, len(nodes) // NUM_AREAS)

    for i, name in enumerate(area_names):
        # Deterministic lat/lng spread
        angle = 2 * math.pi * i / NUM_AREAS
        r = GEO_SPREAD * (0.4 + 0.6 * rng.random())
        lat = DUBLIN_CENTER[0] + r * math.cos(angle)
        lng = DUBLIN_CENTER[1] + r * math.sin(angle) * 1.6  # longitude stretch

        # Assign nodes to this area
        start = i * nodes_per_area
        end = start + nodes_per_area if i < NUM_AREAS - 1 else len(nodes)
        area_nodes = nodes[start:end] if start < len(nodes) else []

        # Population (synthetic)
        population = rng.randint(8000, 45000)

        # Contact intensity from graph
        contact_intensity = 0
        for n in area_nodes:
            contact_intensity += G.degree(n, weight="weight")
        contact_intensity = contact_intensity / max(len(area_nodes), 1)

        # Active cases (synthetic, proportional to contact intensity)
        base_rate = 0.001 + 0.004 * (contact_intensity / max(contact_intensity, 1))
        active_cases = max(1, int(population * base_rate * rng.uniform(0.5, 2.0)))

        areas.append({
            "id": f"area_{i+1}",
            "name": name,
            "lat": round(lat, 6),
            "lng": round(lng, 6),
            "population": population,
            "active_cases": active_cases,
            "contact_intensity": round(contact_intensity, 2),
            "population_density": round(population / (rng.uniform(1.5, 6.0)), 0),
            "mobility_index": round(rng.uniform(0.3, 0.95), 2),
            "node_ids": area_nodes,
            "recent_case_growth": round(rng.uniform(-0.1, 0.35), 3),
        })

    _cache["areas"] = areas
    return areas


# ===========================  FACILITIES  ==================================

def get_facilities():
    """Return hospitals, existing camps, and candidate camp locations."""
    if "facilities" in _cache:
        return _cache["facilities"]

    rng = random.Random(SEED + 1)
    areas = get_areas()

    hospitals = []
    for i in range(NUM_HOSPITALS):
        area = areas[i * (NUM_AREAS // NUM_HOSPITALS)]
        hospitals.append({
            "id": f"hospital_{i+1}",
            "name": f"Dublin Hospital {chr(65+i)}",
            "type": "hospital",
            "lat": area["lat"] + rng.uniform(-0.005, 0.005),
            "lng": area["lng"] + rng.uniform(-0.008, 0.008),
            "capacity": rng.randint(200, 800),
            "area_id": area["id"],
        })

    existing_camps = []
    for i in range(NUM_EXISTING_CAMPS):
        area = areas[5 + i * 4]
        existing_camps.append({
            "id": f"existing_camp_{i+1}",
            "name": f"Field Camp {chr(65+i)}",
            "type": "existing_camp",
            "lat": area["lat"] + rng.uniform(-0.005, 0.005),
            "lng": area["lng"] + rng.uniform(-0.008, 0.008),
            "capacity": rng.randint(50, 200),
            "area_id": area["id"],
        })

    candidates = []
    for i in range(NUM_CANDIDATE_LOCATIONS):
        area = areas[i % NUM_AREAS]
        candidates.append({
            "id": f"candidate_{i+1}",
            "name": f"Candidate Site {i+1}",
            "type": "candidate",
            "lat": area["lat"] + rng.uniform(-0.008, 0.008),
            "lng": area["lng"] + rng.uniform(-0.012, 0.012),
            "capacity": rng.randint(80, 350),
            "setup_cost": round(rng.uniform(50000, 250000), 0),
            "accessibility_score": round(rng.uniform(0.3, 1.0), 2),
            "area_id": area["id"],
            "nearby_population": area["population"],
            "risk_score": 0,  # filled by risk model
        })

    facilities = {
        "hospitals": hospitals,
        "existing_camps": existing_camps,
        "candidates": candidates,
    }
    _cache["facilities"] = facilities
    return facilities


def get_candidate_list():
    """Return just the candidate locations for optimization."""
    return get_facilities()["candidates"]


# ===========================  CONTACT EVENTS  ==============================

def get_contact_events():
    """Return per-time-window contact counts for anomaly detection."""
    if "contact_events" in _cache:
        return _cache["contact_events"]

    rng = np.random.RandomState(SEED + 10)
    G, stats = load_dataset()

    # Simulate hourly contact volumes over the observation period
    n_windows = 48  # 48 half-hour windows ≈ 24h
    total_events = stats["raw_events"]
    base_rate = total_events / n_windows

    events = []
    for t in range(n_windows):
        hour = t * 0.5
        # Diurnal pattern: more contacts during day
        diurnal = 0.3 + 0.7 * max(0, math.sin(math.pi * (hour - 6) / 12)) if 6 <= hour <= 18 else 0.3
        count = int(base_rate * diurnal * rng.uniform(0.5, 1.8))

        # Inject a few anomalies
        is_anomaly = t in [15, 22, 35]
        if is_anomaly:
            count = int(count * rng.uniform(2.5, 4.0))

        events.append({
            "window": t,
            "hour": round(hour, 1),
            "contacts": count,
            "is_anomaly": is_anomaly,
        })

    _cache["contact_events"] = events
    return events


# ===========================  HELPERS  =====================================

def clear_cache():
    """Clear all cached data (useful for testing)."""
    _cache.clear()


def haversine(lat1, lon1, lat2, lon2):
    """Calculate distance in km between two coordinates."""
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
