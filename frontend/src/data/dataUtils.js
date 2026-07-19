export const formatCurrency = (val) => {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num);
};

export const formatCompactCurrency = (val) => {
  const num = Number(val) || 0;
  if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `$${(num / 1000).toFixed(0)}K`;
  return formatCurrency(num);
};

export const formatPercent = (val, decimals = 1) => {
  const num = Number(val) || 0;
  return `${num.toFixed(decimals)}%`;
};

export const formatNumber = (val) => {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('en-US').format(num);
};

export const getRiskLevel = (score) => {
  if (score >= 0.85) return { label: 'Critical', color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20' };
  if (score >= 0.65) return { label: 'High', color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20' };
  if (score >= 0.45) return { label: 'Medium', color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/20' };
  if (score >= 0.25) return { label: 'Low', color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' };
  return { label: 'Minimal', color: 'text-success', bg: 'bg-success/10', border: 'border-success/20' };
};

export const getStatusColor = (status) => {
  const map = {
    'Submitted': 'bg-primary/10 text-primary border-primary/20',
    'Under Review': 'bg-warning/10 text-warning border-warning/20',
    'AI Scored': 'bg-accent/10 text-accent border-accent/20',
    'Approved': 'bg-success/10 text-success border-success/20',
    'Rejected': 'bg-danger/10 text-danger border-danger/20',
    'Fraud Confirmed': 'bg-red-500/10 text-red-500 border-red-500/20',
    'Closed': 'bg-slate-500/10 text-slate-500 border-slate-500/20',
    'Pending': 'bg-warning/10 text-warning border-warning/20',
    'Investigating': 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
    'Resolved': 'bg-success/10 text-success border-success/20',
    'Active': 'bg-success/10 text-success border-success/20',
    'Expired': 'bg-danger/10 text-danger border-danger/20',
  };
  return map[status] || 'bg-bg/10 text-textSecondary border-border';
};

export const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'
];

export const STATE_NAMES = {
  AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',CT:'Connecticut',
  DE:'Delaware',FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',
  KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',
  MN:'Minnesota',MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',
  NJ:'New Jersey',NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',
  OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',TN:'Tennessee',
  TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming'
};

export const generateTimeline = (baseDate, events) => {
  return events.map((e, i) => ({
    ...e,
    time: new Date(new Date(baseDate).getTime() - i * 3600000 * (i + 1)).toISOString(),
  }));
};

export const getInvestigatorForScore = (score) => {
  const investigators = [
    'Dr. Sarah Mitchell', 'James Rodriguez, CFE', 'Dr. Emily Chen',
    'Mark Thompson, CPA', 'Lisa Park, CPC', 'Dr. Robert Kim',
    'Angela Davis, AHFI', 'Dr. Michael O\'Brien'
  ];
  const idx = Math.floor((score || 0.5) * investigators.length) % investigators.length;
  return investigators[idx];
};

export const buildSHAPExplanation = (claim) => {
  const factors = [];
  const score = claim.fraud_score || 0;

  if ((claim.claim_amount || 0) > 500) {
    factors.push({ feature: 'Claim Amount', impact: 'high', direction: 'increases', value: formatCurrency(claim.claim_amount), weight: 0.35 });
  }
  if ((claim.provider_patient_distance_miles || 0) > 100) {
    factors.push({ feature: 'Patient-Provider Distance', impact: 'high', direction: 'increases', value: `${claim.provider_patient_distance_miles}mi`, weight: 0.28 });
  }
  if ((claim.number_of_previous_claims_patient || 0) > 5) {
    factors.push({ feature: 'Patient Claim Frequency', impact: 'medium', direction: 'increases', value: `${claim.number_of_previous_claims_patient} prior claims`, weight: 0.18 });
  }
  if ((claim.number_of_procedures || 0) > 2) {
    factors.push({ feature: 'Procedure Count', impact: 'medium', direction: 'increases', value: `${claim.number_of_procedures} procedures`, weight: 0.12 });
  }
  if (claim.claim_submitted_late) {
    factors.push({ feature: 'Late Submission', impact: 'low', direction: 'increases', value: 'Yes', weight: 0.07 });
  }
  if (factors.length === 0) {
    factors.push({ feature: 'Standard Claim Profile', impact: 'low', direction: 'neutral', value: 'Within normal parameters', weight: 0.5 });
  }

  return {
    base_value: 0.15,
    prediction: score,
    top_factors: factors.sort((a, b) => b.weight - a.weight).slice(0, 5),
    summary: `Fraud probability of ${(score * 100).toFixed(1)}% driven primarily by ${factors[0]?.feature || 'standard patterns'}. Model confidence: ${score >= 0.7 ? 'High' : score >= 0.4 ? 'Moderate' : 'Low'}.`
  };
};

export const FRAUD_CATEGORIES = [
  'Upcoding', 'Duplicate Claims', 'Billing for Non-Covered Services',
  'Phantom Billing', 'Unbundling', 'Identity Theft', 'Kickback Schemes',
  'Excessive Services', 'Misrepresentation', 'Other'
];

export const ALERT_TEMPLATES = [
  { severity: 'Critical', category: 'Upcoding', title: 'Systematic Upcoding Detected', desc: 'Provider consistently billing higher-level CPT codes than supported by documentation. Level 5 visits at 4.2x peer average across 47 patients.' },
  { severity: 'High', category: 'Duplicate', title: 'Duplicate Claim Network Match', desc: 'Cluster of 8 claims with overlapping dates of service, identical procedure codes, and matching billed amounts across 3 provider locations.' },
  { severity: 'Critical', category: 'Phantom', title: 'Phantom Billing Pattern Identified', desc: 'Claims submitted for services on dates when provider facility was confirmed closed (holiday weekend). 12 claims totaling $34,800.' },
  { severity: 'Medium', category: 'Unbundling', title: 'Systematic Unbundling Violation', desc: 'Related procedure codes billed separately instead of bundled. Detected across E/M codes 99213-99215 over 6-week period.' },
  { severity: 'High', category: 'Identity', title: 'Potential Identity Fraud Ring', desc: 'SSN reused across 4 member IDs within 60 days. Shared address and phone number detected. Investigation referral recommended.' },
  { severity: 'Medium', category: 'Services', title: 'Excessive Service Frequency', desc: 'Patient receiving 3x the recommended frequency of imaging services. Provider and patient flagged for review.' },
  { severity: 'Low', category: 'Pharmacy', title: 'Prescription Anomaly Alert', desc: 'Schedule II controlled substance prescribed at elevated dosage. Patient seen by 5 providers in 30 days for same complaint.' },
  { severity: 'Critical', category: 'Provider', title: 'New Provider Rapid Billing Surge', desc: 'Provider enrolled 12 days ago has submitted 212 claims totaling $450K. Average new provider submits <15 claims in first month.' },
  { severity: 'High', category: 'Geographic', title: 'Geographic Anomaly Cluster', desc: '15 claims from patients residing >250 miles from provider. No referral documentation. Potential shell provider network.' },
  { severity: 'Medium', category: 'Billing', title: 'Modifier Misuse Detected', desc: 'Modifier -25 applied to 78% of claims vs. 12% peer average. Systematic overbilling for evaluation and management.' },
];

export const generateAlertTimeline = (alert) => {
  const base = new Date();
  const status = alert.status || 'Pending';
  const events = [
    { action: 'Alert Generated', actor: 'AI Engine v2.4', detail: 'Automated fraud detection pipeline flagged anomaly', time: new Date(base - 1200000).toISOString() },
  ];
  if (status !== 'Pending') {
    events.push({ action: 'Assigned to Investigator', actor: 'System Auto-Assign', detail: `Assigned to ${alert.assigned}`, time: new Date(base - 900000).toISOString() });
  }
  if (status === 'Investigating') {
    events.push({ action: 'Investigation Started', actor: alert.assigned, detail: 'Preliminary review initiated. Evidence collection in progress.', time: new Date(base - 600000).toISOString() });
    events.push({ action: 'Note Added', actor: alert.assigned, detail: 'Cross-referencing claim history and provider billing patterns.', time: new Date(base - 300000).toISOString() });
  }
  if (status === 'Resolved') {
    events.push({ action: 'Investigation Completed', actor: alert.assigned, detail: 'Root cause confirmed. Corrective action applied.', time: new Date(base - 180000).toISOString() });
    events.push({ action: 'Alert Resolved', actor: alert.assigned, detail: 'Claim status updated. Provider notified.', time: new Date(base - 60000).toISOString() });
  }
  return events;
};
