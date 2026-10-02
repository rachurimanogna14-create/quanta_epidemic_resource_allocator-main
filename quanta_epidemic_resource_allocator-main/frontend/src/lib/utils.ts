import { clsx, type ClassValue } from 'clsx';
import type { RiskLevel } from './types';

// ─── Class name utility ───────────────────────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

// ─── Risk level colors ────────────────────────────────────────────────────────
export function riskColor(level: RiskLevel | string): string {
  switch (level) {
    case 'CRITICAL': return '#ef4444';
    case 'HIGH':     return '#f97316';
    case 'MEDIUM':   return '#f59e0b';
    case 'LOW':      return '#10b981';
    default:         return '#6b7280';
  }
}

export function riskBgClass(level: RiskLevel | string): string {
  switch (level) {
    case 'CRITICAL': return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'HIGH':     return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'MEDIUM':   return 'bg-yellow-50 text-yellow-800 border-yellow-200';
    case 'LOW':      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    default:         return 'bg-slate-50 text-slate-700 border-slate-200';
  }
}

export function riskTextClass(level: RiskLevel | string): string {
  switch (level) {
    case 'CRITICAL': return 'text-rose-600';
    case 'HIGH':     return 'text-amber-600';
    case 'MEDIUM':   return 'text-yellow-700';
    case 'LOW':      return 'text-emerald-600';
    default:         return 'text-slate-600';
  }
}

export function riskDotClass(level: RiskLevel | string): string {
  switch (level) {
    case 'CRITICAL': return 'bg-rose-500';
    case 'HIGH':     return 'bg-amber-500';
    case 'MEDIUM':   return 'bg-yellow-500';
    case 'LOW':      return 'bg-emerald-500';
    default:         return 'bg-slate-400';
  }
}

// ─── Number formatting ────────────────────────────────────────────────────────
export function formatNumber(n: number | undefined | null, decimals = 0): string {
  if (n == null || isNaN(n)) return '—';
  return n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatPercent(n: number, decimals = 1): string {
  return `${n.toFixed(decimals)}%`;
}

export function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

export function formatDuration(seconds: number): string {
  if (seconds < 1) return `${(seconds * 1000).toFixed(0)}ms`;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
}

// ─── Trend arrow ──────────────────────────────────────────────────────────────
export function trendArrow(trend: string): string {
  switch (trend) {
    case 'increasing': return '↑';
    case 'decreasing': return '↓';
    default:           return '→';
  }
}

export function trendColor(trend: string): string {
  switch (trend) {
    case 'increasing': return 'text-rose-600';
    case 'decreasing': return 'text-emerald-600';
    default:           return 'text-amber-600';
  }
}

// ─── Alert severity ───────────────────────────────────────────────────────────
export function alertSeverityClass(severity: string): string {
  switch (severity) {
    case 'CRITICAL': return 'border-l-rose-500 bg-rose-50/70 border border-rose-100';
    case 'HIGH':     return 'border-l-amber-500 bg-amber-50/70 border border-amber-100';
    case 'MEDIUM':   return 'border-l-yellow-500 bg-yellow-50/70 border border-yellow-100';
    default:         return 'border-l-emerald-500 bg-emerald-50/70 border border-emerald-100';
  }
}

// ─── Gradient for QUBO heatmap ────────────────────────────────────────────────
export function coefficientColor(value: number, min: number, max: number): string {
  const norm = max - min > 0 ? (value - min) / (max - min) : 0.5;
  if (norm < 0.33) return `rgba(16, 185, 129, ${0.4 + norm})`;
  if (norm < 0.66) return `rgba(245, 158, 11, ${0.4 + norm * 0.5})`;
  return `rgba(239, 68, 68, ${0.4 + norm * 0.5})`;
}

// ─── Misc ─────────────────────────────────────────────────────────────────────
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export function truncate(s: string, len: number): string {
  return s.length > len ? s.slice(0, len) + '…' : s;
}

// ─── Haversine distance (client-side for service circle check) ─────────────
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
