const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function getToken() {
  try {
    const stored = localStorage.getItem('fraud_auth_user');
    if (stored) return JSON.parse(stored).token;
  } catch { /* skip */ }
  return null;
}

async function request(method, path, body) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE_URL}${path}`, opts);
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.detail || errBody.message || `API ${method} ${path} failed: ${res.status}`);
  }
  return res.json();
}

const api = {
  // Auth
  login: (username, password) => request('POST', '/auth/login', { username, password }),

  // Users (admin)
  getUsers: () => request('GET', '/admin/users'),
  createUser: (data) => request('POST', '/admin/users', data),
  deleteUser: (id) => request('DELETE', `/admin/users/${id}`),

  // Claims
  submitClaim: (data) => request('POST', '/claims', data),
  getClaims: (params = '') => request('GET', `/claims${params}`),
  getClaim: (id) => request('GET', `/claims/${id}`),
  updateLabel: (id, label) => request('PATCH', `/claims/${id}`, { label }),

  // Patients (hospital)
  getPatients: () => request('GET', '/patients'),
  createPatient: (data) => request('POST', '/patients', data),
  deletePatient: (id) => request('DELETE', `/patients/${id}`),
  importPatients: (rows) => request('POST', '/patients/bulk', rows),
  exportPatients: () => request('GET', '/patients/export'),

  // Labeled data (insurance — for model retraining)
  getLabeledData: () => request('GET', '/labeled-data'),
  createLabeledRecord: (data) => request('POST', '/labeled-data', data),
  importLabeledData: (rows) => request('POST', '/labeled-data/bulk', rows),
  exportLabeledData: () => request('GET', '/labeled-data/export'),

  // Admin
  getMetrics: () => request('GET', '/admin/metrics'),
  triggerRetrain: () => request('POST', '/admin/retrain'),
  getModelHistory: () => request('GET', '/admin/model-history'),
};

export default api;
