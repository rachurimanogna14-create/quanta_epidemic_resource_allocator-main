import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Sliders, Cpu, Atom, ChevronRight, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { generateQUBO, runQAOA, runClassical } from '../lib/api';
import { useAppStore } from '../store/appStore';
import type { QUBORequest, QUBOResult } from '../lib/types';
import { formatDuration } from '../lib/utils';
import { cn } from '../lib/utils';

type Step = 'qubo' | 'qaoa' | 'classical';

interface OptimizationPanelProps {
  onQUBOGenerated?: (result: QUBOResult) => void;
}

const DEFAULT_QUBO: QUBORequest = {
  num_camps: 5,
  risk_weight: 0.30,
  population_weight: 0.20,
  network_weight: 0.15,
  accessibility_weight: 0.10,
  distance_weight: 0.15,
  cost_weight: 0.10,
  service_radius_km: 3.0,
  penalty_strength: 20.0,
};

const WEIGHT_FIELDS: { key: keyof QUBORequest; label: string; max: number; step: number }[] = [
  { key: 'risk_weight',          label: 'Risk Weight',          max: 1, step: 0.05 },
  { key: 'population_weight',    label: 'Population Weight',    max: 1, step: 0.05 },
  { key: 'network_weight',       label: 'Network Weight',       max: 1, step: 0.05 },
  { key: 'accessibility_weight', label: 'Accessibility Weight', max: 1, step: 0.05 },
  { key: 'distance_weight',      label: 'Distance Penalty',     max: 1, step: 0.05 },
  { key: 'cost_weight',          label: 'Cost Penalty',         max: 1, step: 0.05 },
];

function StepBadge({ step, current, done }: { step: string; current: boolean; done: boolean }) {
  return (
    <div className={cn(
      'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border flex-shrink-0',
      done    ? 'bg-emerald-100 border-emerald-400 text-emerald-800' :
      current ? 'bg-emerald-50 border-emerald-400 text-emerald-700' :
                'bg-slate-100 border-slate-200 text-slate-400'
    )}>
      {done ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : step}
    </div>
  );
}

export default function OptimizationPanel({ onQUBOGenerated }: OptimizationPanelProps) {
  const [req, setReq] = useState<QUBORequest>(DEFAULT_QUBO);
  const [activeStep, setActiveStep] = useState<Step>('qubo');
  const [qaoa_p, setQaoaP] = useState(1);
  const [shots, setShots] = useState(1024);
  const [maxIter, setMaxIter] = useState(50);

  const { quboResult, qaoa, classical, setQuboResult, setQaoa, setClassical, setRecommendedCamps, addToast } = useAppStore();

  // QUBO mutation
  const quboMut = useMutation({
    mutationFn: generateQUBO,
    onSuccess: (data) => {
      setQuboResult(data);
      setActiveStep('qaoa');
      onQUBOGenerated?.(data);
      addToast({ type: 'success', title: 'QUBO Generated', message: `${data.size}×${data.size} matrix ready` });
    },
    onError: (e: Error) => addToast({ type: 'error', title: 'QUBO Failed', message: e.message }),
  });

  // QAOA mutation
  const qaoaMut = useMutation({
    mutationFn: () => runQAOA({
      qubo_matrix: quboResult!.qubo_matrix,
      num_camps: req.num_camps,
      p: qaoa_p,
      shots,
      max_iter: maxIter,
      candidate_details: quboResult!.candidates,
    }),
    onSuccess: (data) => {
      setQaoa(data);
      if (data.selected_facilities?.length) setRecommendedCamps(data.selected_facilities);
      addToast({ type: 'success', title: 'QAOA Complete', message: `${data.selected_facilities?.length ?? 0} camps selected in ${formatDuration(data.execution_time_seconds)}` });
    },
    onError: (e: Error) => addToast({ type: 'error', title: 'QAOA Failed', message: e.message }),
  });

  // Classical mutation
  const classicalMut = useMutation({
    mutationFn: () => runClassical({ qubo_result: quboResult!, num_camps: req.num_camps }),
    onSuccess: (data) => {
      setClassical(data);
      addToast({ type: 'info', title: 'Classical MILP Complete', message: `${data.selected_facilities?.length ?? 0} camps in ${formatDuration(data.execution_time_seconds)}` });
    },
    onError: (e: Error) => addToast({ type: 'error', title: 'Classical Failed', message: e.message }),
  });

  const updateField = <K extends keyof QUBORequest>(key: K, val: number) => {
    setReq((r) => ({ ...r, [key]: val }));
  };

  return (
    <div className="space-y-3">
      {/* Step 1: QUBO */}
      <div className="bg-white rounded-xl border border-emerald-100 shadow-xs overflow-hidden">
        <button
          className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50/70 hover:bg-emerald-50/50 transition-colors"
          onClick={() => setActiveStep(activeStep === 'qubo' ? 'qaoa' : 'qubo')}
        >
          <StepBadge step="1" current={activeStep === 'qubo'} done={!!quboResult} />
          <Sliders className="w-4 h-4 text-emerald-600" />
          <span className="text-sm font-bold text-slate-800">QUBO Formulation</span>
          {quboResult && (
            <span className="ml-auto text-xs text-emerald-700 font-mono font-medium">
              {quboResult.size}×{quboResult.size}
            </span>
          )}
          <ChevronRight className={cn('w-4 h-4 text-slate-400 transition-transform', activeStep === 'qubo' && 'rotate-90')} />
        </button>

        <AnimatePresence>
          {activeStep === 'qubo' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 pt-2 space-y-3">
                {/* Num camps & radius */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="text-xs text-slate-500 font-medium">Number of Camps</label>
                      <span className="text-xs font-mono font-bold text-emerald-700">{req.num_camps}</span>
                    </div>
                    <input type="range" min={1} max={15} step={1} value={req.num_camps}
                      onChange={(e) => updateField('num_camps', Number(e.target.value))} className="w-full" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="text-xs text-slate-500 font-medium">Radius (km)</label>
                      <span className="text-xs font-mono font-bold text-emerald-700">{req.service_radius_km.toFixed(1)}</span>
                    </div>
                    <input type="range" min={0.5} max={15} step={0.5} value={req.service_radius_km}
                      onChange={(e) => updateField('service_radius_km', Number(e.target.value))} className="w-full" />
                  </div>
                </div>

                {/* Penalty */}
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-xs text-slate-500 font-medium">Penalty Strength</label>
                    <span className="text-xs font-mono font-bold text-emerald-700">{req.penalty_strength.toFixed(0)}</span>
                  </div>
                  <input type="range" min={1} max={100} step={1} value={req.penalty_strength}
                    onChange={(e) => updateField('penalty_strength', Number(e.target.value))} className="w-full" />
                </div>

                {/* Objective weights */}
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider pt-1">Objective Weights</p>
                <div className="space-y-2">
                  {WEIGHT_FIELDS.map(({ key, label, max, step }) => (
                    <div key={key} className="flex items-center gap-2">
                      <label className="text-[11px] text-slate-600 font-medium w-32 flex-shrink-0">{label}</label>
                      <input type="range" min={0} max={max} step={step} value={req[key] as number}
                        onChange={(e) => updateField(key, Number(e.target.value))} className="flex-1" />
                      <span className="text-[11px] font-mono font-bold text-emerald-700 w-8 text-right">{(req[key] as number).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => quboMut.mutate(req)}
                  disabled={quboMut.isPending}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors disabled:opacity-60 mt-2 shadow-xs"
                >
                  {quboMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sliders className="w-4 h-4" />}
                  {quboMut.isPending ? 'Building QUBO...' : 'Generate QUBO Matrix'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Step 2: QAOA */}
      <div className={cn('bg-white rounded-xl border shadow-xs overflow-hidden', quboResult ? 'border-emerald-200' : 'border-slate-200 opacity-60')}>
        <button
          className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50/70 hover:bg-emerald-50/50 transition-colors"
          onClick={() => quboResult && setActiveStep('qaoa')}
          disabled={!quboResult}
        >
          <StepBadge step="2" current={activeStep === 'qaoa'} done={!!qaoa} />
          <Atom className="w-4 h-4 text-emerald-700" />
          <span className="text-sm font-bold text-slate-800">QAOA Execution</span>
          {qaoa && <span className="ml-auto text-xs text-emerald-700 font-semibold">{formatDuration(qaoa.execution_time_seconds)}</span>}
          <ChevronRight className={cn('w-4 h-4 text-slate-400 transition-transform', activeStep === 'qaoa' && 'rotate-90')} />
        </button>

        <AnimatePresence>
          {activeStep === 'qaoa' && quboResult && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 pt-2 space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'QAOA Layers (p)', val: qaoa_p, set: setQaoaP, min: 1, max: 3, step: 1 },
                    { label: 'Shots', val: shots, set: setShots, min: 256, max: 4096, step: 256 },
                    { label: 'Max Iterations', val: maxIter, set: setMaxIter, min: 10, max: 150, step: 10 },
                  ].map(({ label, val, set, min, max, step }) => (
                    <div key={label}>
                      <div className="flex justify-between mb-1">
                        <label className="text-[11px] text-slate-500 font-medium">{label}</label>
                        <span className="text-[11px] font-mono font-bold text-emerald-700">{val}</span>
                      </div>
                      <input type="range" min={min} max={max} step={step} value={val}
                        onChange={(e) => set(Number(e.target.value))} className="w-full" />
                    </div>
                  ))}
                </div>

                {/* Circuit preview */}
                <div className="bg-emerald-50/60 border border-emerald-100 rounded-lg p-3 text-[11px] text-slate-600 font-mono space-y-1">
                  <p className="text-emerald-800 font-bold mb-1">Circuit Preview</p>
                  <p>Qubits: <span className="text-slate-900 font-semibold">{quboResult.size}</span></p>
                  <p>QAOA layers: <span className="text-slate-900 font-semibold">{qaoa_p}</span></p>
                  <p>Shots: <span className="text-slate-900 font-semibold">{shots}</span></p>
                  <p className="text-amber-700 mt-1 font-sans">⚠ QAOA may take 30–120s for large circuits</p>
                </div>

                <button
                  onClick={() => qaoaMut.mutate()}
                  disabled={qaoaMut.isPending}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors disabled:opacity-60 shadow-xs"
                >
                  {qaoaMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Atom className="w-4 h-4" />}
                  {qaoaMut.isPending ? 'Running QAOA via Qiskit Aer...' : 'Run QAOA'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Step 3: Classical MILP */}
      <div className={cn('bg-white rounded-xl border shadow-xs overflow-hidden', quboResult ? 'border-emerald-200' : 'border-slate-200 opacity-60')}>
        <button
          className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50/70 hover:bg-emerald-50/50 transition-colors"
          onClick={() => quboResult && setActiveStep('classical')}
          disabled={!quboResult}
        >
          <StepBadge step="3" current={activeStep === 'classical'} done={!!classical} />
          <Cpu className="w-4 h-4 text-emerald-700" />
          <span className="text-sm font-bold text-slate-800">Classical MILP</span>
          {classical && <span className="ml-auto text-xs text-emerald-700 font-semibold">{formatDuration(classical.execution_time_seconds)}</span>}
          <ChevronRight className={cn('w-4 h-4 text-slate-400 transition-transform', activeStep === 'classical' && 'rotate-90')} />
        </button>

        <AnimatePresence>
          {activeStep === 'classical' && quboResult && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 pt-2 space-y-3">
                <div className="bg-emerald-50/60 border border-emerald-100 rounded-lg p-3 text-[11px] text-slate-600">
                  <p className="text-emerald-800 font-bold mb-1">MILP Solver (PuLP)</p>
                  <p>Uses the same cost objective as QUBO, solved to optimality via linear programming relaxation. Provides a classical baseline for quantum comparison.</p>
                </div>

                {classicalMut.isError && (
                  <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Solver failed — PuLP may not be installed</span>
                  </div>
                )}

                <button
                  onClick={() => classicalMut.mutate()}
                  disabled={classicalMut.isPending}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors disabled:opacity-60 shadow-xs"
                >
                  {classicalMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cpu className="w-4 h-4" />}
                  {classicalMut.isPending ? 'Running MILP...' : 'Run Classical MILP'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
