/* ===== CANONICAL DATA — SINGLE SOURCE OF TRUTH =====
   Every metric, count, and model statistic in the app must reference this file.
   No page should hardcode its own version of these values.
*/

// ─────────────────────────────────────────────────
// NOW — single dynamic timestamp used across ALL pages
// ─────────────────────────────────────────────────
const _NOW = Date.now();
export const CANONICAL_NOW = () => new Date(_NOW).toISOString();
export const getNow = () => new Date(_NOW);

// ─────────────────────────────────────────────────
// 0. CORE METRICS — every page reads from here
// ─────────────────────────────────────────────────
export const CANONICAL_REFERENCE = {
  totalClaims: 200,
  totalPatients: 500,
  totalProviders: 15,
  totalPolicies: 80,
  totalHospitalsDetailed: 15,

  // Fraud rate — single canonical number across entire system
  fraudRate: 7.5,
  totalFraudClaims: 15,           // 15/200 = 7.5% — single figure everywhere
  formallyFlagged: 15,             // same: all flagged = all fraud = 15
  escalatedAlerts: 8,             // ~53% of 15 escalate to critical
  normalClaims: 185,              // 200 - 15

  // Financials
  avgClaimAmount: 12500,          // $12.5K realistic per claim
  totalClaimValue: 2_500_000,     // 200 × $12,500 = $2.5M
  totalClaimValueDisplay: '$2.5M',
  totalFraudPrevented: 475_000,   // ~19% of $2.5M — realistic fraud recovery
  fraudPreventedDisplay: '$475K',
  fraudExposure: 625_000,         // ~25% of claim value at risk
  moneySaved: 475_000,

  // Policy breakdown (must sum to totalPolicies)
  policiesActive: 41,
  policiesExpired: 26,
  policiesPending: 13,            // 80 - 41 - 26 = 13

  // Model
  modelAccuracy: 0.946,           // 94.6%
  modelPrecision: 0.882,          // 88.2% — from CM: 1800/(1800+287)
  detectionRate: 0.859,           // 85.9% — recall from CM: 1800/(1800+296) — DIFFERENT from accuracy
  modelF1Score: 0.870,            // 87.0% — 2*(0.882*0.859)/(0.882+0.859)

  // Detection funnel
  aiScoredHighRisk: 15,           // same as totalFraudClaims
  fraudThreshold: 0.75,

  // Auto-Adjudication: with 7.6% fraud rate, ~88.5% of claims pass automated review
  autoAdjudicationRate: 88.5,

  // Providers & Patients
  providerAvgClaim: 12500,
  patientAvgClaim: 12500,
};

// ─────────────────────────────────────────────────
// 1. MODEL METRICS
// ─────────────────────────────────────────────────
export const CANONICAL_MODEL = {
  version: 'v3.2.1',
  status: 'active',
  accuracy: CANONICAL_REFERENCE.modelAccuracy,       // 94.6%
  precision: CANONICAL_REFERENCE.modelPrecision,     // 88.2% — from CM: 1800/(1800+287)
  recall: CANONICAL_REFERENCE.detectionRate,          // 85.9% — NOT same as accuracy
  detectionRate: CANONICAL_REFERENCE.detectionRate,   // 85.9%
  f1Score: CANONICAL_REFERENCE.modelF1Score,          // 87.0% — NOT same as accuracy
  rocAuc: 0.9647,
  predictionTimeMs: 12.4,
  datasetVersion: 'v4.2',
  trainingDate: '2026-06-15',
  lastRetrained: '2026-06-15',
  dataDrift: 4.2,
  validationAccuracy: 0.938,
  numFeatures: 47,
  trainingSize: 128459,
  fraudThreshold: 0.75,
  confusionMatrix: {
    tn: 8417,  fp: 287,  fn: 296,  tp: 1800
    // accuracy = (8417+1800)/10800 = 94.60%
    // precision = 1800/(1800+287) = 88.2% (displayed value)
    // recall/detection = 1800/(1800+296) = 85.9%
    // F1 = 2*(0.882*0.859)/(0.882+0.859) = 87.0%
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
    { feature: 'Geographic Risk Index', importance: 0.007 },
  ],
  versions: [
    { version: 'v3.2.1', label: 'Primary Model', accuracy: 0.946, f1: 0.870, auc: 0.9647, date: '2026-06-15', status: 'active' },
    { version: 'v3.1.0', label: 'Secondary Model', accuracy: 0.918, f1: 0.842, auc: 0.9512, date: '2026-06-01', status: 'standby' },
    { version: 'v3.0.0', label: 'Archive Model', accuracy: 0.873, f1: 0.805, auc: 0.9345, date: '2026-05-15', status: 'archived' },
  ],
  trainingRuns: [
    { runId: 'TRN-2847', date: 'Jun 15, 2026', dataset: 'v4.2 (128K records)', duration: '4h 32m', accuracy: '94.6%', f1: '87.0%', auc: '96.47%', status: 'Completed' },
    { runId: 'TRN-2831', date: 'Jun 1, 2026', dataset: 'v4.1 (125K records)', duration: '4h 18m', accuracy: '94.2%', f1: '85.3%', auc: '96.12%', status: 'Completed' },
    { runId: 'TRN-2819', date: 'May 15, 2026', dataset: 'v4.0 (122K records)', duration: '4h 45m', accuracy: '93.8%', f1: '84.1%', auc: '95.78%', status: 'Completed' },
  ],
};

// ─────────────────────────────────────────────────
// 2. FUNNEL (derived)
// ─────────────────────────────────────────────────
export const CANONICAL_FUNNEL = {
  totalClaims: CANONICAL_REFERENCE.totalClaims,
  totalProviders: CANONICAL_REFERENCE.totalProviders,
  totalPatients: CANONICAL_REFERENCE.totalPatients,
  totalPolicies: CANONICAL_REFERENCE.totalPolicies,
  aiScoredHighRisk: CANONICAL_REFERENCE.aiScoredHighRisk,   // 15
  formallyFlagged: CANONICAL_REFERENCE.formallyFlagged,      // 15
  escalatedAlerts: CANONICAL_REFERENCE.escalatedAlerts,      // 8
  normalClaims: CANONICAL_REFERENCE.normalClaims,            // 185
};

// ─────────────────────────────────────────────────
// 3. FINANCIALS
// ─────────────────────────────────────────────────
export const CANONICAL_FINANCIALS = {
  totalClaimValue: CANONICAL_REFERENCE.totalClaimValue,           // $2.5M
  avgClaimAmount: CANONICAL_REFERENCE.avgClaimAmount,             // $12,500
  totalFraudPrevented: CANONICAL_REFERENCE.totalFraudPrevented,   // $475K
  fraudExposure: CANONICAL_REFERENCE.fraudExposure,               // $625K
  moneySaved: CANONICAL_REFERENCE.moneySaved,                     // $475K
  revenueProtected: CANONICAL_REFERENCE.totalClaimValue - CANONICAL_REFERENCE.fraudExposure, // $1.875M
};

// ─────────────────────────────────────────────────
// 4. STATUSES & COLORS
// ─────────────────────────────────────────────────
export const CANONICAL_STATUSES = [
  'Submitted', 'AI Scored', 'Under Review', 'Approved', 'Rejected', 'Fraud Confirmed', 'Closed',
];

export const CLAIM_STATUS_COLORS = {
  'Submitted':        { bg: 'bg-indigo-500/10',  text: 'text-indigo-500',  border: 'border-indigo-500/20' },
  'AI Scored':        { bg: 'bg-accent/10',       text: 'text-accent',      border: 'border-accent/20' },
  'Under Review':     { bg: 'bg-warning/10',      text: 'text-warning',     border: 'border-warning/20' },
  'Approved':         { bg: 'bg-success/10',      text: 'text-success',     border: 'border-success/20' },
  'Rejected':         { bg: 'bg-danger/10',       text: 'text-danger',      border: 'border-danger/20' },
  'Fraud Confirmed':  { bg: 'bg-red-500/10',      text: 'text-red-500',     border: 'border-red-500/20' },
  'Closed':           { bg: 'bg-slate-500/10',    text: 'text-slate-500',   border: 'border-slate-500/20' },
};

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
// 5. PROVIDERS (same 15 in every page)
// ─────────────────────────────────────────────────
export const CANONICAL_PROVIDERS = [
  { id: 'PRV-001', name: 'Metropolitan General Hospital',      type: 'Hospital',      specialty: 'Multi-Specialty',   city: 'New York',       state: 'NY', total_claims: 28, fraud_claims: 12, total_amount: 350_000 },
  { id: 'PRV-002', name: 'St. Mary Medical Center',            type: 'Hospital',      specialty: 'Multi-Specialty',   city: 'Los Angeles',    state: 'CA', total_claims: 24, fraud_claims: 8, total_amount: 300_000 },
  { id: 'PRV-003', name: 'City Health Network',                type: 'Clinic Network', specialty: 'Primary Care',       city: 'Chicago',        state: 'IL', total_claims: 22, fraud_claims: 2, total_amount: 275_000 },
  { id: 'PRV-004', name: 'Pacific Wellness Group',             type: 'Medical Group',  specialty: 'Internal Medicine',  city: 'San Francisco',  state: 'CA', total_claims: 18, fraud_claims: 6, total_amount: 225_000 },
  { id: 'PRV-005', name: 'Summit Healthcare Partners',         type: 'Medical Group',  specialty: 'Cardiology',        city: 'Denver',         state: 'CO', total_claims: 16, fraud_claims: 1, total_amount: 200_000 },
  { id: 'PRV-006', name: 'Lakeside Medical Associates',        type: 'Clinic',         specialty: 'Family Medicine',   city: 'Minneapolis',    state: 'MN', total_claims: 14, fraud_claims: 1, total_amount: 175_000 },
  { id: 'PRV-007', name: 'Valley Regional Hospital',           type: 'Hospital',       specialty: 'Emergency Medicine',city: 'Phoenix',        state: 'AZ', total_claims: 12, fraud_claims: 1, total_amount: 150_000 },
  { id: 'PRV-008', name: 'Northeast Health Services',          type: 'Health System',  specialty: 'Multi-Specialty',   city: 'Boston',         state: 'MA', total_claims: 10, fraud_claims: 1, total_amount: 125_000 },
  { id: 'PRV-009', name: 'Premier Care Network',               type: 'Clinic Network',  specialty: 'Orthopedics',       city: 'Atlanta',        state: 'GA', total_claims: 10, fraud_claims: 0, total_amount: 125_000 },
  { id: 'PRV-010', name: 'Community Health Alliance',          type: 'Community Health',specialty: 'Pediatrics',        city: 'Houston',        state: 'TX', total_claims: 10, fraud_claims: 0, total_amount: 125_000 },
  { id: 'PRV-011', name: 'Sunrise Health Clinic',              type: 'Clinic',         specialty: 'Dermatology',       city: 'Miami',          state: 'FL', total_claims: 8,  fraud_claims: 0, total_amount: 100_000 },
  { id: 'PRV-012', name: 'Heartland Medical Center',           type: 'Hospital',       specialty: 'Cardiology',        city: 'Kansas City',    state: 'MO', total_claims: 8,  fraud_claims: 0, total_amount: 100_000 },
  { id: 'PRV-013', name: 'Coastal Diagnostic Center',          type: 'Diagnostic',     specialty: 'Radiology',         city: 'San Diego',      state: 'CA', total_claims: 6,  fraud_claims: 0, total_amount: 75_000  },
  { id: 'PRV-014', name: 'Midwest Surgical Institute',         type: 'Surgery Center', specialty: 'General Surgery',    city: 'Detroit',        state: 'MI', total_claims: 6,  fraud_claims: 0, total_amount: 75_000  },
  { id: 'PRV-015', name: 'Southeast Neurology Associates',     type: 'Specialist',     specialty: 'Neurology',         city: 'Charlotte',      state: 'NC', total_claims: 4,  fraud_claims: 0, total_amount: 50_000  },
];

// ─────────────────────────────────────────────────
// 6. PATIENTS (50 unique, total dataset = 500)
// Used by Analytics page fallback for claim generation.
// ─────────────────────────────────────────────────
export const CANONICAL_PATIENTS = [
  { id: 'PAT-001', name: 'Margaret Thompson', age: 72, gender: 'F', city: 'New York',       state: 'NY', total_claims: 5,  total_amount: 62500,  flagged_claims: 1, fraud_score: 78.3 },
  { id: 'PAT-002', name: 'Robert Chen',       age: 58, gender: 'M', city: 'San Francisco',  state: 'CA', total_claims: 4,  total_amount: 50000,  flagged_claims: 0, fraud_score: 32.1 },
  { id: 'PAT-003', name: 'Patricia Williams', age: 65, gender: 'F', city: 'Chicago',        state: 'IL', total_claims: 6,  total_amount: 75000,  flagged_claims: 1, fraud_score: 85.6 },
  { id: 'PAT-004', name: 'James Anderson',    age: 45, gender: 'M', city: 'Houston',        state: 'TX', total_claims: 3,  total_amount: 37500,  flagged_claims: 0, fraud_score: 24.8 },
  { id: 'PAT-005', name: 'Linda Martinez',    age: 61, gender: 'F', city: 'Phoenix',        state: 'AZ', total_claims: 4,  total_amount: 50000,  flagged_claims: 1, fraud_score: 76.2 },
  { id: 'PAT-006', name: 'William Brown',     age: 54, gender: 'M', city: 'Denver',         state: 'CO', total_claims: 3,  total_amount: 37500,  flagged_claims: 0, fraud_score: 29.4 },
  { id: 'PAT-007', name: 'Elizabeth Davis',   age: 78, gender: 'F', city: 'Miami',          state: 'FL', total_claims: 5,  total_amount: 62500,  flagged_claims: 1, fraud_score: 81.7 },
  { id: 'PAT-008', name: 'Michael Wilson',    age: 39, gender: 'M', city: 'Boston',         state: 'MA', total_claims: 2,  total_amount: 25000,  flagged_claims: 0, fraud_score: 18.3 },
  { id: 'PAT-009', name: 'Barbara Garcia',    age: 67, gender: 'F', city: 'Atlanta',        state: 'GA', total_claims: 4,  total_amount: 50000,  flagged_claims: 1, fraud_score: 73.9 },
  { id: 'PAT-010', name: 'David Rodriguez',   age: 48, gender: 'M', city: 'Los Angeles',    state: 'CA', total_claims: 3,  total_amount: 37500,  flagged_claims: 0, fraud_score: 27.5 },
  { id: 'PAT-011', name: 'Sarah Mitchell',    age: 43, gender: 'F', city: 'Seattle',        state: 'WA', total_claims: 4,  total_amount: 50000,  flagged_claims: 0, fraud_score: 30.2 },
  { id: 'PAT-012', name: 'Daniel Kim',        age: 56, gender: 'M', city: 'Austin',         state: 'TX', total_claims: 7,  total_amount: 87500,  flagged_claims: 1, fraud_score: 72.4 },
  { id: 'PAT-013', name: 'Jennifer Lopez',    age: 34, gender: 'F', city: 'San Antonio',    state: 'TX', total_claims: 2,  total_amount: 25000,  flagged_claims: 0, fraud_score: 15.8 },
  { id: 'PAT-014', name: 'Christopher Taylor',age: 62, gender: 'M', city: 'Dallas',         state: 'TX', total_claims: 5,  total_amount: 62500,  flagged_claims: 0, fraud_score: 28.9 },
  { id: 'PAT-015', name: 'Amanda Foster',     age: 47, gender: 'F', city: 'Portland',       state: 'OR', total_claims: 3,  total_amount: 37500,  flagged_claims: 0, fraud_score: 22.1 },
  { id: 'PAT-016', name: 'Kevin Patel',       age: 51, gender: 'M', city: 'San Jose',       state: 'CA', total_claims: 8,  total_amount: 100000, flagged_claims: 2, fraud_score: 68.5 },
  { id: 'PAT-017', name: 'Maria Gonzalez',    age: 38, gender: 'F', city: 'Las Vegas',      state: 'NV', total_claims: 2,  total_amount: 25000,  flagged_claims: 0, fraud_score: 19.3 },
  { id: 'PAT-018', name: 'Thomas Harris',     age: 71, gender: 'M', city: 'Nashville',      state: 'TN', total_claims: 6,  total_amount: 75000,  flagged_claims: 1, fraud_score: 74.1 },
  { id: 'PAT-019', name: 'Nicole Clark',      age: 44, gender: 'F', city: 'Charlotte',      state: 'NC', total_claims: 3,  total_amount: 37500,  flagged_claims: 0, fraud_score: 26.7 },
  { id: 'PAT-020', name: 'Brian Lewis',       age: 59, gender: 'M', city: 'Columbus',       state: 'OH', total_claims: 5,  total_amount: 62500,  flagged_claims: 1, fraud_score: 71.8 },
  { id: 'PAT-021', name: 'Stephanie Walker',  age: 33, gender: 'F', city: 'Indianapolis',   state: 'IN', total_claims: 2,  total_amount: 25000,  flagged_claims: 0, fraud_score: 14.2 },
  { id: 'PAT-022', name: 'Jason Robinson',    age: 46, gender: 'M', city: 'Philadelphia',   state: 'PA', total_claims: 9,  total_amount: 112500, flagged_claims: 2, fraud_score: 65.3 },
  { id: 'PAT-023', name: 'Laura Adams',       age: 55, gender: 'F', city: 'San Diego',      state: 'CA', total_claims: 4,  total_amount: 50000,  flagged_claims: 0, fraud_score: 31.5 },
  { id: 'PAT-024', name: 'Ryan Martinez',     age: 41, gender: 'M', city: 'Denver',         state: 'CO', total_claims: 3,  total_amount: 37500,  flagged_claims: 0, fraud_score: 23.4 },
  { id: 'PAT-025', name: 'Christine Scott',   age: 68, gender: 'F', city: 'New York',       state: 'NY', total_claims: 6,  total_amount: 75000,  flagged_claims: 1, fraud_score: 77.6 },
  { id: 'PAT-026', name: 'Mark Young',        age: 52, gender: 'M', city: 'Phoenix',        state: 'AZ', total_claims: 4,  total_amount: 50000,  flagged_claims: 0, fraud_score: 29.8 },
  { id: 'PAT-027', name: 'Ashley King',       age: 36, gender: 'F', city: 'Houston',        state: 'TX', total_claims: 3,  total_amount: 37500,  flagged_claims: 0, fraud_score: 21.9 },
  { id: 'PAT-028', name: 'Jeffrey Baker',     age: 63, gender: 'M', city: 'Chicago',        state: 'IL', total_claims: 7,  total_amount: 87500,  flagged_claims: 1, fraud_score: 69.2 },
  { id: 'PAT-029', name: 'Emily Campbell',    age: 42, gender: 'F', city: 'Miami',          state: 'FL', total_claims: 2,  total_amount: 25000,  flagged_claims: 0, fraud_score: 17.4 },
  { id: 'PAT-030', name: ' Gregory Cooper',   age: 57, gender: 'M', city: 'Atlanta',        state: 'GA', total_claims: 5,  total_amount: 62500,  flagged_claims: 0, fraud_score: 27.1 },
  { id: 'PAT-031', name: 'Rachel Hill',       age: 49, gender: 'F', city: 'San Francisco',  state: 'CA', total_claims: 4,  total_amount: 50000,  flagged_claims: 1, fraud_score: 73.5 },
  { id: 'PAT-032', name: 'Nathan Brooks',     age: 60, gender: 'M', city: 'Boston',         state: 'MA', total_claims: 3,  total_amount: 37500,  flagged_claims: 0, fraud_score: 25.3 },
  { id: 'PAT-033', name: 'Samantha Reed',     age: 37, gender: 'F', city: 'Seattle',        state: 'WA', total_claims: 6,  total_amount: 75000,  flagged_claims: 1, fraud_score: 76.8 },
  { id: 'PAT-034', name: 'Patrick Howard',    age: 53, gender: 'M', city: 'Dallas',         state: 'TX', total_claims: 2,  total_amount: 25000,  flagged_claims: 0, fraud_score: 16.5 },
  { id: 'PAT-035', name: 'Katherine Price',   age: 45, gender: 'F', city: 'Austin',         state: 'TX', total_claims: 8,  total_amount: 100000, flagged_claims: 2, fraud_score: 67.9 },
  { id: 'PAT-036', name: 'Andrew Collins',    age: 66, gender: 'M', city: 'Portland',       state: 'OR', total_claims: 4,  total_amount: 50000,  flagged_claims: 0, fraud_score: 30.8 },
  { id: 'PAT-037', name: 'Laura Stewart',     age: 40, gender: 'F', city: 'Las Vegas',      state: 'NV', total_claims: 3,  total_amount: 37500,  flagged_claims: 0, fraud_score: 22.6 },
  { id: 'PAT-038', name: 'Tyler Perry',       age: 48, gender: 'M', city: 'Nashville',      state: 'TN', total_claims: 5,  total_amount: 62500,  flagged_claims: 1, fraud_score: 70.4 },
  { id: 'PAT-039', name: 'Michelle Rivera',   age: 35, gender: 'F', city: 'Charlotte',      state: 'NC', total_claims: 2,  total_amount: 25000,  flagged_claims: 0, fraud_score: 18.7 },
  { id: 'PAT-040', name: 'Sean Evans',        age: 58, gender: 'M', city: 'San Antonio',    state: 'TX', total_claims: 7,  total_amount: 87500,  flagged_claims: 1, fraud_score: 66.1 },
  { id: 'PAT-041', name: 'Victoria Morgan',   age: 64, gender: 'F', city: 'Columbus',       state: 'OH', total_claims: 4,  total_amount: 50000,  flagged_claims: 0, fraud_score: 28.3 },
  { id: 'PAT-042', name: 'Derek Ross',        age: 47, gender: 'M', city: 'Indianapolis',   state: 'IN', total_claims: 3,  total_amount: 37500,  flagged_claims: 0, fraud_score: 24.5 },
  { id: 'PAT-043', name: 'Hannah Coleman',    age: 50, gender: 'F', city: 'Philadelphia',   state: 'PA', total_claims: 6,  total_amount: 75000,  flagged_claims: 1, fraud_score: 75.2 },
  { id: 'PAT-044', name: 'Marcus Bennett',    age: 42, gender: 'M', city: 'San Diego',      state: 'CA', total_claims: 5,  total_amount: 62500,  flagged_claims: 0, fraud_score: 33.6 },
  { id: 'PAT-045', name: 'Olivia Gray',       age: 39, gender: 'F', city: 'Denver',         state: 'CO', total_claims: 3,  total_amount: 37500,  flagged_claims: 0, fraud_score: 20.1 },
  { id: 'PAT-046', name: 'Ethan Murphy',      age: 55, gender: 'M', city: 'Phoenix',        state: 'AZ', total_claims: 8,  total_amount: 100000, flagged_claims: 2, fraud_score: 69.7 },
  { id: 'PAT-047', name: 'Chloe Sanders',     age: 44, gender: 'F', city: 'Houston',        state: 'TX', total_claims: 2,  total_amount: 25000,  flagged_claims: 0, fraud_score: 15.4 },
  { id: 'PAT-048', name: 'Brandon Price',     age: 61, gender: 'M', city: 'New York',       state: 'NY', total_claims: 4,  total_amount: 50000,  flagged_claims: 1, fraud_score: 72.0 },
  { id: 'PAT-049', name: 'Grace Howard',      age: 36, gender: 'F', city: 'Chicago',        state: 'IL', total_claims: 3,  total_amount: 37500,  flagged_claims: 0, fraud_score: 21.3 },
  { id: 'PAT-050', name: 'Carlos Simmons',    age: 54, gender: 'M', city: 'Los Angeles',    state: 'CA', total_claims: 5,  total_amount: 62500,  flagged_claims: 1, fraud_score: 74.8 },
];

// ─────────────────────────────────────────────────
// 7. FRAUD BY DIAGNOSIS (same rank in every page)
// ─────────────────────────────────────────────────
export const CANONICAL_FRAUD_DIAGNOSES = [
  { code: 'M54.5',  description: 'Low Back Pain',                claims: 32, fraud_claims: 4, fraud_rate: 12.5, amount: 400_000 },
  { code: 'E11.9',  description: 'Type 2 Diabetes Mellitus',     claims: 28, fraud_claims: 3, fraud_rate: 10.7, amount: 350_000 },
  { code: 'M17.9',  description: 'Osteoarthritis of Knee',      claims: 24, fraud_claims: 2, fraud_rate: 8.3,  amount: 300_000 },
  { code: 'I25.10', description: 'Coronary Artery Disease',      claims: 22, fraud_claims: 2, fraud_rate: 9.1,  amount: 275_000 },
  { code: 'M79.3',  description: 'Panniculitis',                 claims: 18, fraud_claims: 1, fraud_rate: 5.6,  amount: 225_000 },
  { code: 'G43.909',description: 'Migraine, Unspecified',        claims: 16, fraud_claims: 1, fraud_rate: 6.3,  amount: 200_000 },
  { code: 'F32.1',  description: 'Major Depressive Disorder',    claims: 14, fraud_claims: 1, fraud_rate: 7.1,  amount: 175_000 },
  { code: 'N18.9',  description: 'Chronic Kidney Disease',       claims: 12, fraud_claims: 1, fraud_rate: 8.3,  amount: 150_000 },
];

// ─────────────────────────────────────────────────
// 8. MONTHLY TRENDS (fraud ~7.6% each month)
// ─────────────────────────────────────────────────
export const CANONICAL_MONTHLY_TRENDS = [
  { month: 'Jan 2026', claims: 15, fraud_claims: 1, amount: 187_500, fraud_rate: 6.7 },
  { month: 'Feb 2026', claims: 16, fraud_claims: 1, amount: 200_000, fraud_rate: 6.3 },
  { month: 'Mar 2026', claims: 18, fraud_claims: 2, amount: 225_000, fraud_rate: 11.1 },
  { month: 'Apr 2026', claims: 17, fraud_claims: 1, amount: 212_500, fraud_rate: 5.9 },
  { month: 'May 2026', claims: 20, fraud_claims: 2, amount: 250_000, fraud_rate: 10.0 },
  { month: 'Jun 2026', claims: 19, fraud_claims: 1, amount: 237_500, fraud_rate: 5.3 },
  { month: 'Jul 2026', claims: 22, fraud_claims: 2, amount: 275_000, fraud_rate: 9.1 },
  { month: 'Aug 2026', claims: 21, fraud_claims: 2, amount: 262_500, fraud_rate: 9.5 },
  { month: 'Sep 2026', claims: 18, fraud_claims: 1, amount: 225_000, fraud_rate: 5.6 },
  { month: 'Oct 2026', claims: 17, fraud_claims: 1, amount: 212_500, fraud_rate: 5.9 },
  { month: 'Nov 2026', claims: 19, fraud_claims: 1, amount: 237_500, fraud_rate: 5.3 },
  { month: 'Dec 2026', claims: 18, fraud_claims: 1, amount: 225_000, fraud_rate: 5.6 },
];

// ─────────────────────────────────────────────────
// 9. CLAIMS OVER TIME (monthly, for charts)
// ─────────────────────────────────────────────────
export const CANONICAL_CLAIMS_OVER_TIME = [
  { date: '2026-01-01', total_claims: 15, fraud_claims: 1, total_amount: 187_500, fraud_amount: 12_500 },
  { date: '2026-02-01', total_claims: 16, fraud_claims: 1, total_amount: 200_000, fraud_amount: 12_500 },
  { date: '2026-03-01', total_claims: 18, fraud_claims: 2, total_amount: 225_000, fraud_amount: 25_000 },
  { date: '2026-04-01', total_claims: 17, fraud_claims: 1, total_amount: 212_500, fraud_amount: 12_500 },
  { date: '2026-05-01', total_claims: 20, fraud_claims: 2, total_amount: 250_000, fraud_amount: 25_000 },
  { date: '2026-06-01', total_claims: 19, fraud_claims: 1, total_amount: 237_500, fraud_amount: 12_500 },
  { date: '2026-07-01', total_claims: 22, fraud_claims: 2, total_amount: 275_000, fraud_amount: 25_000 },
  { date: '2026-08-01', total_claims: 21, fraud_claims: 2, total_amount: 262_500, fraud_amount: 25_000 },
  { date: '2026-09-01', total_claims: 18, fraud_claims: 1, total_amount: 225_000, fraud_amount: 12_500 },
  { date: '2026-10-01', total_claims: 17, fraud_claims: 1, total_amount: 212_500, fraud_amount: 12_500 },
  { date: '2026-11-01', total_claims: 19, fraud_claims: 1, total_amount: 237_500, fraud_amount: 12_500 },
  { date: '2026-12-01', total_claims: 18, fraud_claims: 1, total_amount: 225_000, fraud_amount: 12_500 },
];

// ─────────────────────────────────────────────────
// 10. REGIONAL DATA (Top 10 states, fraud ~7.6% avg)
// ─────────────────────────────────────────────────
export const CANONICAL_REGIONAL_DATA = [
  { state: 'CA', total_claims: 32, fraud_claims: 3, fraud_rate: 9.4 },
  { state: 'TX', total_claims: 28, fraud_claims: 2, fraud_rate: 7.1 },
  { state: 'FL', total_claims: 30, fraud_claims: 4, fraud_rate: 13.3 },
  { state: 'NY', total_claims: 26, fraud_claims: 2, fraud_rate: 7.7 },
  { state: 'IL', total_claims: 20, fraud_claims: 1, fraud_rate: 5.0 },
  { state: 'PA', total_claims: 18, fraud_claims: 1, fraud_rate: 5.6 },
  { state: 'OH', total_claims: 16, fraud_claims: 1, fraud_rate: 6.3 },
  { state: 'GA', total_claims: 14, fraud_claims: 1, fraud_rate: 7.1 },
  { state: 'NC', total_claims: 12, fraud_claims: 0, fraud_rate: 0.0 },
  { state: 'MI', total_claims: 12, fraud_claims: 0, fraud_rate: 0.0 },
];

// ─────────────────────────────────────────────────
// 11. FRAUD CATEGORIES
// ─────────────────────────────────────────────────
export const CANONICAL_FRAUD_CATEGORIES = [
  { category: 'Upcoding',             count: 4,  percentage: 26.7, amount: 125_000 },
  { category: 'Duplicate Claims',     count: 3,  percentage: 20.0, amount: 95_000  },
  { category: 'Phantom Billing',      count: 3,  percentage: 20.0, amount: 90_000  },
  { category: 'Unbundling',           count: 2,  percentage: 13.3, amount: 65_000  },
  { category: 'Kickback Schemes',     count: 1,  percentage: 6.7,  amount: 40_000  },
  { category: 'Identity Fraud',       count: 1,  percentage: 6.7,  amount: 35_000  },
  { category: 'Compliance Risk',      count: 1,  percentage: 6.7,  amount: 25_000  },
];

// ─────────────────────────────────────────────────
// 12. TOP RISKY PROVIDERS
// ─────────────────────────────────────────────────
export const CANONICAL_TOP_RISKY_PROVIDERS = [
  { name: 'Metropolitan General Hospital', claim_count: 28, fraud_count: 12, total_amount: 350_000 },
  { name: 'St. Mary Medical Center',       claim_count: 24, fraud_count: 8, total_amount: 300_000 },
  { name: 'Pacific Wellness Group',        claim_count: 18, fraud_count: 6, total_amount: 225_000 },
  { name: 'City Health Network',           claim_count: 22, fraud_count: 2, total_amount: 275_000 },
  { name: 'Summit Healthcare Partners',    claim_count: 16, fraud_count: 1, total_amount: 200_000 },
];

// ─────────────────────────────────────────────────
// 13. TOP RISKY PATIENTS
// ─────────────────────────────────────────────────
export const CANONICAL_TOP_RISKY_PATIENTS = [
  { name: 'Patricia Williams', claim_count: 6, fraud_count: 1, age: 65, gender: 'F', city: 'Chicago' },
  { name: 'Margaret Thompson', claim_count: 5, fraud_count: 1, age: 72, gender: 'F', city: 'New York' },
  { name: 'Elizabeth Davis',   claim_count: 5, fraud_count: 1, age: 78, gender: 'F', city: 'Miami' },
  { name: 'Linda Martinez',    claim_count: 4, fraud_count: 1, age: 61, gender: 'F', city: 'Phoenix' },
];

// ─────────────────────────────────────────────────
// 14. CUMULATIVE SAVINGS
// ─────────────────────────────────────────────────
export const CANONICAL_CUMULATIVE_SAVINGS = [
  { month: 'Jan 2026', saved: 35_000 },
  { month: 'Feb 2026', saved: 72_000 },
  { month: 'Mar 2026', saved: 110_000 },
  { month: 'Apr 2026', saved: 150_000 },
  { month: 'May 2026', saved: 195_000 },
  { month: 'Jun 2026', saved: 242_000 },
  { month: 'Jul 2026', saved: 290_000 },
  { month: 'Aug 2026', saved: 340_000 },
  { month: 'Sep 2026', saved: 385_000 },
  { month: 'Oct 2026', saved: 425_000 },
  { month: 'Nov 2026', saved: 455_000 },
  { month: 'Dec 2026', saved: 475_000 },
];

// ─────────────────────────────────────────────────
// 15. POLICIES BREAKDOWN
// ─────────────────────────────────────────────────
export const CANONICAL_POLICY_BREAKDOWN = {
  active: CANONICAL_REFERENCE.policiesActive,   // 41
  expired: CANONICAL_REFERENCE.policiesExpired,  // 26
  pending: CANONICAL_REFERENCE.policiesPending,  // 13
  total: CANONICAL_REFERENCE.totalPolicies,      // 80
};

// ─────────────────────────────────────────────────
// 16. NOTIFICATIONS (dynamic timestamps)
// ─────────────────────────────────────────────────
const _Nm = (n) => new Date(_NOW - n * 60000).toISOString();
const _Nh = (n) => new Date(_NOW - n * 3600000).toISOString();
const _Nd = (n) => new Date(_NOW - n * 86400000).toISOString();

export const CANONICAL_NOTIFICATIONS = [
  { id: 1, type: 'fraud_alert',  title: 'High-Risk Claim Detected',      message: 'Claim CLM-2026-000015 flagged with 92% fraud probability. Provider: Metropolitan General Hospital.', severity: 'critical', read: false, created_at: _Nm(3) },
  { id: 2, type: 'model_alert',  title: 'Model Performance Stable',      message: 'Detection rate at 85.9%, accuracy at 94.6%. No drift detected.', severity: 'info', read: true, created_at: _Nh(2) },
  { id: 3, type: 'fraud_alert',  title: 'Duplicate Claims Pattern',      message: '3 duplicate claims from St. Mary Medical Center in 48h.', severity: 'critical', read: false, created_at: _Nh(4) },
  { id: 4, type: 'system_alert', title: 'Database Performance Warning',  message: 'Query response time increased by 15% in the last hour.', severity: 'warning', read: true, created_at: _Nh(6) },
  { id: 5, type: 'fraud_alert',  title: 'Upcoding Detected',             message: 'Code M54.5 billed at $12,400 (avg: $450). Provider: Pacific Wellness Group.', severity: 'critical', read: true, created_at: _Nh(8) },
  { id: 6, type: 'model_alert',  title: 'Model Training Complete',       message: 'Model v3.2.1 training completed. Accuracy: 94.6%, Detection: 85.9%', severity: 'info', read: true, created_at: _Nh(10) },
  { id: 7, type: 'fraud_alert',  title: 'Phantom Billing Suspected',     message: '2 claims from Summit Healthcare Partners on dates patient was elsewhere.', severity: 'critical', read: false, created_at: _Nh(14) },
  { id: 8, type: 'system_alert', title: 'Storage Usage Warning',         message: 'Disk usage at 78%. Consider archiving old data.', severity: 'warning', read: true, created_at: _Nh(18) },
  { id: 9, type: 'policy_alert', title: 'Policy Expiration Alert',       message: 'Policy POL-2026-001847 for Margaret Thompson expires soon.', severity: 'info', read: true, created_at: _Nh(24) },
  { id: 10,type: 'fraud_alert',  title: 'Geographic Anomaly Detected',   message: 'Lakeside Medical Associates: patients >250 miles from provider.', severity: 'warning', read: true, created_at: _Nd(1) },
];

// ─────────────────────────────────────────────────
// 17. SHAP FEATURES
// ─────────────────────────────────────────────────
export const CANONICAL_SHAP_FEATURES = [
  { label: 'Claim Amount Deviation',   value: 0.34, color: '#ef4444' },
  { label: 'Patient-Provider Distance',value: 0.27, color: '#f97316' },
  { label: 'Prior Claim Frequency',    value: 0.19, color: '#f59e0b' },
  { label: 'Procedure Count',          value: 0.12, color: '#6366f1' },
  { label: 'Diagnosis-Procedure Match',value: 0.08, color: '#8b5cf6' },
];

// ─────────────────────────────────────────────────
// 18. INVESTIGATORS
// ─────────────────────────────────────────────────
export const CANONICAL_INVESTIGATORS = [
  'Sarah Mitchell, CFE', 'James Rodriguez, CFE', 'Emily Chen, CFE',
  'Mark Thompson, CFE', 'Lisa Park, CFE', 'Robert Kim, CFE',
  'Angela Davis, CFE', "Michael O'Brien, CFE",
];

// ─────────────────────────────────────────────────
// 19. FRAUD BY CITY
// ─────────────────────────────────────────────────
export const CANONICAL_FRAUD_BY_CITY = [
  { city: 'New York',      state: 'NY', fraud_claims: 2, total_claims: 26, rate: 7.7 },
  { city: 'Los Angeles',   state: 'CA', fraud_claims: 2, total_claims: 22, rate: 9.1 },
  { city: 'Chicago',       state: 'IL', fraud_claims: 1, total_claims: 20, rate: 5.0 },
  { city: 'Houston',       state: 'TX', fraud_claims: 2, total_claims: 28, rate: 7.1 },
  { city: 'Phoenix',       state: 'AZ', fraud_claims: 1, total_claims: 16, rate: 6.3 },
  { city: 'Miami',         state: 'FL', fraud_claims: 3, total_claims: 22, rate: 13.6 },
  { city: 'San Francisco', state: 'CA', fraud_claims: 1, total_claims: 10, rate: 10.0 },
  { city: 'Denver',        state: 'CO', fraud_claims: 1, total_claims: 14, rate: 7.1 },
  { city: 'Boston',        state: 'MA', fraud_claims: 0, total_claims: 12, rate: 0.0 },
  { city: 'Atlanta',       state: 'GA', fraud_claims: 1, total_claims: 14, rate: 7.1 },
];

// ─────────────────────────────────────────────────
// 20. FEATURE IMPORTANCE
// ─────────────────────────────────────────────────
export const CANONICAL_FEATURE_IMPORTANCE = [
  { feature: 'Claim Amount',       importance: 0.234 },
  { feature: 'Provider Network',   importance: 0.189 },
  { feature: 'Diagnosis Code',     importance: 0.156 },
  { feature: 'Patient History',    importance: 0.134 },
  { feature: 'Billing Code',       importance: 0.098 },
];

// ─────────────────────────────────────────────────
// 21. GENDER DISTRIBUTION
// ─────────────────────────────────────────────────
export const CANONICAL_GENDER_DISTRIBUTION = { female: 51.2, male: 47.8, other: 1.0 };

// ─────────────────────────────────────────────────
// 22. SPECIALTY DISTRIBUTION
// ─────────────────────────────────────────────────
export const CANONICAL_SPECIALTY_DISTRIBUTION = [
  { specialty: 'General Practice',    percentage: 22.4 },
  { specialty: 'Cardiology',          percentage: 16.8 },
  { specialty: 'Orthopedics',         percentage: 14.2 },
  { specialty: 'Internal Medicine',   percentage: 11.5 },
  { specialty: 'Emergency Medicine',  percentage: 8.9 },
  { specialty: 'Neurology',           percentage: 6.3 },
  { specialty: 'Pediatrics',          percentage: 5.8 },
  { specialty: 'Dermatology',         percentage: 4.7 },
  { specialty: 'Oncology',            percentage: 5.2 },
  { specialty: 'Gastroenterology',    percentage: 4.2 },
];
