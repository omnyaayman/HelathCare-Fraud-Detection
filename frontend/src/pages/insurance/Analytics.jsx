import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { Activity, AlertTriangle, BarChart3, BrainCircuit, Database, RefreshCcw, Search, ShieldAlert, Stethoscope } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import api from '../../api';
import Skeleton from '../../components/Skeleton';
import { toNumber as n, formatNumber, formatCurrency } from '../../utils/format';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Tooltip, Legend, Filler);

const palette = ['#2563eb', '#0891b2', '#16a34a', '#f97316', '#dc2626', '#7c3aed'];

function keyDate(raw) {
  const d = raw ? new Date(raw) : null;
  if (!d || Number.isNaN(d.getTime())) return 'Undated';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function labelMonth(key) {
  if (key === 'Undated') return key;
  const [year, month] = key.split('-');
  return new Date(Number(year), Number(month) - 1, 1).toLocaleString('en-US', { month: 'short', year: 'numeric' });
}

function countBy(rows, resolver) {
  return rows.reduce((acc, row) => {
    const key = String(resolver(row) || 'Unknown').trim() || 'Unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function top(map, limit = 8) {
  return Object.entries(map).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, limit);
}

function chart(entries, label, color = '#2563eb') {
  return {
    labels: entries.map((x) => x.label),
    datasets: [{ label, data: entries.map((x) => x.value), backgroundColor: color, borderColor: color, borderRadius: 8, tension: 0.35, fill: true }],
  };
}

const options = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { backgroundColor: '#0f172a', padding: 12, cornerRadius: 10 } },
  scales: {
    x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 11 } } },
    y: { beginAtZero: true, grid: { color: 'rgba(148, 163, 184, 0.16)' }, ticks: { color: '#64748b', precision: 0 } },
  },
};

function Panel({ title, subtitle, icon: Icon, children, empty }) {
  return (
    <section className="enterprise-card p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-black text-textPrimary"><Icon size={17} className="text-primary" />{title}</h2>
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
      ) : <div className="h-72">{children}</div>}
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

  const analytics = useMemo(() => {
    const total = metrics?.total_claims || 0;
    const fraud = metrics?.total_fraud || 0;
    const amount = metrics?.total_claim_amount || 0;
    const avgScore = metrics?.avg_fraud_score || 0;

    const months = monthlyClaims.map(x => ({ label: x.month, value: x.total_claims }));

    const risk = fraudScoreDistribution.map(x => ({ label: x.score_range, value: x.count }));

    const diagnoses = topDiagnoses.map(x => ({ label: x.diagnosis_code, value: x.claim_count }));
    const providers = topProviders.map(x => ({ label: x.name, value: x.fraud_count }));
    const services = []; // Can add later if needed

    return { total, fraud, amount, avgScore, months, risk, diagnoses, providers, services };
  }, [metrics, monthlyClaims, fraudScoreDistribution, topDiagnoses, topProviders]);

  if (loading) return <Skeleton rows={8} />;

  return (
    <div className="insurance-analytics-page space-y-6">
      <header className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-primary">Live analytics</p>
          <h1 className="mt-2 text-2xl font-black text-textPrimary">Fraud Intelligence Analytics</h1>
          <p className="mt-1 text-sm text-textSecondary">All charts are calculated from backend claim records.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search analytics data" className="w-full rounded-lg border border-border py-2.5 pl-9 pr-3 text-sm sm:w-72" />
          </div>
          <button onClick={load} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-black text-white"><RefreshCcw size={16} />Refresh</button>
        </div>
      </header>

      {error && <div className="rounded-xl border border-danger/20 bg-danger/10 p-4 text-sm font-bold text-danger">{error}</div>}

      <section className="grid gap-4 md:grid-cols-4">
        <div className="enterprise-card p-4"><p className="text-[10px] font-black uppercase text-textSecondary">Claims</p><p className="mt-2 text-2xl font-black">{formatNumber(analytics.total)}</p></div>
        <div className="enterprise-card p-4"><p className="text-[10px] font-black uppercase text-textSecondary">Fraud Signals</p><p className="mt-2 text-2xl font-black text-danger">{formatNumber(analytics.fraud)}</p></div>
        <div className="enterprise-card p-4"><p className="text-[10px] font-black uppercase text-textSecondary">Claim Value</p><p className="mt-2 text-2xl font-black">{formatCurrency(analytics.amount)}</p></div>
        <div className="enterprise-card p-4"><p className="text-[10px] font-black uppercase text-textSecondary">Avg Risk Score</p><p className="mt-2 text-2xl font-black text-warning">{(analytics.avgScore * 100).toFixed(1)}%</p></div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Panel title="Monthly Claim Trend" subtitle="Backend claims grouped by claim/submission date" icon={BarChart3} empty={!analytics.months.length}>
          <Line data={chart(analytics.months, 'Claims', palette[0])} options={options} />
        </Panel>
        <Panel title="Risk Distribution" subtitle="Fraud score buckets from ML output" icon={ShieldAlert} empty={!analytics.risk.length}>
          <Doughnut data={{ labels: analytics.risk.map((x) => x.label), datasets: [{ data: analytics.risk.map((x) => x.value), backgroundColor: ['#16a34a', '#f97316', '#dc2626', '#0891b2', '#7c3aed'], borderWidth: 0 }] }} options={{ ...options, scales: {}, plugins: { ...options.plugins, legend: { display: true, position: 'bottom' } } }} />
        </Panel>
        <Panel title="Top Fraud Providers" subtitle="Ranked by fraud or high-score claim records" icon={AlertTriangle} empty={!analytics.providers.length}>
          <Bar data={chart(analytics.providers, 'Fraud claims', palette[4])} options={{ ...options, indexAxis: 'y' }} />
        </Panel>
        <Panel title="Diagnosis Mix" subtitle="Most common diagnosis labels/codes in claim records" icon={Stethoscope} empty={!analytics.diagnoses.length}>
          <Bar data={chart(analytics.diagnoses, 'Claims', palette[2])} options={{ ...options, indexAxis: 'y' }} />
        </Panel>
        <Panel title="Fraud by City" subtitle="Fraud claims by provider city" icon={Activity} empty={!fraudByCity.length}>
          <Bar data={chart(fraudByCity.map(x => ({ label: x.city, value: x.fraud_claims })), 'Fraud claims', palette[1])} options={{ ...options, indexAxis: 'y' }} />
        </Panel>
        <Panel title="Model Performance" subtitle="Metrics returned by the backend stats endpoint" icon={BrainCircuit} empty={!metrics}>
          <Bar data={chart([
            { label: 'Accuracy', value: n(metrics?.model_accuracy) * 100 },
            { label: 'Precision', value: n(metrics?.model_precision) * 100 },
            { label: 'Recall', value: n(metrics?.model_recall) * 100 },
            { label: 'F1', value: n(metrics?.model_f1) * 100 },
            { label: 'ROC AUC', value: n(metrics?.model_roc_auc) * 100 },
          ].filter((x) => x.value > 0), 'Score %', palette[5])} options={options} />
        </Panel>
      </section>
    </div>
  );
}
