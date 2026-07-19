
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
    const fallback = MOCK_DATA[path] || MOCK_DATA[path.split('?')[0]];
    if (fallback) return typeof fallback === 'function' ? fallback(params) : JSON.parse(JSON.stringify(fallback));
    throw error;
  }
}

const MOCK_DATA = {
  '/api/stats': {
    total_claims: 1247832, flagged_claims: 89456, total_amount: 487500000, fraud_amount: 234700000,
    total_providers: 3847, total_patients: 45230, total_policies: 28940, pending_claims: 114696,
    approved_claims: 845230, denied_claims: 89456, under_review: 198450,
    fraud_rate: 7.17, avg_claim_amount: 39065, detection_accuracy: 94.6,
    claims_trend: '+5.2%', fraud_trend: '+3.8%', amount_trend: '+7.1%',
    monthly_data: [
      { month: 'Jan 2025', claims: 98450, fraud: 6892, amount: 18750000 },
      { month: 'Feb 2025', claims: 95230, fraud: 6667, amount: 18100000 },
      { month: 'Mar 2025', claims: 102800, fraud: 7196, amount: 19800000 },
      { month: 'Apr 2025', claims: 108900, fraud: 7623, amount: 20900000 },
      { month: 'May 2025', claims: 112400, fraud: 8430, amount: 21500000 },
      { month: 'Jun 2025', claims: 106700, fraud: 7469, amount: 20100000 },
      { month: 'Jul 2025', claims: 115800, fraud: 8685, amount: 22200000 },
      { month: 'Aug 2025', claims: 118200, fraud: 8865, amount: 22800000 },
      { month: 'Sep 2025', claims: 109500, fraud: 8213, amount: 20800000 },
      { month: 'Oct 2025', claims: 113700, fraud: 8528, amount: 21600000 },
      { month: 'Nov 2025', claims: 120100, fraud: 9008, amount: 23100000 },
      { month: 'Dec 2025', claims: 146952, fraud: 10480, amount: 28250000 }
    ]
  },
  '/api/charts/claims-over-time': [
    { month: 'Jan 2025', total: 98450, flagged: 6892 },
    { month: 'Feb 2025', total: 95230, flagged: 6667 },
    { month: 'Mar 2025', total: 102800, flagged: 7196 },
    { month: 'Apr 2025', total: 108900, flagged: 7623 },
    { month: 'May 2025', total: 112400, flagged: 8430 },
    { month: 'Jun 2025', total: 106700, flagged: 7469 },
    { month: 'Jul 2025', total: 115800, flagged: 8685 },
    { month: 'Aug 2025', total: 118200, flagged: 8865 },
    { month: 'Sep 2025', total: 109500, flagged: 8213 },
    { month: 'Oct 2025', total: 113700, flagged: 8528 },
    { month: 'Nov 2025', total: 120100, flagged: 9008 },
    { month: 'Dec 2025', total: 146952, flagged: 10480 }
  ],
  '/api/charts/monthly-claims': [
    { month: 'Jan 2025', claims: 98450, amount: 18750000 },
    { month: 'Feb 2025', claims: 95230, amount: 18100000 },
    { month: 'Mar 2025', claims: 102800, amount: 19800000 },
    { month: 'Apr 2025', claims: 108900, amount: 20900000 },
    { month: 'May 2025', claims: 112400, amount: 21500000 },
    { month: 'Jun 2025', claims: 106700, amount: 20100000 },
    { month: 'Jul 2025', claims: 115800, amount: 22200000 },
    { month: 'Aug 2025', claims: 118200, amount: 22800000 },
    { month: 'Sep 2025', claims: 109500, amount: 20800000 },
    { month: 'Oct 2025', claims: 113700, amount: 21600000 },
    { month: 'Nov 2025', claims: 120100, amount: 23100000 },
    { month: 'Dec 2025', claims: 146952, amount: 28250000 }
  ],
  '/api/charts/fraud-by-provider': [
    { provider: 'Metropolitan General Hospital', fraud_cases: 4523, total_claims: 38900, rate: 11.6 },
    { provider: 'St. Mary Medical Center', fraud_cases: 3891, total_claims: 35200, rate: 11.1 },
    { provider: 'City Health Network', fraud_cases: 3456, total_claims: 42100, rate: 8.2 },
    { provider: 'Pacific Wellness Group', fraud_cases: 2987, total_claims: 28700, rate: 10.4 },
    { provider: 'Summit Healthcare Partners', fraud_cases: 2654, total_claims: 31200, rate: 8.5 },
    { provider: 'Lakeside Medical Associates', fraud_cases: 2345, total_claims: 26800, rate: 8.8 },
    { provider: 'Valley Regional Hospital', fraud_cases: 2198, total_claims: 29500, rate: 7.5 },
    { provider: 'Northeast Health Services', fraud_cases: 1987, total_claims: 24100, rate: 8.2 },
    { provider: 'Premier Care Network', fraud_cases: 1823, total_claims: 22400, rate: 8.1 },
    { provider: 'Community Health Alliance', fraud_cases: 1654, total_claims: 21800, rate: 7.6 }
  ],
  '/api/charts/fraud-by-region': [
    { region: 'Northeast', fraud_cases: 23400, percentage: 26.2, total_claims: 198000, amount: 89500000 },
    { region: 'Southeast', fraud_cases: 21800, percentage: 24.4, total_claims: 185000, amount: 82300000 },
    { region: 'Midwest', fraud_cases: 16500, percentage: 18.4, total_claims: 142000, amount: 64200000 },
    { region: 'West', fraud_cases: 18900, percentage: 21.1, total_claims: 162000, amount: 73100000 },
    { region: 'Southwest', fraud_cases: 8856, percentage: 9.9, total_claims: 76200, amount: 34800000 }
  ],
  '/api/charts/fraud-by-diagnosis': [
    { code: 'M54.5', description: 'Low Back Pain', fraud_cases: 8945, amount: 12700000, rate: 14.2 },
    { code: 'E11.9', description: 'Type 2 Diabetes', fraud_cases: 7832, amount: 11200000, rate: 9.8 },
    { code: 'I10', description: 'Essential Hypertension', fraud_cases: 7234, amount: 8900000, rate: 8.4 },
    { code: 'J06.9', description: 'Acute URI', fraud_cases: 6543, amount: 4300000, rate: 12.1 },
    { code: 'Z00.00', description: 'General Exam', fraud_cases: 5987, amount: 3200000, rate: 6.7 },
    { code: 'M79.3', description: 'Panniculitis', fraud_cases: 5234, amount: 7800000, rate: 15.8 },
    { code: 'G43.909', description: 'Migraine', fraud_cases: 4876, amount: 6500000, rate: 11.3 },
    { code: 'F32.1', description: 'Major Depression', fraud_cases: 4321, amount: 5900000, rate: 8.9 },
    { code: 'N39.0', description: 'UTI', fraud_cases: 3987, amount: 3400000, rate: 7.2 },
    { code: 'K21.0', description: 'GERD', fraud_cases: 3654, amount: 4100000, rate: 9.4 }
  ],
  '/api/charts/fraud-by-city': [
    { city: 'New York', state: 'NY', fraud_cases: 12450, total_claims: 98700, rate: 12.6 },
    { city: 'Los Angeles', state: 'CA', fraud_cases: 11230, total_claims: 95400, rate: 11.8 },
    { city: 'Chicago', state: 'IL', fraud_cases: 8940, total_claims: 78200, rate: 11.4 },
    { city: 'Houston', state: 'TX', fraud_cases: 8120, total_claims: 72800, rate: 11.2 },
    { city: 'Phoenix', state: 'AZ', fraud_cases: 5230, total_claims: 48900, rate: 10.7 },
    { city: 'Philadelphia', state: 'PA', fraud_cases: 6890, total_claims: 58700, rate: 11.7 },
    { city: 'San Antonio', state: 'TX', fraud_cases: 4320, total_claims: 39800, rate: 10.9 },
    { city: 'San Diego', state: 'CA', fraud_cases: 3890, total_claims: 35200, rate: 11.1 },
    { city: 'Dallas', state: 'TX', fraud_cases: 5670, total_claims: 52100, rate: 10.9 },
    { city: 'Miami', state: 'FL', fraud_cases: 7230, total_claims: 54800, rate: 13.2 }
  ],
  '/api/charts/fraud-score-distribution': [
    { range: '0-10', count: 145230, label: 'Very Low Risk' },
    { range: '10-20', count: 234560, label: 'Low Risk' },
    { range: '20-30', count: 189340, label: 'Low Risk' },
    { range: '30-40', count: 156780, label: 'Medium Risk' },
    { range: '40-50', count: 123450, label: 'Medium Risk' },
    { range: '50-60', count: 98230, label: 'High Risk' },
    { range: '60-70', count: 89450, label: 'High Risk' },
    { range: '70-80', count: 67890, label: 'Very High Risk' },
    { range: '80-90', count: 45670, label: 'Critical Risk' },
    { range: '90-100', count: 97232, label: 'Critical Risk' }
  ],
  '/api/charts/claim-status-distribution': [
    { status: 'Approved', count: 845230, percentage: 67.7 },
    { status: 'Under Review', count: 198450, percentage: 15.9 },
    { status: 'Denied', count: 114696, percentage: 9.2 },
    { status: 'Pending', count: 89456, percentage: 7.2 }
  ],
  '/api/charts/fraud-categories': [
    { category: 'Upcoding', cases: 28450, percentage: 31.8, amount: 74500000 },
    { category: 'Duplicate Claims', cases: 18230, percentage: 20.4, amount: 47900000 },
    { category: 'Phantom Billing', cases: 14890, percentage: 16.6, amount: 38800000 },
    { category: 'Unbundling', cases: 11230, percentage: 12.6, amount: 29500000 },
    { category: 'Kickback Schemes', cases: 8940, percentage: 10.0, amount: 23400000 },
    { category: 'Identity Fraud', cases: 4560, percentage: 5.1, amount: 11900000 },
    { category: 'Other', cases: 3156, percentage: 3.5, amount: 8700000 }
  ],
  '/api/charts/average-claim-cost': [
    { month: 'Jan 2025', avg_cost: 190.45 },
    { month: 'Feb 2025', avg_cost: 190.08 },
    { month: 'Mar 2025', avg_cost: 192.61 },
    { month: 'Apr 2025', avg_cost: 191.92 },
    { month: 'May 2025', avg_cost: 191.28 },
    { month: 'Jun 2025', avg_cost: 188.38 },
    { month: 'Jul 2025', avg_cost: 191.71 },
    { month: 'Aug 2025', avg_cost: 192.89 },
    { month: 'Sep 2025', avg_cost: 190.05 },
    { month: 'Oct 2025', avg_cost: 190.15 },
    { month: 'Nov 2025', avg_cost: 192.34 },
    { month: 'Dec 2025', avg_cost: 192.26 }
  ],
  '/api/analytics/top-providers': [
    { name: 'Metropolitan General Hospital', total_claims: 38900, fraud_claims: 4523, fraud_rate: 11.6, total_amount: 156000000, flagged_amount: 18100000 },
    { name: 'St. Mary Medical Center', total_claims: 35200, fraud_claims: 3891, fraud_rate: 11.1, total_amount: 141000000, flagged_amount: 15650000 },
    { name: 'City Health Network', total_claims: 42100, fraud_claims: 3456, fraud_rate: 8.2, total_amount: 168400000, flagged_amount: 13820000 },
    { name: 'Pacific Wellness Group', total_claims: 28700, fraud_claims: 2987, fraud_rate: 10.4, total_amount: 114800000, flagged_amount: 11950000 },
    { name: 'Summit Healthcare Partners', total_claims: 31200, fraud_claims: 2654, fraud_rate: 8.5, total_amount: 124800000, flagged_amount: 10620000 },
    { name: 'Lakeside Medical Associates', total_claims: 26800, fraud_claims: 2345, fraud_rate: 8.8, total_amount: 107200000, flagged_amount: 9430000 },
    { name: 'Valley Regional Hospital', total_claims: 29500, fraud_claims: 2198, fraud_rate: 7.5, total_amount: 118000000, flagged_amount: 8850000 },
    { name: 'Northeast Health Services', total_claims: 24100, fraud_claims: 1987, fraud_rate: 8.2, total_amount: 96400000, flagged_amount: 7900000 },
    { name: 'Premier Care Network', total_claims: 22400, fraud_claims: 1823, fraud_rate: 8.1, total_amount: 89600000, flagged_amount: 7260000 },
    { name: 'Community Health Alliance', total_claims: 21800, fraud_claims: 1654, fraud_rate: 7.6, total_amount: 87200000, flagged_amount: 6630000 }
  ],
  '/api/analytics/top-patients': [
    { id: 'PAT-001', name: 'Margaret Thompson', total_claims: 47, total_amount: 234500, flagged_claims: 12, fraud_score: 78.3 },
    { id: 'PAT-002', name: 'Robert Chen', total_claims: 38, total_amount: 189700, flagged_claims: 9, fraud_score: 72.1 },
    { id: 'PAT-003', name: 'Patricia Williams', total_claims: 52, total_amount: 267800, flagged_claims: 15, fraud_score: 85.6 },
    { id: 'PAT-004', name: 'James Anderson', total_claims: 29, total_amount: 145600, flagged_claims: 7, fraud_score: 64.8 },
    { id: 'PAT-005', name: 'Linda Martinez', total_claims: 41, total_amount: 203400, flagged_claims: 11, fraud_score: 76.2 },
    { id: 'PAT-006', name: 'William Brown', total_claims: 35, total_amount: 178900, flagged_claims: 8, fraud_score: 69.4 },
    { id: 'PAT-007', name: 'Elizabeth Davis', total_claims: 44, total_amount: 221300, flagged_claims: 13, fraud_score: 81.7 },
    { id: 'PAT-008', name: 'Michael Wilson', total_claims: 26, total_amount: 132100, flagged_claims: 6, fraud_score: 58.3 },
    { id: 'PAT-009', name: 'Barbara Garcia', total_claims: 39, total_amount: 195200, flagged_claims: 10, fraud_score: 73.9 },
    { id: 'PAT-010', name: 'David Rodriguez', total_claims: 31, total_amount: 156800, flagged_claims: 8, fraud_score: 67.5 }
  ],
  '/api/analytics/top-diagnoses': [
    { code: 'M54.5', description: 'Low Back Pain', claims: 8945, fraud_rate: 14.2, amount: 12700000 },
    { code: 'E11.9', description: 'Type 2 Diabetes Mellitus', claims: 7832, fraud_rate: 9.8, amount: 11200000 },
    { code: 'I10', description: 'Essential Hypertension', claims: 7234, fraud_rate: 8.4, amount: 8900000 },
    { code: 'J06.9', description: 'Acute Upper Respiratory Infection', claims: 6543, fraud_rate: 12.1, amount: 4300000 },
    { code: 'Z00.00', description: 'General Adult Medical Exam', claims: 5987, fraud_rate: 6.7, amount: 3200000 },
    { code: 'M79.3', description: 'Panniculitis', claims: 5234, fraud_rate: 15.8, amount: 7800000 },
    { code: 'G43.909', description: 'Migraine, Unspecified', claims: 4876, fraud_rate: 11.3, amount: 6500000 },
    { code: 'F32.1', description: 'Major Depressive Disorder', claims: 4321, fraud_rate: 8.9, amount: 5900000 },
    { code: 'N39.0', description: 'Urinary Tract Infection', claims: 3987, fraud_rate: 7.2, amount: 3400000 },
    { code: 'K21.0', description: 'GERD with Esophagitis', claims: 3654, fraud_rate: 9.4, amount: 4100000 }
  ],
  '/api/claims': () => {
    const patients = ['Margaret Thompson','Robert Chen','Patricia Williams','James Anderson','Linda Martinez','William Brown','Elizabeth Davis','Michael Wilson','Barbara Garcia','David Rodriguez','Jennifer Lee','Thomas Moore','Susan Jackson','Daniel White','Karen Harris','Christopher Martin','Nancy Thompson','Matthew Robinson','Betty Clark','Anthony Lewis'];
    const providers = ['Metropolitan General Hospital','St. Mary Medical Center','City Health Network','Pacific Wellness Group','Summit Healthcare Partners','Lakeside Medical Associates','Valley Regional Hospital','Northeast Health Services','Premier Care Network','Community Health Alliance'];
    const statuses = ['Approved','Under Review','Denied','Pending'];
    const claims = [];
    for (let i = 0; i < 200; i++) {
      const score = Math.round((Math.random() * 96 + 1) * 10) / 10;
      const amount = Math.round((Math.random() * 180000 + 200) * 100) / 100;
      const riskLevel = score >= 80 ? 'critical' : score >= 60 ? 'high' : score >= 30 ? 'medium' : 'low';
      const status = statuses[Math.floor(Math.random() * 4)];
      const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
      const month = String(Math.floor(Math.random() * 3) + 10).padStart(2, '0');
      claims.push({
        id: `CLM-2025-${String(890000 + i).padStart(6, '0')}`,
        claim_id: `CLM-2025-${String(890000 + i).padStart(6, '0')}`,
        patient_name: patients[i % patients.length],
        provider_name: providers[i % providers.length],
        amount, status, fraud_score: score, risk_level: riskLevel,
        date: `2025-${month}-${day}`,
        diagnosis_code: ['M54.5','E11.9','I10','J06.9','Z00.00','M79.3','G43.909','F32.1'][i % 8],
        flagged: score >= 60
      });
    }
    return { claims, total: 200 };
  },
  '/api/patients': () => {
    const names = ['Margaret Thompson','Robert Chen','Patricia Williams','James Anderson','Linda Martinez','William Brown','Elizabeth Davis','Michael Wilson','Barbara Garcia','David Rodriguez','Jennifer Lee','Thomas Moore','Susan Jackson','Daniel White','Karen Harris','Christopher Martin','Nancy Thompson','Matthew Robinson','Betty Clark','Anthony Lewis','Michelle Walker','Kevin Hall','Amanda Young','Jason King','Stephanie Wright','Timothy Green','Nicole Adams','Brian Nelson','Rachel Hill','Jeffrey Campbell'];
    return names.map((name, i) => ({
      id: `PAT-${String(i + 1).padStart(3, '0')}`, name, age: 25 + Math.floor(Math.random() * 55),
      gender: i % 3 === 0 ? 'F' : 'M', phone: `(${200 + i}) ${100 + i}-${1000 + i * 37}`,
      email: `${name.split(' ')[0].toLowerCase()}.${name.split(' ')[1].toLowerCase()}@email.com`,
      total_claims: 5 + Math.floor(Math.random() * 45),
      total_amount: Math.round((Math.random() * 250000 + 1000) * 100) / 100,
      fraud_score: Math.round((Math.random() * 85 + 2) * 10) / 10,
      risk_level: Math.random() > 0.7 ? 'high' : Math.random() > 0.4 ? 'medium' : 'low',
      insurance_plan: ['Medicare','Medicaid','Blue Cross','Aetna','UnitedHealth','Cigna'][i % 6],
      address: `${100 + i * 17} Main St, City ${i + 1}`,
      status: 'active'
    }));
  },
  '/api/providers': () => {
    const providers = [
      { id: 'PRV-001', name: 'Metropolitan General Hospital', type: 'Hospital', specialty: 'Multi-Specialty', address: '1200 Medical Center Dr, New York, NY 10001', phone: '(212) 555-0101', npi: '1234567890', total_claims: 38900, fraud_claims: 4523, fraud_rate: 11.6, total_amount: 156000000, risk_level: 'critical', status: 'active' },
      { id: 'PRV-002', name: 'St. Mary Medical Center', type: 'Hospital', specialty: 'Multi-Specialty', address: '450 Hospital Way, Los Angeles, CA 90001', phone: '(310) 555-0102', npi: '2345678901', total_claims: 35200, fraud_claims: 3891, fraud_rate: 11.1, total_amount: 141000000, risk_level: 'critical', status: 'active' },
      { id: 'PRV-003', name: 'City Health Network', type: 'Clinic Network', specialty: 'Primary Care', address: '789 Health Blvd, Chicago, IL 60601', phone: '(312) 555-0103', npi: '3456789012', total_claims: 42100, fraud_claims: 3456, fraud_rate: 8.2, total_amount: 168400000, risk_level: 'high', status: 'active' },
      { id: 'PRV-004', name: 'Pacific Wellness Group', type: 'Medical Group', specialty: 'Internal Medicine', address: '234 Pacific Ave, San Francisco, CA 94102', phone: '(415) 555-0104', npi: '4567890123', total_claims: 28700, fraud_claims: 2987, fraud_rate: 10.4, total_amount: 114800000, risk_level: 'high', status: 'active' },
      { id: 'PRV-005', name: 'Summit Healthcare Partners', type: 'Medical Group', specialty: 'Cardiology', address: '567 Summit Rd, Denver, CO 80201', phone: '(303) 555-0105', npi: '5678901234', total_claims: 31200, fraud_claims: 2654, fraud_rate: 8.5, total_amount: 124800000, risk_level: 'high', status: 'active' },
      { id: 'PRV-006', name: 'Lakeside Medical Associates', type: 'Clinic', specialty: 'Family Medicine', address: '890 Lakeside Dr, Minneapolis, MN 55401', phone: '(612) 555-0106', npi: '6789012345', total_claims: 26800, fraud_claims: 2345, fraud_rate: 8.8, total_amount: 107200000, risk_level: 'high', status: 'active' },
      { id: 'PRV-007', name: 'Valley Regional Hospital', type: 'Hospital', specialty: 'Emergency', address: '321 Valley Rd, Phoenix, AZ 85001', phone: '(602) 555-0107', npi: '7890123456', total_claims: 29500, fraud_claims: 2198, fraud_rate: 7.5, total_amount: 118000000, risk_level: 'medium', status: 'active' },
      { id: 'PRV-008', name: 'Northeast Health Services', type: 'Health System', specialty: 'Multi-Specialty', address: '456 Northeast Blvd, Boston, MA 02101', phone: '(617) 555-0108', npi: '8901234567', total_claims: 24100, fraud_claims: 1987, fraud_rate: 8.2, total_amount: 96400000, risk_level: 'medium', status: 'active' },
      { id: 'PRV-009', name: 'Premier Care Network', type: 'Clinic Network', specialty: 'Primary Care', address: '678 Premier Way, Atlanta, GA 30301', phone: '(404) 555-0109', npi: '9012345678', total_claims: 22400, fraud_claims: 1823, fraud_rate: 8.1, total_amount: 89600000, risk_level: 'medium', status: 'active' },
      { id: 'PRV-010', name: 'Community Health Alliance', type: 'Community Health', specialty: 'Pediatrics', address: '901 Community Ln, Houston, TX 77001', phone: '(713) 555-0110', npi: '0123456789', total_claims: 21800, fraud_claims: 1654, fraud_rate: 7.6, total_amount: 87200000, risk_level: 'medium', status: 'active' },
      { id: 'PRV-011', name: 'Sunrise Health Clinic', type: 'Clinic', specialty: 'Dermatology', address: '123 Sunrise Blvd, Miami, FL 33101', phone: '(305) 555-0111', npi: '1122334455', total_claims: 15600, fraud_claims: 920, fraud_rate: 5.9, total_amount: 62400000, risk_level: 'medium', status: 'active' },
      { id: 'PRV-012', name: 'Heartland Medical Center', type: 'Hospital', specialty: 'Cardiology', address: '456 Heartland Ave, Kansas City, MO 64101', phone: '(816) 555-0112', npi: '2233445566', total_claims: 18900, fraud_claims: 1134, fraud_rate: 6.0, total_amount: 75600000, risk_level: 'medium', status: 'active' }
    ];
    return providers;
  },
  '/api/policies': () => {
    const plans = [
      { id: 'POL-001', policy_number: 'MC-2025-001847', patient_name: 'Margaret Thompson', patient_id: 'PAT-001', plan_type: 'Medicare Advantage', provider: 'Metropolitan General Hospital', start_date: '2025-01-01', end_date: '2025-12-31', premium: 485.00, deductible: 1500, max_coverage: 500000, status: 'active', claims_count: 12, total_paid: 34500, risk_score: 23.4 },
      { id: 'POL-002', policy_number: 'BC-2025-002341', patient_name: 'Robert Chen', patient_id: 'PAT-002', plan_type: 'Blue Cross PPO', provider: 'City Health Network', start_date: '2025-03-15', end_date: '2026-03-14', premium: 620.00, deductible: 2000, max_coverage: 750000, status: 'active', claims_count: 8, total_paid: 22800, risk_score: 45.2 },
      { id: 'POL-003', policy_number: 'AE-2025-001562', patient_name: 'Patricia Williams', patient_id: 'PAT-003', plan_type: 'Aetna HMO', provider: 'St. Mary Medical Center', start_date: '2025-02-01', end_date: '2026-01-31', premium: 540.00, deductible: 1800, max_coverage: 600000, status: 'active', claims_count: 15, total_paid: 42300, risk_score: 67.8 },
      { id: 'POL-004', policy_number: 'UH-2025-003102', patient_name: 'James Anderson', patient_id: 'PAT-004', plan_type: 'UnitedHealth Choice', provider: 'Pacific Wellness Group', start_date: '2025-04-01', end_date: '2026-03-31', premium: 510.00, deductible: 1700, max_coverage: 650000, status: 'active', claims_count: 6, total_paid: 18900, risk_score: 31.5 },
      { id: 'POL-005', policy_number: 'CG-2025-002876', patient_name: 'Linda Martinez', patient_id: 'PAT-005', plan_type: 'Cigna Open Access', provider: 'Summit Healthcare Partners', start_date: '2025-01-15', end_date: '2026-01-14', premium: 575.00, deductible: 2200, max_coverage: 700000, status: 'active', claims_count: 11, total_paid: 31200, risk_score: 52.1 },
      { id: 'POL-006', policy_number: 'MD-2025-001293', patient_name: 'William Brown', patient_id: 'PAT-006', plan_type: 'Medicaid', provider: 'Lakeside Medical Associates', start_date: '2025-05-01', end_date: '2026-04-30', premium: 125.00, deductible: 500, max_coverage: 200000, status: 'active', claims_count: 9, total_paid: 15600, risk_score: 18.7 },
      { id: 'POL-007', policy_number: 'MC-2025-004521', patient_name: 'Elizabeth Davis', patient_id: 'PAT-007', plan_type: 'Medicare Part B', provider: 'Valley Regional Hospital', start_date: '2025-01-01', end_date: '2025-12-31', premium: 174.00, deductible: 240, max_coverage: 150000, status: 'active', claims_count: 18, total_paid: 28900, risk_score: 74.3 },
      { id: 'POL-008', policy_number: 'BC-2025-005687', patient_name: 'Michael Wilson', patient_id: 'PAT-008', plan_type: 'Blue Cross HMO', provider: 'Northeast Health Services', start_date: '2025-06-01', end_date: '2026-05-31', premium: 490.00, deductible: 1500, max_coverage: 550000, status: 'active', claims_count: 5, total_paid: 12400, risk_score: 28.9 },
      { id: 'POL-009', policy_number: 'AE-2025-006234', patient_name: 'Barbara Garcia', patient_id: 'PAT-009', plan_type: 'Aetna PPO', provider: 'Premier Care Network', start_date: '2025-02-15', end_date: '2026-02-14', premium: 595.00, deductible: 2500, max_coverage: 800000, status: 'active', claims_count: 14, total_paid: 39800, risk_score: 58.6 },
      { id: 'POL-010', policy_number: 'UH-2025-007891', patient_name: 'David Rodriguez', patient_id: 'PAT-010', plan_type: 'UnitedHealth PPO', provider: 'Community Health Alliance', start_date: '2025-03-01', end_date: '2026-02-28', premium: 550.00, deductible: 2000, max_coverage: 700000, status: 'active', claims_count: 7, total_paid: 21300, risk_score: 42.8 }
    ];
    return plans;
  },
  '/api/notifications': () => {
    return [
      { id: 1, type: 'fraud_alert', title: 'High-Risk Claim Detected', message: 'Claim CLM-2025-091234 flagged with 94.2% fraud probability. Provider: Metropolitan General Hospital. Amount: $89,750.00', severity: 'critical', read: false, created_at: '2025-12-16T14:30:00Z', claim_id: 'CLM-2025-091234' },
      { id: 2, type: 'model_alert', title: 'Model Performance Degradation', message: 'F1 Score dropped from 0.932 to 0.918 in the last 24 hours. Consider retraining the model.', severity: 'warning', read: false, created_at: '2025-12-16T12:15:00Z' },
      { id: 3, type: 'fraud_alert', title: 'Duplicate Claims Pattern', message: '12 duplicate claims detected from St. Mary Medical Center in the past 48 hours. Total potential fraud: $156,800.00', severity: 'critical', read: false, created_at: '2025-12-16T10:45:00Z' },
      { id: 4, type: 'system_alert', title: 'Database Performance Warning', message: 'Query response time increased by 35% in the last hour. Average latency: 245ms', severity: 'warning', read: true, created_at: '2025-12-16T08:20:00Z' },
      { id: 5, type: 'fraud_alert', title: 'Upcoding Detected', message: 'Code M54.5 billed at $12,400 (avg: $450). Provider: Pacific Wellness Group. Pattern suggests systematic upcoding.', severity: 'critical', read: true, created_at: '2025-12-15T16:30:00Z', claim_id: 'CLM-2025-089451' },
      { id: 6, type: 'info', title: 'Model Training Complete', message: 'Model v3.2.1 training completed successfully. Accuracy: 94.6%, F1: 0.932, AUC: 0.9647', severity: 'info', read: true, created_at: '2025-12-15T14:00:00Z' },
      { id: 7, type: 'fraud_alert', title: 'Phantom Billing Suspected', message: '3 claims from Summit Healthcare Partners for services on dates patient was hospitalized elsewhere.', severity: 'critical', read: false, created_at: '2025-12-15T11:20:00Z', claim_id: 'CLM-2025-088912' },
      { id: 8, type: 'system_alert', title: 'Storage Usage Warning', message: 'Disk usage at 82.7%. Consider archiving old claim data or expanding storage capacity.', severity: 'warning', read: true, created_at: '2025-12-15T09:00:00Z' },
      { id: 9, type: 'info', title: 'Weekly Report Generated', message: 'Weekly fraud detection report for Dec 8-14, 2025 has been generated. 847 new fraud cases detected.', severity: 'info', read: true, created_at: '2025-12-14T08:00:00Z' },
      { id: 10, type: 'fraud_alert', title: 'Unusual Billing Pattern', message: 'Lakeside Medical Associates showing 280% increase in procedure code 99215 claims over the past 30 days.', severity: 'warning', read: true, created_at: '2025-12-13T15:45:00Z' }
    ];
  },
  '/api/ai-insights': () => {
    return {
      insights: [
        { id: 1, type: 'pattern', title: 'Upcoding Surge in Q4', description: 'Analysis reveals a 34% increase in upcoded claims (CPT 99214→99215) from providers in the Northeast region during Q4 2025. Estimated financial impact: $4.2M.', confidence: 94.5, severity: 'high', actionable: true, created_at: '2025-12-16T10:00:00Z' },
        { id: 2, type: 'anomaly', title: 'Phantom Billing Ring Detected', description: 'Network analysis identified 5 providers sharing overlapping patient records with suspicious billing patterns. Cross-referencing with provider address data reveals 3 share the same registered address.', confidence: 89.2, severity: 'critical', actionable: true, created_at: '2025-12-15T14:30:00Z' },
        { id: 3, type: 'prediction', title: 'Claim Volume Surge Expected', description: 'Predictive model forecasts a 18-22% increase in claim volume during December holidays. Recommend scaling fraud detection resources accordingly.', confidence: 82.7, severity: 'medium', actionable: true, created_at: '2025-12-14T09:15:00Z' },
        { id: 4, type: 'recommendation', title: 'Threshold Optimization', description: 'Current fraud detection threshold (0.75) can be optimized to 0.72 to improve recall by 4.2% without significant increase in false positives. Recommended action: update model threshold.', confidence: 91.3, severity: 'medium', actionable: true, created_at: '2025-12-13T11:00:00Z' },
        { id: 5, type: 'pattern', title: 'Weekend Billing Anomaly', description: 'Weekend claim submissions show 47% higher fraud probability than weekday submissions. Flagged for enhanced review on Saturday-Sunday claims.', confidence: 87.8, severity: 'high', actionable: true, created_at: '2025-12-12T16:45:00Z' }
      ],
      summary: { total_insights: 5, critical: 1, high: 2, medium: 2, low: 0, avg_confidence: 89.1 }
    };
  },
  '/api/model/metrics': () => {
    return {
      accuracy: 94.6, precision: 0.932, recall: 0.918, f1_score: 0.925, roc_auc: 0.9647,
      prediction_time_ms: 12.4, model_version: 'v3.2.1', dataset_version: 'v4.2',
      training_date: '2025-01-15', data_drift: 2.3, last_retrained: '2025-01-15',
      validation_accuracy: 94.1, num_features: 47, training_size: 128450,
      confusion_matrix: { tp: 1814, tn: 8945, fp: 152, fn: 89 },
      feature_importance: [
        { feature: 'Claim Amount Deviation', importance: 0.234 },
        { feature: 'Provider Fraud History', importance: 0.189 },
        { feature: 'Duplicate Procedure Flag', importance: 0.156 },
        { feature: 'Unusual Hour of Service', importance: 0.134 },
        { feature: 'Patient-Provider Distance', importance: 0.098 },
        { feature: 'Claim Frequency Score', importance: 0.078 },
        { feature: 'Diagnosis-Procedure Mismatch', importance: 0.054 },
        { feature: 'Days Since Last Visit', importance: 0.032 },
        { feature: 'Network Anomaly Score', importance: 0.018 },
        { feature: 'Geographic Risk Index', importance: 0.007 }
      ],
      model_versions: [
        { version: 'v3.2.1', accuracy: 94.6, f1: 0.932, auc: 0.9647, date: '2025-01-15', status: 'active' },
        { version: 'v3.1.0', accuracy: 91.8, f1: 0.905, auc: 0.9512, date: '2024-12-01', status: 'archived' },
        { version: 'v3.0.0', accuracy: 87.3, f1: 0.862, auc: 0.9345, date: '2024-10-15', status: 'archived' }
      ]
    };
  },
  '/api/system/health': () => {
    return {
      status: 'healthy', uptime: '47d 14h 32m', version: '2.8.3',
      database: { status: 'connected', latency_ms: 12, connections: '47/200', last_backup: '2025-12-16T12:00:00Z' },
      api: { status: 'running', avg_response_ms: 145, requests_per_min: 1247, uptime_pct: 99.97 },
      gpu: { status: 'active', utilization_pct: 67, memory_used_gb: 14.2, memory_total_gb: 24, temperature_c: 72 },
      disk: { status: 'warning', used_gb: 847, total_gb: 1000, usage_pct: 82.7, iops: 12400 },
      queue: { status: 'healthy', size: 23, processed_per_hour: 45230, failed_24h: 3 },
      jobs: { status: 'running', active: 4, queued: 12, completed_24h: 1847 }
    };
  },
  '/api/audit-logs': () => {
    return {
      logs: [
        { id: 1, timestamp: '2025-12-16T14:32:18Z', user: 'admin_insurance', action: 'VIEW', resource: 'Dashboard', details: 'Viewed fraud analytics dashboard' },
        { id: 2, timestamp: '2025-12-16T14:30:45Z', user: 'admin_insurance', action: 'UPDATE', resource: 'Claim CLM-2025-091234', details: 'Updated claim status to Under Review' },
        { id: 3, timestamp: '2025-12-16T14:28:12Z', user: 'auditor_insurance', action: 'EXPORT', resource: 'Reports', details: 'Exported fraud report (CSV format)' },
        { id: 4, timestamp: '2025-12-16T14:25:30Z', user: 'admin_insurance', action: 'VIEW', resource: 'Model Management', details: 'Viewed model performance metrics' },
        { id: 5, timestamp: '2025-12-16T14:22:15Z', user: 'manager_insurance', action: 'CREATE', resource: 'Notification', details: 'Generated fraud alert notifications' },
        { id: 6, timestamp: '2025-12-16T14:18:45Z', user: 'admin_insurance', action: 'UPDATE', resource: 'Settings', details: 'Updated fraud detection threshold to 0.75' },
        { id: 7, timestamp: '2025-12-16T14:15:20Z', user: 'auditor_insurance', action: 'VIEW', resource: 'Alert Center', details: 'Reviewed 12 fraud alerts' },
        { id: 8, timestamp: '2025-12-16T14:10:00Z', user: 'admin_insurance', action: 'LOGIN', resource: 'System', details: 'Successful login from 192.168.1.45' },
        { id: 9, timestamp: '2025-12-16T13:55:30Z', user: 'manager_insurance', action: 'VIEW', resource: 'Executive Summary', details: 'Viewed executive dashboard' },
        { id: 10, timestamp: '2025-12-16T13:45:10Z', user: 'admin_insurance', action: 'UPDATE', resource: 'Model', details: 'Triggered model retraining' }
      ],
      total: 10
    };
  },
  '/api/stats/trends': () => {
    return {
      claims_trend: { current: 1247832, previous: 1185200, change_pct: 5.28 },
      fraud_trend: { current: 89456, previous: 86200, change_pct: 3.78 },
      amount_trend: { current: 487500000, previous: 455200000, change_pct: 7.10 },
      detection_trend: { current: 94.6, previous: 93.8, change_pct: 0.85 }
    };
  },
  '/api/heatmap/providers': () => {
    return [
      { name: 'Metropolitan General Hospital', lat: 40.7128, lng: -74.0060, fraud_rate: 11.6, claims: 38900 },
      { name: 'St. Mary Medical Center', lat: 34.0522, lng: -118.2437, fraud_rate: 11.1, claims: 35200 },
      { name: 'City Health Network', lat: 41.8781, lng: -87.6298, fraud_rate: 8.2, claims: 42100 },
      { name: 'Pacific Wellness Group', lat: 37.7749, lng: -122.4194, fraud_rate: 10.4, claims: 28700 },
      { name: 'Summit Healthcare Partners', lat: 39.7392, lng: -104.9903, fraud_rate: 8.5, claims: 31200 }
    ];
  },
  '/api/search': (params) => {
    const q = params?.q?.toLowerCase() || '';
    return {
      results: [
        { type: 'claim', id: 'CLM-2025-091234', title: 'Claim #CLM-2025-091234', subtitle: '$89,750 - Under Review', url: '/insurance/claims/CLM-2025-091234' },
        { type: 'provider', id: 'PRV-001', title: 'Metropolitan General Hospital', subtitle: 'Fraud Rate: 11.6%', url: '/insurance/providers' },
        { type: 'patient', id: 'PAT-001', title: 'Margaret Thompson', subtitle: '47 claims, Risk: High', url: '/insurance/patients' }
      ].filter(r => !q || r.title.toLowerCase().includes(q) || r.subtitle.toLowerCase().includes(q)),
      total: 3
    };
  },
  '/api/reports/data': () => {
    return {
      monthly: [
        { month: 'Jan 2025', claims: 98450, fraud: 6892, amount: 18750000, loss: 2340000 },
        { month: 'Feb 2025', claims: 95230, fraud: 6667, amount: 18100000, loss: 2210000 },
        { month: 'Mar 2025', claims: 102800, fraud: 7196, amount: 19800000, loss: 2520000 },
        { month: 'Apr 2025', claims: 108900, fraud: 7623, amount: 20900000, loss: 2780000 },
        { month: 'May 2025', claims: 112400, fraud: 8430, amount: 21500000, loss: 3120000 },
        { month: 'Jun 2025', claims: 106700, fraud: 7469, amount: 20100000, loss: 2650000 },
        { month: 'Jul 2025', claims: 115800, fraud: 8685, amount: 22200000, loss: 3340000 },
        { month: 'Aug 2025', claims: 118200, fraud: 8865, amount: 22800000, loss: 3450000 },
        { month: 'Sep 2025', claims: 109500, fraud: 8213, amount: 20800000, loss: 2960000 },
        { month: 'Oct 2025', claims: 113700, fraud: 8528, amount: 21600000, loss: 3210000 },
        { month: 'Nov 2025', claims: 120100, fraud: 9008, amount: 23100000, loss: 3580000 },
        { month: 'Dec 2025', claims: 146952, fraud: 10480, amount: 28250000, loss: 4120000 }
      ],
      total_claims: 1247832, total_fraud: 89456, total_amount: 234700000
    };
  }
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
