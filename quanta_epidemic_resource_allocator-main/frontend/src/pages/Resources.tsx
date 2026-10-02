import { useQuery } from '@tanstack/react-query';
import { Package, Users, Activity, AlertTriangle, TrendingUp, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import LoadingState from '../components/LoadingState';
import { fetchRisk, fetchFacilities } from '../lib/api';
import { formatNumber, riskBgClass, riskColor } from '../lib/utils';
import type { RiskArea } from '../lib/types';

// Derive resource needs from risk score and population
function calcResources(area: RiskArea) {
  const riskMultiplier = { LOW: 1, MEDIUM: 1.8, HIGH: 3.2, CRITICAL: 5.0 }[area.risk_level] ?? 1;
  const base = area.active_cases ?? 0;
  return {
    staff:      Math.round(base * 0.3 * riskMultiplier),
    beds:       Math.round(base * 2.5 * riskMultiplier),
    testKits:   Math.round(base * 8 * riskMultiplier),
    ppe:        Math.round(base * 12 * riskMultiplier),
    medication: Math.round(base * 5 * riskMultiplier),
  };
}

const CAPACITY_LIMITS = { staff: 50, beds: 200, testKits: 1500, ppe: 2000, medication: 800 };

export default function Resources() {
  const { data: riskData, isLoading } = useQuery({
    queryKey: ['risk'],
    queryFn: fetchRisk,
  });

  const { data: facilities } = useQuery({
    queryKey: ['facilities'],
    queryFn: fetchFacilities,
  });

  if (isLoading) return <LoadingState message="Loading resource allocation data..." />;
  const areas = riskData?.areas ?? [];

  const totalStaff   = areas.reduce((s, a) => s + calcResources(a).staff,      0);
  const totalBeds    = areas.reduce((s, a) => s + calcResources(a).beds,        0);
  const totalKits    = areas.reduce((s, a) => s + calcResources(a).testKits,    0);
  const totalPPE     = areas.reduce((s, a) => s + calcResources(a).ppe,         0);
  const totalCampCap = [...(facilities?.hospitals ?? []), ...(facilities?.existing_camps ?? [])]
    .reduce((s, f) => s + (f.capacity ?? 0), 0);

  const shortfall = Math.max(0, totalBeds - totalCampCap);

  return (
    <div className="space-y-5">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Users,        label: 'Medical Staff Needed', value: formatNumber(totalStaff),  color: 'text-blue-600',    border: 'border-blue-100 bg-white' },
          { icon: Activity,     label: 'Hospital Beds Needed', value: formatNumber(totalBeds),   color: 'text-amber-600',  border: 'border-amber-100 bg-white' },
          { icon: Package,      label: 'Test Kits Required',   value: formatNumber(totalKits),   color: 'text-emerald-700',  border: 'border-emerald-100 bg-white' },
          { icon: AlertTriangle,label: 'Bed Shortfall',        value: formatNumber(shortfall),   color: shortfall > 0 ? 'text-rose-600' : 'text-emerald-700', border: shortfall > 0 ? 'border-rose-200 bg-white' : 'border-emerald-200 bg-white' },
        ].map(({ icon: Icon, label, value, color, border }) => (
          <div key={label} className={`rounded-xl p-4 border ${border} shadow-xs`}>
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`w-4 h-4 ${color}`} />
              <span className="text-[11px] text-slate-500 font-medium">{label}</span>
            </div>
            <p className={`text-2xl font-bold font-mono ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Facility capacity summary */}
      <div className="bg-white rounded-xl p-4 border border-emerald-100 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900 mb-3">Facility Capacity Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="bg-blue-50/60 border border-blue-100/80 rounded-lg p-3">
            <p className="text-slate-500 mb-1 font-medium">Hospitals</p>
            <p className="text-blue-700 font-bold text-lg font-mono">{facilities?.hospitals.length ?? 0}</p>
            <p className="text-slate-500">{formatNumber(facilities?.hospitals.reduce((s, h) => s + h.capacity, 0) ?? 0)} beds</p>
          </div>
          <div className="bg-emerald-50/60 border border-emerald-100/80 rounded-lg p-3">
            <p className="text-slate-500 mb-1 font-medium">Field Camps</p>
            <p className="text-emerald-700 font-bold text-lg font-mono">{facilities?.existing_camps.length ?? 0}</p>
            <p className="text-slate-500">{formatNumber(facilities?.existing_camps.reduce((s, c) => s + c.capacity, 0) ?? 0)} capacity</p>
          </div>
          <div className="bg-amber-50/60 border border-amber-100/80 rounded-lg p-3">
            <p className="text-slate-500 mb-1 font-medium">Candidate Sites</p>
            <p className="text-amber-700 font-bold text-lg font-mono">{facilities?.candidates.length ?? 0}</p>
            <p className="text-slate-500">not yet deployed</p>
          </div>
          <div className={`${shortfall > 0 ? 'bg-rose-50/70 border-rose-200' : 'bg-emerald-50/70 border-emerald-200'} border rounded-lg p-3`}>
            <p className="text-slate-500 mb-1 font-medium">Total Capacity</p>
            <p className={`font-bold text-lg font-mono ${shortfall > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>{formatNumber(totalCampCap)}</p>
            <p className="text-slate-500 font-medium">{shortfall > 0 ? `⚠ ${formatNumber(shortfall)} shortfall` : '✓ Sufficient'}</p>
          </div>
        </div>
      </div>

      {/* Resource allocation table */}
      <div className="bg-white rounded-xl p-5 border border-emerald-100 shadow-xs">
        <div className="flex items-center gap-2 mb-4">
          <Package className="w-4 h-4 text-emerald-600" />
          <h2 className="text-sm font-bold text-slate-900">Resource Allocation by Area</h2>
          <span className="ml-auto text-[11px] text-slate-500 font-medium">{areas.length} areas</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500 font-semibold border-b border-slate-100">
                <th className="text-left pb-2 pr-4">Area</th>
                <th className="text-center pb-2 px-3">Risk</th>
                <th className="text-right pb-2 px-3">Cases</th>
                <th className="text-right pb-2 px-3">Staff</th>
                <th className="text-right pb-2 px-3">Beds</th>
                <th className="text-right pb-2 px-3">Test Kits</th>
                <th className="text-right pb-2 px-3">PPE</th>
                <th className="text-center pb-2 pl-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {areas
                .sort((a, b) => b.risk_score - a.risk_score)
                .map((area, i) => {
                  const res = calcResources(area);
                  const isShortage = res.beds > CAPACITY_LIMITS.beds;
                  return (
                    <motion.tr
                      key={area.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-emerald-50/40 transition-colors"
                    >
                      <td className="py-2.5 pr-4 text-slate-900 font-semibold">{area.name}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${riskBgClass(area.risk_level)}`}>
                          {area.risk_level}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold" style={{ color: riskColor(area.risk_level) }}>
                        {area.active_cases}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-medium text-blue-600">{formatNumber(res.staff)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-medium text-amber-600">{formatNumber(res.beds)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-medium text-emerald-700">{formatNumber(res.testKits)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">{formatNumber(res.ppe)}</td>
                      <td className="py-2.5 pl-3 text-center">
                        {isShortage ? (
                          <div className="flex items-center justify-center gap-1 text-rose-600 font-semibold">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span className="text-[10px]">Shortage</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1 text-emerald-600 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span className="text-[10px]">OK</span>
                          </div>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
            </tbody>
            {/* Totals row */}
            <tfoot>
              <tr className="border-t border-slate-200 text-slate-900 font-bold">
                <td className="pt-3 pr-4">TOTAL</td>
                <td />
                <td className="pt-3 px-3 text-right font-mono">{formatNumber(areas.reduce((s, a) => s + a.active_cases, 0))}</td>
                <td className="pt-3 px-3 text-right font-mono text-blue-600">{formatNumber(totalStaff)}</td>
                <td className="pt-3 px-3 text-right font-mono text-amber-600">{formatNumber(totalBeds)}</td>
                <td className="pt-3 px-3 text-right font-mono text-emerald-700">{formatNumber(totalKits)}</td>
                <td className="pt-3 px-3 text-right font-mono">{formatNumber(totalPPE)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white rounded-xl p-4 border border-emerald-100 shadow-xs">
        <p className="text-[11px] text-slate-500 leading-relaxed">
          <span className="text-emerald-700 font-semibold">Resource estimates</span> are derived from active case counts per area using risk-adjusted multipliers:
          LOW ×1.0, MEDIUM ×1.8, HIGH ×3.2, CRITICAL ×5.0.
          Staff ratio: 0.3 per case; Beds: 2.5 per case; Test kits: 8 per case; PPE sets: 12 per case.
          Shortage threshold based on local facility capacity limits.
        </p>
      </div>
    </div>
  );
}
