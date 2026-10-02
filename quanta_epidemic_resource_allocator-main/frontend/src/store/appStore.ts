import { create } from 'zustand';
import type {
  QUBOResult, QAOAResult, ClassicalResult,
  SelectedFacility, MapLayer,
} from '../lib/types';

interface AppState {
  // Theme
  darkMode: boolean;
  toggleDarkMode: () => void;

  // Backend connectivity
  backendOnline: boolean;
  setBackendOnline: (v: boolean) => void;

  // Optimization state — shared between pages
  quboResult: QUBOResult | null;
  qaoa: QAOAResult | null;
  classical: ClassicalResult | null;
  setQuboResult: (r: QUBOResult | null) => void;
  setQaoa: (r: QAOAResult | null) => void;
  setClassical: (r: ClassicalResult | null) => void;

  // Selected camps to display on map
  recommendedCamps: SelectedFacility[];
  setRecommendedCamps: (camps: SelectedFacility[]) => void;

  // Map layer visibility
  mapLayers: MapLayer;
  toggleMapLayer: (layer: keyof MapLayer) => void;

  // Service radius (km) — synced between map and optimizer
  serviceRadius: number;
  setServiceRadius: (r: number) => void;

  // Optimizer params (for sharing between pages)
  numCamps: number;
  setNumCamps: (n: number) => void;

  // Currently selected area on map
  selectedAreaId: string | null;
  setSelectedAreaId: (id: string | null) => void;

  // Toast notifications
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
}

export const useAppStore = create<AppState>((set) => ({
  // Theme
  darkMode: false,
  toggleDarkMode: () =>
    set((s) => {
      const next = !s.darkMode;
      if (next) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return { darkMode: next };
    }),

  // Backend
  backendOnline: true,
  setBackendOnline: (v) => set({ backendOnline: v }),

  // Optimization
  quboResult: null,
  qaoa: null,
  classical: null,
  setQuboResult: (r) => set({ quboResult: r }),
  setQaoa: (r) => set({ qaoa: r }),
  setClassical: (r) => set({ classical: r }),

  // Map camps
  recommendedCamps: [],
  setRecommendedCamps: (camps) => set({ recommendedCamps: camps }),

  // Map layers
  mapLayers: {
    riskHeatmap: true,
    hospitals: true,
    existingCamps: true,
    candidateSites: true,
    recommendedCamps: true,
    serviceRadius: true,
    contactDensity: false,
  },
  toggleMapLayer: (layer) =>
    set((s) => ({
      mapLayers: { ...s.mapLayers, [layer]: !s.mapLayers[layer] },
    })),

  // Service radius
  serviceRadius: 3.0,
  setServiceRadius: (r) => set({ serviceRadius: r }),

  // Num camps
  numCamps: 5,
  setNumCamps: (n) => set({ numCamps: n }),

  // Selected area
  selectedAreaId: null,
  setSelectedAreaId: (id) => set({ selectedAreaId: id }),

  // Toasts
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    // Auto-dismiss after 4s
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },
  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
