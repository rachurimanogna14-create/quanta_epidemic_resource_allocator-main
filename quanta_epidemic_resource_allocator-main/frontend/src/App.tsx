import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';

import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import ToastContainer from './components/ToastContainer';

import Overview from './pages/Overview';
import EpidemicModel from './pages/EpidemicModel';
import ContactNetwork from './pages/ContactNetwork';
import MedicalCampOptimizer from './pages/MedicalCampOptimizer';
import QuantumAnalysis from './pages/QuantumAnalysis';
import Forecasting from './pages/Forecasting';
import AnomalyDetection from './pages/AnomalyDetection';
import Dataset from './pages/Dataset';
import Resources from './pages/Resources';

import { useAppStore } from './store/appStore';
import { checkHealth } from './lib/api';

// ─── Animated page wrapper ─────────────────────────────────────────────────────
function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="h-full"
    >
      {children}
    </motion.div>
  );
}

// ─── Inner app with routing (needs useLocation) ────────────────────────────────
function AppRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Navigate to="/overview" replace />} />
        <Route path="/overview" element={<PageWrapper><Overview /></PageWrapper>} />
        <Route path="/epidemic" element={<PageWrapper><EpidemicModel /></PageWrapper>} />
        <Route path="/network" element={<PageWrapper><ContactNetwork /></PageWrapper>} />
        <Route path="/optimizer" element={<PageWrapper><MedicalCampOptimizer /></PageWrapper>} />
        <Route path="/quantum" element={<PageWrapper><QuantumAnalysis /></PageWrapper>} />
        <Route path="/forecast" element={<PageWrapper><Forecasting /></PageWrapper>} />
        <Route path="/anomalies" element={<PageWrapper><AnomalyDetection /></PageWrapper>} />
        <Route path="/dataset" element={<PageWrapper><Dataset /></PageWrapper>} />
        <Route path="/resources" element={<PageWrapper><Resources /></PageWrapper>} />
        <Route path="*" element={<Navigate to="/overview" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  const setBackendOnline = useAppStore((s) => s.setBackendOnline);

  // Check backend health on mount
  useEffect(() => {
    const check = async () => {
      const ok = await checkHealth();
      setBackendOnline(ok);
    };
    check();
    const interval = setInterval(check, 30_000);
    return () => clearInterval(interval);
  }, [setBackendOnline]);

  return (
    <BrowserRouter>
      <div className="flex h-screen overflow-hidden bg-[#f8fafc] text-slate-800">
        {/* Sidebar nav */}
        <Sidebar />

        {/* Main content area */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <TopBar />

          {/* Scrollable page content */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-6">
            <AppRoutes />
          </main>
        </div>

        {/* Toast notifications */}
        <ToastContainer />
      </div>
    </BrowserRouter>
  );
}
