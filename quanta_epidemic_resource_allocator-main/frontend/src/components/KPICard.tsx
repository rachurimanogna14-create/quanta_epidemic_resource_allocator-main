import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../lib/utils';

type ColorVariant = 'red' | 'orange' | 'cyan' | 'yellow' | 'green' | 'purple';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: ColorVariant;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

const colorMap: Record<ColorVariant, { icon: string; bg: string; border: string; glow: string; bar: string }> = {
  red:    { icon: 'text-rose-600',    bg: 'bg-rose-50',    border: 'border-rose-100 hover:border-rose-300',       glow: 'shadow-rose-500/5', bar: 'bg-rose-500' },
  orange: { icon: 'text-amber-600',  bg: 'bg-amber-50',   border: 'border-amber-100 hover:border-amber-300',     glow: 'shadow-amber-500/5', bar: 'bg-amber-500' },
  cyan:   { icon: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200 hover:border-emerald-400', glow: 'shadow-emerald-500/10', bar: 'bg-emerald-600' },
  yellow: { icon: 'text-amber-600',  bg: 'bg-amber-50',   border: 'border-amber-100 hover:border-amber-300',     glow: 'shadow-amber-500/5', bar: 'bg-amber-500' },
  green:  { icon: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200 hover:border-emerald-400', glow: 'shadow-emerald-500/10', bar: 'bg-emerald-500' },
  purple: { icon: 'text-teal-700',    bg: 'bg-teal-50',    border: 'border-teal-100 hover:border-teal-300',       glow: 'shadow-teal-500/5', bar: 'bg-teal-600' },
};

export default function KPICard({ title, value, icon: Icon, color, subtitle, className }: KPICardProps) {
  const c = colorMap[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      whileHover={{ scale: 1.02, transition: { duration: 0.15 } }}
      className={cn(
        'bg-white rounded-xl p-4 border flex flex-col gap-3 cursor-default shadow-xs',
        c.border,
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500 font-semibold leading-tight">{title}</span>
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', c.bg)}>
          <Icon className={cn('w-4 h-4', c.icon)} />
        </div>
      </div>

      {/* Value */}
      <div>
        <p className="text-2xl font-bold font-mono tracking-tight text-slate-900">
          {value}
        </p>
        {subtitle && (
          <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">{subtitle}</p>
        )}
      </div>

      {/* Animated bottom accent */}
      <motion.div
        className={cn('h-1 rounded-full', c.bar)}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
        style={{ originX: 0 }}
      />
    </motion.div>
  );
}
