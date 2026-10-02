import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useAppStore, type Toast } from '../store/appStore';
import { cn } from '../lib/utils';

const TOAST_CONFIG: Record<Toast['type'], { icon: React.ElementType; color: string; border: string }> = {
  success: { icon: CheckCircle2, color: 'text-emerald-600', border: 'border-emerald-200' },
  error:   { icon: XCircle,      color: 'text-rose-600',    border: 'border-rose-200'    },
  warning: { icon: AlertTriangle, color: 'text-amber-600',  border: 'border-amber-200' },
  info:    { icon: Info,          color: 'text-emerald-700', border: 'border-emerald-200'  },
};

function ToastItem({ toast }: { toast: Toast }) {
  const removeToast = useAppStore((s) => s.removeToast);
  const cfg = TOAST_CONFIG[toast.type];
  const Icon = cfg.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 60, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={cn(
        'flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg max-w-sm w-full bg-white/95',
        'backdrop-blur-md',
        cfg.border
      )}
    >
      <Icon className={cn('w-4 h-4 mt-0.5 flex-shrink-0', cfg.color)} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-900">{toast.title}</p>
        {toast.message && (
          <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{toast.message}</p>
        )}
      </div>
      <button
        onClick={() => removeToast(toast.id)}
        className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors flex-shrink-0"
        title="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}

export default function ToastContainer() {
  const toasts = useAppStore((s) => s.toasts);

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
