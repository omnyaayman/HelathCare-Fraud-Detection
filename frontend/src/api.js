const BASE_URL = 'http://127.0.0.1:8000'; 

// دالة لجلب التوكن من التخزين المحلي
function getToken() {
  try {
    const stored = localStorage.getItem('fraud_auth_user');
    // التوكن هنا هو base64(username:password) اللي اتخزن وقت اللوجين
    if (stored) return JSON.parse(stored).token;
  } catch (error) {
    return null;
  }
  return null;
}

// الدالة المركزية للطلبات
async function request(method, path, body = null, params = null) {
  const token = getToken();
  
  let url = `${BASE_URL}${path}`;
  if (params) {
    // تحويل الأوبجكت لـ query string (مثلاً: ?min_score=0.6)
    const queryString = new URLSearchParams(params).toString();
    url += `?${queryString}`;
  }

  const headers = { 
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  // لو فيه توكن (يوزر مسجل)، ابعته في الهيدر
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
  // 0️⃣ تسجيل الدخول (Authentication)
  login: async (username, password) => {
    const token = btoa(`${username}:${password}`); // تحويل لـ Base64
    const res = await fetch(`${BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 
        'Authorization': `Basic ${token}`,
        'Content-Type': 'application/json'
      }
    });
    if (!res.ok) throw new Error('Invalid credentials');
    const data = await res.json();
    return { ...data, token }; // بنرجع بيانات اليوزر مع التوكن عشان يتخزن
  },

  // 1️⃣ المطالبات (Claims)
  submitClaim: (data) => request('POST', '/api/process-claim', data),
  getClaims: (params = {}) => request('GET', '/api/my-claims', null, params),
  updateClaimStatus: (id, data) => request('PATCH', `/api/claims/${id}`, data),

  // 2️⃣ المرضى والسياسات (Patients & Policies)
  getPatients: () => request('GET', '/api/patients'),
  createPatient: (data) => request('POST', '/api/patients', data),
  updatePatient: (id, data) => request('PATCH', `/api/patients/${id}`, data),
  deletePatient: (id) => request('DELETE', `/api/patients/${id}`),
  importPatients: (rows) => request('POST', '/api/patients/bulk', rows),
  updatePolicy: (id, data) => request('PATCH', `/api/policies/${id}`, data),

  // 3️⃣ المزودين (Providers)
  getProviders: () => request('GET', '/api/providers-list'),
  createProvider: (data) => request('POST', '/api/providers', data),
  deleteProvider: (id) => request('DELETE', `/api/providers/${id}`),

  // 4️⃣ البيانات المصنفة (Labeled Data للتدريب)
  getLabeledData: () => request('GET', '/api/labeled-data'),
  createLabeledRecord: (data) => request('POST', '/api/labeled-data', data),
  importLabeledData: (rows) => request('POST', '/api/labeled-data/bulk', rows),

  // 5️⃣ الإحصائيات والموديل (Admin & Metrics)
  getMetrics: () => request('GET', '/api/stats'),
  triggerRetrain: () => request('POST', '/api/retrain'),

  // 6️⃣ إدارة الخدمات والكوباي (Services & Copay Management) - التعديل الجديد 🔥
  getServices: () => request('GET', '/api/services'),
  createService: (data) => request('POST', '/api/services', data),
  updateServiceCopay: (id, data) => request('PATCH', `/api/services/${id}`, data),
  
  // دالة عامة للطوارئ
  request: (method, path, body, params) => request(method, path, body, params)
};

export default api;