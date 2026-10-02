import { useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { riskColor } from '../lib/utils';
import type { RiskArea, FacilitiesData, SelectedFacility } from '../lib/types';
import { useAppStore } from '../store/appStore';

// Fix Leaflet default icon issue with Vite
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface MapViewProps {
  areas: RiskArea[];
  facilities: FacilitiesData | null;
  onAreaClick?: (area: RiskArea) => void;
  recommendedCamps?: SelectedFacility[];
  height?: string;
  className?: string;
  showServiceRadius?: boolean;
}

// Auto-pan to fit bounds
function BoundsFitter({ areas }: { areas: RiskArea[] }) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (fitted.current || !areas.length) return;
    const bounds = L.latLngBounds(areas.map((a) => [a.lat, a.lng]));
    map.fitBounds(bounds, { padding: [32, 32] });
    fitted.current = true;
  }, [map, areas]);

  return null;
}

const DUBLIN_CENTER: [number, number] = [53.3498, -6.2603];

export default function MapView({
  areas,
  facilities,
  onAreaClick,
  recommendedCamps = [],
  height = '400px',
  className = '',
  showServiceRadius = true,
}: MapViewProps) {
  const mapLayers = useAppStore((s) => s.mapLayers);
  const serviceRadius = useAppStore((s) => s.serviceRadius);

  // Normalize risk score for circle radius
  const maxRiskScore = useMemo(() => Math.max(...areas.map((a) => a.risk_score ?? 0), 1), [areas]);

  return (
    <div className={`rounded-xl overflow-hidden border border-emerald-200/80 shadow-xs ${className}`} style={{ height }}>
      <MapContainer
        center={DUBLIN_CENTER}
        zoom={13}
        style={{ height: '100%', width: '100%', background: '#f8fafc' }}
        zoomControl={true}
      >
        {/* Tile layer */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />

        <BoundsFitter areas={areas} />

        {/* Risk area heatmap circles */}
        {mapLayers.riskHeatmap && areas.map((area) => {
          const r = area.risk_score ?? 0;
          const radius = 250 + (r / maxRiskScore) * 700;
          const color = riskColor(area.risk_level);
          return (
            <CircleMarker
              key={area.id}
              center={[area.lat, area.lng]}
              radius={Math.max(8, Math.min(28, radius / 40))}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: 0.35,
                weight: 1.5,
                opacity: 0.7,
              }}
              eventHandlers={{ click: () => onAreaClick?.(area) }}
            >
              <Tooltip>
                <div className="text-xs font-semibold">{area.name}</div>
                <div className="text-[11px]">
                  Risk: <span style={{ color }}>{area.risk_level}</span> ({r.toFixed(3)})
                </div>
                <div className="text-[11px]">Pop: {area.population?.toLocaleString()}</div>
                <div className="text-[11px]">Cases: {area.active_cases}</div>
              </Tooltip>
            </CircleMarker>
          );
        })}

        {/* Hospitals */}
        {mapLayers.hospitals && facilities?.hospitals.map((h) => (
          <CircleMarker
            key={h.id}
            center={[h.lat, h.lng]}
            radius={8}
            pathOptions={{ color: '#2563eb', fillColor: '#3b82f6', fillOpacity: 0.9, weight: 2 }}
          >
            <Tooltip>
              <div className="text-xs font-semibold">{h.name}</div>
              <div className="text-[11px]">Hospital · Capacity: {h.capacity}</div>
            </Tooltip>
          </CircleMarker>
        ))}

        {/* Existing camps */}
        {mapLayers.existingCamps && facilities?.existing_camps.map((c) => (
          <CircleMarker
            key={c.id}
            center={[c.lat, c.lng]}
            radius={7}
            pathOptions={{ color: '#047857', fillColor: '#10b981', fillOpacity: 0.85, weight: 2 }}
          >
            <Tooltip>
              <div className="text-xs font-semibold">{c.name}</div>
              <div className="text-[11px]">Existing Camp · Capacity: {c.capacity}</div>
            </Tooltip>
          </CircleMarker>
        ))}

        {/* Candidate sites */}
        {mapLayers.candidateSites && facilities?.candidates.map((c) => (
          <CircleMarker
            key={c.id}
            center={[c.lat, c.lng]}
            radius={5}
            pathOptions={{ color: '#64748b', fillColor: '#94a3b8', fillOpacity: 0.6, weight: 1, dashArray: '3' }}
          >
            <Tooltip>
              <div className="text-xs font-semibold">{c.name}</div>
              <div className="text-[11px]">Candidate Site · Cap: {c.capacity}</div>
            </Tooltip>
          </CircleMarker>
        ))}

        {/* Recommended camps from optimizer */}
        {mapLayers.recommendedCamps && recommendedCamps.map((rc) => (
          <CircleMarker
            key={rc.id}
            center={[rc.lat, rc.lng]}
            radius={11}
            pathOptions={{ color: '#047857', fillColor: '#059669', fillOpacity: 0.9, weight: 2.5 }}
          >
            <Tooltip>
              <div className="text-xs font-bold text-emerald-700">⭐ {rc.name}</div>
              <div className="text-[11px]">Recommended Camp</div>
              <div className="text-[11px]">Coverage: {(rc.coverage_score * 100).toFixed(1)}%</div>
            </Tooltip>
          </CircleMarker>
        ))}

        {/* Service radius circles for recommended camps */}
        {showServiceRadius && mapLayers.serviceRadius && recommendedCamps.map((rc) => (
          <CircleMarker
            key={`radius-${rc.id}`}
            center={[rc.lat, rc.lng]}
            radius={serviceRadius * 12} // approximate pixel conversion at zoom 13
            pathOptions={{ color: '#059669', fillColor: '#10b981', fillOpacity: 0.08, weight: 1.5, dashArray: '5 5' }}
          />
        ))}
      </MapContainer>
    </div>
  );
}
