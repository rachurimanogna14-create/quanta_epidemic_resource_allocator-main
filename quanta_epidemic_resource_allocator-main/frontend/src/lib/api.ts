import axios from 'axios';
import type {
  OverviewData, NetworkData, RiskArea, FacilitiesData,
  SEIRResult, SimulationParams, QUBOResult, QUBORequest,
  QAOAResult, ClassicalResult, ForecastResult, AnomalyResult,
} from './types';

const BASE_URL = '/api';

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 120000, // QAOA can take time
});

// Request interceptor for error logging
client.interceptors.response.use(
  (res) => res,
  (err) => {
    console.error('[API Error]', err.config?.url, err.response?.data || err.message);
    return Promise.reject(err);
  }
);

// ─── Overview ───────────────────────────────────────────────────────────────
export async function fetchOverview(): Promise<OverviewData> {
  const { data } = await client.get('/overview');
  return data;
}

// ─── Network ─────────────────────────────────────────────────────────────────
export async function fetchNetwork(
  maxEdges: number = 300,
  minWeight: number = 0
): Promise<NetworkData> {
  const { data } = await client.get('/network', {
    params: { max_edges: maxEdges, min_weight: minWeight },
  });
  return data;
}

export async function fetchSuperspreaders(topN: number = 20) {
  const { data } = await client.get('/network/superspreaders', {
    params: { top_n: topN },
  });
  return data.superspreaders;
}

// ─── Risk ─────────────────────────────────────────────────────────────────────
export async function fetchRisk(): Promise<{ areas: RiskArea[] }> {
  const { data } = await client.get('/risk');
  return data;
}

// ─── Facilities ───────────────────────────────────────────────────────────────
export async function fetchFacilities(): Promise<FacilitiesData> {
  const { data } = await client.get('/facilities');
  return data;
}

// ─── Epidemic Simulation ──────────────────────────────────────────────────────
export async function runEpidemicSimulation(
  params: SimulationParams
): Promise<SEIRResult> {
  const { data } = await client.post('/epidemic/simulate', params);
  return data;
}

// ─── QUBO ─────────────────────────────────────────────────────────────────────
export async function generateQUBO(req: QUBORequest): Promise<QUBOResult> {
  const { data } = await client.post('/optimization/qubo', req);
  return data;
}

// ─── QAOA ─────────────────────────────────────────────────────────────────────
export async function runQAOA(params: {
  qubo_matrix: number[][];
  num_camps: number;
  p: number;
  shots: number;
  max_iter: number;
  candidate_details?: unknown[];
}): Promise<QAOAResult> {
  const { data } = await client.post('/optimization/qaoa', params);
  return data;
}

// ─── Classical MILP ───────────────────────────────────────────────────────────
export async function runClassical(params: {
  qubo_result: QUBOResult;
  num_camps: number;
}): Promise<ClassicalResult> {
  const { data } = await client.post('/optimization/classical', params);
  return data;
}

// ─── Forecast ─────────────────────────────────────────────────────────────────
export async function fetchForecast(
  horizonDays: number = 30,
  currentCases: number = 25,
  transmissionRate: number = 0.3
): Promise<ForecastResult> {
  const { data } = await client.get('/forecast', {
    params: {
      horizon_days: horizonDays,
      current_cases: currentCases,
      transmission_rate: transmissionRate,
    },
  });
  return data;
}

// ─── Anomalies ───────────────────────────────────────────────────────────────
export async function fetchAnomalies(
  zThreshold: number = 2.0
): Promise<AnomalyResult> {
  const { data } = await client.get('/anomalies', {
    params: { z_threshold: zThreshold },
  });
  return data;
}

// ─── Health check ─────────────────────────────────────────────────────────────
export async function checkHealth(): Promise<boolean> {
  try {
    const { data } = await client.get('/health', { timeout: 3000 });
    return data.status === 'healthy';
  } catch {
    return false;
  }
}
