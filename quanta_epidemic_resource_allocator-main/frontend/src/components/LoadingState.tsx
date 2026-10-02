import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  variant?: 'spinner' | 'skeleton';
}

export default function LoadingState({
  message = 'Loading...',
  size = 'md',
  className,
  variant = 'spinner',
}: LoadingStateProps) {
  const sizeMap = {
    sm: { container: 'py-8', spinner: 'w-6 h-6', text: 'text-xs' },
    md: { container: 'py-16', spinner: 'w-8 h-8', text: 'text-sm' },
    lg: { container: 'py-24', spinner: 'w-12 h-12', text: 'text-base' },
  };
  const s = sizeMap[size];

  if (variant === 'skeleton') {
    return (
      <div className={cn('space-y-3 animate-pulse', className)}>
        <div className="h-4 bg-slate-200 rounded-lg w-3/4" />
        <div className="h-4 bg-slate-200 rounded-lg w-1/2" />
        <div className="h-4 bg-slate-200 rounded-lg w-5/6" />
        <div className="h-4 bg-slate-200 rounded-lg w-2/3" />
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col items-center justify-center gap-4', s.container, className)}>
      {/* Dual-ring spinner */}
      <div className="relative">
        <motion.div
          className={cn('rounded-full border-2 border-emerald-200 border-t-emerald-600', s.spinner)}
          animate={{ rotate: 360 }}
          transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className={cn('absolute inset-1 rounded-full border-2 border-teal-200 border-b-teal-500')}
          animate={{ rotate: -360 }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      {/* Pulsing dots */}
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-emerald-500"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>

      {message && (
        <p className={cn('text-slate-600 font-medium', s.text)}>{message}</p>
      )}
    </div>
  );
}
