"""
Epidemic Model Service — Configurable SEIR compartmental simulation.

S(usceptible) → E(xposed) → I(nfectious) → R(ecovered)

Supports network-informed transmission rates and intervention effects.
"""


import numpy as np

def run_seir_simulation(
    population: int = 410,
    initial_infected: int = 5,
    initial_exposed: int = 10,
    transmission_rate: float = 0.3,
    contact_intensity: float = 1.0,
    incubation_days: float = 5.0,
    recovery_days: float = 10.0,
    intervention_level: float = 0.0,
    simulation_days: int = 160,
    dt: float = 0.25,
):
    """
    Run a deterministic SEIR simulation.

    Parameters
    ----------
    population : int — Total population N.
    initial_infected : int — I(0).
    initial_exposed : int — E(0).
    transmission_rate : float — Base transmission probability β.
    contact_intensity : float — Multiplier on β from contact network density.
    incubation_days : float — Average incubation period (1/σ).
    recovery_days : float — Average infectious period (1/γ).
    intervention_level : float — 0 = no intervention, 1 = full lockdown.
    simulation_days : int — Duration of simulation.
    dt : float — Time step in days.

    Returns
    -------
    dict with time series and summary metrics.
    """
    N = population
    I0 = min(initial_infected, N - 1)
    E0 = min(initial_exposed, N - I0 - 1)
    R0_init = 0
    S0 = N - I0 - E0 - R0_init

    beta = transmission_rate * contact_intensity * (1 - intervention_level * 0.8)
    sigma = 1.0 / max(incubation_days, 0.5)
    gamma = 1.0 / max(recovery_days, 0.5)

    steps = int(simulation_days / dt)

    S = np.zeros(steps + 1)
    E = np.zeros(steps + 1)
    I = np.zeros(steps + 1)
    R = np.zeros(steps + 1)

    S[0], E[0], I[0], R[0] = S0, E0, I0, R0_init

    for t in range(steps):
        s, e, i, r = S[t], E[t], I[t], R[t]

        dS = -beta * s * i / N * dt
        dE = (beta * s * i / N - sigma * e) * dt
        dI = (sigma * e - gamma * i) * dt
        dR = gamma * i * dt

        S[t + 1] = max(0, s + dS)
        E[t + 1] = max(0, e + dE)
        I[t + 1] = max(0, i + dI)
        R[t + 1] = max(0, r + dR)

    # Downsample to daily resolution
    daily_step = int(1.0 / dt)
    indices = list(range(0, steps + 1, daily_step))
    if indices[-1] != steps:
        indices.append(steps)

    days = [round(idx * dt, 1) for idx in indices]
    S_daily = [round(float(S[idx]), 2) for idx in indices]
    E_daily = [round(float(E[idx]), 2) for idx in indices]
    I_daily = [round(float(I[idx]), 2) for idx in indices]
    R_daily = [round(float(R[idx]), 2) for idx in indices]

    # Key metrics
    peak_infected = float(np.max(I))
    peak_day = float(np.argmax(I) * dt)
    total_infected = float(R[-1])
    attack_rate = total_infected / N if N > 0 else 0

    # Basic reproduction number estimate
    R_eff = beta / gamma if gamma > 0 else 0

    return {
        "parameters": {
            "population": N,
            "initial_infected": I0,
            "initial_exposed": E0,
            "transmission_rate": transmission_rate,
            "contact_intensity": contact_intensity,
            "incubation_days": incubation_days,
            "recovery_days": recovery_days,
            "intervention_level": intervention_level,
            "simulation_days": simulation_days,
            "effective_beta": round(beta, 4),
            "sigma": round(sigma, 4),
            "gamma": round(gamma, 4),
        },
        "time_series": {
            "days": days,
            "susceptible": S_daily,
            "exposed": E_daily,
            "infected": I_daily,
            "recovered": R_daily,
        },
        "metrics": {
            "peak_infected": round(peak_infected, 2),
            "peak_day": round(peak_day, 1),
            "total_infected": round(total_infected, 2),
            "attack_rate": round(attack_rate, 4),
            "R_effective": round(R_eff, 3),
            "final_susceptible": round(float(S[-1]), 2),
            "herd_immunity_threshold": round(1 - 1 / R_eff, 3) if R_eff > 1 else 0,
        },
    }
