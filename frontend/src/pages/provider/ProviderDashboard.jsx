import { useState, useEffect, useMemo } from 'react';
import { Activity, AlertCircle, BrainCircuit, CheckCircle, Clock, CreditCard, DollarSign, FileText, ShieldCheck, TrendingUp } from 'lucide-react';
import api from '../../api';
import Skeleton from '../../components/Skeleton';
import StatusBadge from '../../components/StatusBadge';
import PlotlyChart from '../../components/PlotlyChart';
import { toNumber, clampScore, formatCurrency, formatCompactCurrency } from '../../utils/format';

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
    const pending = claims.filter((c) => {
      const status = statusOf(c).toLowerCase();
      return status.includes('pending') || status.includes('submitted') || status.includes('review');
    }).length;
    const flagged = claims.filter((c) => {
      const status = statusOf(c).toLowerCase();
      return status.includes('flagged') || status.includes('fraud') || status.includes('reject') || clampScore(c.fraud_score) >= 0.7;
    }).length;
    const approved = claims.filter((c) => {
      const status = statusOf(c).toLowerCase();
      return status.includes('cleared') || status.includes('approved') || status.includes('close');
    }).length;
    const amount = claims.reduce((sum, c) => sum + toNumber(c.claim_amount), 0);
    const avgRisk = total ? claims.reduce((sum, c) => sum + clampScore(c.fraud_score), 0) / total : 0;

    const byDay = Object.entries(claims.reduce((acc, c) => {
      const key = dateKey(c.claim_date || c.service_date);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {})).sort(([a], [b]) => a.localeCompare(b)).slice(-12);

    const amountsByDay = Object.entries(claims.reduce((acc, c) => {
      const key = dateKey(c.claim_date || c.service_date);
      acc[key] = (acc[key] || 0) + toNumber(c.claim_amount);
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
      .sort((a, b) => new Date(b.claim_date || 0) - new Date(a.claim_date || 0))
      .slice(0, 6);

    return { total, pending, flagged, approved, amount, avgRisk, byDay, amountsByDay, statusMix, riskBuckets, recent };
  }, [claims]);

  const byDayPlotlyData = [
    {
      x: analytics.byDay.map(([label]) => label),
      y: analytics.byDay.map(([, value]) => value),
      type: 'scatter',
      mode: 'lines',
      name: 'Claims Count',
      line: { color: '#1e5fb7', width: 3, shape: 'spline' },
      fill: 'tozeroy',
      fillcolor: 'rgba(30, 95, 183, 0.08)'
    }
  ];

  const statusMixPlotlyData = [
    {
      labels: analytics.statusMix.map(([label]) => label),
      values: analytics.statusMix.map(([, value]) => value),
      type: 'pie',
      hole: 0.6,
      marker: {
        colors: ['#16a34a', '#dc2626', '#ea7c23', '#0891b2', '#1e5fb7', '#64748b']
      },
      textinfo: 'percent',
      textposition: 'inside'
    }
  ];

  const amountsByDayPlotlyData = [
    {
      x: analytics.amountsByDay.map(([label]) => label),
      y: analytics.amountsByDay.map(([, value]) => value),
      type: 'bar',
      name: 'Billed Amount',
      marker: { color: '#0891b2' }
    }
  ];

  const riskBucketsPlotlyData = [
    {
      x: Object.keys(analytics.riskBuckets),
      y: Object.values(analytics.riskBuckets),
      type: 'bar',
      name: 'Claims Count',
      marker: {
        color: ['#16a34a', '#ea7c23', '#dc2626']
      }
    }
  ];

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
        <KpiCard label="Total Billed" value={formatCompactCurrency(analytics.amount)} helper="Financial exposure in submitted claims" icon={DollarSign} tone="primary" />
        <KpiCard label="Average Risk" value={`${(analytics.avgRisk * 100).toFixed(1)}%`} helper="Mean fraud probability" icon={BrainCircuit} tone="warning" />
        <KpiCard label="AI Accuracy" value={`${(clampScore(metrics?.model_accuracy) * 100).toFixed(1)}%`} helper="Returned from stats endpoint" icon={ShieldCheck} tone="success" />
        <KpiCard label="Last Retrain" value={metrics?.last_retrain ? new Date(metrics.last_retrain).toLocaleDateString() : 'N/A'} helper="Model lifecycle timestamp" icon={Activity} tone="cyan" />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ChartCard title="Claim Submission Trend" subtitle="Daily claim count aggregated from backend timestamps" empty={!analytics.byDay.length}>
            <PlotlyChart
              data={byDayPlotlyData}
              layout={{
                margin: { t: 10, r: 10, l: 30, b: 30 },
                xaxis: { showgrid: false },
                yaxis: { gridcolor: 'rgba(148, 163, 184, 0.18)' },
                legend: { display: false }
              }}
            />
          </ChartCard>
        </div>
        <ChartCard title="Current Status Mix" subtitle="Claim statuses returned by the API" empty={!hasClaims}>
          <PlotlyChart
            data={statusMixPlotlyData}
            layout={{
              margin: { t: 10, b: 10, l: 10, r: 10 },
              height: 240,
              legend: { orientation: 'h', y: -0.15 }
            }}
          />
        </ChartCard>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ChartCard title="Claim Amount Trend" subtitle="Daily billed amount from real claim totals" empty={!analytics.amountsByDay.length}>
          <PlotlyChart
            data={amountsByDayPlotlyData}
            layout={{
              margin: { t: 10, r: 10, l: 40, b: 30 },
              xaxis: { showgrid: false },
              yaxis: { gridcolor: 'rgba(148, 163, 184, 0.18)' }
            }}
          />
        </ChartCard>
        <ChartCard title="Risk Distribution" subtitle="Low, medium, and high buckets from fraud scores" empty={!hasClaims}>
          <PlotlyChart
            data={riskBucketsPlotlyData}
            layout={{
              margin: { t: 10, r: 10, l: 30, b: 30 },
              xaxis: { showgrid: false },
              yaxis: { gridcolor: 'rgba(148, 163, 184, 0.18)' }
            }}
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
                    <tr key={claim.claim_id || `${claim.patient_name}-${claim.claim_date}`}>
                      <td className="font-mono text-xs font-black text-primary">#{claim.claim_id || 'N/A'}</td>
                      <td className="font-bold text-textPrimary">{claim.patient_name || 'Unknown patient'}</td>
                      <td className="text-xs text-textSecondary">{claim.service_name || 'Medical service'}</td>
                      <td className="text-right font-mono text-textPrimary">{formatCurrency(claim.claim_amount)}</td>
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
