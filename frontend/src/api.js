
const BASE_URL = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
const USE_MOCK = !import.meta.env.VITE_API_URL || BASE_URL === 'http://127.0.0.1:8000';

function getToken() {
  try {
    const stored = localStorage.getItem('fraud_auth_user');
    if (stored) return JSON.parse(stored).token;
  } catch (error) {
    return null;
  }
  return null;
}

function getMock(path, params) {
  const fallback = MOCK_DATA[path] || MOCK_DATA[path.split('?')[0]];
  if (fallback) return typeof fallback === 'function' ? fallback(params) : JSON.parse(JSON.stringify(fallback));
  return null;
}

async function request(method, path, body = null, params = null) {
  if (USE_MOCK) {
    const mock = getMock(path, params);
    if (mock) return mock;
    throw new Error(`No mock data for ${path}`);
  }

  const token = getToken();

  let url = `${BASE_URL}${path}`;
  if (params) {
    const queryString = new URLSearchParams(params).toString();
    url += `?${queryString}`;
  }

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  if (token) {
    headers['Authorization'] = `Basic ${token}`;
  }

  const opts = { method, headers, mode: 'cors' };
  if (body) opts.body = JSON.stringify(body);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    opts.signal = controller.signal;
    const res = await fetch(url, opts);
    clearTimeout(timeout);

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.detail || `Server Error ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    console.warn(`API Fallback [${method} ${path}]:`, error.message);
    const mock = getMock(path, params);
    if (mock) return mock;
    throw error;
  }
}

import {
  CANONICAL_MODEL, CANONICAL_FUNNEL, CANONICAL_FINANCIALS, CANONICAL_PROVIDERS,
  CANONICAL_PATIENTS, CANONICAL_POLICIES, CANONICAL_MONTHLY_TRENDS,
  CANONICAL_CLAIMS_OVER_TIME, CANONICAL_NOTIFICATIONS, CANONICAL_FRAUD_DIAGNOSES,
  CANONICAL_FRAUD_BY_CITY, CANONICAL_REGIONAL_DATA, CANONICAL_FRAUD_CATEGORIES,
  CANONICAL_TOP_RISKY_PROVIDERS, CANONICAL_TOP_RISKY_PATIENTS, CANONICAL_CUMULATIVE_SAVINGS,
  CANONICAL_GENDER_DISTRIBUTION, CANONICAL_SPECIALTY_DISTRIBUTION
} from './data/canonicalData';

const MOCK_DATA = {
  '/api/stats': {
    total_claims: CANONICAL_FUNNEL.totalClaims,
    total_fraud: CANONICAL_FUNNEL.aiScoredHighRisk,
    flagged_claims: CANONICAL_FUNNEL.formallyFlagged,
    escalated_alerts: CANONICAL_FUNNEL.escalatedAlerts,
    total_amount: CANONICAL_FINANCIALS.totalClaimValue,
    fraud_amount: CANONICAL_FINANCIALS.fraudExposure,
    normal_claims: CANONICAL_FUNNEL.normalClaims,
    total_providers: CANONICAL_FUNNEL.totalProviders,
    total_patients: CANONICAL_FUNNEL.totalPatients,
    total_policies: CANONICAL_FUNNEL.totalPolicies,
    pending_claims: 1420,
    approved_claims: 14890,
    denied_claims: 1890,
    under_review: 1872,
    fraud_rate: 24.83,
    avg_claim_amount: CANONICAL_FINANCIALS.avgClaimAmount,
    detection_accuracy: CANONICAL_MODEL.accuracy * 100,
    model_accuracy: CANONICAL_MODEL.accuracy,
    model_version: CANONICAL_MODEL.version,
    model_f1: CANONICAL_MODEL.f1Score,
    model_roc_auc: CANONICAL_MODEL.rocAuc,
    money_saved: CANONICAL_FINANCIALS.moneySaved,
    financial_exposure: CANONICAL_FINANCIALS.fraudExposure,
    total_claim_amount: CANONICAL_FINANCIALS.totalClaimValue,
    monthly_data: CANONICAL_MONTHLY_TRENDS,
  },
  '/api/charts/claims-over-time': CANONICAL_CLAIMS_OVER_TIME.map(d => ({
    month: d.date.slice(0, 7),
    date: d.date,
    total: d.total_claims,
    flagged: d.fraud_claims,
    total_claims: d.total_claims,
    fraud_claims: d.fraud_claims,
  })),
  '/api/charts/monthly-claims': CANONICAL_MONTHLY_TRENDS.map(d => ({
    month: d.month,
    claims: d.claims,
    amount: d.amount,
    total_claims: d.claims,
    fraud_claims: d.fraud_claims,
  })),
  '/api/charts/fraud-by-provider': CANONICAL_PROVIDERS.map(p => ({
    provider: p.name,
    provider_name: p.name,
    fraud_cases: p.fraud_claims,
    total_claims: p.total_claims,
    rate: +((p.fraud_claims / p.total_claims) * 100).toFixed(1),
  })),
  '/api/charts/fraud-by-region': CANONICAL_REGIONAL_DATA.map(r => ({
    region: r.state,
    state: r.state,
    fraud_cases: r.fraud_claims,
    fraud_claims: r.fraud_claims,
    percentage: +((r.fraud_claims / r.total_claims) * 100).toFixed(1),
    total_claims: r.total_claims,
    amount: r.total_claims * CANONICAL_FINANCIALS.avgClaimAmount,
  })),
  '/api/charts/fraud-by-diagnosis': CANONICAL_FRAUD_DIAGNOSES.map(d => ({
    code: d.code,
    description: d.description,
    diagnosis_code: d.code,
    total_claims: d.claims,
    fraud_claims: d.fraud_claims,
    fraud_cases: d.fraud_claims,
    amount: d.amount,
    rate: d.fraud_rate,
    fraud_rate: d.fraud_rate,
  })),
  '/api/charts/fraud-by-city': CANONICAL_FRAUD_BY_CITY.map(c => ({
    city: c.city,
    state: c.state,
    fraud_cases: c.fraud_claims,
    fraud_claims: c.fraud_claims,
    total_claims: c.total_claims,
    rate: c.rate,
  })),
  '/api/charts/fraud-score-distribution': [
    { range: '0-10', count: 6245, label: 'Very Low Risk', score_range: '0-10%' },
    { range: '10-20', count: 4832, label: 'Low Risk', score_range: '10-20%' },
    { range: '20-30', count: 3156, label: 'Low Risk', score_range: '20-30%' },
    { range: '30-40', count: 2234, label: 'Medium Risk', score_range: '30-40%' },
    { range: '40-50', count: 1567, label: 'Medium Risk', score_range: '40-50%' },
    { range: '50-60', count: 923, label: 'High Risk', score_range: '50-60%' },
    { range: '60-70', count: 534, label: 'High Risk', score_range: '60-70%' },
    { range: '70-80', count: 312, label: 'Very High Risk', score_range: '70-80%' },
    { range: '80-90', count: 198, label: 'Critical Risk', score_range: '80-90%' },
    { range: '90-100', count: 71, label: 'Critical Risk', score_range: '90-100%' },
  ],
  '/api/charts/claim-status-distribution': [
    { status: 'Approved', count: 14890, percentage: 74.2 },
    { status: 'Under Review', count: 1872, percentage: 9.3 },
    { status: 'Rejected', count: 1890, percentage: 9.4 },
    { status: 'AI Scored', count: 780, percentage: 3.9 },
    { status: 'Fraud Confirmed', count: 342, percentage: 1.7 },
    { status: 'Submitted', count: 298, percentage: 1.5 },
  ],
  '/api/charts/fraud-categories': CANONICAL_FRAUD_CATEGORIES,
  '/api/charts/average-claim-cost': CANONICAL_MONTHLY_TRENDS.map(d => ({
    month: d.month,
    avg_cost: CANONICAL_FINANCIALS.avgClaimAmount + (Math.random() * 200 - 100),
  })),
  '/api/analytics/top-providers': CANONICAL_TOP_RISKY_PROVIDERS.map(p => ({
    name: p.name,
    total_claims: p.claim_count,
    fraud_claims: p.fraud_count,
    fraud_rate: +((p.fraud_count / p.claim_count) * 100).toFixed(1),
    total_amount: p.total_amount,
    flagged_amount: Math.round(p.total_amount * 0.1),
    claim_count: p.claim_count,
    fraud_count: p.fraud_count,
  })),
  '/api/analytics/top-patients': CANONICAL_TOP_RISKY_PATIENTS.map(p => ({
    name: p.name,
    claim_count: p.claim_count,
    fraud_count: p.fraud_count,
    total_claims: p.claim_count,
    age: p.age,
    gender: p.gender,
    city: p.city,
  })),
  '/api/analytics/top-diagnoses': CANONICAL_FRAUD_DIAGNOSES.slice(0, 6).map(d => ({
    diagnosis_code: d.code,
    code: d.code,
    description: d.description,
    claim_count: d.claims,
    claims: d.claims,
    fraud_count: d.fraud_claims,
    fraud_rate: d.fraud_rate,
    amount: d.amount,
  })),
  '/api/claims': () => {
    const patients = CANONICAL_PATIENTS.map(p => p.name);
    const providerNames = CANONICAL_PROVIDERS.map(p => p.name);
    const statuses = ['Submitted', 'AI Scored', 'Under Review', 'Approved', 'Rejected', 'Fraud Confirmed', 'Closed'];
    const claims = [];
    for (let i = 0; i < 200; i++) {
      const score = Math.round((Math.random() * 0.96 + 0.01) * 100) / 100;
      // Realistic claim amounts: log-normal centered ~$1,250, tail up to $150K
      const raw = Math.exp(Math.log(1250) + 0.8 * (Math.random() + Math.random() + Math.random() - 1.5));
      const amount = Math.round(Math.max(150, Math.min(raw, 150000)) * 100) / 100;
      const riskLevel = score >= 0.85 ? 'critical' : score >= 0.65 ? 'high' : score >= 0.45 ? 'medium' : 'low';
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
      const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
      const year = Math.random() > 0.3 ? '2025' : '2026';
      claims.push({
        id: `CLM-${year}-${String(200000 + i).padStart(6, '0')}`,
        claim_id: `CLM-${year}-${String(200000 + i).padStart(6, '0')}`,
        patient_name: patients[i % patients.length],
        provider_name: providerNames[i % providerNames.length],
        amount, status, fraud_score: score, risk_level: riskLevel,
        date: `${year}-${month}-${day}`,
        diagnosis_code: CANONICAL_FRAUD_DIAGNOSES[i % CANONICAL_FRAUD_DIAGNOSES.length].code,
        flagged: score >= 0.65,
        claim_amount: amount,
      });
    }
    return { claims, total: 200 };
  },
  '/api/patients': () => {
    return CANONICAL_PATIENTS.map(p => ({
      id: p.id, name: p.name, age: p.age, gender: p.gender,
      city: p.city, state: p.state,
      total_claims: p.total_claims, total_amount: p.total_amount,
      flagged_claims: p.flagged_claims, fraud_score: p.fraud_score / 100,
      risk_level: p.fraud_score >= 80 ? 'critical' : p.fraud_score >= 60 ? 'high' : p.fraud_score >= 40 ? 'medium' : 'low',
      insurance_plan: ['Medicare','Medicaid','Blue Cross','Aetna','UnitedHealth','Cigna'][parseInt(p.id.slice(-1)) % 6],
      status: 'active',
      claim_count: p.total_claims,
      fraud_count: p.flagged_claims,
    }));
  },
  '/api/providers': () => CANONICAL_PROVIDERS,
  '/api/policies': () => CANONICAL_POLICIES,
  '/api/notifications': () => CANONICAL_NOTIFICATIONS,
  '/api/ai-insights': () => ({
    insights: [
      { id: 1, type: 'pattern', title: 'Upcoding Surge in Q4', description: 'Analysis reveals a 34% increase in upcoded claims (CPT 99214→99215) from providers in the Northeast region during Q4 2025. Estimated financial impact: $4.2M.', confidence: 94.5, severity: 'high', actionable: true, created_at: '2025-12-16T10:00:00Z', priority: 'high' },
      { id: 2, type: 'anomaly', title: 'Phantom Billing Ring Detected', description: 'Network analysis identified 5 providers sharing overlapping patient records with suspicious billing patterns. Cross-referencing with provider address data reveals 3 share the same registered address.', confidence: 89.2, severity: 'critical', actionable: true, created_at: '2025-12-15T14:30:00Z', priority: 'high' },
      { id: 3, type: 'prediction', title: 'Claim Volume Surge Expected', description: 'Predictive model forecasts a 18-22% increase in claim volume during December holidays. Recommend scaling fraud detection resources accordingly.', confidence: 82.7, severity: 'medium', actionable: true, created_at: '2025-12-14T09:15:00Z', priority: 'medium' },
      { id: 4, type: 'recommendation', title: 'Threshold Optimization', description: 'Current fraud detection threshold (0.75) can be optimized to 0.72 to improve recall by 4.2% without significant increase in false positives.', confidence: 91.3, severity: 'medium', actionable: true, created_at: '2025-12-13T11:00:00Z', priority: 'medium' },
      { id: 5, type: 'pattern', title: 'Weekend Billing Anomaly', description: 'Weekend claim submissions show 47% higher fraud probability than weekday submissions. Flagged for enhanced review on Saturday-Sunday claims.', confidence: 87.8, severity: 'high', actionable: true, created_at: '2025-12-12T16:45:00Z', priority: 'low' },
    ],
    summary: { total_insights: 5, critical: 1, high: 2, medium: 2, low: 0, avg_confidence: 89.1 },
    model_accuracy: CANONICAL_MODEL.accuracy,
    precision: CANONICAL_MODEL.precision,
    recall: CANONICAL_MODEL.recall,
    f1: CANONICAL_MODEL.f1Score,
    roc_auc: CANONICAL_MODEL.rocAuc,
    model_version: CANONICAL_MODEL.version,
  }),
  '/api/model/metrics': () => ({
    accuracy: CANONICAL_MODEL.accuracy,
    precision: CANONICAL_MODEL.precision,
    recall: CANONICAL_MODEL.recall,
    f1_score: CANONICAL_MODEL.f1Score,
    roc_auc: CANONICAL_MODEL.rocAuc,
    prediction_time_ms: CANONICAL_MODEL.predictionTimeMs,
    model_version: CANONICAL_MODEL.version,
    dataset_version: CANONICAL_MODEL.datasetVersion,
    training_date: CANONICAL_MODEL.trainingDate,
    data_drift: CANONICAL_MODEL.dataDrift,
    last_retrained: CANONICAL_MODEL.lastRetrained,
    validation_accuracy: CANONICAL_MODEL.validationAccuracy,
    num_features: CANONICAL_MODEL.numFeatures,
    training_size: CANONICAL_MODEL.trainingSize,
    confusion_matrix: CANONICAL_MODEL.confusionMatrix,
    feature_importance: CANONICAL_MODEL.featureImportance,
    model_versions: CANONICAL_MODEL.versions,
  }),
  '/api/system/health': () => ({
    status: 'healthy', uptime: '47d 14h 32m', version: '2.8.3',
    database: { status: 'connected', latency_ms: 12, connections: '47/200', last_backup: '2025-12-16T12:00:00Z' },
    api: { status: 'running', avg_response_ms: 145, requests_per_min: 1247, uptime_pct: 99.97 },
    gpu: { status: 'active', utilization_pct: 67, memory_used_gb: 14.2, memory_total_gb: 24, temperature_c: 72 },
    disk: { status: 'warning', used_gb: 847, total_gb: 1000, usage_pct: 82.7, iops: 12400 },
    queue: { status: 'healthy', size: 23, processed_per_hour: 45230, failed_24h: 3 },
    jobs: { status: 'running', active: 4, queued: 12, completed_24h: 1847 }
  }),
  '/api/audit-logs': () => ({
    logs: [
      { id: 1, timestamp: '2025-12-16T14:32:18Z', user: 'admin_insurance', action: 'VIEW', resource: 'Dashboard', details: 'Viewed fraud analytics dashboard' },
      { id: 2, timestamp: '2025-12-16T14:30:45Z', user: 'admin_insurance', action: 'UPDATE', resource: 'Claim CLM-2025-200127', details: 'Updated claim status to Under Review' },
      { id: 3, timestamp: '2025-12-16T14:28:12Z', user: 'auditor_insurance', action: 'EXPORT', resource: 'Reports', details: 'Exported fraud report (CSV format)' },
      { id: 4, timestamp: '2025-12-16T14:25:30Z', user: 'admin_insurance', action: 'VIEW', resource: 'Model Management', details: 'Viewed model performance metrics' },
      { id: 5, timestamp: '2025-12-16T14:22:15Z', user: 'manager_insurance', action: 'CREATE', resource: 'Notification', details: 'Generated fraud alert notifications' },
      { id: 6, timestamp: '2025-12-16T14:18:45Z', user: 'admin_insurance', action: 'UPDATE', resource: 'Settings', details: 'Updated fraud detection threshold to 0.75' },
      { id: 7, timestamp: '2025-12-16T14:15:20Z', user: 'auditor_insurance', action: 'VIEW', resource: 'Alert Center', details: 'Reviewed 14 fraud alerts' },
      { id: 8, timestamp: '2025-12-16T14:10:00Z', user: 'admin_insurance', action: 'LOGIN', resource: 'System', details: 'Successful login from 192.168.1.45' },
      { id: 9, timestamp: '2025-12-16T13:55:30Z', user: 'manager_insurance', action: 'VIEW', resource: 'Executive Summary', details: 'Viewed executive dashboard' },
      { id: 10, timestamp: '2025-12-16T13:45:10Z', user: 'admin_insurance', action: 'UPDATE', resource: 'Model', details: 'Triggered model retraining' }
    ],
    total: 10
  }),
  '/api/stats/trends': () => ({
    claims_trend: { current: CANONICAL_FUNNEL.totalClaims, previous: 18900, change_pct: 5.28 },
    fraud_trend: { current: CANONICAL_FUNNEL.aiScoredHighRisk, previous: 4750, change_pct: 4.9 },
    amount_trend: { current: CANONICAL_FINANCIALS.totalClaimValue, previous: 23_800_000, change_pct: 5.4 },
    detection_trend: { current: CANONICAL_MODEL.accuracy * 100, previous: 93.8, change_pct: 0.85 },
    money_saved_trend: 8.2,
    suspicious_providers_active: CANONICAL_FUNNEL.totalProviders,
  }),
  '/api/heatmap/providers': () => CANONICAL_PROVIDERS.slice(0, 5).map(p => ({
    name: p.name,
    lat: { 'New York': 40.7128, 'Los Angeles': 34.0522, 'Chicago': 41.8781, 'San Francisco': 37.7749, 'Denver': 39.7392 }[p.city] || 39.0,
    lng: { 'New York': -74.006, 'Los Angeles': -118.2437, 'Chicago': -87.6298, 'San Francisco': -122.4194, 'Denver': -104.9903 }[p.city] || -98.0,
    fraud_rate: +((p.fraud_claims / p.total_claims) * 100).toFixed(1),
    claims: p.total_claims,
  })),
  '/api/search': (params) => {
    const q = params?.q?.toLowerCase() || '';
    return {
      results: [
        { type: 'claim', id: 'CLM-2025-200127', title: 'Claim #CLM-2025-200127', subtitle: '$2,450 - Under Review', url: '/insurance/claims/CLM-2025-200127' },
        { type: 'provider', id: 'PRV-001', title: 'Metropolitan General Hospital', subtitle: 'Fraud Rate: 10.3%', url: '/insurance/providers' },
        { type: 'patient', id: 'PAT-001', title: 'Margaret Thompson', subtitle: '47 claims, Risk: High', url: '/insurance/patients' }
      ].filter(r => !q || r.title.toLowerCase().includes(q) || r.subtitle.toLowerCase().includes(q)),
      total: 3
    };
  },
  '/api/reports/data': () => ({
    monthly: CANONICAL_MONTHLY_TRENDS.map(d => ({
      month: d.month, claims: d.claims, fraud: d.fraud_claims,
      amount: d.amount, loss: Math.round(d.amount * 0.12),
    })),
    total_claims: CANONICAL_FUNNEL.totalClaims,
    total_fraud: CANONICAL_FUNNEL.aiScoredHighRisk,
    total_amount: CANONICAL_FINANCIALS.fraudExposure,
  }),
};

const api = {
  login: async (username, password) => {
    const token = btoa(`${username}:${password}`);
    const isInsurance = ['admin_insurance', 'auditor_insurance', 'manager_insurance'].includes(username);
    const role = isInsurance ? 'insurance' : 'provider';
    let subrole = 'admin';
    if (username === 'auditor_insurance') subrole = 'auditor';
    if (username === 'manager_insurance') subrole = 'manager';
    if (!isInsurance) subrole = 'doctor';
    const data = { token, username, role, subrole };
    localStorage.setItem('fraud_auth_user', JSON.stringify(data));
    return data;
  },

  getStats: () => request('GET', '/api/stats'),
  getMetrics: () => request('GET', '/api/stats'),
  getClaims: (params) => request('GET', '/api/claims', null, params),
  submitClaim: (data) => request('POST', '/api/claims', data),
  updateClaimStatus: (id, status) => request('PATCH', `/api/claims/${id}/status`, { status }),

  getPatients: () => request('GET', '/api/patients'),
  getProviders: () => request('GET', '/api/providers'),
  getPolicies: () => request('GET', '/api/policies'),
  getServices: () => request('GET', '/api/services'),
  createService: (data) => request('POST', '/api/services', data),
  updateService: (id, data) => request('PATCH', `/api/services/${id}`, data),
  deleteService: (id) => request('DELETE', `/api/services/${id}`),

  getLabeledData: (params) => request('GET', '/api/labeled-data', null, params),
  createLabeledRecord: (data) => request('POST', '/api/labeled-data', data),
  updateLabeledRecord: (id, data) => request('PATCH', `/api/labeled-data/${id}`, data),
  deleteLabeledRecord: (id) => request('DELETE', `/api/labeled-data/${id}`),

  getClaimsOverTime: () => request('GET', '/api/charts/claims-over-time'),
  getFraudByProvider: () => request('GET', '/api/charts/fraud-by-provider'),
  getFraudByRegion: () => request('GET', '/api/charts/fraud-by-region'),
  getFraudByDiagnosis: () => request('GET', '/api/charts/fraud-by-diagnosis'),
  getFraudByCity: () => request('GET', '/api/charts/fraud-by-city'),
  getFraudScoreDistribution: () => request('GET', '/api/charts/fraud-score-distribution'),
  getClaimStatusDistribution: () => request('GET', '/api/charts/claim-status-distribution'),
  getMonthlyClaims: () => request('GET', '/api/charts/monthly-claims'),
  getAverageClaimCost: () => request('GET', '/api/charts/average-claim-cost'),

  getTopProviders: () => request('GET', '/api/analytics/top-providers'),
  getTopPatients: () => request('GET', '/api/analytics/top-patients'),
  getTopDiagnoses: () => request('GET', '/api/analytics/top-diagnoses'),

  getAiInsights: () => request('GET', '/api/ai-insights'),

  getNotifications: () => request('GET', '/api/notifications'),
  getNotificationDetail: (id) => request('GET', `/api/notifications/${id}`),
  markNotificationRead: (id) => request('PATCH', `/api/notifications/${id}/read`),
  markAllNotificationsRead: () => request('PATCH', '/api/notifications/read-all'),

  getModelMetrics: () => request('GET', '/api/model/metrics'),
  triggerRetrain: () => request('POST', '/api/model/retrain'),

  getAuditLogs: (params) => request('GET', '/api/audit-logs', null, params),

  getSystemHealth: () => request('GET', '/api/system/health'),

  getHeatmapProviders: () => request('GET', '/api/heatmap/providers'),

  getStatsTrends: () => request('GET', '/api/stats/trends'),
  generateNotifications: () => request('POST', '/api/notifications/generate'),
  getReportData: (params) => request('GET', '/api/reports/data', null, params),
  exportReports: (params) => request('GET', '/api/reports/export', null, params),

  getDistributionByRegion: () => request('GET', '/api/charts/fraud-by-region'),
  getFraudByCategory: () => request('GET', '/api/charts/fraud-categories'),

  searchGlobal: (q) => request('GET', '/api/search', null, { q }),

  getClaim: (id) => request('GET', `/api/claims/${id}`),
  getClaimInvestigation: (id) => request('GET', `/api/claims/${id}/investigation`),
  updateInvestigation: (id, data) => request('PATCH', `/api/claims/${id}/investigation`, data),
  addInvestigationNote: (id, note) => request('POST', `/api/claims/${id}/investigation/notes`, note),
};

export default api;
