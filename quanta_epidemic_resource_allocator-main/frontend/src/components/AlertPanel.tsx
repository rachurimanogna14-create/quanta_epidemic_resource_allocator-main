import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, AlertCircle, Info, Wifi, TrendingUp, Shield } from 'lucide-react';
import { alertSeverityClass } from '../lib/utils';
import type { Alert } from '../lib/types';

interface AlertPanelProps {
  alerts: Alert[];
  maxVisible?: number;
}

const SEVERITY_ICON: Record<string, React.ElementType> = {
  CRITICAL: AlertTriangle,
  HIGH:     AlertCircle,
  MEDIUM:   Shield,
  LOW:      Info,
};

const TYPE_ICON: Record<string, React.ElementType> = {
  network:  Wifi,
  forecast: TrendingUp,
  critical: AlertTriangle,
  warning:  AlertCircle,
  density:  Shield,
  coverage: Info,
};

const SEVERITY_DOT: Record<string, string> = {
  CRITICAL: 'bg-red-500',
  HIGH:     'bg-orange-500',
  MEDIUM:   'bg-amber-500',
  LOW:      'bg-emerald-500',
};

export default function AlertPanel({ alerts, maxVisible = 10 }: AlertPanelProps) {
  const visible = alerts.slice(0, maxVisible);

  if (!visible.length) {
    return (
      <p className="text-sm text-slate-500 py-4 text-center">No active alerts</p>
    );
  }

  return (
    <div className="space-y-2">
      <AnimatePresence initial={false}>
        {visible.map((alert, i) => {
          const TypeIcon = TYPE_ICON[alert.type] ?? Info;
          return (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`flex gap-3 p-3 rounded-lg border-l-4 ${alertSeverityClass(alert.severity)} shadow-2xs`}
            >
              <div className="flex-shrink-0 mt-0.5">
                <TypeIcon className="w-3.5 h-3.5 text-slate-500" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${SEVERITY_DOT[alert.severity] ?? 'bg-emerald-500'}`} />
                  <p className="text-xs font-semibold text-slate-900 truncate">{alert.title}</p>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">{alert.message}</p>
                <p className="text-[10px] text-slate-400 mt-1 font-medium">{alert.timestamp}</p>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {alerts.length > maxVisible && (
        <p className="text-[11px] text-slate-500 text-center pt-1 font-medium">
          +{alerts.length - maxVisible} more alerts
        </p>
      )}
    </div>
  );
}
