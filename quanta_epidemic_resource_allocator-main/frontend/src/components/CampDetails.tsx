import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Users, Activity, TrendingUp, AlertTriangle } from 'lucide-react';
import { riskBgClass, riskColor, formatNumber, cn } from '../lib/utils';
import type { RiskArea } from '../lib/types';

interface CampDetailsProps {
  area: RiskArea | null;
  onClose: () => void;
}

export default function CampDetails({ area, onClose }: CampDetailsProps) {
  return (
    <AnimatePresence>
      {area && (
        <motion.div
          initial={{ opacity: 0, x: 16, width: 0 }}
          animate={{ opacity: 1, x: 0, width: 230 }}
          exit={{ opacity: 0, x: 16, width: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="bg-white rounded-xl border border-emerald-200/80 shadow-md overflow-hidden flex-shrink-0"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-emerald-100 bg-emerald-50/60">
            <div className="flex items-center gap-1.5 min-w-0">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span className="text-xs font-bold text-slate-900 truncate">{area.name}</span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-emerald-100/60 text-slate-400 hover:text-slate-700 transition-colors flex-shrink-0"
              title="Close panel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Risk badge */}
          <div className="px-3.5 pt-3 pb-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${riskBgClass(area.risk_level)}`}>
              {area.risk_level} RISK
            </span>
          </div>

          {/* Stats */}
          <div className="px-3.5 pb-3 space-y-2.5">
            {[
              { icon: Users,         label: 'Population',    value: formatNumber(area.population),    color: 'text-blue-600' },
              { icon: Activity,      label: 'Active Cases',  value: formatNumber(area.active_cases),  color: 'text-amber-600' },
              { icon: TrendingUp,    label: 'Risk Score',    value: area.risk_score?.toFixed(3) ?? '—', color: undefined },
              { icon: AlertTriangle, label: 'Network Deg.',  value: area.network_degree ?? '—',       color: 'text-emerald-700' },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Icon className="w-3.5 h-3.5" />
                  <span>{label}</span>
                </div>
                <span
                  className={cn("font-mono font-semibold", color)}
                  style={{ color: color ? undefined : riskColor(area.risk_level) }}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>

          {/* Mini risk bar */}
          <div className="px-3.5 pb-3">
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: riskColor(area.risk_level) }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (area.risk_score ?? 0) * 100)}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1 text-right font-medium">
              Risk index: {((area.risk_score ?? 0) * 100).toFixed(1)}%
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
