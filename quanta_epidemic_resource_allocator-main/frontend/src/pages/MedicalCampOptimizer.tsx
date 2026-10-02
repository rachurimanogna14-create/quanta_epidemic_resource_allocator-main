import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Layers, Map } from 'lucide-react';
import MapView from '../components/MapView';
import OptimizationPanel from '../components/OptimizationPanel';
import LoadingState from '../components/LoadingState';
import CampDetails from '../components/CampDetails';
import { fetchFacilities, fetchRisk } from '../lib/api';
import { useAppStore } from '../store/appStore';
import type { RiskArea } from '../lib/types';
import { riskBgClass, formatNumber } from '../lib/utils';
import { cn } from '../lib/utils';

const LAYER_LABELS: Record<string, string> = {
  riskHeatmap:     'Risk Heatmap',
  hospitals:       'Hospitals',
  existingCamps:   'Existing Camps',
  candidateSites:  'Candidate Sites',
  recommendedCamps:'Recommended Camps',
  serviceRadius:   'Service Radius',
};

export default function MedicalCampOptimizer() {
  const [selectedArea, setSelectedArea] = useState<RiskArea | null>(null);
  const { mapLayers, toggleMapLayer, recommendedCamps, quboResult } = useAppStore();

  const { data: facilities, isLoading: facLoading } = useQuery({
    queryKey: ['facilities'],
    queryFn: fetchFacilities,
  });

  const { data: riskData, isLoading: riskLoading } = useQuery({
    queryKey: ['risk'],
    queryFn: fetchRisk,
  });

  const isLoading = facLoading || riskLoading;
  if (isLoading) return <LoadingState message="Loading facilities and risk data..." />;

  const areas = riskData?.areas ?? [];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Map — 2/3 width */}
        <div className="xl:col-span-2 space-y-3">
          {/* Layer toggles */}
          <div className="bg-white rounded-xl p-3 border border-emerald-100 shadow-xs">
            <div className="flex items-center gap-2 mb-2.5">
              <Layers className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-800">Map Layers</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(mapLayers) as (keyof typeof mapLayers)[]).map((layer) => (
                <button
                  key={layer}
                  onClick={() => toggleMapLayer(layer)}
                  className={cn(
                    'text-[11px] px-2.5 py-1 rounded-full border transition-all font-medium',
                    mapLayers[layer]
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs'
                      : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/30'
                  )}
                >
                  {LAYER_LABELS[layer] ?? layer}
                </button>
              ))}
            </div>
          </div>

          {/* Map + detail panel */}
          <div className="flex gap-3">
            <MapView
              areas={areas}
              facilities={facilities ?? null}
              onAreaClick={setSelectedArea}
              recommendedCamps={recommendedCamps}
              height="480px"
              className="flex-1"
              showServiceRadius
            />
            <CampDetails area={selectedArea} onClose={() => setSelectedArea(null)} />
          </div>

          {/* Map legend */}
          <div className="bg-white rounded-xl p-3 border border-emerald-100 shadow-xs">
            <div className="flex flex-wrap gap-4 text-[11px]">
              {[
                { color: '#ef4444', label: 'Critical Risk' },
                { color: '#f97316', label: 'High Risk' },
                { color: '#f59e0b', label: 'Medium Risk' },
                { color: '#10b981', label: 'Low Risk' },
                { color: '#2563eb', label: 'Hospital' },
                { color: '#10b981', label: 'Existing Camp' },
                { color: '#94a3b8', label: 'Candidate Site' },
                { color: '#059669', label: 'Recommended' },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1.5 text-slate-600 font-medium">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Optimization panel + results */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Map className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900">Optimization Workflow</h2>
          </div>

          <OptimizationPanel />

          {/* Quick results summary */}
          {quboResult && (
            <div className="bg-white rounded-xl p-4 border border-emerald-100 shadow-xs">
              <h3 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">QUBO Summary</h3>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Matrix size</span>
                  <span className="text-slate-900 font-mono font-bold">{quboResult.qubo_stats.matrix_size}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Variables</span>
                  <span className="text-slate-900 font-mono font-bold">{quboResult.qubo_stats.num_variables}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Quadratic terms</span>
                  <span className="text-slate-900 font-mono font-bold">{quboResult.qubo_stats.num_quadratic_terms}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Matrix density</span>
                  <span className="text-slate-900 font-mono font-bold">{quboResult.qubo_stats.density?.toFixed(3)}</span>
                </div>
              </div>
            </div>
          )}

          {recommendedCamps.length > 0 && (
            <div className="bg-white rounded-xl p-4 border border-emerald-200 shadow-xs">
              <h3 className="text-xs font-bold text-emerald-800 mb-3 uppercase tracking-wider">Recommended Sites</h3>
              <div className="space-y-2">
                {recommendedCamps.map((camp, i) => (
                  <div key={camp.id} className="flex items-center gap-2 text-xs bg-emerald-50/50 p-2 rounded-lg border border-emerald-100/60">
                    <span className="text-emerald-700 font-bold w-4">#{i+1}</span>
                    <span className="text-slate-900 font-medium flex-1 truncate">{camp.name}</span>
                    <span className="text-emerald-700 font-mono font-bold">{(camp.coverage_score * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Risk area table */}
          <div className="bg-white rounded-xl p-4 border border-emerald-100 shadow-xs">
            <h3 className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wider">Risk Areas ({areas.length})</h3>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {areas.sort((a, b) => b.risk_score - a.risk_score).slice(0, 10).map((area) => (
                <button
                  key={area.id}
                  onClick={() => setSelectedArea(area)}
                  className="w-full flex items-center gap-2 text-[11px] hover:bg-emerald-50/50 rounded-lg px-2 py-1.5 transition-colors text-left"
                >
                  <span className={`text-[9px] px-1.5 py-0.5 rounded border ${riskBgClass(area.risk_level)} flex-shrink-0 font-semibold`}>
                    {area.risk_level}
                  </span>
                  <span className="text-slate-800 font-medium flex-1 truncate">{area.name}</span>
                  <span className="text-slate-500 font-mono">{formatNumber(area.population)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
