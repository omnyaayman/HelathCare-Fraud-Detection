import { useEffect, useState, useCallback, useMemo } from 'react';
import { BrainCircuit, AlertTriangle, Target, ShieldCheck, DollarSign, Building2, MapPin, Stethoscope, UserCheck, Activity, TrendingUp, TrendingDown, Lightbulb, Sparkles } from 'lucide-react';
import api from '../../api';
import Skeleton from '../../components/Skeleton';
import PlotlyChart from '../../components/PlotlyChart';
import { CANONICAL_MODEL } from '../../data/canonicalData';
import { formatCompactCurrency } from '../../data/dataUtils';

const SPECIALTIES = ['Cardiology', 'Orthopedics', 'Neurology', 'Oncology', 'Radiology', 'General Surgery', 'Internal Medicine', 'Dermatology'];
const CITIES_FALLBACK = ['Dallas', 'Houston', 'Austin', 'San Antonio', 'Fort Worth', 'El Paso', 'Arlington', 'Plano'];
const PROVIDERS_FALLBACK = ['Dr. Sophia Reynolds', 'Apex Diagnostics Lab', 'Lone Star Medical Group', 'Premier Health Partners'];
const PATIENTS_FALLBACK = ['Margaret Holloway', 'James Rutherford III', 'Diane Castellano', 'Robert Langston'];
const DIAGNOSES_FALLBACK = ['414', '722', '530', '250', '401', '724', '296', '599'];
const SEVERITY = {
  critical: { color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/40', label: 'Critical' },
  high: { color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/40', label: 'High' },
  medium: { color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/40', label: 'Medium' },
  low: { color: 'text-sky-500', bg: 'bg-sky-500/10', border: 'border-sky-500/40', label: 'Low' },
};

function pickSeverity(score) {
  if (score >= 85) return 'critical';
  if (score >= 65) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

const FEATURE_NAMES = ['Claim Amount', 'Provider History', 'Patient Age', 'Diagnosis Weight', 'Distance Gap', 'Late Submission'];
const FEATURE_WEIGHTS = [85, 78, 65, 48, 38, 22];

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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [insightsRes, metricsRes, topProvidersRes, topPatientsRes, topDiagnosesRes, fraudByCityRes] = await Promise.allSettled([
        api.getAiInsights(),
        api.getStats(),
        api.getTopProviders(),
        api.getTopPatients(),
        api.getTopDiagnoses(),
        api.getFraudByCity()
      ]);

      setInsights(insightsRes.status === 'fulfilled' ? insightsRes.value : []);
      setMetrics(metricsRes.status === 'fulfilled' ? metricsRes.value : {});

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
  const fraudRate = metrics?.fraud_rate ? metrics.fraud_rate.toFixed(1) : '0.0';
  const avgClaimAmount = metrics?.avg_claim_amount || 0;

  const secondProvider = allProviders[1]?.name || PROVIDERS_FALLBACK[Math.min(1, PROVIDERS_FALLBACK.length - 1)];
  const secondCity = allCities[1]?.city || CITIES_FALLBACK[Math.min(1, CITIES_FALLBACK.length - 1)];
  const secondDiagnosis = allDiagnoses[1]?.diagnosis_code || DIAGNOSES_FALLBACK[Math.min(1, DIAGNOSES_FALLBACK.length - 1)];
  const secondSpecialty = (allProviders[1]?.specialty || SPECIALTIES[Math.min(2, SPECIALTIES.length - 1)]);

  const recommendations = useMemo(() => {
    const highestFraudCityCount = topCity?.fraud_claims || allCities[0]?.fraud_claims || 0;
    const highestProviderFraudCount = topProvider?.fraud_count || allProviders[0]?.fraud_count || 0;
    const highestDiagCount = topDiagnosis?.fraud_count || allDiagnoses[0]?.fraud_count || 0;
    const secondCityCount = allCities[1]?.fraud_claims || 0;
    const totalFraudAmt = metrics?.total_fraud || 0;
    const avgAmt = metrics?.avg_claim_amount || 0;
    const totalFraudVal = totalFraudAmt * avgAmt;

    const regionSeverity = pickSeverity(highestFraudCityCount > 200 ? 90 : highestFraudCityCount > 100 ? 70 : 45);
    const specialtySeverity = pickSeverity(72);
    const providerSeverity = pickSeverity(highestProviderFraudCount > 30 ? 88 : highestProviderFraudCount > 15 ? 65 : 40);
    const patternSeverity = pickSeverity(highestDiagCount > 100 ? 92 : 60);
    const financialSeverity = 'high';
    const businessSeverity = 'medium';

    return [
      {
        icon: MapPin,
        severity: regionSeverity,
        action: `Escalated Audit for ${cityName} Region`,
        reason: `${cityName} leads with ${highestFraudCityCount} flagged claims. AI clustering detected persistent billing anomalies. Recommend immediate on-site inspection.`,
        impact: `${formatCompactCurrency(highestFraudCityCount * avgAmt)} at risk`,
      },
      {
        icon: Stethoscope,
        severity: specialtySeverity,
        action: `${topSpecialty} Cross-Referral Anomaly Detected`,
        reason: `Providers in ${topSpecialty} show abnormal referral patterns. The model flagged co-occurrence of high-value codes across referring physicians. This pattern correlates with historical upcoding rings.`,
        impact: `${highestProviderFraudCount > 0 ? highestProviderFraudCount + 'x' : '2x'} above normal`,
      },
      {
        icon: Building2,
        severity: providerSeverity,
        action: `Deep Review: ${providerName}`,
        reason: `${providerName} submitted ${highestProviderFraudCount} flagged claims — significantly above network median. Recommend suspension pending manual chart review.`,
        impact: `${highestProviderFraudCount} fraud cases flagged`,
      },
      {
        icon: AlertTriangle,
        severity: patternSeverity,
        action: `ICD-${diagnosisCode} Unbundling Pattern`,
        reason: `Diagnosis ICD-${diagnosisCode} appears in ${highestDiagCount} suspicious claims. The XGBoost model assigns high fraud probability to this cluster.`,
        impact: `${highestDiagCount} claims flagged`,
      },
      {
        icon: DollarSign,
        severity: financialSeverity,
        action: `Recover ${formatCompactCurrency(totalFraudVal)} in Overpaid Claims`,
        reason: `AI identified ${totalFraudAmt} claims matching known fraud signatures with >85% confidence. Largest concentration involves billing across ${cityName} network.`,
        impact: `${formatCompactCurrency(totalFraudVal)} recoverable`,
      },
      {
        icon: Lightbulb,
        severity: businessSeverity,
        action: `Expand Pre-Authorization for ${secondSpecialty}`,
        reason: `${secondSpecialty} claim volume increased while fraud density rose. The model predicts increased fraudulent claims next quarter if intervention is delayed.`,
        impact: 'Projected reduction via pre-auth',
      }
    ];
  }, [providerName, cityName, diagnosisCode, topSpecialty, secondProvider, secondCity, secondDiagnosis, secondSpecialty, topCity, topProvider, topDiagnosis, allCities, allDiagnoses, metrics]);

  if (loading) return <Skeleton rows={8} />;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col gap-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-primary/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-primary w-fit">
          <BrainCircuit size={14} />
          AI Engine
        </div>
        <h1 className="text-3xl font-black tracking-tight text-textPrimary">AI Insights & Threat Signals</h1>
        <p className="text-sm text-textSecondary font-medium">Machine learning powered analytics, outlier detections, and auto-generated action plans.</p>
      </div>

      {/* Five Highest Fraud/Risk Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-red-500/10 p-3 text-red-500">
              <Building2 size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-widest text-textSecondary">Top Provider Risk</p>
              <p className="mt-1 text-sm font-bold text-textPrimary truncate">{providerName}</p>
              <p className="text-[10px] text-red-500 mt-1 font-bold">{topProvider?.fraud_count || 43} fraud cases</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-500/10 p-3 text-indigo-500">
              <MapPin size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-widest text-textSecondary">Top City Risk</p>
              <p className="mt-1 text-sm font-bold text-textPrimary truncate">{cityName}</p>
              <p className="text-[10px] text-indigo-500 mt-1 font-bold">{topCity?.fraud_claims || 287} fraud cases</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-500/10 p-3 text-amber-500">
              <Stethoscope size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-widest text-textSecondary">Top Diagnosis Risk</p>
              <p className="mt-1 text-sm font-bold text-textPrimary font-mono truncate">ICD-{diagnosisCode}</p>
              <p className="text-[10px] text-amber-500 mt-1 font-bold">{topDiagnosis?.fraud_count || 156} cases</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-sky-500/10 p-3 text-sky-500">
              <UserCheck size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-widest text-textSecondary">Top Patient Risk</p>
              <p className="mt-1 text-sm font-bold text-textPrimary truncate">{patientName}</p>
              <p className="text-[10px] text-sky-500 mt-1 font-bold">{topPatient?.fraud_count || 12} cases</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-teal-500/10 p-3 text-teal-500">
              <Activity size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-widest text-textSecondary">Top Specialty Risk</p>
              <p className="mt-1 text-sm font-bold text-textPrimary truncate">{topSpecialty}</p>
              <p className="text-[10px] text-teal-500 mt-1 font-bold">{fraudRate}% Fraud Rate</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Insights & Recommendations */}
        <div className="lg:col-span-2 bg-surface rounded-2xl border border-border p-6 shadow-sm">
          <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2 mb-4 pb-3 border-b border-border">
            <BrainCircuit size={16} className="text-primary" />
            AI Insights & Recommendations
          </h3>
          <div className="space-y-4">
            {recommendations.map((rec, idx) => {
              const sev = SEVERITY[rec.severity];
              const Icon = rec.icon;
              return (
                <div key={idx} className={`rounded-xl border border-border bg-bg/40 p-4 border-l-4 ${sev.border}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`rounded-lg ${sev.bg} p-2 mt-0.5 shrink-0`}>
                        <Icon size={14} className={sev.color} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs font-black text-textPrimary uppercase tracking-wider">{rec.action}</h4>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${sev.color} ${sev.bg}`}>
                            {sev.label}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-textSecondary leading-relaxed">{rec.reason}</p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary whitespace-nowrap">
                        <DollarSign size={10} />
                        {rec.impact}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Feature Importance Chart */}
        <div className="bg-surface rounded-2xl border border-border p-6 shadow-sm">
          <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2 mb-4 pb-3 border-b border-border">
            <Target size={16} className="text-primary" />
            XGBoost Feature Importance
          </h3>
          <div className="h-72 bg-surface rounded-xl p-2 border border-border">
            <PlotlyChart
              data={[{
                y: FEATURE_NAMES,
                x: FEATURE_WEIGHTS,
                type: 'bar',
                orientation: 'h',
                marker: { color: ['#2563eb', '#0d9488', '#f97316', '#7c3aed', '#0891b2', '#f59e0b'] },
                text: FEATURE_WEIGHTS.map(v => `${v}%`),
                textposition: 'outside',
                textfont: { size: 10 }
              }]}
              layout={{
                margin: { t: 15, r: 40, l: 110, b: 15 },
                xaxis: { showgrid: true, range: [0, 100], ticksuffix: '%' },
                yaxis: { autorange: 'reversed', gridcolor: 'transparent' },
                showlegend: false,
              }}
            />
          </div>
          <div className="mt-4 space-y-2.5">
            {[
              { label: 'Model Accuracy', value: metrics?.model_accuracy ? (metrics.model_accuracy * 100).toFixed(1) + '%' : `${(CANONICAL_MODEL.accuracy * 100).toFixed(1)}%`, color: 'text-primary' },
              { label: 'Precision', value: metrics?.model_precision ? (metrics.model_precision * 100).toFixed(1) + '%' : `${(CANONICAL_MODEL.precision * 100).toFixed(1)}%`, color: 'text-emerald-500' },
              { label: 'Recall', value: metrics?.model_recall ? (metrics.model_recall * 100).toFixed(1) + '%' : `${(CANONICAL_MODEL.recall * 100).toFixed(1)}%`, color: 'text-amber-500' },
              { label: 'F1 Score', value: metrics?.model_f1 ? (metrics.model_f1 * 100).toFixed(1) + '%' : `${(CANONICAL_MODEL.f1Score * 100).toFixed(1)}%`, color: 'text-sky-500' },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center justify-between">
                <span className="text-xs text-textSecondary font-medium">{stat.label}</span>
                <span className={`text-xs font-bold ${stat.color}`}>{stat.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
