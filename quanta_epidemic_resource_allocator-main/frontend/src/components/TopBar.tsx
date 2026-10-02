import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Sun, Moon, Wifi, WifiOff } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { cn } from '../lib/utils';

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/overview':  { title: 'Epidemic Intelligence Command Center', subtitle: 'Real-time outbreak monitoring & response' },
  '/epidemic':  { title: 'Epidemic Simulation', subtitle: 'SEIR compartmental model with network-informed transmission' },
  '/network':   { title: 'Contact Network Intelligence', subtitle: 'SocioPatterns Infectious — 410 individuals, 2765 contacts' },
  '/optimizer': { title: 'Medical Camp Optimizer', subtitle: 'Quantum-Classical hybrid facility placement optimization' },
  '/quantum':   { title: 'Quantum Optimization Lab', subtitle: 'QAOA via Qiskit Aer — vs. Classical MILP comparison' },
  '/forecast':  { title: 'Epidemic Forecasting', subtitle: 'SEIR-based projections with uncertainty quantification' },
  '/anomalies': { title: 'Contact Anomaly Detection', subtitle: 'Z-score statistical deviation analysis' },
  '/resources': { title: 'Medical Resource Allocation', subtitle: 'Inventory management and shortage detection' },
  '/dataset':   { title: 'Dataset & Data Pipeline', subtitle: 'SocioPatterns Infectious contact-event network' },
};

export default function TopBar() {
  const location = useLocation();
  const { darkMode, toggleDarkMode, backendOnline } = useAppStore();

  const page = PAGE_TITLES[location.pathname] ?? {
    title: 'Quanta',
    subtitle: 'Epidemic Resource Allocator',
  };

  return (
    <header className="h-16 flex items-center justify-between px-6 bg-white/95 border-b border-emerald-100 flex-shrink-0 shadow-xs backdrop-blur-md">
      {/* Left: page title */}
      <div className="min-w-0">
        <h1 className="text-base font-bold text-slate-900 truncate leading-tight">
          {page.title}
        </h1>
        <p className="text-xs text-slate-500 truncate">{page.subtitle}</p>
      </div>

      {/* Right: controls */}
      <div className="flex items-center gap-3 flex-shrink-0 ml-4">
        {/* Live timestamp */}
        <LiveClock />

        {/* Backend status */}
        <div className={cn(
          'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border font-medium',
          backendOnline
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-red-50 text-red-600 border-red-200'
        )}>
          {backendOnline
            ? <Wifi className="w-3.5 h-3.5 text-emerald-600" />
            : <WifiOff className="w-3.5 h-3.5 text-red-500" />}
          <span>{backendOnline ? 'API Online' : 'API Offline'}</span>
        </div>

        {/* Dark/Light toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-lg bg-emerald-50/70 hover:bg-emerald-100/70 text-slate-600 hover:text-emerald-800 transition-colors border border-emerald-200/60"
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {darkMode ? <Sun className="w-4 h-4 text-emerald-600" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>
      </div>
    </header>
  );
}

function LiveClock() {
  const [time, setTime] = useState('');

  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString('en-GB', { hour12: false }));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="font-mono text-xs font-semibold text-emerald-700 tabular-nums hidden sm:block bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200/60">
      {time}
    </span>
  );
}
