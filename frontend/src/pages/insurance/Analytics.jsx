import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, BarChart3, BrainCircuit, Database, RefreshCcw, Search, ShieldAlert, Stethoscope } from 'lucide-react';
import api from '../../api';
import Skeleton from '../../components/Skeleton';
import PlotlyChart from '../../components/PlotlyChart';

const palette = ['#2563eb', '#0891b2', '#16a34a', '#f97316', '#dc2626', '#7c3aed'];
const fmt = new Intl.NumberFormat('en-US');
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

function n(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function Panel({ title, subtitle, icon: Icon, children, empty }) {
  return (
    <section className="enterprise-card p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-textPrimary"><Icon size={17} className="text-primary" />{title}</h2>
          <p className="mt-1 text-xs text-textSecondary">{subtitle}</p>
        </div>
      </div>
      {empty ? (
        <div className="flex h-72 items-center justify-center rounded-lg border border-dashed border-border bg-bg/50 text-center">
          <div>
            <Database className="mx-auto mb-2 text-textSecondary" />
            <p className="text-sm font-bold text-textPrimary">No backend records matched this panel.</p>
          </div>
        </div>
      ) : <div className="h-72 bg-surface rounded-lg p-2">{children}</div>}
    </section>
  );
}

export default function Analytics() {
  const [claims, setClaims] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [topProviders, setTopProviders] = useState([]);
  const [topPatients, setTopPatients] = useState([]);
  const [topDiagnoses, setTopDiagnoses] = useState([]);
  const [fraudByDiagnosis, setFraudByDiagnosis] = useState([]);
  const [fraudByCity, setFraudByCity] = useState([]);
  const [fraudScoreDistribution, setFraudScoreDistribution] = useState([]);
  const [monthlyClaims, setMonthlyClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [claimRes, metricRes, topProvidersRes, topPatientsRes, topDiagnosesRes, fraudByDiagnosisRes, fraudByCityRes, fraudScoreDistRes, monthlyRes] = await Promise.allSettled([
        api.getClaims({ page_size: 1000 }),
        api.getStats(),
        api.getTopProviders(),
        api.getTopPatients(),
        api.getTopDiagnoses(),
        api.getFraudByDiagnosis(),
        api.getFraudByCity(),
        api.getFraudScoreDistribution(),
        api.getMonthlyClaims(),
      ]);

      setClaims(claimRes.status === 'fulfilled' ? (claimRes.value?.data || claimRes.value) : []);
      setMetrics(metricRes.status === 'fulfilled' ? metricRes.value : {});
      setTopProviders(topProvidersRes.status === 'fulfilled' ? topProvidersRes.value : []);
      setTopPatients(topPatientsRes.status === 'fulfilled' ? topPatientsRes.value : []);
      setTopDiagnoses(topDiagnosesRes.status === 'fulfilled' ? topDiagnosesRes.value : []);
      setFraudByDiagnosis(fraudByDiagnosisRes.status === 'fulfilled' ? fraudByDiagnosisRes.value : []);
      setFraudByCity(fraudByCityRes.status === 'fulfilled' ? fraudByCityRes.value : []);
      setFraudScoreDistribution(fraudScoreDistRes.status === 'fulfilled' ? fraudScoreDistRes.value : []);
      setMonthlyClaims(monthlyRes.status === 'fulfilled' ? monthlyRes.value : []);
    } catch (err) {
      setError(err.message || 'Unable to load analytics.');
      setClaims([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return claims;
    return claims.filter((claim) => JSON.stringify(claim).toLowerCase().includes(q));
  }, [claims, search]);

  const statsInfo = useMemo(() => {
    const total = metrics?.total_claims || 0;
    const fraud = metrics?.total_fraud || 0;
    const amount = metrics?.total_claim_amount || 0;
    const avgScore = metrics?.avg_fraud_score || 0;
    return { total, fraud, amount, avgScore };
  }, [metrics]);

  // Chart 1: Monthly Fraud Trend Line Chart
  const monthlyFraudTrend = useMemo(() => {
    return [
      {
        x: monthlyClaims.map(m => m.month),
        y: monthlyClaims.map(m => m.fraud_claims || 0),
        type: 'scatter',
        mode: 'lines+markers',
        name: 'Monthly Fraud Claims',
        line: { color: '#dc2626', width: 3, shape: 'spline' },
        marker: { size: 6, color: '#dc2626' },
        fill: 'tozeroy',
        fillcolor: 'rgba(220, 38, 38, 0.05)'
      }
    ];
  }, [monthlyClaims]);

  // Chart 2: Fraud by City Bar Chart
  const fraudByCityData = useMemo(() => {
    const sorted = [...fraudByCity].sort((a, b) => b.fraud_claims - a.fraud_claims).slice(0, 8);
    return [
      {
        x: sorted.map(c => c.city),
        y: sorted.map(c => c.fraud_claims),
        type: 'bar',
        name: 'Fraud Claims',
        marker: { color: '#ef4444' }
      }
    ];
  }, [fraudByCity]);

  // Chart 3: Fraud by Provider Grouped Bar Chart (Provider Comparison)
  const providerComparisonData = useMemo(() => {
    const top5 = topProviders.slice(0, 5);
    return [
      {
        x: top5.map(p => p.name),
        y: top5.map(p => p.claim_count),
        type: 'bar',
        name: 'Total Claims',
        marker: { color: '#2563eb' }
      },
      {
        x: top5.map(p => p.name),
        y: top5.map(p => p.fraud_count),
        type: 'bar',
        name: 'Fraud Claims',
        marker: { color: '#dc2626' }
      }
    ];
  }, [topProviders]);

  // Chart 4: Fraud by Diagnosis Bar Chart
  const fraudByDiagnosisData = useMemo(() => {
    const topD = topDiagnoses.slice(0, 8);
    return [
      {
        x: topD.map(d => `ICD-${d.diagnosis_code}`),
        y: topD.map(d => d.fraud_count || 0),
        type: 'bar',
        name: 'Suspicious Claims',
        marker: { color: '#f59e0b' }
      }
    ];
  }, [topDiagnoses]);

  // Chart 5: Claim Risk Score Distribution
  const claimDistributionData = useMemo(() => {
    return [
      {
        labels: fraudScoreDistribution.map(d => d.score_range),
        values: fraudScoreDistribution.map(d => d.count),
        type: 'pie',
        hole: 0.5,
        marker: { colors: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#7c3aed'] }
      }
    ];
  }, [fraudScoreDistribution]);

  // Chart 6: Model Metrics Accuracy Bar Chart
  const modelMetricsData = useMemo(() => {
    return [
      {
        x: ['Accuracy', 'Precision', 'Recall', 'F1-Score', 'ROC AUC'],
        y: [
          n(metrics?.model_accuracy) * 100,
          n(metrics?.model_precision) * 100,
          n(metrics?.model_recall) * 100,
          n(metrics?.model_f1) * 100,
          n(metrics?.model_roc_auc) * 100
        ],
        type: 'bar',
        marker: { color: '#10b981' }
      }
    ];
  }, [metrics]);

  if (loading) return <Skeleton rows={8} />;

  return (
    <div className="insurance-analytics-page space-y-6 animate-in fade-in duration-300">
      <header className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-primary">Intelligence Console</p>
          <h1 className="mt-2 text-2xl font-black text-textPrimary">Advanced Platform Analytics</h1>
          <p className="mt-1 text-sm text-textSecondary">Statistical intelligence reports parsed across SQL datasets.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search records..." className="w-full bg-surface text-textPrimary border border-border rounded-lg py-2.5 pl-9 pr-3 text-sm sm:w-72 outline-none" />
          </div>
          <button onClick={load} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-black text-white hover:brightness-110 transition-all"><RefreshCcw size={16} />Refresh</button>
        </div>
      </header>

      {error && <div className="rounded-xl border border-danger/20 bg-danger/10 p-4 text-sm font-bold text-danger">{error}</div>}

      <section className="grid gap-4 md:grid-cols-4">
        <div className="enterprise-card p-4"><p className="text-[10px] font-black uppercase text-textSecondary">Claims</p><p className="mt-2 text-2xl font-black font-mono">{fmt.format(statsInfo.total)}</p></div>
        <div className="enterprise-card p-4"><p className="text-[10px] font-black uppercase text-textSecondary">Fraud Signals</p><p className="mt-2 text-2xl font-black text-danger font-mono">{fmt.format(statsInfo.fraud)}</p></div>
        <div className="enterprise-card p-4"><p className="text-[10px] font-black uppercase text-textSecondary">Claim Value</p><p className="mt-2 text-2xl font-black font-mono">{money.format(statsInfo.amount)}</p></div>
        <div className="enterprise-card p-4"><p className="text-[10px] font-black uppercase text-textSecondary">Avg Risk Score</p><p className="mt-2 text-2xl font-black text-warning font-mono">{(statsInfo.avgScore * 100).toFixed(1)}%</p></div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Panel title="Monthly Fraud Trend" subtitle="Flagged fraud claims count by calendar month" icon={BarChart3} empty={!monthlyClaims.length}>
          <PlotlyChart
            data={monthlyFraudTrend}
            layout={{
              margin: { t: 10, r: 10, l: 30, b: 30 },
              xaxis: { showgrid: false },
              yaxis: { gridcolor: 'rgba(148, 163, 184, 0.16)' }
            }}
          />
        </Panel>

        <Panel title="Fraud by City" subtitle="City locations ranked by total flagged fraud counts" icon={Activity} empty={!fraudByCity.length}>
          <PlotlyChart
            data={fraudByCityData}
            layout={{
              margin: { t: 10, r: 10, l: 30, b: 35 },
              xaxis: { showgrid: false },
              yaxis: { gridcolor: 'rgba(148, 163, 184, 0.16)' }
            }}
          />
        </Panel>

        <Panel title="Provider Comparison" subtitle="Suspicious claims vs total claims of top providers" icon={AlertTriangle} empty={!topProviders.length}>
          <PlotlyChart
            data={providerComparisonData}
            layout={{
              margin: { t: 10, r: 10, l: 30, b: 35 },
              barmode: 'group',
              xaxis: { showgrid: false },
              yaxis: { gridcolor: 'rgba(148, 163, 184, 0.16)' }
            }}
          />
        </Panel>

        <Panel title="Fraud by Diagnosis" subtitle="Diagnosis ICD codes associated with flagged claims" icon={Stethoscope} empty={!topDiagnoses.length}>
          <PlotlyChart
            data={fraudByDiagnosisData}
            layout={{
              margin: { t: 10, r: 10, l: 30, b: 35 },
              xaxis: { showgrid: false },
              yaxis: { gridcolor: 'rgba(148, 163, 184, 0.16)' }
            }}
          />
        </Panel>

        <Panel title="Claim Distribution (Risk Scores)" subtitle="Risk probability bucket distribution count" icon={ShieldAlert} empty={!fraudScoreDistribution.length}>
          <PlotlyChart
            data={claimDistributionData}
            layout={{
              margin: { t: 10, b: 10, l: 10, r: 10 },
              legend: { orientation: 'h', y: -0.15 }
            }}
          />
        </Panel>

        <Panel title="Model Performance Metrics" subtitle="Active ML model validation specifications" icon={BrainCircuit} empty={!metrics}>
          <PlotlyChart
            data={modelMetricsData}
            layout={{
              margin: { t: 15, r: 10, l: 35, b: 30 },
              xaxis: { showgrid: false },
              yaxis: { gridcolor: 'rgba(148, 163, 184, 0.16)', range: [0, 100] }
            }}
          />
        </Panel>
      </section>
    </div>
  );
}
