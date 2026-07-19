/* ===== CANONICAL DATA — SINGLE SOURCE OF TRUTH =====
   Every metric, count, and model statistic in the app must reference this file.
   No page should hardcode its own version of these values.
*/

// ─────────────────────────────────────────────────
// 1. MODEL METRICS (Section 1 fix)
// One canonical set for the production model (v3.2.1).
// NEVER show accuracy/precision/recall above 99%.
// ─────────────────────────────────────────────────
export const CANONICAL_MODEL = {
  version: 'v3.2.1',
  status: 'active',
  accuracy: 0.946,          // 94.6%
  precision: 0.932,
  recall: 0.918,
  f1Score: 0.925,
  rocAuc: 0.9647,
  predictionTimeMs: 12.4,
  datasetVersion: 'v4.2',
  trainingDate: '2026-01-15',
  lastRetrained: '2026-01-15',
  dataDrift: 4.2,
  validationAccuracy: 0.938,
  numFeatures: 47,
  trainingSize: 128459,
  fraudThreshold: 0.75,
  confusionMatrix: {
    tn: 8417,  // True Negatives
    fp: 287,   // False Positives
    fn: 296,   // False Negatives
    tp: 1800   // True Positives
    // Derived: accuracy = (8417+1800)/(8417+287+296+1800) = 10217/10800 = 94.60%
  },
  featureImportance: [
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
  versions: [
    { version: 'v3.2.1', label: 'Primary Model', accuracy: 0.946, f1: 0.925, auc: 0.9647, date: '2026-01-15', status: 'active' },
    { version: 'v3.1.0', label: 'Secondary Model', accuracy: 0.918, f1: 0.905, auc: 0.9512, date: '2025-12-28', status: 'standby' },
    { version: 'v3.0.0', label: 'Archive Model', accuracy: 0.873, f1: 0.862, auc: 0.9345, date: '2025-11-14', status: 'archived' }
  ],
  trainingRuns: [
    { runId: 'TRN-2847', date: 'Jan 15, 2026', dataset: 'v4.2 (128K records)', duration: '4h 32m', accuracy: '94.6%', f1: '92.5%', auc: '96.47%', status: 'Completed' },
    { runId: 'TRN-2831', date: 'Dec 28, 2025', dataset: 'v4.1 (125K records)', duration: '4h 18m', accuracy: '94.2%', f1: '92.1%', auc: '96.12%', status: 'Completed' },
    { runId: 'TRN-2819', date: 'Dec 12, 2025', dataset: 'v4.0 (122K records)', duration: '4h 45m', accuracy: '93.8%', f1: '91.4%', auc: '95.78%', status: 'Completed' },
    { runId: 'TRN-2805', date: 'Nov 28, 2025', dataset: 'v3.9 (119K records)', duration: '4h 12m', accuracy: '93.1%', f1: '90.8%', auc: '95.34%', status: 'Completed' },
    { runId: 'TRN-2791', date: 'Nov 14, 2025', dataset: 'v3.8 (116K records)', duration: '4h 28m', accuracy: '92.5%', f1: '90.1%', auc: '94.89%', status: 'Completed' }
  ]
};

// ─────────────────────────────────────────────────
// 2. FRAUD DETECTION FUNNEL (Section 3 fix)
// Total Claims → AI-Scored High Risk → Formally Flagged → Escalated to Critical Alert
// ─────────────────────────────────────────────────
export const CANONICAL_FUNNEL = {
  totalClaims: 20072,
  totalProviders: 1847,
  totalPatients: 4523,
  totalPolicies: 2894,
  aiScoredHighRisk: 4983,       // ~24.8% — claims scored above threshold by ML model
  formallyFlagged: 140,          // SIU formally flagged for investigation
  escalatedAlerts: 14,           // Critical alerts escalated to senior investigators
  normalClaims: 20072 - 4983,    // 15089
};

// ─────────────────────────────────────────────────
// 3. FINANCIAL METRICS (consistent across all pages)
// ─────────────────────────────────────────────────
export const CANONICAL_FINANCIALS = {
  totalClaimValue: 25_089_600,   // ~$25.1M total value across 20,072 claims
  avgClaimAmount: 1_250,         // $1,250 average (realistic for healthcare)
  fraudExposure: 6_227_400,      // ~$6.2M at risk from flagged claims
  moneySaved: 4_670_550,         // ~$4.7M prevented/detected
  monthlyAvgClaim: 1_250,
};

// ─────────────────────────────────────────────────
// 4. CLAIM STATUS STATE MACHINE (Section 5.5 fix)
// Canonical statuses used everywhere:
//   Submitted → AI Scored → Under Review → Approved | Rejected | Fraud Confirmed → Closed
// ─────────────────────────────────────────────────
export const CANONICAL_STATUSES = [
  'Submitted',
  'AI Scored',
  'Under Review',
  'Approved',
  'Rejected',
  'Fraud Confirmed',
  'Closed'
];

export const CLAIM_STATUS_COLORS = {
  'Submitted':        { bg: 'bg-indigo-500/10',  text: 'text-indigo-500',  border: 'border-indigo-500/20' },
  'AI Scored':        { bg: 'bg-accent/10',       text: 'text-accent',       border: 'border-accent/20' },
  'Under Review':     { bg: 'bg-warning/10',      text: 'text-warning',      border: 'border-warning/20' },
  'Approved':         { bg: 'bg-success/10',      text: 'text-success',      border: 'border-success/20' },
  'Rejected':         { bg: 'bg-danger/10',       text: 'text-danger',       border: 'border-danger/20' },
  'Fraud Confirmed':  { bg: 'bg-red-500/10',      text: 'text-red-500',      border: 'border-red-500/20' },
  'Closed':           { bg: 'bg-slate-500/10',    text: 'text-slate-500',    border: 'border-slate-500/20' },
};

// ─────────────────────────────────────────────────
// 5. PROVIDER DATA (unique, realistic names — Section 5.2 fix)
// Each provider has genuinely unique name, specialty, city.
// ─────────────────────────────────────────────────
export const CANONICAL_PROVIDERS = [
  { id: 'PRV-001', name: 'Metropolitan General Hospital', type: 'Hospital', specialty: 'Multi-Specialty', address: '1200 Medical Center Dr, New York, NY 10001', city: 'New York', state: 'NY', phone: '(212) 555-0101', npi: '1234567890', total_claims: 1842, fraud_claims: 189, total_amount: 2_302_500, flagged_amount: 236_250 },
  { id: 'PRV-002', name: 'St. Mary Medical Center', type: 'Hospital', specialty: 'Multi-Specialty', address: '450 Hospital Way, Los Angeles, CA 90001', city: 'Los Angeles', state: 'CA', phone: '(310) 555-0102', npi: '2345678901', total_claims: 1687, fraud_claims: 162, total_amount: 2_108_750, flagged_amount: 202_500 },
  { id: 'PRV-003', name: 'City Health Network', type: 'Clinic Network', specialty: 'Primary Care', address: '789 Health Blvd, Chicago, IL 60601', city: 'Chicago', state: 'IL', phone: '(312) 555-0103', npi: '3456789012', total_claims: 2014, fraud_claims: 145, total_amount: 2_517_500, flagged_amount: 181_250 },
  { id: 'PRV-004', name: 'Pacific Wellness Group', type: 'Medical Group', specialty: 'Internal Medicine', address: '234 Pacific Ave, San Francisco, CA 94102', city: 'San Francisco', state: 'CA', phone: '(415) 555-0104', npi: '4567890123', total_claims: 1456, fraud_claims: 128, total_amount: 1_820_000, flagged_amount: 160_000 },
  { id: 'PRV-005', name: 'Summit Healthcare Partners', type: 'Medical Group', specialty: 'Cardiology', address: '567 Summit Rd, Denver, CO 80201', city: 'Denver', state: 'CO', phone: '(303) 555-0105', npi: '5678901234', total_claims: 1523, fraud_claims: 118, total_amount: 1_903_750, flagged_amount: 147_500 },
  { id: 'PRV-006', name: 'Lakeside Medical Associates', type: 'Clinic', specialty: 'Family Medicine', address: '890 Lakeside Dr, Minneapolis, MN 55401', city: 'Minneapolis', state: 'MN', phone: '(612) 555-0106', npi: '6789012345', total_claims: 1298, fraud_claims: 107, total_amount: 1_622_500, flagged_amount: 133_750 },
  { id: 'PRV-007', name: 'Valley Regional Hospital', type: 'Hospital', specialty: 'Emergency Medicine', address: '321 Valley Rd, Phoenix, AZ 85001', city: 'Phoenix', state: 'AZ', phone: '(602) 555-0107', npi: '7890123456', total_claims: 1387, fraud_claims: 94, total_amount: 1_733_750, flagged_amount: 117_500 },
  { id: 'PRV-008', name: 'Northeast Health Services', type: 'Health System', specialty: 'Multi-Specialty', address: '456 Northeast Blvd, Boston, MA 02101', city: 'Boston', state: 'MA', phone: '(617) 555-0108', npi: '8901234567', total_claims: 1156, fraud_claims: 82, total_amount: 1_445_000, flagged_amount: 102_500 },
  { id: 'PRV-009', name: 'Premier Care Network', type: 'Clinic Network', specialty: 'Orthopedics', address: '678 Premier Way, Atlanta, GA 30301', city: 'Atlanta', state: 'GA', phone: '(404) 555-0109', npi: '9012345678', total_claims: 1089, fraud_claims: 74, total_amount: 1_361_250, flagged_amount: 92_500 },
  { id: 'PRV-010', name: 'Community Health Alliance', type: 'Community Health', specialty: 'Pediatrics', address: '901 Community Ln, Houston, TX 77001', city: 'Houston', state: 'TX', phone: '(713) 555-0110', npi: '0123456789', total_claims: 1024, fraud_claims: 65, total_amount: 1_280_000, flagged_amount: 81_250 },
  { id: 'PRV-011', name: 'Sunrise Health Clinic', type: 'Clinic', specialty: 'Dermatology', address: '123 Sunrise Blvd, Miami, FL 33101', city: 'Miami', state: 'FL', phone: '(305) 555-0111', npi: '1122334455', total_claims: 867, fraud_claims: 41, total_amount: 1_083_750, flagged_amount: 51_250 },
  { id: 'PRV-012', name: 'Heartland Medical Center', type: 'Hospital', specialty: 'Cardiology', address: '456 Heartland Ave, Kansas City, MO 64101', city: 'Kansas City', state: 'MO', phone: '(816) 555-0112', npi: '2233445566', total_claims: 934, fraud_claims: 48, total_amount: 1_167_500, flagged_amount: 60_000 },
  { id: 'PRV-013', name: 'Coastal Diagnostic Center', type: 'Diagnostic', specialty: 'Radiology', address: '789 Coastal Hwy, San Diego, CA 92101', city: 'San Diego', state: 'CA', phone: '(619) 555-0113', npi: '3344556677', total_claims: 756, fraud_claims: 52, total_amount: 945_000, flagged_amount: 65_000 },
  { id: 'PRV-014', name: 'Midwest Surgical Institute', type: 'Surgery Center', specialty: 'General Surgery', address: '321 Surgery Pl, Detroit, MI 48201', city: 'Detroit', state: 'MI', phone: '(313) 555-0114', npi: '4455667788', total_claims: 645, fraud_claims: 58, total_amount: 806_250, flagged_amount: 72_500 },
  { id: 'PRV-015', name: 'Southeast Neurology Associates', type: 'Specialist', specialty: 'Neurology', address: '555 Brain Way, Charlotte, NC 28201', city: 'Charlotte', state: 'NC', phone: '(704) 555-0115', npi: '5566778899', total_claims: 534, fraud_claims: 23, total_amount: 667_500, flagged_amount: 28_750 },
];

// ─────────────────────────────────────────────────
// 6. GENDER DISTRIBUTION (Section 4.9 fix)
// Realistic healthcare distribution
// ─────────────────────────────────────────────────
export const CANONICAL_GENDER_DISTRIBUTION = {
  female: 51.2,
  male: 47.8,
  other: 1.0
};

// ─────────────────────────────────────────────────
// 7. SPECIALTY DISTRIBUTION (Section 4.8 fix)
// Realistic weighted distribution — Cardiology/Ortho/GP dominate
// ─────────────────────────────────────────────────
export const CANONICAL_SPECIALTY_DISTRIBUTION = [
  { specialty: 'General Practice', percentage: 22.4 },
  { specialty: 'Cardiology', percentage: 16.8 },
  { specialty: 'Orthopedics', percentage: 14.2 },
  { specialty: 'Internal Medicine', percentage: 11.5 },
  { specialty: 'Emergency Medicine', percentage: 8.9 },
  { specialty: 'Neurology', percentage: 6.3 },
  { specialty: 'Pediatrics', percentage: 5.8 },
  { specialty: 'Dermatology', percentage: 4.7 },
  { specialty: 'Oncology', percentage: 5.2 },
  { specialty: 'Gastroenterology', percentage: 4.2 },
];

// ─────────────────────────────────────────────────
// 8. FRAUD BY DIAGNOSIS (Section 5.8 fix)
// Realistic top fraud-prone diagnoses — not "cough"
// ─────────────────────────────────────────────────
export const CANONICAL_FRAUD_DIAGNOSES = [
  { code: 'M54.5', description: 'Low Back Pain', claims: 894, fraud_claims: 127, fraud_rate: 14.2, amount: 1_587_500 },
  { code: 'E11.9', description: 'Type 2 Diabetes Mellitus', claims: 783, fraud_claims: 98, fraud_rate: 12.5, amount: 978_750 },
  { code: 'M17.9', description: 'Osteoarthritis of Knee', claims: 654, fraud_claims: 91, fraud_rate: 13.9, amount: 1_222_500 },
  { code: 'I25.10', description: 'Coronary Artery Disease', claims: 523, fraud_claims: 73, fraud_rate: 14.0, amount: 1_634_375 },
  { code: 'M79.3', description: 'Panniculitis', claims: 487, fraud_claims: 77, fraud_rate: 15.8, amount: 912_500 },
  { code: 'G43.909', description: 'Migraine, Unspecified', claims: 432, fraud_claims: 49, fraud_rate: 11.3, amount: 540_000 },
  { code: 'F32.1', description: 'Major Depressive Disorder', claims: 398, fraud_claims: 36, fraud_rate: 9.0, amount: 497_500 },
  { code: 'N18.9', description: 'Chronic Kidney Disease', claims: 356, fraud_claims: 46, fraud_rate: 12.9, amount: 890_000 },
];

// ─────────────────────────────────────────────────
// 9. MONTHLY TREND DATA (Section 4.10 fix)
// Realistic monthly claims with gradual upward drift,
// seasonal bumps, and occasional spikes
// ─────────────────────────────────────────────────
export const CANONICAL_MONTHLY_TRENDS = [
  { month: 'Jan 2025', claims: 1542, fraud_claims: 342, amount: 1_927_500, fraud_rate: 6.2 },
  { month: 'Feb 2025', claims: 1498, fraud_claims: 318, amount: 1_872_500, fraud_rate: 6.5 },
  { month: 'Mar 2025', claims: 1623, fraud_claims: 374, amount: 2_028_750, fraud_rate: 6.8 },
  { month: 'Apr 2025', claims: 1587, fraud_claims: 362, amount: 1_983_750, fraud_rate: 6.9 },
  { month: 'May 2025', claims: 1712, fraud_claims: 412, amount: 2_140_000, fraud_rate: 7.4 },
  { month: 'Jun 2025', claims: 1654, fraud_claims: 387, amount: 2_067_500, fraud_rate: 7.1 },
  { month: 'Jul 2025', claims: 1789, fraud_claims: 456, amount: 2_236_250, fraud_rate: 7.8 },
  { month: 'Aug 2025', claims: 1823, fraud_claims: 478, amount: 2_278_750, fraud_rate: 8.2 },
  { month: 'Sep 2025', claims: 1698, fraud_claims: 423, amount: 2_122_500, fraud_rate: 7.5 },
  { month: 'Oct 2025', claims: 1756, fraud_claims: 445, amount: 2_195_000, fraud_rate: 7.9 },
  { month: 'Nov 2025', claims: 1867, fraud_claims: 498, amount: 2_333_750, fraud_rate: 8.4 },
  { month: 'Dec 2025', claims: 1523, fraud_claims: 488, amount: 1_903_750, fraud_rate: 9.1 },
];

// ─────────────────────────────────────────────────
// 10. PATIENTS (realistic names, ages, genders)
// ─────────────────────────────────────────────────
export const CANONICAL_PATIENTS = [
  { id: 'PAT-001', name: 'Margaret Thompson', age: 72, gender: 'F', city: 'New York', state: 'NY', total_claims: 47, total_amount: 29_250, flagged_claims: 12, fraud_score: 78.3 },
  { id: 'PAT-002', name: 'Robert Chen', age: 58, gender: 'M', city: 'San Francisco', state: 'CA', total_claims: 38, total_amount: 23_750, flagged_claims: 9, fraud_score: 72.1 },
  { id: 'PAT-003', name: 'Patricia Williams', age: 65, gender: 'F', city: 'Chicago', state: 'IL', total_claims: 52, total_amount: 32_500, flagged_claims: 15, fraud_score: 85.6 },
  { id: 'PAT-004', name: 'James Anderson', age: 45, gender: 'M', city: 'Houston', state: 'TX', total_claims: 29, total_amount: 18_125, flagged_claims: 7, fraud_score: 64.8 },
  { id: 'PAT-005', name: 'Linda Martinez', age: 61, gender: 'F', city: 'Phoenix', state: 'AZ', total_claims: 41, total_amount: 25_625, flagged_claims: 11, fraud_score: 76.2 },
  { id: 'PAT-006', name: 'William Brown', age: 54, gender: 'M', city: 'Denver', state: 'CO', total_claims: 35, total_amount: 21_875, flagged_claims: 8, fraud_score: 69.4 },
  { id: 'PAT-007', name: 'Elizabeth Davis', age: 78, gender: 'F', city: 'Miami', state: 'FL', total_claims: 44, total_amount: 27_500, flagged_claims: 13, fraud_score: 81.7 },
  { id: 'PAT-008', name: 'Michael Wilson', age: 39, gender: 'M', city: 'Boston', state: 'MA', total_claims: 26, total_amount: 16_250, flagged_claims: 6, fraud_score: 58.3 },
  { id: 'PAT-009', name: 'Barbara Garcia', age: 67, gender: 'F', city: 'Atlanta', state: 'GA', total_claims: 39, total_amount: 24_375, flagged_claims: 10, fraud_score: 73.9 },
  { id: 'PAT-010', name: 'David Rodriguez', age: 48, gender: 'M', city: 'Los Angeles', state: 'CA', total_claims: 31, total_amount: 19_375, flagged_claims: 8, fraud_score: 67.5 },
];

// ─────────────────────────────────────────────────
// 11. POLICIES (realistic format, balanced statuses)
// Policy ID format: POL-YYYY-XXXXXXXXX
// ─────────────────────────────────────────────────
export const CANONICAL_POLICIES = [
  { id: 'POL-001', policy_number: 'POL-2025-001847', patient_name: 'Margaret Thompson', patient_id: 'PAT-001', plan_type: 'Medicare Advantage', provider: 'Metropolitan General Hospital', start_date: '2025-01-01', end_date: '2025-12-31', premium: 485.00, deductible: 1500, max_coverage: 500000, status: 'active', claims_count: 12, total_paid: 15_000, risk_score: 23.4 },
  { id: 'POL-002', policy_number: 'POL-2025-002341', patient_name: 'Robert Chen', patient_id: 'PAT-002', plan_type: 'Blue Cross PPO', provider: 'City Health Network', start_date: '2025-03-15', end_date: '2026-03-14', premium: 620.00, deductible: 2000, max_coverage: 750000, status: 'active', claims_count: 8, total_paid: 10_000, risk_score: 45.2 },
  { id: 'POL-003', policy_number: 'POL-2025-001562', patient_name: 'Patricia Williams', patient_id: 'PAT-003', plan_type: 'Aetna HMO', provider: 'St. Mary Medical Center', start_date: '2025-02-01', end_date: '2026-01-31', premium: 540.00, deductible: 1800, max_coverage: 600000, status: 'active', claims_count: 15, total_paid: 18_750, risk_score: 67.8 },
  { id: 'POL-004', policy_number: 'POL-2025-003102', patient_name: 'James Anderson', patient_id: 'PAT-004', plan_type: 'UnitedHealth Choice', provider: 'Pacific Wellness Group', start_date: '2025-04-01', end_date: '2026-03-31', premium: 510.00, deductible: 1700, max_coverage: 650000, status: 'active', claims_count: 6, total_paid: 7_500, risk_score: 31.5 },
  { id: 'POL-005', policy_number: 'POL-2025-002876', patient_name: 'Linda Martinez', patient_id: 'PAT-005', plan_type: 'Cigna Open Access', provider: 'Summit Healthcare Partners', start_date: '2025-01-15', end_date: '2026-01-14', premium: 575.00, deductible: 2200, max_coverage: 700000, status: 'active', claims_count: 11, total_paid: 13_750, risk_score: 52.1 },
];

// ─────────────────────────────────────────────────
// 12. CLAIMS OVER TIME (monthly for chart consistency)
// ─────────────────────────────────────────────────
export const CANONICAL_CLAIMS_OVER_TIME = [
  { date: '2025-01-01', total_claims: 1542, fraud_claims: 342, total_amount: 1_927_500, fraud_amount: 427_500 },
  { date: '2025-02-01', total_claims: 1498, fraud_claims: 318, total_amount: 1_872_500, fraud_amount: 397_500 },
  { date: '2025-03-01', total_claims: 1623, fraud_claims: 374, total_amount: 2_028_750, fraud_amount: 467_500 },
  { date: '2025-04-01', total_claims: 1587, fraud_claims: 362, total_amount: 1_983_750, fraud_amount: 452_500 },
  { date: '2025-05-01', total_claims: 1712, fraud_claims: 412, total_amount: 2_140_000, fraud_amount: 515_000 },
  { date: '2025-06-01', total_claims: 1654, fraud_claims: 387, total_amount: 2_067_500, fraud_amount: 483_750 },
  { date: '2025-07-01', total_claims: 1789, fraud_claims: 456, total_amount: 2_236_250, fraud_amount: 570_000 },
  { date: '2025-08-01', total_claims: 1823, fraud_claims: 478, total_amount: 2_278_750, fraud_amount: 597_500 },
  { date: '2025-09-01', total_claims: 1698, fraud_claims: 423, total_amount: 2_122_500, fraud_amount: 528_750 },
  { date: '2025-10-01', total_claims: 1756, fraud_claims: 445, total_amount: 2_195_000, fraud_amount: 556_250 },
  { date: '2025-11-01', total_claims: 1867, fraud_claims: 498, total_amount: 2_333_750, fraud_amount: 622_500 },
  { date: '2025-12-01', total_claims: 1523, fraud_claims: 488, total_amount: 1_903_750, fraud_amount: 610_000 },
];

// ─────────────────────────────────────────────────
// 13. NOTIFICATIONS (diverse, deduplicated — Section 8A fix)
// ─────────────────────────────────────────────────
export const CANONICAL_NOTIFICATIONS = [
  { id: 1, type: 'fraud_alert', title: 'High-Risk Claim Detected', message: 'Claim CLM-2025-000127 flagged with 94.2% fraud probability. Provider: Metropolitan General Hospital. Amount: $2,450.00', severity: 'critical', read: false, created_at: '2025-12-16T14:30:00Z', claim_id: 'CLM-2025-000127' },
  { id: 2, type: 'model_alert', title: 'Model Performance Degradation', message: 'F1 Score dropped from 0.932 to 0.918 in the last 24 hours. Consider retraining the model.', severity: 'warning', read: false, created_at: '2025-12-16T12:15:00Z' },
  { id: 3, type: 'fraud_alert', title: 'Duplicate Claims Pattern', message: '12 duplicate claims detected from St. Mary Medical Center in the past 48 hours. Total potential fraud: $15,680.00', severity: 'critical', read: false, created_at: '2025-12-16T10:45:00Z' },
  { id: 4, type: 'system_alert', title: 'Database Performance Warning', message: 'Query response time increased by 35% in the last hour. Average latency: 245ms', severity: 'warning', read: true, created_at: '2025-12-16T08:20:00Z' },
  { id: 5, type: 'fraud_alert', title: 'Upcoding Detected', message: 'Code M54.5 billed at $12,400 (avg: $450). Provider: Pacific Wellness Group. Pattern suggests systematic upcoding.', severity: 'critical', read: true, created_at: '2025-12-15T16:30:00Z', claim_id: 'CLM-2025-000089' },
  { id: 6, type: 'model_alert', title: 'Model Training Complete', message: 'Model v3.2.1 training completed successfully. Accuracy: 94.6%, F1: 0.925, AUC: 0.9647', severity: 'info', read: true, created_at: '2025-12-15T14:00:00Z' },
  { id: 7, type: 'fraud_alert', title: 'Phantom Billing Suspected', message: '3 claims from Summit Healthcare Partners for services on dates patient was hospitalized elsewhere.', severity: 'critical', read: false, created_at: '2025-12-15T11:20:00Z', claim_id: 'CLM-2025-000056' },
  { id: 8, type: 'system_alert', title: 'Storage Usage Warning', message: 'Disk usage at 82.7%. Consider archiving old claim data or expanding storage capacity.', severity: 'warning', read: true, created_at: '2025-12-15T09:00:00Z' },
  { id: 9, type: 'policy_alert', title: 'Policy Expiration Alert', message: 'Policy POL-2025-001847 for Margaret Thompson expires in 15 days. Premium renewal due.', severity: 'info', read: true, created_at: '2025-12-14T08:00:00Z' },
  { id: 10, type: 'fraud_alert', title: 'Geographic Anomaly Detected', message: 'Lakeside Medical Associates: 15 claims from patients residing >250 miles from provider. No referral documentation.', severity: 'warning', read: true, created_at: '2025-12-13T15:45:00Z' },
  { id: 11, type: 'system_alert', title: 'Model Retraining Scheduled', message: 'Auto-retraining scheduled for Dec 28, 2025. Dataset v4.1 queued for processing.', severity: 'info', read: true, created_at: '2025-12-12T10:00:00Z' },
  { id: 12, type: 'policy_alert', title: 'High-Risk Policy Flagged', message: 'Policy POL-2025-001562 (Patricia Williams) shows claims 3x above plan average. Risk score: 67.8.', severity: 'warning', read: false, created_at: '2025-12-11T09:30:00Z' },
];

// ─────────────────────────────────────────────────
// 14. AUDIT TRAIL STATUSES (canonical workflow)
// ─────────────────────────────────────────────────
export const CLAIM_STATE_MACHINE = {
  Submitted:       { next: ['AI Scored'], label: 'Claim Submitted' },
  'AI Scored':     { next: ['Under Review', 'Approved'], label: 'AI Risk Assessment Complete' },
  'Under Review':  { next: ['Approved', 'Rejected', 'Fraud Confirmed'], label: 'Under SIU Investigation' },
  Approved:        { next: ['Closed'], label: 'Claim Approved' },
  Rejected:        { next: ['Closed'], label: 'Claim Rejected' },
  'Fraud Confirmed': { next: ['Closed'], label: 'Fraud Confirmed — Referred to Legal' },
  Closed:          { next: [], label: 'Case Closed' },
};

// ─────────────────────────────────────────────────
// 15. SHAP FEATURES (for dashboard — normalized % of max)
// ─────────────────────────────────────────────────
export const CANONICAL_SHAP_FEATURES = [
  { label: 'Claim Amount Deviation', value: 0.34, color: '#ef4444' },
  { label: 'Patient-Provider Distance', value: 0.27, color: '#f97316' },
  { label: 'Prior Claim Frequency', value: 0.19, color: '#f59e0b' },
  { label: 'Procedure Count', value: 0.12, color: '#6366f1' },
  { label: 'Diagnosis-Procedure Match', value: 0.08, color: '#8b5cf6' },
];

// ─────────────────────────────────────────────────
// 16. REGIONAL DATA (consistent with funnel totals)
// ─────────────────────────────────────────────────
export const CANONICAL_REGIONAL_DATA = [
  { state: 'CA', total_claims: 3450, fraud_claims: 382 },
  { state: 'TX', total_claims: 2980, fraud_claims: 215 },
  { state: 'FL', total_claims: 3120, fraud_claims: 514 },
  { state: 'NY', total_claims: 2850, fraud_claims: 276 },
  { state: 'IL', total_claims: 2100, fraud_claims: 146 },
  { state: 'PA', total_claims: 1870, fraud_claims: 98 },
  { state: 'OH', total_claims: 1640, fraud_claims: 112 },
  { state: 'GA', total_claims: 1520, fraud_claims: 189 },
  { state: 'NC', total_claims: 1310, fraud_claims: 78 },
  { state: 'MI', total_claims: 1232, fraud_claims: 93 },
];

// ─────────────────────────────────────────────────
// 17. INVESTIGATORS
// ─────────────────────────────────────────────────
export const CANONICAL_INVESTIGATORS = [
  'Dr. Sarah Mitchell',
  'James Rodriguez, CFE',
  'Dr. Emily Chen',
  'Mark Thompson, CPA',
  'Lisa Park, CPC',
  'Dr. Robert Kim',
  'Angela Davis, AHFI',
  "Dr. Michael O'Brien"
];

// ─────────────────────────────────────────────────
// 18. FRAUD CATEGORIES (with Compliance risk separated)
// ─────────────────────────────────────────────────
export const CANONICAL_FRAUD_CATEGORIES = [
  { category: 'Upcoding', count: 1489, percentage: 29.9, amount: 1_862_500 },
  { category: 'Duplicate Claims', count: 1023, percentage: 20.5, amount: 1_278_750 },
  { category: 'Phantom Billing', count: 834, percentage: 16.7, amount: 1_042_500 },
  { category: 'Unbundling', count: 612, percentage: 12.3, amount: 765_000 },
  { category: 'Kickback Schemes', count: 478, percentage: 9.6, amount: 597_500 },
  { category: 'Identity Fraud', count: 312, percentage: 6.3, amount: 390_000 },
  { category: 'Compliance Risk', count: 235, percentage: 4.7, amount: 293_750 },
];

// ─────────────────────────────────────────────────
// 19. CUMULATIVE SAVINGS (for Executive chart — monotonic growth)
// ─────────────────────────────────────────────────
export const CANONICAL_CUMULATIVE_SAVINGS = [
  { month: 'Jan 2025', saved: 312_500 },
  { month: 'Feb 2025', saved: 656_250 },
  { month: 'Mar 2025', saved: 1_031_250 },
  { month: 'Apr 2025', saved: 1_437_500 },
  { month: 'May 2025', saved: 1_887_500 },
  { month: 'Jun 2025', saved: 2_362_500 },
  { month: 'Jul 2025', saved: 2_887_500 },
  { month: 'Aug 2025', saved: 3_443_750 },
  { month: 'Sep 2025', saved: 3_956_250 },
  { month: 'Oct 2025', saved: 4_512_500 },
  { month: 'Nov 2025', saved: 5_125_000 },
  { month: 'Dec 2025', saved: 5_793_750 },
];

// ─────────────────────────────────────────────────
// 20. FRAUD BY CITY (Section 2 fix — internal portfolio data)
// ─────────────────────────────────────────────────
export const CANONICAL_FRAUD_BY_CITY = [
  { city: 'New York', state: 'NY', fraud_claims: 276, total_claims: 2850, rate: 9.7 },
  { city: 'Los Angeles', state: 'CA', fraud_claims: 218, total_claims: 2340, rate: 9.3 },
  { city: 'Chicago', state: 'IL', fraud_claims: 146, total_claims: 2100, rate: 7.0 },
  { city: 'Houston', state: 'TX', fraud_claims: 189, total_claims: 2980, rate: 6.3 },
  { city: 'Phoenix', state: 'AZ', fraud_claims: 112, total_claims: 1640, rate: 6.8 },
  { city: 'Miami', state: 'FL', fraud_claims: 312, total_claims: 2150, rate: 14.5 },
  { city: 'San Francisco', state: 'CA', fraud_claims: 164, total_claims: 1110, rate: 14.8 },
  { city: 'Denver', state: 'CO', fraud_claims: 98, total_claims: 1520, rate: 6.4 },
  { city: 'Boston', state: 'MA', fraud_claims: 87, total_claims: 1380, rate: 6.3 },
  { city: 'Atlanta', state: 'GA', fraud_claims: 189, total_claims: 1520, rate: 12.4 },
];

// ─────────────────────────────────────────────────
// 21. TOP RISKY PROVIDERS (for Dashboard/Executive)
// ─────────────────────────────────────────────────
export const CANONICAL_TOP_RISKY_PROVIDERS = [
  { name: 'Metropolitan General Hospital', claim_count: 1842, fraud_count: 189, total_amount: 2_302_500 },
  { name: 'St. Mary Medical Center', claim_count: 1687, fraud_count: 162, total_amount: 2_108_750 },
  { name: 'City Health Network', claim_count: 2014, fraud_count: 145, total_amount: 2_517_500 },
  { name: 'Pacific Wellness Group', claim_count: 1456, fraud_count: 128, total_amount: 1_820_000 },
  { name: 'Summit Healthcare Partners', claim_count: 1523, fraud_count: 118, total_amount: 1_903_750 },
];

// ─────────────────────────────────────────────────
// 22. TOP RISKY PATIENTS (for Dashboard)
// Based on claim volume × severity, not single incident
// ─────────────────────────────────────────────────
export const CANONICAL_TOP_RISKY_PATIENTS = [
  { name: 'Patricia Williams', claim_count: 52, fraud_count: 15, age: 65, gender: 'F', city: 'Chicago' },
  { name: 'Margaret Thompson', claim_count: 47, fraud_count: 12, age: 72, gender: 'F', city: 'New York' },
  { name: 'Elizabeth Davis', claim_count: 44, fraud_count: 13, age: 78, gender: 'F', city: 'Miami' },
  { name: 'Linda Martinez', claim_count: 41, fraud_count: 11, age: 61, gender: 'F', city: 'Phoenix' },
];
