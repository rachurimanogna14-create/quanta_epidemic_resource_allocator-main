import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Atom, Cpu, BarChart3, GitCompare, AlertCircle, ArrowRight } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend,
} from 'recharts';
import { useAppStore } from '../store/appStore';
import { formatDuration, formatNumber, coefficientColor } from '../lib/utils';
import { NavLink } from 'react-router-dom';

// QUBO matrix mini-heatmap
function QUBOHeatmap({ matrix }: { matrix: number[][] }) {
  const size = matrix.length;
  const flat = matrix.flat();
  const min = Math.min(...flat);
  const max = Math.max(...flat);

  // Only show if reasonably small
  if (size > 24) {
    return (
      <div className="text-sm text-slate-500 text-center py-4">
        Matrix too large to display visually ({size}×{size}). Stats shown below.
      </div>
    );
  }

  const cellSize = Math.max(4, Math.min(18, Math.floor(320 / size)));

  return (
    <div className="overflow-auto">
      <div
        style={{ display: 'grid', gridTemplateColumns: `repeat(${size}, ${cellSize}px)`, gap: 1 }}
      >
        {matrix.map((row, i) =>
          row.map((val, j) => (
            <div
              key={`${i}-${j}`}
              style={{
                width: cellSize,
                height: cellSize,
                background: coefficientColor(val, min, max),
                borderRadius: 1,
              }}
              title={`[${i},${j}]: ${val.toFixed(3)}`}
            />
          ))
        )}
      </div>
      <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-500 font-medium">
        <div className="w-8 h-2 rounded" style={{ background: 'rgba(16,185,129,0.8)' }} />
        <span>Low</span>
        <div className="w-8 h-2 rounded" style={{ background: 'rgba(245,158,11,0.8)' }} />
        <span>Medium</span>
        <div className="w-8 h-2 rounded" style={{ background: 'rgba(239,68,68,0.8)' }} />
        <span>High</span>
      </div>
    </div>
  );
}

export default function QuantumAnalysis() {
  const { quboResult, qaoa, classical } = useAppStore();

  // Bitstring histogram data
  const bitstringData = useMemo(() => {
    return (qaoa?.measurements.top_results ?? []).slice(0, 12).map((r) => ({
      bitstring: r.bitstring.length > 8 ? r.bitstring.slice(0, 8) + '…' : r.bitstring,
      probability: +(r.probability * 100).toFixed(2),
      count: r.count,
      feasible: r.feasible,
      cost: r.cost,
    }));
  }, [qaoa]);

  // Convergence history
  const convergenceData = useMemo(() => {
    return (qaoa?.optimization?.history ?? []).map((h) => ({
      iter: h.iteration,
      cost: +h.cost.toFixed(4),
    }));
  }, [qaoa]);

  if (!quboResult && !qaoa) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center max-w-sm bg-white border border-emerald-100 rounded-2xl p-8 shadow-sm">
          <Atom className="w-14 h-14 text-emerald-600 mx-auto mb-4" />
          <h2 className="text-slate-900 font-bold text-lg mb-2">No Quantum Results Yet</h2>
          <p className="text-slate-600 text-sm mb-5 leading-relaxed">
            Go to the Medical Camp Optimizer to generate a QUBO matrix and run the QAOA algorithm first.
          </p>
          <NavLink
            to="/optimizer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors shadow-xs"
          >
            Open Optimizer <ArrowRight className="w-4 h-4" />
          </NavLink>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* QUBO Section */}
      {quboResult && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {/* QUBO matrix heatmap */}
          <div className="bg-white rounded-xl p-5 border border-emerald-100 shadow-xs">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900">QUBO Matrix ({quboResult.size}×{quboResult.size})</h2>
            </div>
            <QUBOHeatmap matrix={quboResult.qubo_matrix} />
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              {[
                { label: 'Variables', value: quboResult.qubo_stats.num_variables },
                { label: 'Quadratic Terms', value: quboResult.qubo_stats.num_quadratic_terms },
                { label: 'Min Coeff', value: quboResult.qubo_stats.min_coefficient?.toFixed(4) },
                { label: 'Max Coeff', value: quboResult.qubo_stats.max_coefficient?.toFixed(4) },
                { label: 'Density', value: quboResult.qubo_stats.density?.toFixed(4) },
                { label: 'Penalty λ', value: quboResult.penalty_strength },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between bg-emerald-50/60 border border-emerald-100/60 rounded-lg px-2.5 py-1.5">
                  <span className="text-slate-500 font-medium">{label}</span>
                  <span className="text-slate-900 font-mono font-bold">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Formulation */}
          <div className="bg-white rounded-xl p-5 border border-emerald-100 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 mb-4">QUBO Formulation</h2>
            <div className="bg-emerald-50/60 border border-emerald-100/60 rounded-lg p-3 font-mono text-xs space-y-1.5 mb-4 text-slate-700">
              <p className="text-emerald-700 font-bold">min  xᵀQx</p>
              <p className="text-slate-600">subject to:  Σᵢxᵢ = k  (k = {quboResult.num_camps})</p>
              <p className="text-slate-500 mt-2">Q = -W_risk · R</p>
              <p className="text-slate-500">  - W_pop · P</p>
              <p className="text-slate-500">  - W_net · N</p>
              <p className="text-slate-500">  + W_dist · D</p>
              <p className="text-slate-500">  + λ · (Σᵢxᵢ - k)²</p>
            </div>
            <h3 className="text-xs text-slate-600 font-bold uppercase tracking-wider mb-2">Objective Weights</h3>
            <div className="space-y-1.5">
              {Object.entries(quboResult.weights).map(([k, v]) => (
                <div key={k} className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500 capitalize w-28 font-medium">{k.replace('_', ' ')}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(v as number) * 100}%` }} />
                  </div>
                  <span className="text-emerald-700 font-mono font-bold w-10 text-right">{(v as number).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* QAOA Results */}
      {qaoa && (
        <div className="space-y-5">
          {/* Circuit info + selected facilities */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              { label: 'Qubits', value: qaoa.circuit_info?.num_qubits, icon: Atom, color: 'text-emerald-700' },
              { label: 'Circuit Depth', value: qaoa.circuit_info?.circuit_depth ?? qaoa.circuit_info?.depth, icon: BarChart3, color: 'text-teal-700' },
              { label: 'QAOA Time', value: formatDuration(qaoa.execution_time_seconds), icon: Atom, color: 'text-emerald-600' },
              { label: 'Camps Selected', value: qaoa.selected_facilities?.length ?? 0, icon: Atom, color: 'text-amber-600' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white rounded-xl p-4 border border-emerald-100 shadow-xs">
                <div className="flex items-center gap-1.5 mb-2">
                  <Icon className={`w-3.5 h-3.5 ${color}`} />
                  <span className="text-[11px] text-slate-500 font-medium">{label}</span>
                </div>
                <p className={`text-2xl font-bold font-mono ${color}`}>{String(value ?? '—')}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {/* Bitstring histogram */}
            <div className="bg-white rounded-xl p-5 border border-emerald-100 shadow-xs">
              <h2 className="text-sm font-bold text-slate-900 mb-4">Measurement Histogram</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={bitstringData} margin={{ top: 5, right: 10, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                  <XAxis dataKey="bitstring" tick={{ fontSize: 9, fill: '#64748b' }} angle={-30} textAnchor="end" />
                  <YAxis tick={{ fontSize: 9, fill: '#64748b' }} tickFormatter={(v) => `${v}%`} />
                  <Tooltip
                    contentStyle={{ background: '#ffffff', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, fontSize: 11, color: '#0f172a' }}
                    formatter={(v: number) => [`${v}%`, 'Probability']}
                  />
                  <Bar dataKey="probability" fill="#059669" radius={[3, 3, 0, 0]}>
                    {bitstringData.map((entry, i) => (
                      <rect key={i} fill={entry.feasible ? '#059669' : '#cbd5e1'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="text-[11px] text-slate-500 mt-2 font-medium">
                {qaoa.measurements.unique_bitstrings} unique bitstrings from {formatNumber(qaoa.measurements.total_shots)} shots
              </p>
            </div>

            {/* Convergence */}
            {convergenceData.length > 0 && (
              <div className="bg-white rounded-xl p-5 border border-emerald-100 shadow-xs">
                <h2 className="text-sm font-bold text-slate-900 mb-4">Optimization Convergence</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={convergenceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                    <XAxis dataKey="iter" tick={{ fontSize: 9, fill: '#64748b' }} label={{ value: 'Iteration', position: 'insideBottom', offset: -4, fontSize: 9, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 9, fill: '#64748b' }} />
                    <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, fontSize: 11, color: '#0f172a' }} />
                    <Line type="monotone" dataKey="cost" stroke="#059669" strokeWidth={2} dot={false} name="Cost" />
                  </LineChart>
                </ResponsiveContainer>
                <p className="text-[11px] text-slate-500 mt-2 font-medium">
                  Method: {qaoa.optimization?.method} · {qaoa.optimization?.iterations} iterations · {qaoa.optimization?.convergence ? 'Converged ✓' : 'Max iter reached'}
                </p>
              </div>
            )}
          </div>

          {/* Comparison table */}
          {classical && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl p-5 border border-emerald-100 shadow-xs"
            >
              <div className="flex items-center gap-2 mb-4">
                <GitCompare className="w-4 h-4 text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-900">QAOA vs. Classical MILP Comparison</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-500 font-semibold border-b border-slate-100">
                      <th className="text-left pb-2 pr-6">Metric</th>
                      <th className="text-center pb-2 px-4 text-teal-700">QAOA (Quantum)</th>
                      <th className="text-center pb-2 px-4 text-emerald-700">Classical MILP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[
                      { metric: 'Algorithm', qaoa: qaoa.algorithm, cl: classical.algorithm },
                      { metric: 'Backend / Solver', qaoa: qaoa.backend, cl: classical.solver },
                      { metric: 'Execution Time', qaoa: formatDuration(qaoa.execution_time_seconds), cl: formatDuration(classical.execution_time_seconds) },
                      { metric: 'Camps Selected', qaoa: qaoa.selected_facilities?.length ?? '—', cl: classical.selected_facilities?.length ?? '—' },
                      { metric: 'Objective Value', qaoa: qaoa.objective_value?.toFixed(4) ?? '—', cl: classical.objective_value?.toFixed(4) ?? '—' },
                      { metric: 'Feasible?', qaoa: qaoa.is_feasible ? '✓ Yes' : '✗ No', cl: classical.success ? '✓ Yes' : '✗ No' },
                      { metric: 'Pop. Coverage', qaoa: '—', cl: classical.coverage?.population_coverage_pct != null ? `${classical.coverage.population_coverage_pct.toFixed(1)}%` : '—' },
                    ].map(({ metric, qaoa: qv, cl: cv }) => (
                      <tr key={metric} className="hover:bg-emerald-50/40 transition-colors">
                        <td className="py-2.5 pr-6 text-slate-600 font-medium">{metric}</td>
                        <td className="py-2.5 px-4 text-center text-teal-800 font-mono font-bold">{String(qv)}</td>
                        <td className="py-2.5 px-4 text-center text-emerald-800 font-mono font-bold">{String(cv)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* Selected facilities */}
          {qaoa.selected_facilities?.length > 0 && (
            <div className="bg-white rounded-xl p-5 border border-emerald-100 shadow-xs">
              <h2 className="text-sm font-bold text-slate-900 mb-3">Selected Medical Camps (QAOA)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {qaoa.selected_facilities.map((f, i) => (
                  <motion.div
                    key={f.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-emerald-50/60 border border-emerald-200/70 rounded-lg p-3"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-emerald-700 text-xs font-bold">#{i+1}</span>
                      <span className="text-sm font-bold text-slate-900 truncate">{f.name}</span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Coverage: <span className="text-emerald-700 font-semibold font-mono">{(f.coverage_score * 100).toFixed(1)}%</span> · {f.lat.toFixed(4)}, {f.lng.toFixed(4)}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
