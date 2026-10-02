import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Sliders, RefreshCw, AlertTriangle, Activity, Users, Package } from 'lucide-react';
import { motion } from 'framer-motion';
import ForecastChart from '../components/ForecastChart';
import LoadingState from '../components/LoadingState';
import { fetchForecast } from '../lib/api';
import { formatNumber, trendArrow, trendColor } from '../lib/utils';

export default function Forecasting() {
  const [horizonDays, setHorizonDays] = useState(30);
  const [currentCases, setCurrentCases] = useState(25);
  const [transmissionRate, setTransmissionRate] = useState(0.3);
  const [enabled, setEnabled] = useState(true);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['forecast', horizonDays, currentCases, transmissionRate],
    queryFn: () => fetchForecast(horizonDays, currentCases, transmissionRate),
    enabled,
    staleTime: 60_000,
  });

  const handleRun = useCallback(() => {
    setEnabled(true);
    refetch();
  }, [refetch]);

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="bg-white rounded-xl p-5 border border-emerald-100 shadow-xs">
        <div className="flex items-center gap-2 mb-4">
          <Sliders className="w-4 h-4 text-emerald-600" />
          <h2 className="text-sm font-bold text-slate-900">Forecast Parameters</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              label: 'Forecast Horizon', value: horizonDays, set: setHorizonDays,
              min: 7, max: 90, step: 7, format: (v: number) => `${v} days`
            },
            {
              label: 'Current Cases', value: currentCases, set: setCurrentCases,
              min: 1, max: 1000, step: 5, format: (v: number) => String(v)
            },
            {
              label: 'Transmission Rate (β)', value: transmissionRate, set: setTransmissionRate,
              min: 0.01, max: 1.0, step: 0.01, format: (v: number) => v.toFixed(2)
            },
          ].map(({ label, value, set, min, max, step, format }) => (
            <div key={label}>
              <div className="flex justify-between mb-1.5">
                <label className="text-xs text-slate-600 font-medium">{label}</label>
                <span className="text-xs font-mono font-bold text-emerald-700">{format(value)}</span>
              </div>
              <input
                type="range" min={min} max={max} step={step} value={value}
                onChange={(e) => set(Number(e.target.value))}
                className="w-full"
              />
            </div>
          ))}
        </div>
        <button
          onClick={handleRun}
          disabled={isFetching}
          className="mt-4 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors disabled:opacity-60 shadow-xs"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          {isFetching ? 'Generating forecast...' : 'Update Forecast'}
        </button>
      </div>

      {isLoading || isFetching ? (
        <LoadingState message="Generating epidemic forecast..." />
      ) : data ? (
        <>
          {/* Trend + Summary KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 border border-emerald-100 shadow-xs">
              <p className="text-[11px] text-slate-500 mb-1 font-medium">Trend</p>
              <p className={`text-2xl font-bold font-mono ${trendColor(data.trend)}`}>
                {trendArrow(data.trend)} {data.trend.toUpperCase()}
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-emerald-100 shadow-xs">
              <p className="text-[11px] text-slate-500 mb-1 font-medium">Peak Cases</p>
              <p className="text-2xl font-bold font-mono text-rose-600">{formatNumber(data.peak_demand.cases)}</p>
              <p className="text-[11px] text-slate-500 mt-1">Day {data.peak_demand.day}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-emerald-100 shadow-xs">
              <p className="text-[11px] text-slate-500 mb-1 font-medium">Confidence</p>
              <p className="text-2xl font-bold font-mono text-emerald-700">{(data.confidence_level * 100).toFixed(0)}%</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-emerald-100 shadow-xs">
              <p className="text-[11px] text-slate-500 mb-1 font-medium">Horizon</p>
              <p className="text-2xl font-bold font-mono text-teal-700">{data.horizon_days}d</p>
            </div>
          </div>

          {/* Forecast chart */}
          <div className="bg-white rounded-xl p-5 border border-emerald-100 shadow-xs">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900">Epidemic Forecast with Confidence Bands</h2>
              <span className="ml-auto text-[11px] text-slate-500 font-medium">Shaded area = 95% CI</span>
            </div>
            <ForecastChart data={data} height={340} />
          </div>

          {/* Peak demand resource estimates */}
          <div className="bg-white rounded-xl p-5 border border-emerald-100 shadow-xs">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h2 className="text-sm font-bold text-slate-900">Peak Demand Resource Estimates</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  icon: Users,
                  label: 'Medical Staff',
                  value: formatNumber(data.peak_demand.medical_staff_needed),
                  sub: 'doctors, nurses & paramedics',
                  color: 'text-blue-600',
                  bg: 'border-blue-100 bg-blue-50/40',
                },
                {
                  icon: Activity,
                  label: 'Hospital Beds',
                  value: formatNumber(data.peak_demand.beds_needed),
                  sub: 'total capacity required',
                  color: 'text-amber-600',
                  bg: 'border-amber-100 bg-amber-50/40',
                },
                {
                  icon: Package,
                  label: 'Test Kits',
                  value: formatNumber(data.peak_demand.test_kits_needed),
                  sub: 'diagnostic kits at peak',
                  color: 'text-emerald-700',
                  bg: 'border-emerald-100 bg-emerald-50/40',
                },
              ].map(({ icon: Icon, label, value, sub, color, bg }) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-xl p-4 border ${bg} shadow-2xs`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-4 h-4 ${color}`} />
                    <span className="text-xs text-slate-600 font-medium">{label}</span>
                  </div>
                  <p className="text-3xl font-bold font-mono text-slate-900">{value}</p>
                  <p className="text-[11px] text-slate-500 mt-1">{sub}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-16 text-slate-400">
          <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30 text-emerald-600" />
          <p>Set parameters and click Update Forecast</p>
        </div>
      )}
    </div>
  );
}
