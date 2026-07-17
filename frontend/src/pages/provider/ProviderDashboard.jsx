import { useState, useEffect, useMemo } from 'react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Tooltip, Filler, Legend
} from 'chart.js';
import { Activity, AlertCircle, BrainCircuit, CheckCircle, Clock, CreditCard, DollarSign, FileText, ShieldCheck, TrendingUp } from 'lucide-react';
import api from '../../api';
import Skeleton from '../../components/Skeleton';
import StatusBadge from '../../components/StatusBadge';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Tooltip, Filler, Legend);

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const compactCurrency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 });

const chartOpts = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 650 },
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#0f172a',
      borderColor: 'rgba(148, 163, 184, 0.25)',
      borderWidth: 1,
      titleColor: '#e2e8f0',
      bodyColor: '#cbd5e1',
      padding: 10,
      displayColors: false,
    },
  },
  scales: {
    x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 11 } } },
    y: { beginAtZero: true, grid: { color: 'rgba(148, 163, 184, 0.18)' }, ticks: { color: '#64748b', font: { size: 11 }, precision: 0 } },
  },
};

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function clampScore(value) {
  const n = toNumber(value);
  if (n > 1) return Math.min(n / 100, 1);
  return Math.min(Math.max(n, 0), 1);
}

function dateKey(value) {
  const raw = value || '';
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? 'Undated' : d.toISOString().slice(0, 10);
}

function statusOf(claim) {
  return claim?.status || 'Pending';
}

function KpiCard({ label, value, helper, icon: Icon, tone = 'primary' }) {
  const tones = {
    primary: 'bg-primary/10 text-primary border-primary/20',
    cyan: 'bg-secondary/10 text-secondary border-secondary/20',
    success: 'bg-success/10 text-success border-success/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
    danger: 'bg-danger/10 text-danger border-danger/20',
  };

  return (
    <div className="enterprise-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/30">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-textSecondary">{label}</p>
          <p className="mt-2 truncate text-2xl font-black text-textPrimary">{value}</p>
        </div>
        <div className={`rounded-xl border p-2 ${tones[tone] || tones.primary}`}>
          <Icon size={18} />
        </div>
      </div>
      {helper && <p className="mt-3 truncate text-xs text-textSecondary">{helper}</p>}
    </div>
  );
}

function ChartCard({ title, subtitle, children, empty }) {
  return (
    <section className="enterprise-card p-5">
      <div className="mb-5">
        <h3 className="text-sm font-black text-textPrimary">{title}</h3>
        <p className="mt-1 text-xs text-textSecondary">{subtitle}</p>
      </div>
      {empty ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-bg/50 text-center">
          <FileText size={26} className="mb-2 text-textSecondary" />
          <p className="text-sm font-bold text-textPrimary">No claim data yet</p>
          <p className="mt-1 text-xs text-textSecondary">This chart will populate from backend claims.</p>
        </div>
      ) : (
        <div className="h-64">{children}</div>
      )}
    </section>
  );
}

export default function ProviderDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const [metricsData, claimsData] = await Promise.all([
          api.getMetrics(),
          api.getClaims(),
        ]);
        setMetrics(metricsData || {});
        setClaims(Array.isArray(claimsData) ? claimsData : []);
      } catch (err) {
        console.error('Dashboard Loading Error:', err);
        setError(err?.message || 'Unable to load provider analytics.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const analytics = useMemo(() => {
    const total = claims.length;
    const pending = claims.filter((c) => statusOf(c).toLowerCase().includes('pending')).length;
    const flagged = claims.filter((c) => {
      const status = statusOf(c).toLowerCase();
      return status.includes('flagged') || status.includes('fraud') || clampScore(c.fraud_score) >= 0.7;
    }).length;
    const approved = claims.filter((c) => {
      const status = statusOf(c).toLowerCase();
      return status.includes('cleared') || status.includes('approved');
    }).length;
    const amount = claims.reduce((sum, c) => sum + toNumber(c.amount), 0);
    const avgRisk = total ? claims.reduce((sum, c) => sum + clampScore(c.fraud_score), 0) / total : 0;

    const byDay = Object.entries(claims.reduce((acc, c) => {
      const key = dateKey(c.submitted_at || c.claim_date || c.service_date);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {})).sort(([a], [b]) => a.localeCompare(b)).slice(-12);

    const amountsByDay = Object.entries(claims.reduce((acc, c) => {
      const key = dateKey(c.submitted_at || c.claim_date || c.service_date);
      acc[key] = (acc[key] || 0) + toNumber(c.amount);
      return acc;
    }, {})).sort(([a], [b]) => a.localeCompare(b)).slice(-12);

    const statusMix = Object.entries(claims.reduce((acc, c) => {
      const key = statusOf(c);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {}));

    const riskBuckets = claims.reduce((acc, c) => {
      const score = clampScore(c.fraud_score);
      const key = score >= 0.7 ? 'High' : score >= 0.4 ? 'Medium' : 'Low';
      acc[key] += 1;
      return acc;
    }, { Low: 0, Medium: 0, High: 0 });

    const recent = [...claims]
      .sort((a, b) => new Date(b.submitted_at || b.claim_date || 0) - new Date(a.submitted_at || a.claim_date || 0))
      .slice(0, 6);

    return { total, pending, flagged, approved, amount, avgRisk, byDay, amountsByDay, statusMix, riskBuckets, recent };
  }, [claims]);

  if (loading) return <div className="enterprise-card p-8"><Skeleton rows={12} /></div>;

  if (error) {
    return (
      <div className="enterprise-card flex flex-col items-center justify-center px-6 py-20 text-center">
        <AlertCircle className="mb-3 text-danger" size={38} />
        <p className="font-black text-textPrimary">Unable to load provider analytics</p>
        <p className="mt-1 max-w-sm text-sm text-textSecondary">{error}</p>
      </div>
    );
  }

  const hasClaims = analytics.total > 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-primary">Provider workspace</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-textPrimary">Claim Operations Dashboard</h1>
          <p className="mt-2 max-w-2xl text-sm text-textSecondary">
            Live claim volume, payment exposure, and AI risk insights from the backend claims endpoint.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface px-4 py-3 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-textSecondary">Model accuracy</p>
          <p className="mt-1 text-xl font-black text-success">{((clampScore(metrics?.model_accuracy) || 0) * 100).toFixed(1)}%</p>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Claims" value={analytics.total.toLocaleString()} helper="Submitted by this provider account" icon={CreditCard} tone="cyan" />
        <KpiCard label="Pending Review" value={analytics.pending.toLocaleString()} helper="Awaiting processing or analyst review" icon={Clock} tone="warning" />
        <KpiCard label="High Risk Claims" value={analytics.flagged.toLocaleString()} helper="Flagged by status or fraud score" icon={AlertCircle} tone="danger" />
        <KpiCard label="Cleared Claims" value={analytics.approved.toLocaleString()} helper="Approved or cleared records" icon={CheckCircle} tone="success" />
        <KpiCard label="Total Billed" value={compactCurrency.format(analytics.amount)} helper="Financial exposure in submitted claims" icon={DollarSign} tone="primary" />
        <KpiCard label="Average Risk" value={`${(analytics.avgRisk * 100).toFixed(1)}%`} helper="Mean fraud probability" icon={BrainCircuit} tone="warning" />
        <KpiCard label="AI Accuracy" value={`${(clampScore(metrics?.model_accuracy) * 100).toFixed(1)}%`} helper="Returned from stats endpoint" icon={ShieldCheck} tone="success" />
        <KpiCard label="Last Retrain" value={metrics?.last_retrain ? new Date(metrics.last_retrain).toLocaleDateString() : 'N/A'} helper="Model lifecycle timestamp" icon={Activity} tone="cyan" />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ChartCard title="Claim Submission Trend" subtitle="Daily claim count aggregated from backend timestamps" empty={!analytics.byDay.length}>
            <Line
              data={{
                labels: analytics.byDay.map(([label]) => label),
                datasets: [{
                  data: analytics.byDay.map(([, value]) => value),
                  borderColor: '#1e5fb7',
                  backgroundColor: 'rgba(30, 95, 183, 0.12)',
                  fill: true,
                  tension: 0.35,
                  pointRadius: 3,
                }],
              }}
              options={chartOpts}
            />
          </ChartCard>
        </div>
        <ChartCard title="Current Status Mix" subtitle="Claim statuses returned by the API" empty={!hasClaims}>
          <Doughnut
            data={{
              labels: analytics.statusMix.map(([label]) => label),
              datasets: [{
                data: analytics.statusMix.map(([, value]) => value),
                backgroundColor: ['#16a34a', '#dc2626', '#ea7c23', '#0891b2', '#1e5fb7', '#64748b'],
                borderWidth: 0,
                cutout: '68%',
              }],
            }}
            options={{ ...chartOpts, scales: {}, plugins: { ...chartOpts.plugins, legend: { display: true, position: 'bottom', labels: { color: '#64748b', boxWidth: 10, font: { size: 11 } } } } }}
          />
        </ChartCard>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ChartCard title="Claim Amount Trend" subtitle="Daily billed amount from real claim totals" empty={!analytics.amountsByDay.length}>
          <Bar
            data={{
              labels: analytics.amountsByDay.map(([label]) => label),
              datasets: [{ data: analytics.amountsByDay.map(([, value]) => value), backgroundColor: '#0891b2', borderRadius: 8, maxBarThickness: 38 }],
            }}
            options={chartOpts}
          />
        </ChartCard>
        <ChartCard title="Risk Distribution" subtitle="Low, medium, and high buckets from fraud scores" empty={!hasClaims}>
          <Bar
            data={{
              labels: Object.keys(analytics.riskBuckets),
              datasets: [{ data: Object.values(analytics.riskBuckets), backgroundColor: ['#16a34a', '#ea7c23', '#dc2626'], borderRadius: 8, maxBarThickness: 52 }],
            }}
            options={chartOpts}
          />
        </ChartCard>
      </section>

      <section className="enterprise-card overflow-hidden">
        <div className="flex flex-col gap-1 border-b border-border bg-bg/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-black text-textPrimary">Recent Claim Activity</h2>
            <p className="text-xs text-textSecondary">Latest backend rows with status and AI risk.</p>
          </div>
          <TrendingUp size={18} className="text-primary" />
        </div>
        {analytics.recent.length ? (
          <div className="overflow-x-auto">
            <table className="enterprise-table">
              <thead>
                <tr>
                  <th>Claim ID</th>
                  <th>Patient</th>
                  <th>Service</th>
                  <th className="text-right">Amount</th>
                  <th className="text-right">Risk</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {analytics.recent.map((claim) => {
                  const score = clampScore(claim.fraud_score);
                  return (
                    <tr key={claim.id || `${claim.patient_name}-${claim.submitted_at}`}>
                      <td className="font-mono text-xs font-black text-primary">{claim.id || 'N/A'}</td>
                      <td className="font-bold text-textPrimary">{claim.patient_name || 'Unknown patient'}</td>
                      <td className="text-xs text-textSecondary">{claim.service_label || claim.service_type || 'Medical service'}</td>
                      <td className="text-right font-mono text-textPrimary">{currency.format(toNumber(claim.amount))}</td>
                      <td className={`text-right font-mono font-black ${score >= 0.7 ? 'text-danger' : score >= 0.4 ? 'text-warning' : 'text-success'}`}>{(score * 100).toFixed(1)}%</td>
                      <td><StatusBadge status={statusOf(claim)} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-16 text-center text-sm text-textSecondary">No claims have been returned for this provider yet.</div>
        )}
      </section>
    </div>
  );
}
