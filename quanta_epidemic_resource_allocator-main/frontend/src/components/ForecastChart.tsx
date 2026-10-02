import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { ForecastResult } from '../lib/types';
import { formatNumber } from '../lib/utils';

interface ForecastChartProps {
  data: ForecastResult;
  height?: number;
}

interface ChartPoint {
  day: number;
  label: string;
  historical_cases?: number;
  historical_recovered?: number;
  predicted_cases?: number;
  predicted_recovered?: number;
  upper_bound?: number;
  lower_bound?: number;
  isHistory: boolean;
}

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-emerald-200/90 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-600 mb-1.5 font-medium">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-500">{p.name}:</span>
          <span className="text-slate-900 font-mono font-semibold">{formatNumber(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

export default function ForecastChart({ data, height = 340 }: ForecastChartProps) {
  const { history, forecast } = data;

  // Build unified chart data: history + forecast
  const chartData: ChartPoint[] = [];

  // Historical points
  history.days.forEach((day, i) => {
    chartData.push({
      day,
      label: `Day ${day}`,
      historical_cases: history.cases[i],
      historical_recovered: history.recovered[i],
      isHistory: true,
    });
  });

  // Forecast points
  forecast.days.forEach((day, i) => {
    chartData.push({
      day,
      label: `Day ${day}`,
      predicted_cases: forecast.predicted_cases[i],
      predicted_recovered: forecast.predicted_recovered[i],
      upper_bound: forecast.upper_bound[i],
      lower_bound: forecast.lower_bound[i],
      isHistory: false,
    });
  });

  const splitDay = history.days[history.days.length - 1] ?? 0;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 10 }}>
        <defs>
          <linearGradient id="confBand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="recGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 0, 0, 0.06)" />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 10, fill: '#64748b' }}
          tickLine={false}
          axisLine={false}
          label={{ value: 'Days', position: 'insideBottom', offset: -4, fontSize: 10, fill: '#64748b' }}
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#64748b' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />

        {/* Forecast split line */}
        <ReferenceLine
          x={splitDay}
          stroke="#06b6d4"
          strokeDasharray="4 3"
          strokeWidth={1.5}
          label={{ value: '▸ Forecast', position: 'top', fontSize: 9, fill: '#06b6d4' }}
        />

        {/* Confidence band (area between upper and lower) */}
        <Area
          type="monotone"
          dataKey="upper_bound"
          stroke="none"
          fill="url(#confBand)"
          name="Upper Bound"
          legendType="none"
          connectNulls
        />
        <Area
          type="monotone"
          dataKey="lower_bound"
          stroke="none"
          fill="#0a0f1e"
          name="Lower Bound"
          legendType="none"
          connectNulls
        />

        {/* Historical cases */}
        <Area
          type="monotone"
          dataKey="historical_cases"
          stroke="#f97316"
          strokeWidth={2}
          fill="url(#histGrad)"
          name="Historical Cases"
          dot={false}
          connectNulls
        />

        {/* Predicted cases (dashed) */}
        <Line
          type="monotone"
          dataKey="predicted_cases"
          stroke="#ef4444"
          strokeWidth={2}
          strokeDasharray="5 3"
          dot={false}
          name="Predicted Cases"
          connectNulls
        />

        {/* Historical recovered */}
        <Area
          type="monotone"
          dataKey="historical_recovered"
          stroke="#10b981"
          strokeWidth={1.5}
          fill="url(#recGrad)"
          name="Historical Recovered"
          dot={false}
          connectNulls
        />

        {/* Predicted recovered (dashed) */}
        <Line
          type="monotone"
          dataKey="predicted_recovered"
          stroke="#10b981"
          strokeWidth={1.5}
          strokeDasharray="5 3"
          dot={false}
          name="Predicted Recovered"
          connectNulls
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
