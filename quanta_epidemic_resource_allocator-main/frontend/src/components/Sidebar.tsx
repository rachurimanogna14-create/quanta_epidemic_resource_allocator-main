import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Activity, Network, MapPin,
  Atom, TrendingUp, AlertTriangle, Database,
  Package, ChevronLeft, Zap,
} from 'lucide-react';
import { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { cn } from '../lib/utils';

const NAV_ITEMS = [
  { path: '/overview',   icon: LayoutDashboard, label: 'Overview',            badge: null },
  { path: '/epidemic',   icon: Activity,         label: 'Epidemic Simulation', badge: null },
  { path: '/network',    icon: Network,           label: 'Contact Network',     badge: null },
  { path: '/optimizer',  icon: MapPin,            label: 'Camp Optimizer',      badge: 'AI' },
  { path: '/quantum',    icon: Atom,              label: 'Quantum Analysis',    badge: 'Q' },
  { path: '/forecast',   icon: TrendingUp,        label: 'Forecasting',         badge: null },
  { path: '/anomalies',  icon: AlertTriangle,     label: 'Anomaly Detection',   badge: null },
  { path: '/resources',  icon: Package,           label: 'Resources',           badge: null },
  { path: '/dataset',    icon: Database,          label: 'Dataset',             badge: null },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const backendOnline = useAppStore((s) => s.backendOnline);
  const location = useLocation();

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="flex flex-col h-full bg-white border-r border-emerald-100 z-40 flex-shrink-0 shadow-sm"
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center h-16 px-4 border-b border-emerald-100',
        collapsed ? 'justify-center' : 'justify-between'
      )}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-sm shadow-emerald-500/20">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                className="min-w-0"
              >
                <p className="text-sm font-bold text-gradient truncate">QUANTA</p>
                <p className="text-[10px] text-emerald-800/70 font-medium truncate">Epidemic Allocator</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="p-1 rounded-md hover:bg-emerald-50 text-slate-400 hover:text-emerald-700 transition-colors flex-shrink-0"
            title="Collapse Sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="absolute left-14 w-5 h-5 rounded-full bg-emerald-50 border border-emerald-300 flex items-center justify-center text-emerald-700 hover:bg-emerald-100 transition-colors shadow-xs"
            title="Expand Sidebar"
          >
            <ChevronLeft className="w-3 h-3 rotate-180" />
          </button>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-1 px-2">
        {NAV_ITEMS.map(({ path, icon: Icon, label, badge }) => {
          const isActive = location.pathname === path;
          return (
            <NavLink
              key={path}
              to={path}
              title={collapsed ? label : undefined}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group relative',
                isActive
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-emerald-50/50'
              )}
            >
              {/* Active indicator */}
              {isActive && (
                <motion.div
                  layoutId="active-indicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-emerald-600 rounded-r"
                />
              )}

              <Icon className={cn(
                'w-5 h-5 flex-shrink-0 transition-colors',
                isActive ? 'text-emerald-600' : 'text-slate-400 group-hover:text-emerald-600'
              )} />

              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-sm truncate"
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>

              {badge && !collapsed && (
                <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-300/60">
                  {badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Status footer */}
      <div className={cn(
        'px-4 py-3 border-t border-emerald-100 bg-slate-50/50',
        collapsed ? 'flex justify-center' : ''
      )}>
        {collapsed ? (
          <div className={cn('w-2.5 h-2.5 rounded-full', backendOnline ? 'bg-emerald-500 status-dot-live' : 'bg-red-400')} />
        ) : (
          <div className="flex items-center gap-2">
            <div className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', backendOnline ? 'bg-emerald-500 status-dot-live' : 'bg-red-400')} />
            <span className="text-xs text-slate-600 font-medium truncate">
              {backendOnline ? 'Backend Online' : 'Backend Offline'}
            </span>
          </div>
        )}
      </div>
    </motion.aside>
  );
}
