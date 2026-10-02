import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Play, Pause, RotateCcw, Sliders } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
import LoadingState from '../components/LoadingState';
import { runEpidemicSimulation } from '../lib/api';
import { formatNumber } from '../lib/utils';
import type { SimulationParams, SEIRResult } from '../lib/types';

const DEFAULT_PARAMS: SimulationParams = {
  population: 10000,
  initial_infected: 10,
  initial_exposed: 20,
  transmission_rate: 0.3,
  contact_intensity: 1.0,
  incubation_days: 5.0,
  recovery_days: 10.0,
  intervention_level: 0.0,
  simulation_days: 160,
};

const SLIDER_CONFIG = [
  { key: 'population',         label: 'Population',              min: 100,  max: 100000, step: 100,  format: (v: number) => formatNumber(v) },
  { key: 'initial_infected',   label: 'Initial Infected',        min: 1,    max: 500,    step: 1,    format: (v: number) => String(v) },
  { key: 'transmission_rate',  label: 'Transmission Rate (β)',   min: 0.01, max: 1.0,    step: 0.01, format: (v: number) => v.toFixed(2) },
  { key: 'contact_intensity',  label: 'Contact Intensity',       min: 0.1,  max: 5.0,    step: 0.1,  format: (v: number) => v.toFixed(1) },
  { key: 'incubation_days',    label: 'Incubation Period (days)',min: 1,    max: 21,     step: 0.5,  format: (v: number) => v.toFixed(1) },
  { key: 'recovery_days',      label: 'Recovery Period (days)',  min: 1,    max: 30,     step: 0.5,  format: (v: number) => v.toFixed(1) },
  { key: 'intervention_level', label: 'Intervention Level',      min: 0,    max: 1.0,    step: 0.05, format: (v: number) => `${(v * 100).toFixed(0)}%` },
  { key: 'simulation_days',    label: 'Simulation Days',         min: 30,   max: 365,    step: 5,    format: (v: number) => String(v) },
] as const;

export default function EpidemicModel() {
  const [params, setParams] = useState<SimulationParams>(DEFAULT_PARAMS);
  const [result, setResult] = useState<SEIRResult | null>(null);

  const { mutate: runSim, isPending } = useMutation({
    mutationFn: runEpidemicSimulation,
    onSuccess: (data) => setResult(data),
  });

  const handleRun = useCallback(() => runSim(params), [params, runSim]);
  const handleReset = useCallback(() => {
    setParams(DEFAULT_PARAMS);
    setResult(null);
  }, []);

  // Build chart data
  const chartData = result
    ? result.time_series.days.map((day, i) => ({
        day: Math.round(day),
        S: Math.round(result.time_series.susceptible[i]),
        E: Math.round(result.time_series.exposed[i]),
        I: Math.round(result.time_series.infected[i]),
        R: Math.round(result.time_series.recovered[i]),
      }))
    : [];

  const peakDay = result?.metrics.peak_day ?? 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Parameter Controls */}
        <div className="glass rounded-xl p-5 border border-emerald-100 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <Sliders className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900">SEIR Parameters</h2>
          </div>

          <div className="space-y-4">
            {SLIDER_CONFIG.map(({ key, label, min, max, step, format }) => (
              <div key={key}>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs text-slate-600 font-medium">{label}</label>
                  <span className="text-xs font-mono font-bold text-emerald-700">{format(params[key] as number)}</span>
                </div>
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={params[key] as number}
                  onChange={(e) =>
                    setParams((p) => ({ ...p, [key]: Number(e.target.value) }))
                  }
                  className="w-full"
                />
              </div>
            ))}
          </div>

          <div className="flex gap-2 mt-5">
            <button
              onClick={handleRun}
              disabled={isPending}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors disabled:opacity-60 shadow-xs"
            >
              {isPending ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Running...</>
              ) : (
                <><Play className="w-4 h-4" /> Run Simulation</>
              )}
            </button>
            <button
              onClick={handleReset}
              className="p-2 rounded-lg bg-slate-50 hover:bg-emerald-50 text-slate-500 hover:text-emerald-700 border border-slate-200 transition-colors"
              title="Reset Parameters"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Chart + Metrics */}
        <div className="xl:col-span-2 space-y-4">
          {/* SEIR Chart */}
          <div className="glass rounded-xl p-5 border border-emerald-100 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 mb-4">SEIR Compartment Dynamics</h2>
            {isPending ? (
              <LoadingState message="Running SEIR simulation..." />
            ) : result ? (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#64748b' }} label={{ value: 'Days', position: 'insideBottom', offset: -2, fontSize: 10, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                  <Tooltip
                    contentStyle={{ background: '#ffffff', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, fontSize: 11, color: '#0f172a' }}
                    formatter={(v: number) => [formatNumber(v), '']}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <ReferenceLine x={Math.round(peakDay)} stroke="#ef4444" strokeDasharray="4 2" label={{ value: 'Peak', fontSize: 9, fill: '#ef4444' }} />
                  <Line type="monotone" dataKey="S" stroke="#2563eb" strokeWidth={2} dot={false} name="Susceptible" />
                  <Line type="monotone" dataKey="E" stroke="#d97706" strokeWidth={2} dot={false} name="Exposed" />
                  <Line type="monotone" dataKey="I" stroke="#dc2626" strokeWidth={2.5} dot={false} name="Infected" />
                  <Line type="monotone" dataKey="R" stroke="#059669" strokeWidth={2} dot={false} name="Recovered" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
                <div className="text-center">
                  <Play className="w-10 h-10 mx-auto mb-3 opacity-30 text-emerald-600" />
                  <p>Click "Run Simulation" to generate SEIR curves</p>
                </div>
              </div>
            )}
          </div>

          {/* Metrics row */}
          {result && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'R Effective', value: result.metrics.R_effective.toFixed(3), color: result.metrics.R_effective > 1 ? 'text-rose-600' : 'text-emerald-600', sub: result.metrics.R_effective > 1 ? 'Epidemic growing' : 'Epidemic declining' },
                { label: 'Peak Infected', value: formatNumber(result.metrics.peak_infected), color: 'text-amber-600', sub: `Day ${result.metrics.peak_day.toFixed(0)}` },
                { label: 'Attack Rate', value: `${(result.metrics.attack_rate * 100).toFixed(1)}%`, color: 'text-amber-700', sub: 'Total population infected' },
                { label: 'Herd Immunity', value: result.metrics.herd_immunity_threshold > 0 ? `${(result.metrics.herd_immunity_threshold * 100).toFixed(1)}%` : 'N/A', color: 'text-emerald-700', sub: 'Required threshold' },
              ].map(({ label, value, color, sub }) => (
                <div key={label} className="bg-white rounded-lg p-4 border border-emerald-100 shadow-2xs">
                  <p className="text-xs text-slate-500 mb-1">{label}</p>
                  <p className={`text-xl font-bold font-mono ${color}`}>{value}</p>
                  <p className="text-[10px] text-slate-500 mt-1">{sub}</p>
                </div>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      {/* Model Description */}
      <div className="glass rounded-xl p-4 border border-emerald-100 shadow-xs">
        <h3 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">SEIR Model — Mathematical Formulation</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600">
          <div className="space-y-1 font-mono text-[11px] bg-emerald-50/60 border border-emerald-100/60 rounded-lg p-3">
            <p className="text-emerald-700 font-semibold">dS/dt = -β·S·I/N</p>
            <p className="text-amber-700 font-semibold">dE/dt = β·S·I/N - σ·E</p>
            <p className="text-rose-600 font-semibold">dI/dt = σ·E - γ·I</p>
            <p className="text-teal-700 font-semibold">dR/dt = γ·I</p>
          </div>
          <div className="space-y-1">
            <p><span className="text-emerald-700 font-mono font-bold">β</span> = transmission_rate × contact_intensity × (1 - 0.8 × intervention)</p>
            <p><span className="text-amber-700 font-mono font-bold">σ</span> = 1 / incubation_days</p>
            <p><span className="text-rose-600 font-mono font-bold">γ</span> = 1 / recovery_days</p>
            <p><span className="text-slate-800 font-mono font-bold">R₀</span> = β / γ (basic reproduction number)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
