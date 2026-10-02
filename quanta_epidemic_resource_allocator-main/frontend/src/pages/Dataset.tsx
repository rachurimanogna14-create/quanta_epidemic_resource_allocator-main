import { useQuery } from '@tanstack/react-query';
import { Database, CheckCircle2, AlertTriangle, FileText, GitBranch, Cpu, Network, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';
import LoadingState from '../components/LoadingState';
import { fetchOverview } from '../lib/api';
import { formatNumber } from '../lib/utils';

const PIPELINE_STEPS = [
  {
    icon: Database,
    title: 'Raw Data Ingestion',
    desc: 'Parse SocioPatterns KONECT edge list format',
    color: 'text-emerald-700',
    border: 'border-emerald-200',
    bg: 'bg-emerald-50/70',
  },
  {
    icon: GitBranch,
    title: 'Graph Construction',
    desc: 'Build weighted NetworkX undirected graph',
    color: 'text-teal-700',
    border: 'border-teal-200',
    bg: 'bg-teal-50/70',
  },
  {
    icon: Network,
    title: 'Network Analysis',
    desc: 'Compute betweenness, eigenvector, community detection',
    color: 'text-blue-700',
    border: 'border-blue-200',
    bg: 'bg-blue-50/70',
  },
  {
    icon: BarChart3,
    title: 'Risk Modelling',
    desc: 'Score areas by contact intensity, density, and growth',
    color: 'text-amber-700',
    border: 'border-amber-200',
    bg: 'bg-amber-50/70',
  },
  {
    icon: Cpu,
    title: 'QUBO Formulation',
    desc: 'Encode optimization problem as binary quadratic',
    color: 'text-emerald-800',
    border: 'border-emerald-300',
    bg: 'bg-emerald-100/60',
  },
];

export default function Dataset() {
  const { data: overview, isLoading } = useQuery({
    queryKey: ['overview'],
    queryFn: fetchOverview,
    staleTime: 120_000,
  });

  if (isLoading) return <LoadingState message="Loading dataset information..." />;

  const ds = overview?.dataset;
  const isReal = ds?.source === 'real_dataset';

  return (
    <div className="space-y-6">
      {/* Dataset header */}
      <div className="bg-white rounded-xl p-5 border border-emerald-100 shadow-xs">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Database className="w-5 h-5 text-emerald-600" />
              <h2 className="text-lg font-bold text-slate-900">{ds?.name ?? 'Dataset'}</h2>
              <span className={`text-[11px] px-2 py-0.5 rounded-full border font-semibold ${isReal ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                {isReal ? '✓ Real Dataset' : '⚠ Synthetic Fallback'}
              </span>
            </div>
            <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">{ds?.description}</p>
          </div>
          {isReal ? (
            <CheckCircle2 className="w-8 h-8 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-8 h-8 text-amber-600 flex-shrink-0" />
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
        {[
          { label: 'Raw Events', value: formatNumber(ds?.raw_events), color: 'text-emerald-700' },
          { label: 'Individuals', value: formatNumber(ds?.individuals), color: 'text-teal-700' },
          { label: 'Contact Edges', value: formatNumber(ds?.edges), color: 'text-emerald-600' },
          { label: 'Time Range', value: `${ds?.time_range_hours}h`, color: 'text-amber-600' },
          { label: 'Missing Values', value: ds?.missing_values ?? 0, color: 'text-amber-700' },
          { label: 'Status', value: ds?.processing_status?.replace('_', ' ') ?? '—', color: 'text-blue-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl p-3 border border-emerald-100 shadow-2xs">
            <p className="text-[11px] text-slate-500 mb-1 font-medium">{label}</p>
            <p className={`text-lg font-bold font-mono ${color} truncate`}>{String(value)}</p>
          </div>
        ))}
      </div>

      {/* Data Pipeline */}
      <div className="bg-white rounded-xl p-5 border border-emerald-100 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900 mb-5">Data Processing Pipeline</h2>
        <div className="relative">
          {/* Connector line */}
          <div className="absolute left-5 top-6 bottom-6 w-0.5 bg-gradient-to-b from-emerald-400 via-teal-400 to-emerald-600 hidden md:block" />

          <div className="space-y-4">
            {PIPELINE_STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className={`relative flex items-start gap-4 pl-0 md:pl-12`}
                >
                  {/* Step icon */}
                  <div className={`absolute left-0 w-10 h-10 rounded-xl ${step.bg} border ${step.border} flex items-center justify-center flex-shrink-0 hidden md:flex`}>
                    <Icon className={`w-5 h-5 ${step.color}`} />
                  </div>

                  <div className={`flex-1 ${step.bg} border ${step.border} rounded-xl p-4 shadow-2xs`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`w-4 h-4 ${step.color} md:hidden`} />
                      <span className={`text-sm font-bold ${step.color}`}>
                        {i + 1}. {step.title}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">{step.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Source information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl p-5 border border-emerald-100 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">Dataset Source</h3>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Source</span>
              <span className="text-slate-900 font-mono font-bold">{ds?.source}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">File</span>
              <span className="text-emerald-700 font-mono font-semibold truncate ml-4">{ds?.file}</span>
            </div>
            {ds?.columns && (
              <div>
                <span className="text-slate-500 font-medium">Columns</span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {ds.columns.map((col) => (
                    <span key={col} className="text-[10px] font-mono bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-emerald-800 font-semibold">
                      {col}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-emerald-100 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-3">About the Dataset</h3>
          <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
            <p>
              The <span className="text-emerald-700 font-semibold">SocioPatterns Infectious</span> dataset records face-to-face contact events between 410 museum visitors over 7.9 hours at the <em>INFECTIOUS: Stay Away</em> exhibition, Science Gallery Dublin (2009).
            </p>
            <p>
              Contact proximity was measured using RFID badge sensors with ≈20s resolution. Multiple contact events between the same pair are aggregated into edge weights.
            </p>
            <p className="text-slate-500">
              Source: KONECT — The Koblenz Network Collection<br />
              <span className="text-emerald-700/80 font-mono">http://konect.cc/networks/sociopatterns-infectious/</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
