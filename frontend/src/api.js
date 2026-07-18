
const BASE_URL = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, ''); 

function getToken() {
  try {
    const stored = localStorage.getItem('fraud_auth_user');
    if (stored) return JSON.parse(stored).token;
  } catch (error) {
    return null;
  }
  return null;
}

async function request(method, path, body = null, params = null) {
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
    const res = await fetch(url, opts);
    
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.detail || `Server Error ${res.status}`);
    }
    
    return await res.json();
  } catch (error) {
    console.error(`🔴 API Failure [${method} ${path}]:`, error.message);
    throw error;
  }
}

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
  getMetrics: () => request('GET', '/api/stats'), // Alias for compatibility
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
  markNotificationRead: (id) => request('PATCH', `/api/notifications/${id}/read`),
  markAllNotificationsRead: () => request('PATCH', '/api/notifications/read-all'),
  
  getModelMetrics: () => request('GET', '/api/model/metrics'),
  triggerRetrain: () => request('POST', '/api/model/retrain'),
  
  getAuditLogs: (params) => request('GET', '/api/audit-logs', null, params),
  
  getSystemHealth: () => request('GET', '/api/system/health'),
  
  getHeatmapProviders: () => request('GET', '/api/heatmap/providers'),
  
  // NEW ENDPOINTS
  getStatsTrends: () => request('GET', '/api/stats/trends'),
  generateNotifications: () => request('POST', '/api/notifications/generate'),
  getReportData: (params) => request('GET', '/api/reports/data', null, params),
  exportReports: (params) => request('GET', '/api/reports/export', null, params),
};

export default api;

