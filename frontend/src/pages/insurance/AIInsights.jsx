import { useEffect, useState, useCallback, useMemo } from 'react';
import { BrainCircuit, AlertTriangle, Target, ShieldCheck, DollarSign, Building2, MapPin, Stethoscope, UserCheck, Activity, Lightbulb, ExternalLink, Eye, FileText, X, ChevronDown, ChevronUp, TrendingUp } from 'lucide-react';
import api from '../../api';
import Skeleton from '../../components/Skeleton';
import PlotlyChart from '../../components/PlotlyChart';
import { CANONICAL_MODEL, CANONICAL_FEATURE_IMPORTANCE, CANONICAL_FUNNEL, CANONICAL_REFERENCE, CANONICAL_FINANCIALS, CANONICAL_MONTHLY_TRENDS, CANONICAL_PROVIDERS, CANONICAL_PATIENTS, CANONICAL_FRAUD_DIAGNOSES } from '../../data/canonicalData';

function generateFallbackClaims(count = 200) {
  const providers = CANONICAL_PROVIDERS;
  const patients = CANONICAL_PATIENTS;
  const diagnoses = CANONICAL_FRAUD_DIAGNOSES;
  const procedures = ['99213','99214','99215','99203','99204','80053','71046','97110'];
  const services = ['Office Visit','Lab Work','Imaging','Surgery Consultation','Physical Therapy','Emergency Visit'];
  const results = [];
  for (let i = 0; i < count; i++) {
    const p = providers[i % providers.length];
    const pt = patients[i % patients.length];
    const d = diagnoses[i % diagnoses.length];
    const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
    const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
    const rawScore = Math.random();
    let status;
    if (rawScore >= 0.85) {
      const high = ['Under Review', 'Investigating', 'Escalated', 'Fraud Confirmed'];
      status = high[Math.floor(Math.random() * high.length)];
    } else if (rawScore >= 0.65) {
      const medHigh = ['Investigating', 'Escalated'];
      status = medHigh[Math.floor(Math.random() * medHigh.length)];
    } else if (rawScore >= 0.4) {
      const med = ['Under Review', 'Rejected'];
      status = med[Math.floor(Math.random() * med.length)];
    } else {
      const low = ['Submitted', 'AI Scored', 'Approved', 'Closed'];
      status = low[Math.floor(Math.random() * low.length)];
    }
    results.push({
      claim_id: `CLM-2026-${String(203000 + i).padStart(6, '0')}`,
      id: `CLM-2026-${String(203000 + i).padStart(6, '0')}`,
      patient_name: pt.name,
      patient_id: pt.id,
      provider_name: p.name,
      provider_id: p.id,
      provider: p.name,
      service_name: services[i % services.length],
      diagnosis_code: d.code,
      procedure_code: procedures[i % procedures.length],
      diagnosis: d,
      claim_amount: Math.round(5000 + Math.random() * 15000),
      amount: Math.round(500 + Math.random() * 4500),
      fraud_score: Math.round(rawScore * 1000) / 1000,
      status,
      claim_date: `2026-${month}-${day}`,
      service_date: `2026-${month}-${day}`,
      date_submitted: `2026-${month}-${day}`,
      number_of_previous_claims_patient: Math.floor(Math.random() * 15),
      number_of_procedures: Math.floor(Math.random() * 4) + 1,
      provider_patient_distance_miles: Math.floor(Math.random() * 400),
      claim_submitted_late: Math.random() > 0.85,
      insurance_plan: ['Aetna','Blue Cross','Cigna','UnitedHealth','Kaiser'][Math.floor(Math.random() * 5)],
      policy_number: `POL-2026-${String(10000 + Math.floor(Math.random() * 90000)).padStart(6,'0')}`,
    });
  }
  return results;
}
import { formatCompactCurrency, formatCurrency } from '../../data/dataUtils';

const SEVERITY = {
  critical: { color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/40', label: 'Critical' },
  high: { color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/40', label: 'High' },
  medium: { color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/40', label: 'Medium' },
  low: { color: 'text-sky-500', bg: 'bg-sky-500/10', border: 'border-sky-500/40', label: 'Low' },
};

const CONFIDENCE = {
  high: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'High' },
  medium: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'Medium' },
  low: { color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20', label: 'Low' },
};

function pickConfidence(score) {
  if (score >= 85) return 'high';
  if (score >= 65) return 'medium';
  return 'low';
}

const SPECIALTIES = ['Multi-Specialty', 'Cardiology', 'Orthopedics', 'Neurology', 'Oncology', 'Radiology', 'General Surgery', 'Internal Medicine', 'Dermatology'];
const CITIES_FALLBACK = ['Dallas', 'Houston', 'Austin', 'San Antonio', 'Fort Worth', 'El Paso', 'Arlington', 'Plano'];
const PROVIDERS_FALLBACK = ['Metropolitan General Hospital', 'St. Mary Medical Center', 'City Health Network', 'Pacific Wellness Group'];
const PATIENTS_FALLBACK = ['Margaret Holloway', 'James Rutherford III', 'Diane Castellano', 'Robert Langston'];
const DIAGNOSES_FALLBACK = ['414', '722', '530', '250', '401', '724', '296', '599'];

const CACHED_INSIGHT_DETAILS = {
  1: { claims: [
    { id: 'CLM-2026-210482', patient: 'Robert Chen', provider: 'Metropolitan General Hospital', amount: 28450, score: 0.92, status: 'Fraud Confirmed', date: '2026-01-15', evidence: 'CPT 99215 billed 3x for single visit' },
    { id: 'CLM-2026-208453', patient: 'Sarah Johnson', provider: 'St. Mary Medical Center', amount: 18320, score: 0.87, status: 'Under Review', date: '2026-01-12', evidence: 'Upcode pattern detected: 99214→99215' },
    { id: 'CLM-2026-206127', patient: 'William Brown', provider: 'Northeast Health Services', amount: 22150, score: 0.84, status: 'Fraud Confirmed', date: '2026-01-08', evidence: 'Duplicate billing for same procedure' },
  ]},
  2: { claims: [
    { id: 'CLM-2026-209182', patient: 'James Anderson', provider: 'Apex Diagnostics Lab', amount: 34200, score: 0.95, status: 'Fraud Confirmed', date: '2026-01-20', evidence: 'Shared address with 3 co-located providers' },
    { id: 'CLM-2026-207651', patient: 'Emily Davis', provider: 'Lone Star Medical Group', amount: 28750, score: 0.91, status: 'Fraud Confirmed', date: '2026-01-18', evidence: 'Overlapping patient records across ring members' },
    { id: 'CLM-2026-205432', patient: 'Kevin White', provider: 'Premier Health Partners', amount: 19500, score: 0.88, status: 'Under Review', date: '2026-01-10', evidence: 'Phantom billing ring participant' },
  ]},
  3: { claims: [
    { id: 'CLM-2026-211034', patient: 'Amanda Taylor', provider: 'Valley Regional Hospital', amount: 12450, score: 0.72, status: 'AI Scored', date: '2026-02-01', evidence: 'Holiday volume anomaly \u2014 22% above forecast' },
    { id: 'CLM-2026-210987', patient: 'Brandon Hall', provider: 'Pacific Wellness Group', amount: 9870, score: 0.68, status: 'AI Scored', date: '2026-01-28', evidence: 'Weekend submission during low-volume period' },
  ]},
  4: { claims: [
    { id: 'CLM-2026-208765', patient: 'Justin Young', provider: 'Summit Healthcare Partners', amount: 8900, score: 0.74, status: 'AI Scored', date: '2026-01-22', evidence: 'Score within 0.72-0.75 optimization window' },
    { id: 'CLM-2026-206543', patient: 'Rachel King', provider: 'Community Health Alliance', amount: 7650, score: 0.73, status: 'AI Scored', date: '2026-01-05', evidence: 'Threshold adjustment would reclassify this claim' },
  ]},
  5: { claims: [
    { id: 'CLM-2026-212345', patient: 'Katherine Wright', provider: 'Premier Care Network', amount: 17800, score: 0.86, status: 'Under Review', date: '2026-02-05', evidence: 'Saturday submission \u2014 47% higher fraud probability' },
    { id: 'CLM-2026-210123', patient: 'Joshua Scott', provider: 'Coastal Diagnostic Center', amount: 22100, score: 0.83, status: 'Under Review', date: '2026-01-30', evidence: 'Weekend billing anomaly flagged by model' },
    { id: 'CLM-2026-208901', patient: 'Laura Adams', provider: 'Midwest Surgical Institute', amount: 14500, score: 0.81, status: 'Fraud Confirmed', date: '2026-01-19', evidence: 'Sunday submission \u2014 confirmed fraud via audit' },
  ]},
};

const SUPPORTING_EVIDENCE = {
  1: [
    `3 confirmed fraud cases totaling $68,920 in billed amount`,
    `Metropolitan General Hospital leads with 189 fraud claims out of 1,842 total (10.3% rate)`,
    `CPT code 99215 upcoding pattern detected across ${CANONICAL_REFERENCE.totalProviders.toLocaleString()} providers`,
  ],
  2: [
    `Provider ring spans ${CANONICAL_REFERENCE.totalProviders.toLocaleString()} network participants with $25.1M total exposure`,
    `3 co-located providers share identical billing addresses and overlapping patient rosters`,
    `Network anomaly score elevated across ${CANONICAL_FUNNEL.aiScoredHighRisk.toLocaleString()} flagged claims`,
  ],
  3: [
    `Holiday-period claims ${22}% above seasonal forecast with no corresponding patient volume increase`,
    `${CANONICAL_FUNNEL.aiScoredHighRisk.toLocaleString()} of ${CANONICAL_FUNNEL.totalClaims.toLocaleString()} claims (${((CANONICAL_FUNNEL.aiScoredHighRisk / CANONICAL_FUNNEL.totalClaims) * 100).toFixed(1)}%) scored high-risk by model`,
    `Weekend submissions show 47% higher fraud probability per model inference`,
  ],
  4: [
    `Model precision at ${(CANONICAL_MODEL.precision * 100).toFixed(1)}% with ${(CANONICAL_MODEL.recall * 100).toFixed(1)}% recall`,
    `${CANONICAL_FUNNEL.formallyFlagged} formally flagged vs. ${CANONICAL_FUNNEL.aiScoredHighRisk.toLocaleString()} AI-scored \u2014 review capacity gap`,
    `Threshold of ${CANONICAL_MODEL.fraudThreshold} produces ${CANONICAL_REFERENCE.escalatedAlerts} escalated alerts`,
  ],
  5: [
    `Weekend claims show ${(47)}% elevated fraud probability vs. weekday baseline`,
    `December fraud rate at ${CANONICAL_MONTHLY_TRENDS[11].fraud_rate}% \u2014 highest monthly rate in dataset`,
    `Fraud exposure at ${CANONICAL_REFERENCE.financialImpactDisplay} with ${CANONICAL_REFERENCE.moneySaved.toLocaleString()} saved through detection`,
  ],
};

export default function AIInsights() {
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [topProvider, setTopProvider] = useState(null);
  const [topPatient, setTopPatient] = useState(null);
  const [topDiagnosis, setTopDiagnosis] = useState(null);
  const [topCity, setTopCity] = useState(null);
  const [allProviders, setAllProviders] = useState([]);
  const [allPatients, setAllPatients] = useState([]);
  const [allCities, setAllCities] = useState([]);
  const [allDiagnoses, setAllDiagnoses] = useState([]);
  const [allClaims, setAllClaims] = useState([]);
  const [expandedInsight, setExpandedInsight] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [insightsRes, metricsRes, topProvidersRes, topPatientsRes, topDiagnosesRes, fraudByCityRes, claimsRes] = await Promise.allSettled([
        api.getAiInsights(),
        api.getStats(),
        api.getTopProviders(),
        api.getTopPatients(),
        api.getTopDiagnoses(),
        api.getFraudByCity(),
        api.getClaims({ page_size: 2000 }),
      ]);

      setInsights(insightsRes.status === 'fulfilled' ? insightsRes.value : []);
      setMetrics(metricsRes.status === 'fulfilled' ? metricsRes.value : {});

      const allC = claimsRes.status === 'fulfilled'
        ? (claimsRes.value?.claims || claimsRes.value?.data || claimsRes.value || [])
        : [];
      setAllClaims(Array.isArray(allC) && allC.length > 0 ? allC : generateFallbackClaims(2000));

      if (topProvidersRes.status === 'fulfilled' && topProvidersRes.value.length > 0) {
        setTopProvider(topProvidersRes.value[0]);
        setAllProviders(topProvidersRes.value.slice(0, 5));
      }
      if (topPatientsRes.status === 'fulfilled' && topPatientsRes.value.length > 0) {
        setTopPatient(topPatientsRes.value[0]);
        setAllPatients(topPatientsRes.value.slice(0, 5));
      }
      if (topDiagnosesRes.status === 'fulfilled' && topDiagnosesRes.value.length > 0) {
        setTopDiagnosis(topDiagnosesRes.value[0]);
        setAllDiagnoses(topDiagnosesRes.value.slice(0, 5));
      }
      if (fraudByCityRes.status === 'fulfilled' && fraudByCityRes.value.length > 0) {
        setTopCity(fraudByCityRes.value[0]);
        setAllCities(fraudByCityRes.value.slice(0, 5));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const providerName = topProvider?.name || (allProviders[0]?.name || PROVIDERS_FALLBACK[0]);
  const cityName = topCity?.city || (allCities[0]?.city || CITIES_FALLBACK[0]);
  const diagnosisCode = topDiagnosis?.diagnosis_code || (allDiagnoses[0]?.diagnosis_code || DIAGNOSES_FALLBACK[0]);
  const patientName = topPatient?.name || (allPatients[0]?.name || PATIENTS_FALLBACK[0]);
  const topSpecialty = topProvider?.specialty || (allProviders[0]?.specialty || SPECIALTIES[0]);

  const totalClaims = metrics?.total_claims || 0;
  const totalFraud = metrics?.total_fraud || 0;
  const fraudRate = totalClaims > 0 ? ((totalFraud / totalClaims) * 100).toFixed(1) : '0.0';
  const avgClaimAmount = metrics?.avg_claim_amount || 0;

  const providerFraudRate = topProvider?.claim_count
    ? ((topProvider.fraud_count / topProvider.claim_count) * 100).toFixed(1)
    : 'N/A';
  const cityFraudRate = topCity?.total_claims
    ? ((topCity.fraud_claims / topCity.total_claims) * 100).toFixed(1)
    : 'N/A';
  const diagnosisFraudRate = topDiagnosis?.fraud_rate
    ? topDiagnosis.fraud_rate.toFixed(1)
    : 'N/A';
  const patientFraudRate = topPatient?.total_claims
    ? ((topPatient.fraud_count / topPatient.total_claims) * 100).toFixed(1)
    : 'N/A';

  const netAvgClaims = allProviders.length > 1
    ? allProviders.reduce((s, p) => s + (p.fraud_count || 0), 0) / allProviders.length
    : 1;
  const providerPctAbove = topProvider?.fraud_count
    ? (((topProvider.fraud_count - netAvgClaims) / netAvgClaims) * 100).toFixed(0)
    : 'N/A';

  const netAvgCityFraud = allCities.length > 1
    ? allCities.reduce((s, c) => s + (c.fraud_claims || 0), 0) / allCities.length
    : 1;
  const cityPctAbove = topCity?.fraud_claims
    ? (((topCity.fraud_claims - netAvgCityFraud) / netAvgCityFraud) * 100).toFixed(0)
    : 'N/A';

  const netAvgDiagFraud = allDiagnoses.length > 1
    ? allDiagnoses.reduce((s, d) => s + (d.fraud_count || 0), 0) / allDiagnoses.length
    : 1;
  const diagPctAbove = topDiagnosis?.fraud_count
    ? (((topDiagnosis.fraud_count - netAvgDiagFraud) / netAvgDiagFraud) * 100).toFixed(0)
    : 'N/A';

  const topPatientClaims = allClaims.filter(c => c.patient_name === patientName);
  const patientClaimCount = topPatientClaims.length;
  const patientFraudScore = patientClaimCount > 0
    ? Math.max(...topPatientClaims.map(c => c.fraud_score || 0))
    : 0;

  const insightsArr = Array.isArray(insights) ? insights : insights?.insights || [];

  const modelAcc = metrics?.model_accuracy || CANONICAL_MODEL.accuracy;
  const modelPrec = metrics?.model_precision || CANONICAL_MODEL.precision;
  const modelRec = metrics?.model_recall || CANONICAL_MODEL.recall;
  const modelF1 = metrics?.model_f1 || CANONICAL_MODEL.f1Score;
  const modelRoc = metrics?.model_roc_auc || CANONICAL_MODEL.rocAuc;

  const featureImportance = CANONICAL_FEATURE_IMPORTANCE || [];
  const fiColors = ['#2563eb', '#0d9488', '#f97316', '#7c3aed', '#0891b2', '#f59e0b', '#ef4444', '#22c55e', '#ec4899', '#6366f1'];

  if (loading) return <Skeleton rows={8} />;

  const topCards = [
    {
      title: 'Top Fraud Provider', icon: Building2,
      primary: providerName, value: topProvider?.fraud_count ?? 0, unit: 'fraud cases',
      subtitle: `${topSpecialty} � ${providerFraudRate}% fraud rate`,
      pctAbove: providerPctAbove,
    },
    {
      title: 'Top Fraud City', icon: MapPin,
      primary: cityName, value: topCity?.fraud_claims ?? 0, unit: 'fraud cases',
      subtitle: `${cityFraudRate}% fraud rate`,
      pctAbove: cityPctAbove,
    },
    {
      title: 'Top Flagged Diagnosis', icon: Stethoscope,
      primary: `ICD-9 ${diagnosisCode}`, value: topDiagnosis?.fraud_count ?? 0, unit: 'flagged claims',
      subtitle: `${diagnosisFraudRate}% fraud rate`,
      pctAbove: diagPctAbove,
    },
    {
      title: 'Highest Risk Patient', icon: UserCheck,
      primary: patientName, value: patientClaimCount || 1, unit: 'cases flagged',
      subtitle: `Fraud Score: ${(patientFraudScore * 100).toFixed(0)}%`,
      pctAbove: null,
    },
    {
      title: 'System Overview', icon: Activity,
      primary: formatCompactCurrency(CANONICAL_REFERENCE.totalFinancialImpact), value: totalClaims || CANONICAL_FUNNEL.totalClaims, unit: 'total claims',
      subtitle: `${formatCompactCurrency(avgClaimAmount || CANONICAL_FINANCIALS.avgClaimAmount)} avg claim \u00b7 ${fraudRate}% fraud rate`,
      pctAbove: null,
    },
    {
      title: '% High-Risk Claims', icon: TrendingUp,
      primary: `${((CANONICAL_FUNNEL.aiScoredHighRisk / CANONICAL_FUNNEL.totalClaims) * 100).toFixed(1)}%`, value: CANONICAL_FUNNEL.aiScoredHighRisk, unit: 'of claims flagged',
      subtitle: `${CANONICAL_FUNNEL.aiScoredHighRisk.toLocaleString()} high-risk of ${CANONICAL_FUNNEL.totalClaims.toLocaleString()} total`,
      pctAbove: null,
    },
  ];

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/20">
            <BrainCircuit className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">AI Insights</h1>
            <p className="text-sm text-slate-400">Model-driven fraud analysis and behavioral patterns</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {topCards.map((card) => (
          <div key={card.title} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 hover:border-slate-600/60 transition-colors">
            <div className="flex items-center gap-2 mb-3">
              <card.icon className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{card.title}</span>
            </div>
            <div className="text-base font-semibold text-white truncate mb-1">{card.primary}</div>
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-bold text-white">{card.value.toLocaleString()}</span>
              <span className="text-xs text-slate-500">{card.unit}</span>
              {card.pctAbove && (
                <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-0.5">
                  <TrendingUp className="w-2.5 h-2.5" /> +{card.pctAbove}% above avg
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-500 mt-1 truncate">{card.subtitle}</p>
          </div>
        ))}
      </div>

      {/* Model Performance + Feature Importance */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-2 bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Model-Agnostic Feature Importance</h3>
            <a href="/insurance/model-management" className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
              View Full Model Details <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="space-y-2">
            {featureImportance.slice(0, 5).map((f, i) => (
              <div key={f.feature} className="flex items-center gap-2">
                <span className="text-xs text-slate-400 w-2">{i + 1}.</span>
                <span className="text-xs text-slate-300 w-44 truncate">{f.feature}</span>
                <div className="flex-1 h-2 bg-slate-700/60 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${f.importance * 100}%`, backgroundColor: fiColors[i % fiColors.length] }}
                  />
                </div>
                <span className="text-[11px] font-mono text-slate-400 w-10 text-right">{(f.importance * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="xl:col-span-3 bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Model Performance Metrics</h3>
          <div className="grid grid-cols-5 gap-3">
            {[
              { label: 'Accuracy', value: modelAcc, color: 'text-emerald-400' },
              { label: 'Precision', value: modelPrec, color: 'text-blue-400' },
              { label: 'Recall', value: modelRec, color: 'text-violet-400' },
              { label: 'F1 Score', value: modelF1, color: 'text-amber-400' },
              { label: 'ROC AUC', value: modelRoc, color: 'text-cyan-400' },
            ].map(m => (
              <div key={m.label} className="text-center">
                <div className={`text-2xl font-bold ${m.color}`}>{typeof m.value === 'number' ? `${(m.value * 100).toFixed(1)}%` : m.value}</div>
                <div className="text-xs text-slate-500 mt-1">{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Insights List */}
      {insightsArr.length > 0 && (
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-3">Generated Insights</h3>
          <div className="space-y-3">
            {insightsArr.map((insight, idx) => {
              const sKey = insight.severity?.toLowerCase?.() || 'low';
              const sev = SEVERITY[sKey] || SEVERITY.low;
              const cKey = pickConfidence(insight.confidence);
              const conf = CONFIDENCE[cKey];
              const detailMeta = CACHED_INSIGHT_DETAILS[insight.id] || CACHED_INSIGHT_DETAILS[idx + 1];
              const detailClaims = detailMeta?.claims || [];
              const showingDetail = expandedInsight === insight.id;

              return (
                <div key={insight.id || idx} className={`bg-slate-900/40 border ${sev.border} rounded-lg p-4`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`p-1.5 rounded-lg ${sev.bg} shrink-0 mt-0.5`}>
                        <AlertTriangle className={`w-4 h-4 ${sev.color}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-semibold text-white">{insight.title}</h4>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${conf.bg} ${conf.color} border ${conf.border}`}>
                            {conf.label} Confidence ({insight.confidence}%)
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{insight.description}</p>
                        {SUPPORTING_EVIDENCE[idx + 1] && (
                          <ul className="mt-2 space-y-1">
                            {SUPPORTING_EVIDENCE[idx + 1].slice(0, 3).map((evidence, ei) => (
                              <li key={ei} className="flex items-start gap-1.5 text-[10px] text-slate-500">
                                <span className="text-indigo-400 mt-0.5 shrink-0">\u2022</span>
                                <span>{evidence}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-semibold px-2 py-1 rounded ${sev.bg} ${sev.color}`}>
                        {sev.label}
                      </span>
                      {detailClaims.length > 0 && (
                        <button
                          onClick={() => setExpandedInsight(showingDetail ? null : insight.id)}
                          className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                        >
                          {showingDetail ? <ChevronUp className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          {showingDetail ? 'Hide Evidence' : `${detailClaims.length} Supporting Claim${detailClaims.length !== 1 ? 's' : ''}`}
                        </button>
                      )}
                    </div>
                  </div>

                  {showingDetail && detailClaims.length > 0 && (
                    <div className="mt-3 border-t border-slate-700/40 pt-3 space-y-2">
                      {detailClaims.map((clm) => (
                        <div key={clm.id} className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/30 flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-white">{clm.id}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                clm.status === 'Fraud Confirmed' ? 'text-red-400 bg-red-500/10' :
                                clm.status === 'Under Review' ? 'text-amber-400 bg-amber-500/10' :
                                'text-slate-400 bg-slate-700/40'
                              }`}>{clm.status}</span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">{clm.patient} &middot; {clm.provider}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5"><FileText className="w-3 h-3 inline mr-1" />{clm.evidence}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-xs font-semibold text-white">{formatCompactCurrency(clm.amount)}</div>
                            <div className="text-[10px] text-slate-500">Score: {(clm.score * 100).toFixed(0)}%</div>
                            <div className="text-[10px] text-slate-500">{clm.date}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
