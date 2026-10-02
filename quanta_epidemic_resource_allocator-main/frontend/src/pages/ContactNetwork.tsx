import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Network, Users, Sliders, AlertTriangle, ZoomIn, ZoomOut } from 'lucide-react';
import { motion } from 'framer-motion';
import NetworkGraph from '../components/NetworkGraph';
import LoadingState from '../components/LoadingState';
import { fetchNetwork, fetchSuperspreaders } from '../lib/api';
import { formatNumber, riskBgClass, riskColor } from '../lib/utils';
import type { NetworkNode } from '../lib/types';

export default function ContactNetwork() {
  const [maxEdges, setMaxEdges] = useState(300);
  const [minWeight, setMinWeight] = useState(0);
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);

  const { data: network, isLoading } = useQuery({
    queryKey: ['network', maxEdges, minWeight],
    queryFn: () => fetchNetwork(maxEdges, minWeight),
  });

  const { data: superspreaders } = useQuery({
    queryKey: ['superspreaders'],
    queryFn: () => fetchSuperspreaders(20),
  });

  if (isLoading) return <LoadingState message="Loading contact network..." />;
  if (!network) return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center bg-white border border-rose-200 rounded-2xl p-8 shadow-sm">
        <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <p className="text-slate-900 font-bold">Network data unavailable</p>
      </div>
    </div>
  );

  const { summary, nodes, edges, communities } = network;

  // Community color map for legend
  const communityColors = [
    '#059669', '#7c3aed', '#10b981', '#d97706', '#dc2626',
    '#2563eb', '#db2777', '#0d9488', '#ea580c', '#9333ea',
  ];

  return (
    <div className="space-y-5">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Individuals',    value: formatNumber(summary.nodes),           color: 'text-emerald-700' },
          { label: 'Contact Edges',  value: formatNumber(summary.edges),           color: 'text-teal-700' },
          { label: 'Communities',    value: summary.communities,                    color: 'text-emerald-600' },
          { label: 'Avg Degree',     value: summary.avg_degree?.toFixed(2) ?? '—', color: 'text-amber-600' },
          { label: 'Network Density', value: summary.density?.toFixed(4) ?? '—',  color: 'text-amber-700' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl p-3 border border-emerald-100 shadow-2xs">
            <p className="text-[11px] text-slate-500 mb-1 font-medium">{label}</p>
            <p className={`text-xl font-bold font-mono ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
        {/* Graph visualization */}
        <div className="xl:col-span-3 bg-white rounded-xl border border-emerald-100 shadow-xs overflow-hidden">
          {/* Controls bar */}
          <div className="flex items-center gap-4 px-4 py-3 border-b border-slate-100 bg-slate-50/70 flex-wrap">
            <div className="flex items-center gap-2">
              <Network className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-bold text-slate-900">Contact Network Graph</span>
            </div>

            <div className="flex items-center gap-3 ml-auto flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-[11px] text-slate-600 font-medium">Max Edges</label>
                <input type="range" min={50} max={1000} step={50} value={maxEdges}
                  onChange={(e) => setMaxEdges(Number(e.target.value))} className="w-24" />
                <span className="text-[11px] font-mono font-bold text-emerald-700 w-10">{maxEdges}</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[11px] text-slate-600 font-medium">Min Weight</label>
                <input type="range" min={0} max={10} step={1} value={minWeight}
                  onChange={(e) => setMinWeight(Number(e.target.value))} className="w-20" />
                <span className="text-[11px] font-mono font-bold text-emerald-700 w-6">{minWeight}</span>
              </div>
            </div>
          </div>

          <div className="relative">
            <NetworkGraph
              nodes={nodes}
              edges={edges}
              communities={communities}
              width={900}
              height={520}
              onNodeClick={setSelectedNode}
              highlightSuperspreaders
            />

            {/* Hint overlay */}
            <div className="absolute bottom-3 left-3 flex items-center gap-2 text-[10px] text-slate-600 bg-white/90 border border-slate-200 px-2.5 py-1 rounded-md shadow-2xs">
              <ZoomIn className="w-3 h-3 text-emerald-600" />
              <span>Scroll to zoom · Drag to pan · Click node for details</span>
            </div>
          </div>

          {/* Community legend */}
          <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/40 flex flex-wrap gap-3">
            {communities.slice(0, 8).map((c, i) => (
              <div key={c.id} className="flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: communityColors[i % communityColors.length] }} />
                <span>Community {c.id} ({c.size})</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5 text-[11px] text-rose-600 font-semibold">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-1 ring-rose-400" />
              <span>Super-spreaders</span>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          {/* Selected node */}
          {selectedNode ? (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl p-4 border border-emerald-200 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900">Node {selectedNode.id}</h3>
                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${riskBgClass(selectedNode.risk_level)}`}>
                  {selectedNode.risk_level}
                </span>
              </div>
              <div className="space-y-2 text-xs">
                {[
                  ['Degree', selectedNode.degree],
                  ['Weighted Degree', selectedNode.weighted_degree?.toFixed(1)],
                  ['Betweenness', selectedNode.betweenness?.toFixed(5)],
                  ['Eigenvector', selectedNode.eigenvector?.toFixed(5)],
                  ['Clustering', selectedNode.clustering?.toFixed(4)],
                  ['Community', selectedNode.community],
                ].map(([label, val]) => (
                  <div key={String(label)} className="flex justify-between">
                    <span className="text-slate-500">{label}</span>
                    <span className="text-slate-900 font-mono font-bold">{String(val)}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : (
            <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-xs text-center">
              <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500 font-medium">Click a node to view details</p>
            </div>
          )}

          {/* Super-spreaders list */}
          <div className="bg-white rounded-xl p-4 border border-rose-100 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              Super-Spreaders
            </h3>
            <div className="space-y-2">
              {(superspreaders ?? []).slice(0, 8).map((ss: {id: number; degree: number; spreader_score: number; risk_level: string; community: number}, i: number) => (
                <motion.div key={ss.id}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-2 text-xs"
                >
                  <span className="text-slate-400 w-4 font-mono">#{i+1}</span>
                  <span className="text-slate-900 font-medium flex-1">Node {ss.id}</span>
                  <span className="text-slate-500 font-mono">{ss.degree}d</span>
                  <span className="font-mono font-bold" style={{ color: riskColor(ss.risk_level) }}>
                    {ss.spreader_score?.toFixed(3)}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Metrics summary */}
          <div className="bg-white rounded-xl p-4 border border-emerald-100 shadow-xs">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Network Properties</h3>
            <div className="space-y-2 text-xs">
              {[
                { label: 'Edges shown', value: `${edges.length} / ${summary.edges ?? '—'}` },
                { label: 'Communities', value: communities.length },
                { label: 'Density', value: summary.density?.toFixed(5) ?? '—' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between">
                  <span className="text-slate-500">{label}</span>
                  <span className="text-slate-900 font-mono font-bold">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
