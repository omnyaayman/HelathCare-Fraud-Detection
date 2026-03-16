/* ===== REFERENCE DATA ===== */

export const ADMISSION_TYPES = [
  { id: 1, label: 'Elective' },
  { id: 2, label: 'Urgent' },
  { id: 3, label: 'Trauma' },
  { id: 4, label: 'Emergency' },
  { id: 5, label: 'Newborn' },
];

export const DIAGNOSES = [
  { code: 'A09', label: 'Infectious Gastroenteritis and Colitis' },
  { code: 'C50.919', label: 'Malignant Neoplasm of Breast' },
  { code: 'D50.9', label: 'Iron Deficiency Anemia' },
  { code: 'E11.9', label: 'Type 2 Diabetes Mellitus' },
  { code: 'E78.5', label: 'Hyperlipidemia, Unspecified' },
  { code: 'F32.9', label: 'Major Depressive Disorder' },
  { code: 'G40.909', label: 'Epilepsy, Unspecified' },
  { code: 'H25.9', label: 'Senile Cataract, Unspecified' },
  { code: 'I10', label: 'Essential Hypertension' },
  { code: 'I25.10', label: 'ASHD of Native Coronary Artery' },
  { code: 'J02.9', label: 'Acute Pharyngitis, Unspecified' },
  { code: 'J20.9', label: 'Acute Bronchitis' },
  { code: 'J45.909', label: 'Unspecified Asthma' },
  { code: 'K21.9', label: 'Gastro-Esophageal Reflux Disease' },
  { code: 'L20.9', label: 'Atopic Dermatitis' },
  { code: 'M17.9', label: 'Osteoarthritis of Knee' },
  { code: 'M54.5', label: 'Low Back Pain' },
  { code: 'N18.9', label: 'Chronic Kidney Disease' },
  { code: 'R05', label: 'Cough' },
  { code: 'Z00.00', label: 'General Adult Medical Examination' },
];

export const PROCEDURES = [
  { code: '71045', label: 'Chest X-ray, single view' },
  { code: '71046', label: 'Chest X-ray, 2 views' },
  { code: '80053', label: 'Comprehensive metabolic panel' },
  { code: '93000', label: 'ECG, 12 leads (Complete)' },
  { code: '93010', label: 'ECG, 12 leads (Interpretation)' },
  { code: '93040', label: 'Rhythm ECG, 1-3 leads' },
  { code: '93306', label: 'TTE with spectral and color Doppler' },
  { code: '93307', label: 'TTE complete (2D)' },
  { code: '93308', label: 'Echocardiography, follow-up' },
  { code: '93458', label: 'Left heart catheterization' },
  { code: '93571', label: 'Intravascular Doppler flow (1st vessel)' },
  { code: '93572', label: 'Intravascular Doppler flow (add-on)' },
  { code: '93600', label: 'Bundle of His recording' },
  { code: '93610', label: 'Intra-atrial pacing' },
  { code: '99203', label: 'Office visit, new patient (30-44 min)' },
  { code: '99204', label: 'Office visit, new patient (45-59 min)' },
  { code: '99213', label: 'Office visit, established patient (20-29 min)' },
  { code: '99214', label: 'Office visit, established patient (30-39 min)' },
  { code: '99283', label: 'Emergency dept visit (Moderate)' },
  { code: '99284', label: 'Emergency dept visit (High)' },
];

export const SERVICES = [
  { id: 1, label: 'Ambulance', cost: 491.50 },
  { id: 2, label: 'Emergency Room', cost: 500.45 },
  { id: 3, label: 'Inpatient', cost: 496.11 },
  { id: 4, label: 'Laboratory', cost: 502.79 },
  { id: 5, label: 'Outpatient', cost: 501.94 },
  { id: 6, label: 'Pharmacy', cost: 505.10 },
];

export const DISCHARGE_TYPES = [
  { id: 1, label: 'Rehab/Skilled Nursing' },
  { id: 2, label: 'Deceased' },
  { id: 3, label: 'Home' },
  { id: 4, label: 'Against Medical Advice' },
  { id: 5, label: 'Transfer to another facility' },
];

/* ===== PROVIDER CATEGORIES ===== */

export const PROVIDER_TYPES = ['Hospital', 'Clinic', 'Urgent Care', 'Specialist Office', 'Surgery Center', 'Rehabilitation Center'];
export const SPECIALTIES = ['General Medicine', 'Cardiology', 'Orthopedics', 'Neurology', 'Oncology', 'Pediatrics', 'Emergency Medicine', 'Dermatology', 'Gastroenterology', 'Pulmonology'];
export const CITIES = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'Austin'];
export const STATES = ['NY', 'CA', 'IL', 'TX', 'AZ', 'PA', 'FL', 'OH', 'GA', 'NC'];

/* ===== MOCK PROVIDERS ===== */

export const MOCK_PROVIDERS = [
  { id: 'PRV-001', name: 'City General Hospital', type: 'Hospital', specialty: 'General Medicine', city: 'New York', state: 'NY' },
  { id: 'PRV-002', name: 'Metro Health Center', type: 'Clinic', specialty: 'Cardiology', city: 'Los Angeles', state: 'CA' },
  { id: 'PRV-003', name: 'Valley Medical', type: 'Hospital', specialty: 'Orthopedics', city: 'Chicago', state: 'IL' },
  { id: 'PRV-004', name: 'Sunrise Clinic', type: 'Clinic', specialty: 'Pediatrics', city: 'Houston', state: 'TX' },
  { id: 'PRV-005', name: 'Lakeside Hospital', type: 'Hospital', specialty: 'Emergency Medicine', city: 'Phoenix', state: 'AZ' },
  { id: 'PRV-006', name: 'Pine Ridge Medical', type: 'Specialist Office', specialty: 'Neurology', city: 'Philadelphia', state: 'PA' },
  { id: 'PRV-007', name: 'Central Care Facility', type: 'Urgent Care', specialty: 'General Medicine', city: 'San Antonio', state: 'TX' },
  { id: 'PRV-008', name: 'Northwind Health', type: 'Surgery Center', specialty: 'Oncology', city: 'Dallas', state: 'TX' },
];

/* ===== MOCK PATIENTS (with policy) ===== */

export const MOCK_PATIENTS = [
  { patient_id: 'PAT-10001', name: 'Ahmed Al-Rashid', age: 45, gender: 'Male', city: 'New York', state: 'NY', policy_id: 'XAI000137254', member_id: '90975662', annual_deductible: 2024.85, policy_start: '2024-08-25', policy_end: '2025-08-25', copay: 30 },
  { patient_id: 'PAT-10002', name: 'Sarah Mitchell', age: 32, gender: 'Female', city: 'Los Angeles', state: 'CA', policy_id: 'XAI000178076', member_id: '16877430', annual_deductible: 1253.10, policy_start: '2025-01-01', policy_end: '2026-01-01', copay: 25 },
  { patient_id: 'PAT-10003', name: 'James Okoro', age: 58, gender: 'Male', city: 'Chicago', state: 'IL', policy_id: 'XAI000258885', member_id: '82796916', annual_deductible: 1780.32, policy_start: '2025-02-09', policy_end: '2026-02-09', copay: 35 },
  { patient_id: 'PAT-10004', name: 'Maria Gonzalez', age: 27, gender: 'Female', city: 'Houston', state: 'TX', policy_id: 'XAI000366221', member_id: '90708489', annual_deductible: 3370.80, policy_start: '2022-06-28', policy_end: '2023-06-28', copay: 20 },
  { patient_id: 'PAT-10005', name: 'Robert Chen', age: 71, gender: 'Male', city: 'Phoenix', state: 'AZ', policy_id: 'XAI000384158', member_id: '64812393', annual_deductible: 1080.69, policy_start: '2020-02-11', policy_end: '2021-02-11', copay: 40 },
  { patient_id: 'PAT-10006', name: 'Fatima Nour', age: 39, gender: 'Female', city: 'Philadelphia', state: 'PA', policy_id: 'XAI000436610', member_id: '74310752', annual_deductible: 2351.62, policy_start: '2025-01-16', policy_end: '2026-01-16', copay: 30 },
  { patient_id: 'PAT-10007', name: 'David Park', age: 53, gender: 'Male', city: 'San Antonio', state: 'TX', policy_id: 'XAI000517916', member_id: '10398665', annual_deductible: 4604.61, policy_start: '2023-07-18', policy_end: '2024-07-18', copay: 50 },
  { patient_id: 'PAT-10008', name: 'Aisha Bello', age: 24, gender: 'Female', city: 'San Diego', state: 'CA', policy_id: 'XAI000644295', member_id: '54056520', annual_deductible: 2842.45, policy_start: '2024-02-22', policy_end: '2025-02-22', copay: 20 },
  { patient_id: 'PAT-10009', name: 'Michael Torres', age: 66, gender: 'Male', city: 'Dallas', state: 'TX', policy_id: 'XAI000674929', member_id: '16285526', annual_deductible: 3052.12, policy_start: '2029-03-06', policy_end: '2030-03-06', copay: 45 },
  { patient_id: 'PAT-10010', name: 'Lina Johansson', age: 41, gender: 'Female', city: 'Austin', state: 'TX', policy_id: 'XAI000714056', member_id: '14654899', annual_deductible: 1593.62, policy_start: '2025-07-12', policy_end: '2026-07-12', copay: 25 },
];

/* ===== MOCK CLAIMS ===== */

export function generateMockClaims(count = 80) {
  const statuses = ['Pending', 'Processing', 'Flagged', 'Cleared', 'Fraud Confirmed'];

  return Array.from({ length: count }, (_, i) => {
    const patient = MOCK_PATIENTS[i % MOCK_PATIENTS.length];
    const provider = MOCK_PROVIDERS[i % MOCK_PROVIDERS.length];
    const diagnosis = DIAGNOSES[i % DIAGNOSES.length];
    const procedure = PROCEDURES[i % PROCEDURES.length];
    const service = SERVICES[i % SERVICES.length];
    const admission = ADMISSION_TYPES[i % ADMISSION_TYPES.length];
    const discharge = DISCHARGE_TYPES[i % DISCHARGE_TYPES.length];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const amount = Math.round((service.cost + Math.random() * 2000) * 100) / 100;
    const fraudScore = status === 'Cleared' ? Math.random() * 0.3 : status === 'Fraud Confirmed' ? 0.7 + Math.random() * 0.3 : Math.random();
    const daysAgo = Math.floor(Math.random() * 180);
    const serviceDate = new Date(Date.now() - (daysAgo + 5) * 86400000);
    const claimDate = new Date(Date.now() - daysAgo * 86400000);

    return {
      id: `CLM-${String(1000 + i).padStart(5, '0')}`,
      patient_name: patient.name,
      patient_id: patient.patient_id,
      provider_name: provider.name,
      provider_id: provider.id,
      service_date: serviceDate.toISOString().slice(0, 10),
      claim_date: claimDate.toISOString().slice(0, 10),
      admission_type: admission.id,
      admission_label: admission.label,
      diagnosis_code: diagnosis.code,
      diagnosis_label: diagnosis.label,
      procedure_code: procedure.code,
      procedure_label: procedure.label,
      service_type: service.id,
      service_label: service.label,
      discharge_type: discharge.id,
      discharge_label: discharge.label,
      amount,
      status,
      fraud_score: Math.round(fraudScore * 100) / 100,
      submitted_at: claimDate.toISOString(),
      processed_at: status !== 'Pending' ? new Date(claimDate.getTime() + Math.random() * 3600000 * 48).toISOString() : null,
      label: status === 'Fraud Confirmed' ? 'Fraud' : status === 'Cleared' ? 'Real' : null,
    };
  });
}

/* ===== MOCK METRICS ===== */

export function generateMockMetrics() {
  return {
    total_claims: 12847,
    flagged_claims: 1432,
    confirmed_fraud: 892,
    cleared_claims: 540,
    total_patients: MOCK_PATIENTS.length,
    total_providers: MOCK_PROVIDERS.length,
    model_accuracy: 0.943,
    model_precision: 0.912,
    model_recall: 0.887,
    model_f1: 0.899,
    avg_processing_time: 2.3,
    last_retrain: '2026-03-01T14:30:00Z',
    total_payout: 4823150.60,
    avg_claim_amount: 375.42,
    daily_volume: [
      { date: '2026-02-25', count: 142 },
      { date: '2026-02-26', count: 158 },
      { date: '2026-02-27', count: 131 },
      { date: '2026-02-28', count: 176 },
      { date: '2026-03-01', count: 163 },
      { date: '2026-03-02', count: 189 },
      { date: '2026-03-03', count: 184 },
      { date: '2026-03-04', count: 201 },
      { date: '2026-03-05', count: 167 },
      { date: '2026-03-06', count: 223 },
      { date: '2026-03-07', count: 195 },
      { date: '2026-03-08', count: 178 },
      { date: '2026-03-09', count: 210 },
    ],
    monthly_claims: [
      { month: 'Oct 2025', count: 4210, fraud: 312 },
      { month: 'Nov 2025', count: 4532, fraud: 345 },
      { month: 'Dec 2025', count: 3987, fraud: 298 },
      { month: 'Jan 2026', count: 4678, fraud: 367 },
      { month: 'Feb 2026', count: 4312, fraud: 334 },
      { month: 'Mar 2026', count: 2150, fraud: 168 },
    ],
    claims_by_service: [
      { service: 'Ambulance', count: 1842 },
      { service: 'Emergency Room', count: 2456 },
      { service: 'Inpatient', count: 3124 },
      { service: 'Laboratory', count: 2098 },
      { service: 'Outpatient', count: 2187 },
      { service: 'Pharmacy', count: 1140 },
    ],
    fraud_by_category: [
      { category: 'Billing Fraud', count: 312 },
      { category: 'Phantom Services', count: 198 },
      { category: 'Upcoding', count: 167 },
      { category: 'Unbundling', count: 121 },
      { category: 'Identity Fraud', count: 94 },
    ],
    fraud_by_provider: [
      { provider: 'City General Hospital', count: 45 },
      { provider: 'Metro Health Center', count: 38 },
      { provider: 'Valley Medical', count: 31 },
      { provider: 'Sunrise Clinic', count: 27 },
      { provider: 'Lakeside Hospital', count: 22 },
    ],
    fraud_by_admission: [
      { type: 'Emergency', count: 342 },
      { type: 'Urgent', count: 234 },
      { type: 'Elective', count: 178 },
      { type: 'Trauma', count: 98 },
      { type: 'Newborn', count: 40 },
    ],
    model_history: [
      { version: 'v1.0', date: '2025-11-15', accuracy: 0.891, f1: 0.854 },
      { version: 'v1.1', date: '2025-12-20', accuracy: 0.912, f1: 0.878 },
      { version: 'v1.2', date: '2026-01-28', accuracy: 0.928, f1: 0.891 },
      { version: 'v1.3', date: '2026-03-01', accuracy: 0.943, f1: 0.899 },
    ],
  };
}
