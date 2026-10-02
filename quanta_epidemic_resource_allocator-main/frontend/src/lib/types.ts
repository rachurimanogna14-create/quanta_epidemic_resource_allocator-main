// ============================================================
// TypeScript interfaces for the Quanta Epidemic Resource Allocator
// ============================================================

// ---------- Overview / KPIs ----------
export interface KPIs {
  active_cases: number;
  population_at_risk: number;
  network_connections: number;
  high_risk_areas: number;
  r_effective: number;
  recommended_camps: number;
  total_population: number;
  total_individuals: number;
  communities: number;
}

export interface Alert {
  id: number;
  type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  message: string;
  timestamp: string;
}

export interface RiskArea {
  id: string;
  name: string;
  lat: number;
  lng: number;
  population: number;
  active_cases: number;
  risk_score: number;
  risk_level: RiskLevel;
  contact_intensity: number;
  population_density: number;
  mobility_index: number;
  recent_case_growth: number;
  network_centrality: number;
  network_degree: number;
  network_nodes: number;
  node_ids: number[];
}

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface RiskDistribution {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface OverviewData {
  kpis: KPIs;
  alerts: Alert[];
  top_risk_areas: RiskArea[];
  risk_distribution: RiskDistribution;
  network_summary: NetworkSummary;
  superspreaders: SuperSpreader[];
  dataset: DatasetStats;
}

// ---------- Network ----------
export interface NetworkNode {
  id: number;
  weighted_degree: number;
  normalized_degree: number;
  betweenness: number;
  eigenvector: number;
  clustering: number;
  community: number;
  degree: number;
  risk_level: RiskLevel;
}

export interface NetworkEdge {
  source: number;
  target: number;
  weight: number;
  normalized_weight: number;
}

export interface NetworkSummary {
  nodes: number;
  edges: number;
  density: number;
  avg_degree: number;
  avg_weighted_degree?: number;
  communities: number;
  total_edges_in_graph?: number;
  edges_sent?: number;
}

export interface Community {
  id: number;
  size: number;
  color: string;
}

export interface NetworkData {
  summary: NetworkSummary;
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  communities: Community[];
}

export interface SuperSpreader {
  id: number;
  weighted_degree: number;
  betweenness: number;
  eigenvector: number;
  community: number;
  degree: number;
  spreader_score: number;
  risk_level: RiskLevel;
}

// ---------- Epidemic / SEIR ----------
export interface SEIRTimeSeries {
  days: number[];
  susceptible: number[];
  exposed: number[];
  infected: number[];
  recovered: number[];
}

export interface SEIRMetrics {
  peak_infected: number;
  peak_day: number;
  total_infected: number;
  attack_rate: number;
  R_effective: number;
  final_susceptible: number;
  herd_immunity_threshold: number;
}

export interface SEIRResult {
  parameters: Record<string, number>;
  time_series: SEIRTimeSeries;
  metrics: SEIRMetrics;
}

export interface SimulationParams {
  population: number;
  initial_infected: number;
  initial_exposed: number;
  transmission_rate: number;
  contact_intensity: number;
  incubation_days: number;
  recovery_days: number;
  intervention_level: number;
  simulation_days: number;
}

// ---------- Facilities ----------
export interface Facility {
  id: string;
  name: string;
  type: 'hospital' | 'existing_camp' | 'candidate' | 'recommended';
  lat: number;
  lng: number;
  capacity: number;
  area_id?: string;
  setup_cost?: number;
  accessibility_score?: number;
  nearby_population?: number;
  risk_score?: number;
  risk_level?: RiskLevel;
}

export interface FacilitiesData {
  hospitals: Facility[];
  existing_camps: Facility[];
  candidates: Facility[];
}

// ---------- QUBO ----------
export interface QUBOWeights {
  risk: number;
  population: number;
  network: number;
  accessibility: number;
  distance: number;
  cost: number;
}

export interface QUBOStats {
  matrix_size: string;
  num_variables: number;
  num_quadratic_terms: number;
  min_coefficient: number;
  max_coefficient: number;
  density: number;
}

export interface CandidateDetail {
  index: number;
  id: string;
  name: string;
  lat: number;
  lng: number;
  coverage_score: number;
  population_score: number;
  network_score: number;
  accessibility_score: number;
  distance_penalty: number;
  cost_penalty: number;
  diagonal_coeff: number;
}

export interface QUBOResult {
  qubo_matrix: number[][];
  size: number;
  num_camps: number;
  formulation: {
    objective: string;
    decision_variable: string;
    constraint: string;
    terms: Record<string, string>;
    penalty_strength: number;
  };
  candidates: CandidateDetail[];
  weights: QUBOWeights;
  service_radius_km: number;
  penalty_strength: number;
  qubo_stats: QUBOStats;
}

export interface QUBORequest {
  num_camps: number;
  risk_weight: number;
  population_weight: number;
  network_weight: number;
  accessibility_weight: number;
  distance_weight: number;
  cost_weight: number;
  service_radius_km: number;
  penalty_strength: number;
}

// ---------- QAOA ----------
export interface BitstringResult {
  bitstring: string;
  selected_indices: number[];
  count: number;
  probability: number;
  cost: number;
  feasible: boolean;
  num_selected: number;
}

export interface SelectedFacility {
  index: number;
  id: string;
  name: string;
  lat: number;
  lng: number;
  coverage_score: number;
}

export interface CircuitInfo {
  num_qubits: number;
  depth: number;
  num_parameters: number;
  gate_count: number;
  circuit_depth: number;
}

export interface OptimizationProgress {
  iteration: number;
  cost: number;
}

export interface QAOAResult {
  success: boolean;
  selected_indices: number[];
  selected_facilities: SelectedFacility[];
  objective_value: number | null;
  is_feasible: boolean;
  circuit_info: CircuitInfo;
  optimization: {
    method: string;
    iterations: number;
    final_cost: number;
    convergence: boolean;
    history: OptimizationProgress[];
  };
  measurements: {
    total_shots: number;
    unique_bitstrings: number;
    top_results: BitstringResult[];
  };
  execution_time_seconds: number;
  algorithm: string;
  backend: string;
  qiskit_version: string;
  error?: string;
}

// ---------- Classical / MILP ----------
export interface CoverageMetrics {
  population_covered: number;
  population_coverage_pct: number;
  high_risk_covered: number;
  high_risk_coverage_pct: number;
  avg_distance_km: number;
  total_deployment_cost: number;
}

export interface ClassicalResult {
  success: boolean;
  status: string;
  selected_indices: number[];
  selected_facilities: SelectedFacility[];
  objective_value: number | null;
  coverage: CoverageMetrics;
  execution_time_seconds: number;
  algorithm: string;
  solver: string;
  error?: string;
}

// ---------- Forecasting ----------
export interface ForecastHistory {
  days: number[];
  cases: number[];
  recovered: number[];
}

export interface ForecastData {
  days: number[];
  predicted_cases: number[];
  predicted_recovered: number[];
  upper_bound: number[];
  lower_bound: number[];
}

export interface PeakDemand {
  cases: number;
  day: number;
  medical_staff_needed: number;
  beds_needed: number;
  test_kits_needed: number;
}

export interface ForecastResult {
  horizon_days: number;
  history: ForecastHistory;
  forecast: ForecastData;
  trend: 'increasing' | 'decreasing' | 'stable';
  peak_demand: PeakDemand;
  confidence_level: number;
}

// ---------- Anomaly Detection ----------
export interface AnomalyPoint {
  window: number;
  hour: number;
  contacts: number;
  baseline: number;
  z_score: number;
  deviation: number;
  is_anomaly: boolean;
  severity?: 'HIGH' | 'MEDIUM';
  affected_area?: string;
  area_id?: string;
  description?: string;
}

export interface AnomalyResult {
  anomalies: AnomalyPoint[];
  normal_points: AnomalyPoint[];
  all_points: AnomalyPoint[];
  summary: {
    total_windows: number;
    anomaly_count: number;
    anomaly_rate: number;
    total_contacts: number;
    avg_contacts: number;
    max_contacts: number;
    z_threshold: number;
    std_deviation: number;
  };
}

// ---------- Dataset ----------
export interface DatasetStats {
  name: string;
  description: string;
  raw_events: number;
  individuals: number;
  edges: number;
  source: string;
  file: string;
  time_range_hours: number;
  columns: string[];
  missing_values: number;
  processing_status: string;
}

// ---------- App State ----------
export interface MapLayer {
  riskHeatmap: boolean;
  hospitals: boolean;
  existingCamps: boolean;
  candidateSites: boolean;
  recommendedCamps: boolean;
  serviceRadius: boolean;
  contactDensity: boolean;
}
