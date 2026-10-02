"""
QAOA Solver — Executes the Quantum Approximate Optimization Algorithm
using genuine Qiskit and Qiskit Aer.

Converts the QUBO matrix to an Ising Hamiltonian, builds a QAOA ansatz,
optimizes variational parameters, and decodes the best feasible bitstring.
"""

import time
import numpy as np
from typing import Optional

# Qiskit imports
try:
    from qiskit.circuit.library import QAOAAnsatz
    from qiskit.quantum_info import SparsePauliOp
    from qiskit_aer import AerSimulator
    from qiskit import transpile
    QISKIT_AVAILABLE = True
except ImportError:
    QISKIT_AVAILABLE = False

from scipy.optimize import minimize as scipy_minimize


def qubo_to_ising(Q: np.ndarray):
    """
    Convert a QUBO matrix Q to an Ising Hamiltonian.

    QUBO: minimize x^T Q x, x_i ∈ {0,1}
    Ising: minimize Σ h_i z_i + Σ J_{ij} z_i z_j + offset, z_i ∈ {-1,+1}

    Substitution: x_i = (1 - z_i) / 2
    """
    n = Q.shape[0]
    # Make Q symmetric
    Q_sym = (Q + Q.T) / 2

    h = np.zeros(n)
    J = np.zeros((n, n))
    offset = 0.0

    for i in range(n):
        offset += Q_sym[i, i] / 4.0
        h[i] -= Q_sym[i, i] / 4.0
        for j in range(i + 1, n):
            coeff = Q_sym[i, j] / 2.0  # since Q_sym is symmetric, Q_sym[i,j] = Q_sym[j,i]
            offset += coeff / 2.0
            h[i] -= coeff / 2.0
            h[j] -= coeff / 2.0
            J[i, j] = coeff / 2.0

    return h, J, offset


def ising_to_operator(h: np.ndarray, J: np.ndarray) -> "SparsePauliOp":
    """Convert Ising coefficients to a SparsePauliOp cost Hamiltonian."""
    n = len(h)
    pauli_list = []

    # Single-qubit Z terms
    for i in range(n):
        if abs(h[i]) > 1e-10:
            label = ["I"] * n
            label[n - 1 - i] = "Z"  # Qiskit uses little-endian
            pauli_list.append(("".join(label), float(h[i])))

    # Two-qubit ZZ terms
    for i in range(n):
        for j in range(i + 1, n):
            if abs(J[i, j]) > 1e-10:
                label = ["I"] * n
                label[n - 1 - i] = "Z"
                label[n - 1 - j] = "Z"
                pauli_list.append(("".join(label), float(J[i, j])))

    if not pauli_list:
        # Add identity if empty
        pauli_list.append(("I" * n, 0.0))

    return SparsePauliOp.from_list(pauli_list)


def run_qaoa(
    qubo_matrix: list,
    num_camps: int = 5,
    p: int = 1,
    shots: int = 2048,
    max_iter: int = 100,
    candidate_details: Optional[list] = None,
):
    """
    Execute QAOA using Qiskit Aer.

    Parameters
    ----------
    qubo_matrix : list — The QUBO Q matrix (n×n).
    num_camps : int — Required number of selected camps (K).
    p : int — QAOA circuit depth (number of layers).
    shots : int — Number of measurement shots.
    max_iter : int — Maximum classical optimizer iterations.
    candidate_details : list — Candidate metadata for result decoding.

    Returns
    -------
    dict with selected facilities, circuit info, measurements, and stats.
    """
    if not QISKIT_AVAILABLE:
        return {
            "error": "Qiskit is not installed. Install qiskit and qiskit-aer.",
            "success": False,
        }

    start_time = time.time()
    Q = np.array(qubo_matrix)
    n = Q.shape[0]

    # Convert QUBO → Ising
    h, J, offset = qubo_to_ising(Q)

    # Build cost operator
    cost_op = ising_to_operator(h, J)

    # Build QAOA ansatz
    qaoa_circuit = QAOAAnsatz(cost_op, reps=p)
    num_params = qaoa_circuit.num_parameters

    # Setup simulator
    backend = AerSimulator(method="statevector")

    # Track optimization progress
    optimization_history = []
    iteration_count = [0]

    def objective_function(params):
        """Evaluate the QAOA cost for given variational parameters."""
        # Bind parameters
        bound_circuit = qaoa_circuit.assign_parameters(dict(zip(qaoa_circuit.parameters, params)))

        # Add measurements
        meas_circuit = bound_circuit.copy()
        meas_circuit.measure_all()

        # Transpile and run
        transpiled = transpile(meas_circuit, backend)
        job = backend.run(transpiled, shots=shots)
        result = job.result()
        counts = result.get_counts()

        # Evaluate expected cost
        total_cost = 0.0
        total_counts = 0
        for bitstring, count in counts.items():
            bits = [int(b) for b in bitstring[::-1]]  # little-endian
            x = np.array(bits[:n])
            cost = float(x @ Q @ x)
            total_cost += cost * count
            total_counts += count

        avg_cost = total_cost / total_counts
        iteration_count[0] += 1
        optimization_history.append({
            "iteration": iteration_count[0],
            "cost": round(avg_cost, 4),
        })
        return avg_cost

    # Initial parameters
    np.random.seed(42)
    initial_params = np.random.uniform(0, np.pi, num_params)

    # Classical optimization of QAOA parameters
    opt_result = scipy_minimize(
        objective_function,
        initial_params,
        method="COBYLA",
        options={"maxiter": max_iter, "rhobeg": 0.5},
    )

    # Final measurement with optimized parameters
    optimal_params = opt_result.x
    bound_circuit = qaoa_circuit.assign_parameters(
        dict(zip(qaoa_circuit.parameters, optimal_params))
    )
    meas_circuit = bound_circuit.copy()
    meas_circuit.measure_all()
    transpiled = transpile(meas_circuit, backend)
    job = backend.run(transpiled, shots=shots * 2)
    final_result = job.result()
    final_counts = final_result.get_counts()

    # Decode results
    bitstring_results = []
    best_feasible = None
    best_feasible_cost = float("inf")
    best_overall = None
    best_overall_cost = float("inf")

    for bitstring, count in sorted(final_counts.items(), key=lambda x: -x[1]):
        bits = [int(b) for b in bitstring[::-1]]
        x = np.array(bits[:n])
        cost = float(x @ Q @ x)
        selected = [i for i in range(n) if x[i] == 1]
        is_feasible = len(selected) == num_camps

        entry = {
            "bitstring": bitstring,
            "selected_indices": selected,
            "count": count,
            "probability": round(count / (shots * 2), 4),
            "cost": round(cost, 4),
            "feasible": is_feasible,
            "num_selected": len(selected),
        }
        bitstring_results.append(entry)

        if cost < best_overall_cost:
            best_overall_cost = cost
            best_overall = entry

        if is_feasible and cost < best_feasible_cost:
            best_feasible_cost = cost
            best_feasible = entry

    # If no feasible solution, select the best and force-adjust
    if best_feasible is None and best_overall is not None:
        # Find closest to feasible
        min_diff = float("inf")
        for entry in bitstring_results:
            diff = abs(entry["num_selected"] - num_camps)
            if diff < min_diff:
                min_diff = diff
                best_feasible = entry

    end_time = time.time()
    execution_time = round(end_time - start_time, 3)

    # Build selected facilities info
    selected_facilities = []
    if best_feasible and candidate_details:
        for idx in best_feasible["selected_indices"][:num_camps]:
            if idx < len(candidate_details):
                cand = candidate_details[idx]
                selected_facilities.append({
                    "index": idx,
                    "id": cand.get("id", f"candidate_{idx+1}"),
                    "name": cand.get("name", f"Candidate {idx+1}"),
                    "lat": cand.get("lat"),
                    "lng": cand.get("lng"),
                    "coverage_score": cand.get("coverage_score", 0),
                })

    # Circuit info
    circuit_info = {
        "num_qubits": n,
        "depth": p,
        "num_parameters": num_params,
        "gate_count": transpiled.size(),
        "circuit_depth": transpiled.depth(),
    }

    # Top measurement results (for visualization)
    top_measurements = sorted(bitstring_results, key=lambda x: -x["count"])[:20]

    return {
        "success": True,
        "selected_indices": best_feasible["selected_indices"] if best_feasible else [],
        "selected_facilities": selected_facilities,
        "objective_value": best_feasible["cost"] if best_feasible else None,
        "is_feasible": best_feasible["feasible"] if best_feasible else False,
        "circuit_info": circuit_info,
        "optimization": {
            "method": "COBYLA",
            "iterations": iteration_count[0],
            "final_cost": round(float(opt_result.fun), 4),
            "convergence": opt_result.success,
            "history": optimization_history,
        },
        "measurements": {
            "total_shots": shots * 2,
            "unique_bitstrings": len(bitstring_results),
            "top_results": top_measurements,
        },
        "execution_time_seconds": execution_time,
        "algorithm": "QAOA",
        "backend": "Qiskit Aer StatevectorSimulator",
        "qiskit_version": _get_qiskit_version(),
    }


def _get_qiskit_version():
    try:
        import qiskit
        return qiskit.__version__
    except Exception:
        return "unknown"
