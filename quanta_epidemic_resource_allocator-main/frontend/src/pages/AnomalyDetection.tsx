import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Sliders, RefreshCw, Activity, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts';
import LoadingState from '../components/LoadingState';
import { fetchAnomalies } from '../lib/api';
import { formatNumber } from '../lib/utils';
import type { AnomalyPoint } from '../lib/types';

const CustomDot = (props: { cx?: number; cy?: number; payload?: AnomalyPoint }) => {
  const { cx = 0, cy = 0, payload } = props;
  if (!payload) return null;
  if (payload.is_anomaly) {
    return (
      <g>
        <circle cx={cx} cy={cy} r={7} fill="#dc2626" fillOpacity={0.8} />
        <circle cx={cx} cy={cy} r={11} fill="none" stroke="#dc2626" strokeWidth={1.5} strokeOpacity={0.4} />
      </g>
    );
  }
  return <circle cx={cx} cy={cy} r={4.5} fill="#059669" fillOpacity={0.7} />;
};

const CustomTooltip = ({ active, payload }: {
  active?: boolean;
  payload?: Array<{ payload: AnomalyPoint }>;
}) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-emerald-200/90 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className={`font-bold mb-1 ${d.is_anomaly ? 'text-rose-600' : 'text-emerald-700'}`}>
        {d.is_anomaly ? '⚠ ANOMALY' : 'Normal'}
      </p>
      <div className="space-y-0.5 text-slate-600">
        <p>Hour: <span className="text-slate-900 font-mono font-semibold">{d.hour}</span></p>
        <p>Contacts: <span className="text-slate-900 font-mono font-semibold">{d.contacts}</span></p>
        <p>Baseline: <span className="text-slate-900 font-mono font-semibold">{d.baseline?.toFixed(1)}</span></p>
        <p>Z-score: <span className={`font-mono font-bold ${d.is_anomaly ? 'text-rose-600' : 'text-slate-800'}`}>{d.z_score?.toFixed(3)}</span></p>
        {d.affected_area && <p>Area: <span className="text-emerald-700 font-semibold">{d.affected_area}</span></p>}
        {d.severity && <p>Severity: <span className="text-amber-700 font-semibold">{d.severity}</span></p>}
      </div>
    </div>
  );
};

export default function AnomalyDetection() {
  const [zThreshold, setZThreshold] = useState(2.0);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['anomalies', zThreshold],
    queryFn: () => fetchAnomalies(zThreshold),
    staleTime: 60_000,
  });

  if (isLoading) return <LoadingState message="Detecting contact anomalies..." />;

  const normalPoints = data?.normal_points ?? [];
  const anomalyPoints = data?.anomalies ?? [];
  const summary = data?.summary;

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="bg-white rounded-xl p-4 border border-emerald-100 shadow-xs flex flex-wrap items-center gap-5">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-emerald-600" />
          <span className="text-sm font-bold text-slate-900">Detection Threshold</span>
        </div>
        <div className="flex items-center gap-3 flex-1">
          <label className="text-xs text-slate-600 font-medium">Z-Score Threshold</label>
          <input
            type="range" min={1.0} max={4.0} step={0.1} value={zThreshold}
            onChange={(e) => setZThreshold(Number(e.target.value))}
            className="w-40"
          />
          <span className="text-sm font-mono font-bold text-emerald-700 w-8">{zThreshold.toFixed(1)}</span>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs border border-emerald-200 transition-colors font-medium shadow-2xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Summary KPIs */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Time Windows', value: summary.total_windows, color: 'text-emerald-700' },
            { label: 'Anomalies', value: summary.anomaly_count, color: 'text-rose-600' },
            { label: 'Anomaly Rate', value: `${(summary.anomaly_rate * 100).toFixed(1)}%`, color: 'text-amber-600' },
            { label: 'Avg Contacts', value: summary.avg_contacts?.toFixed(1), color: 'text-slate-800' },
            { label: 'Std Deviation', value: summary.std_deviation?.toFixed(1), color: 'text-amber-700' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl p-3 border border-emerald-100 shadow-2xs">
              <p className="text-[11px] text-slate-500 mb-1 font-medium">{label}</p>
              <p className={`text-xl font-bold font-mono ${color}`}>{String(value ?? '—')}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Scatter plot */}
        <div className="xl:col-span-2 bg-white rounded-xl p-5 border border-emerald-100 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900">Contact Density Scatter — Time Windows</h2>
          </div>

          <ResponsiveContainer width="100%" height={340}>
            <ScatterChart margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 0, 0, 0.06)" />
              <XAxis
                dataKey="hour"
                type="number"
                name="Hour"
                tick={{ fontSize: 10, fill: '#64748b' }}
                label={{ value: 'Hour of Day', position: 'insideBottom', offset: -4, fontSize: 10, fill: '#64748b' }}
              />
              <YAxis
                dataKey="contacts"
                type="number"
                name="Contacts"
                tick={{ fontSize: 10, fill: '#64748b' }}
                label={{ value: 'Contact Count', angle: -90, position: 'insideLeft', offset: 10, fontSize: 10, fill: '#64748b' }}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />

              {/* Baseline reference */}
              {summary && (
                <ReferenceLine
                  y={summary.avg_contacts}
                  stroke="#059669"
                  strokeDasharray="4 3"
                  strokeWidth={1.5}
                  label={{ value: 'Baseline', position: 'right', fontSize: 9, fill: '#059669' }}
                />
              )}

              {/* Normal points */}
              <Scatter
                name="Normal"
                data={normalPoints}
                fill="#059669"
                shape={<CustomDot />}
              />

              {/* Anomaly points */}
              <Scatter
                name="Anomaly"
                data={anomalyPoints}
                fill="#dc2626"
                shape={<CustomDot />}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Anomaly detail list */}
        <div className="space-y-3">
          <div className="bg-white rounded-xl p-4 border border-rose-100 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              Detected Anomalies ({anomalyPoints.length})
            </h3>

            {anomalyPoints.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">
                No anomalies at Z ≥ {zThreshold.toFixed(1)}
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {anomalyPoints.map((a, i) => (
                  <motion.div
                    key={`${a.window}-${i}`}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-rose-50/70 border border-rose-100 rounded-lg p-2.5"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-rose-700 font-bold">Hour {a.hour}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${a.severity === 'HIGH' ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
                        {a.severity ?? 'ANOMALY'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 space-y-0.5">
                      <p>Contacts: <span className="text-slate-900 font-mono font-bold">{a.contacts}</span></p>
                      <p>Z-score: <span className="text-rose-600 font-mono font-bold">{a.z_score?.toFixed(3)}</span></p>
                      {a.affected_area && <p>Area: <span className="text-emerald-700 font-medium">{a.affected_area}</span></p>}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Z-score distribution */}
          {data?.all_points && (
            <div className="bg-white rounded-xl p-4 border border-emerald-100 shadow-xs">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Statistics</h3>
              <div className="space-y-1.5 text-xs">
                {[
                  { label: 'Total Windows', value: summary?.total_windows },
                  { label: 'Max Contacts', value: summary?.max_contacts },
                  { label: 'Z Threshold', value: zThreshold.toFixed(1) },
                  { label: 'Normal Points', value: normalPoints.length },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-slate-500">{label}</span>
                    <span className="text-slate-900 font-mono font-bold">{String(value ?? '—')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
