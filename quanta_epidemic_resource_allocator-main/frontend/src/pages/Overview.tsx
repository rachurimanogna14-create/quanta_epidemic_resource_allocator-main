import { useQuery } from '@tanstack/react-query';
import { Users, Activity, Network, AlertTriangle, Cpu, MapPin, TrendingUp, Radio } from 'lucide-react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import KPICard from '../components/KPICard';
import AlertPanel from '../components/AlertPanel';
import LoadingState from '../components/LoadingState';
import MapView from '../components/MapView';
import CampDetails from '../components/CampDetails';
import { fetchOverview, fetchFacilities } from '../lib/api';
import { formatNumber, riskColor, riskBgClass } from '../lib/utils';
import type { RiskArea } from '../lib/types';
import { useState } from 'react';

export default function Overview() {
  const [selectedArea, setSelectedArea] = useState<RiskArea | null>(null);

  const { data: overview, isLoading, error } = useQuery({
    queryKey: ['overview'],
    queryFn: fetchOverview,
    refetchInterval: 60_000,
  });

  const { data: facilities } = useQuery({
    queryKey: ['facilities'],
    queryFn: fetchFacilities,
  });

  if (isLoading) return <LoadingState message="Loading epidemic intelligence..." />;

  if (error || !overview) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center bg-white border border-rose-200 rounded-2xl p-8 shadow-sm max-w-md">
          <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <p className="text-slate-900 font-bold text-lg">Backend Unavailable</p>
          <p className="text-slate-600 text-sm mt-1">Start the FastAPI server on port 8000</p>
          <code className="text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded border border-emerald-200 mt-3 inline-block font-mono">
            uvicorn main:app --reload --port 8000
          </code>
        </div>
      </div>
    );
  }

  const { kpis, alerts, top_risk_areas, risk_distribution, network_summary, superspreaders, dataset } = overview;

  // Build chart data from risk distribution
  const riskPieData = [
    { name: 'Critical', value: risk_distribution.critical, color: '#ef4444' },
    { name: 'High',     value: risk_distribution.high,     color: '#f97316' },
    { name: 'Medium',   value: risk_distribution.medium,   color: '#f59e0b' },
    { name: 'Low',      value: risk_distribution.low,      color: '#10b981' },
  ];

  // Synthetic trend data for quick chart
  const trendData = Array.from({ length: 14 }, (_, i) => ({
    day: `D-${13 - i}`,
    cases: Math.round(kpis.active_cases * (0.5 + 0.5 * Math.sin(i * 0.4 + 1)) * (0.8 + Math.random() * 0.4)),
  }));

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard title="Population at Risk" value={formatNumber(kpis.population_at_risk)} icon={Users} color="red" subtitle="HIGH + CRITICAL zones" />
        <KPICard title="Active Cases" value={formatNumber(kpis.active_cases)} icon={Activity} color="orange" subtitle="Current estimate" />
        <KPICard title="Network Contacts" value={formatNumber(kpis.network_connections)} icon={Network} color="cyan" subtitle="Unique contact edges" />
        <KPICard title="High-Risk Areas" value={kpis.high_risk_areas} icon={AlertTriangle} color="yellow" subtitle="HIGH + CRITICAL zones" />
        <KPICard title="R Effective" value={kpis.r_effective.toFixed(2)} icon={TrendingUp} color={kpis.r_effective > 1 ? 'red' : 'green'} subtitle={kpis.r_effective > 1 ? 'Above threshold' : 'Below threshold'} />
        <KPICard title="Recommended Camps" value={kpis.recommended_camps} icon={MapPin} color="green" subtitle="Optimize to place" />
      </div>

      {/* Main content: Map + Alerts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Map — takes 2/3 width */}
        <div className="xl:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Live Epidemic Map</h2>
            <span className="text-xs text-slate-500">Synthetic geography · Dublin, IE</span>
          </div>
          <div className="flex gap-3">
            <MapView
              areas={top_risk_areas as RiskArea[]}
              facilities={facilities ?? null}
              onAreaClick={setSelectedArea}
              height="380px"
              className="flex-1"
            />
            <CampDetails area={selectedArea} onClose={() => setSelectedArea(null)} />
          </div>
        </div>

        {/* Right column: Alerts + Risk dist */}
        <div className="space-y-4">
          <div className="glass rounded-xl p-4 border border-emerald-100 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <Radio className="w-4 h-4 text-rose-500 animate-pulse" />
              <h2 className="text-sm font-bold text-slate-900">Emergency Alerts</h2>
              <span className="ml-auto text-xs bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full font-bold">
                {alerts.length}
              </span>
            </div>
            <AlertPanel alerts={alerts} maxVisible={4} />
          </div>

          {/* Risk Distribution */}
          <div className="glass rounded-xl p-4 border border-emerald-100 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 mb-3">Risk Distribution</h2>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={100}>
                <PieChart>
                  <Pie data={riskPieData} cx="50%" cy="50%" innerRadius={28} outerRadius={45} dataKey="value" paddingAngle={2}>
                    {riskPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5">
                {riskPieData.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                      <span className="text-slate-600 font-medium">{d.name}</span>
                    </div>
                    <span className="text-slate-900 font-mono font-bold">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom row: Trend + Network Intelligence + Super-spreaders */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Outbreak Trend */}
        <div className="glass rounded-xl p-4 border border-emerald-100 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900 mb-3">Outbreak Trend (14d)</h2>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="caseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#64748b' }} tickLine={false} axisLine={false} />
              <YAxis hide />
              <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, fontSize: 11, color: '#0f172a' }} />
              <Area type="monotone" dataKey="cases" stroke="#059669" strokeWidth={2} fill="url(#caseGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Network Intelligence */}
        <div className="glass rounded-xl p-4 border border-emerald-100 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900 mb-3">Network Intelligence</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Individuals', value: formatNumber(network_summary.nodes), icon: Users },
              { label: 'Contact Edges', value: formatNumber(network_summary.edges), icon: Network },
              { label: 'Communities', value: network_summary.communities, icon: Cpu },
              { label: 'Avg Degree', value: network_summary.avg_degree?.toFixed(1), icon: Activity },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="bg-emerald-50/60 border border-emerald-100/60 rounded-lg p-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className="w-3 h-3 text-emerald-700" />
                  <span className="text-[10px] text-slate-500 font-medium">{label}</span>
                </div>
                <span className="text-sm font-bold text-slate-900">{value}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100">
            <p className="text-xs text-slate-600">Dataset: <span className="text-emerald-700 font-semibold">{dataset.name}</span></p>
            <p className="text-[10px] text-slate-500 mt-0.5">{dataset.source === 'real_dataset' ? '✓ Real dataset loaded' : '⚠ Synthetic fallback'}</p>
          </div>
        </div>

        {/* Super-spreaders */}
        <div className="glass rounded-xl p-4 border border-emerald-100 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900 mb-3">Super-Spreader Candidates</h2>
          <div className="space-y-2">
            {superspreaders.slice(0, 5).map((ss, i) => (
              <motion.div key={ss.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 w-4 text-right font-mono">#{i + 1}</span>
                <span className="text-slate-900 font-medium flex-1">Node {ss.id}</span>
                <span className="text-slate-500 font-mono">{ss.degree} contacts</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] border ${riskBgClass(ss.risk_level)}`}>{ss.risk_level}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Risk Areas Table */}
      <div className="glass rounded-xl p-4 border border-emerald-100 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900 mb-3">High-Risk Areas</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500 font-semibold border-b border-slate-100">
                <th className="text-left pb-2 pr-4">Area</th>
                <th className="text-right pb-2 pr-4">Population</th>
                <th className="text-right pb-2 pr-4">Active Cases</th>
                <th className="text-right pb-2 pr-4">Risk Score</th>
                <th className="text-center pb-2">Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {top_risk_areas.map((area) => (
                <tr key={area.id} className="hover:bg-emerald-50/40 cursor-pointer transition-colors" onClick={() => setSelectedArea(area as RiskArea)}>
                  <td className="py-2.5 pr-4 text-slate-900 font-semibold">{area.name}</td>
                  <td className="py-2.5 pr-4 text-right text-slate-600 font-mono">{formatNumber(area.population)}</td>
                  <td className="py-2.5 pr-4 text-right text-amber-600 font-mono font-semibold">{formatNumber(area.active_cases)}</td>
                  <td className="py-2.5 pr-4 text-right font-mono font-bold" style={{ color: riskColor(area.risk_level) }}>{area.risk_score.toFixed(3)}</td>
                  <td className="py-2.5 text-center">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${riskBgClass(area.risk_level)}`}>{area.risk_level}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
