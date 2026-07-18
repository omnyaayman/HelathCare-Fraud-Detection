
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
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
import {
  TrendingUp,
  DollarSign,
  Activity,
  AlertTriangle,
  Target,
  ShieldCheck,
  Users,
  Building2,
  MapPin,
  Clock,
  FileText,
  BrainCircuit,
  HeartPulse,
  TrendingDown,
  TrendingUp as TrendingUpIcon
} from 'lucide-react';

import api from '../../api';
import Skeleton from '../../components/Skeleton';
import { formatCurrency, formatCompactCurrency, formatNumber } from '../../utils/format';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler
);


const palette = {
  blue: '#2563eb',
  cyan: '#0891b2',
  teal: '#0d9488',
  green: '#16a34a',
  orange: '#f97316',
  red: '#dc2626',
  slate: '#64748b',
  violet: '#7c3aed',
  indigo: '#4f46e5',
};

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 700 },
  plugins: { legend: { display: false } },
  scales: { x: { grid: { display: false } }, y: { beginAtZero: true } },
};

function StatCard({ icon: Icon, label, value, trend, trendValue, tone = 'blue', helper }) {
  const bgTones = {
    blue: 'from-blue-500/15 to-blue-600/10 text-blue-600',
    cyan: 'from-cyan-500/15 to-cyan-600/10 text-cyan-600',
    green: 'from-green-500/15 to-green-600/10 text-green-600',
    orange: 'from-orange-500/15 to-orange-600/10 text-orange-600',
    red: 'from-red-500/15 to-red-600/10 text-red-600',
    violet: 'from-violet-500/15 to-violet-600/10 text-violet-600',
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-6 shadow-sm transition-all duration-300 hover:shadow-lg">
      <div className="absolute inset-0 bg-gradient-to-br opacity-5" />
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-widest text-textSecondary">{label}</p>
            <p className="mt-3 text-3xl font-black tracking-tight text-textPrimary">{value}</p>
            {helper && <p className="mt-1 text-xs text-textSecondary">{helper}</p>}
            {trend !== undefined && (
              <div className="mt-3 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-black">
                {trend === 'up' ? <TrendingUpIcon size={13} /> : <TrendingDown size={13} />}
                {trendValue}
                <span className="ml-1 text-textSecondary">vs last month</span>
              </div>
            )}
          </div>
          <div className={`rounded-2xl bg-gradient-to-br ${bgTones[tone]} p-3`}>
            <Icon size={24} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, icon: Icon, children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-border bg-surface p-6 shadow-sm ${className}`}>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-black text-textPrimary">
            <span className="rounded-lg bg-primary/10 p-1.5 text-primary">
              <Icon size={15} />
            </span>
            {title}
          </h3>
          <p className="mt-1 text-xs text-textSecondary">{subtitle}</p>
        </div>
      </div>
      <div className="h-80">{children}</div>
    </div>
  );
}

export default function ExecutiveDashboard() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);
  const [claims, setClaims] = useState([]);
  const [patients, setPatients] = useState([]);
  const [providers, setProviders] = useState([]);
  const [monthlyClaims, setMonthlyClaims] = useState([]);
  const [fraudByProvider, setFraudByProvider] = useState([]);
  const [claimStatus, setClaimStatus] = useState([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [metricsRes, claimsRes, patientsRes, providersRes, monthlyRes, fraudByProviderRes, statusRes] = await Promise.allSettled([
        api.getStats(),
        api.getClaims({ page_size: 1000 }),
        api.getPatients(),
        api.getProviders(),
        api.getMonthlyClaims(),
        api.getFraudByProvider(),
        api.getClaimStatusDistribution(),
      ]);

      setMetrics(metricsRes.status === 'fulfilled' ? metricsRes.value : {});
      setClaims(claimsRes.status === 'fulfilled' ? (claimsRes.value?.data || claimsRes.value) : []);
      setPatients(patientsRes.status === 'fulfilled' ? patientsRes.value : []);
      setProviders(providersRes.status === 'fulfilled' ? providersRes.value : []);
      setMonthlyClaims(monthlyRes.status === 'fulfilled' ? monthlyRes.value : []);
      setFraudByProvider(fraudByProviderRes.status === 'fulfilled' ? fraudByProviderRes.value : []);
      setClaimStatus(statusRes.status === 'fulfilled' ? statusRes.value : []);
    } catch (error) {
      console.error('Executive dashboard error:', error);
      setMetrics({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const analytics = useMemo(() => {
    const totalClaims = metrics?.total_claims || 0;
    const totalPatients = metrics?.total_patients || 0;
    const totalProviders = metrics?.total_providers || 0;
    const totalPolicies = metrics?.total_policies || 0;

    const totalAmount = metrics?.total_claim_amount || 0;
    const avgClaimAmount = metrics?.avg_claim_amount || 0;
    const avgFraudScore = metrics?.avg_fraud_score || 0;
    const fraudRate = metrics?.fraud_rate || 0;
    const fraudCount = metrics?.total_fraud || 0;
    const normalCount = metrics?.normal_claims || 0;
    const totalPremium = metrics?.total_premium || 0;
    const totalCopay = metrics?.total_copay || 0;

    const highRiskCount = claims.filter(c => c.fraud_score >= 0.7).length;

    return { 
      totalClaims, totalPatients, totalProviders, totalPolicies, 
      totalAmount, avgClaimAmount, avgFraudScore, fraudRate, 
      fraudCount, normalCount, totalPremium, totalCopay, 
      highRiskCount 
    };
  }, [metrics, claims]);

  const monthlyChartData = {
    labels: monthlyClaims.map(e => e.month),
    datasets: [
      {
        label: 'Total Claims',
        data: monthlyClaims.map(e => e.total_claims),
        borderColor: palette.blue,
        backgroundColor: 'rgba(37, 99, 235, 0.15)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Fraud Claims',
        data: monthlyClaims.map(e => e.fraud_claims),
        borderColor: palette.red,
        backgroundColor: 'rgba(220, 38, 38, 0.15)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const claimStatusChartData = {
    labels: claimStatus.map(e => e.status),
    datasets: [
      {
        data: claimStatus.map(e => e.count),
        backgroundColor: [palette.blue, palette.cyan, palette.teal, palette.green, palette.orange, palette.red, palette.slate, palette.violet],
        borderWidth: 0,
      },
    ],
  };

  const fraudByProviderChartData = {
    labels: fraudByProvider.slice(0, 5).map(e => e.provider_name),
    datasets: [
      {
        label: 'Fraud Claims',
        data: fraudByProvider.slice(0, 5).map(e => e.fraud_claims),
        backgroundColor: palette.red,
        borderRadius: 6,
      },
      {
        label: 'Total Claims',
        data: fraudByProvider.slice(0, 5).map(e => e.total_claims),
        backgroundColor: palette.blue,
        borderRadius: 6,
      },
    ],
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-border bg-surface p-8">
          <Skeleton rows={10} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-slate-950 via-primary to-secondary p-8 text-white">
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.15)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.15)_1px,transparent_1px)] [background-size:50px_50px]" />
        <div className="relative">
          <div className="flex flex-col gap-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/20 px-4 py-2 text-xs font-black uppercase tracking-widest">
              <HeartPulse size={14} />
              Executive Overview
            </div>
            <h1 className="text-4xl font-black tracking-tight">Healthcare Fraud Intelligence Platform</h1>
            <p className="max-w-3xl text-sm leading-6 text-white/80">
              Strategic insights for enterprise fraud detection, risk management, and operational excellence.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <StatCard
          icon={FileText}
          label="Total Claims"
          value={formatNumber(analytics.totalClaims)}
          trend="up"
          trendValue="+12.5%"
          tone="blue"
          helper="Processed to date"
        />
        <StatCard
          icon={AlertTriangle}
          label="Fraud Claims"
          value={formatNumber(analytics.fraudCount)}
          trend="down"
          trendValue="-3.1%"
          tone="red"
          helper="Confirmed fraud"
        />
        <StatCard
          icon={ShieldCheck}
          label="Normal Claims"
          value={formatNumber(analytics.normalCount)}
          trend="up"
          trendValue="+5.2%"
          tone="green"
          helper="Legitimate claims"
        />
        <StatCard
          icon={DollarSign}
          label="Total Claim Amount"
          value={formatCompactCurrency(analytics.totalAmount)}
          trend="up"
          trendValue="+8.2%"
          tone="violet"
          helper="Total claim value"
        />
        <StatCard
          icon={BrainCircuit}
          label="Model Accuracy"
          value={metrics?.model_accuracy ? `${(metrics.model_accuracy * 100).toFixed(1)}%` : 'N/A'}
          trend="up"
          trendValue="+1.4%"
          tone="green"
          helper="Current ML performance"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <StatCard
          icon={Activity}
          label="Fraud Rate"
          value={`${analytics.fraudRate.toFixed(1)}%`}
          trend="down"
          trendValue="-1.2%"
          tone="orange"
          helper="% of claims flagged"
        />
        <StatCard
          icon={Target}
          label="Avg Fraud Score"
          value={`${(analytics.avgFraudScore * 100).toFixed(1)}%`}
          tone="cyan"
          helper="Average risk score"
        />
        <StatCard
          icon={Users}
          label="Active Patients"
          value={formatNumber(analytics.totalPatients)}
          tone="teal"
          helper="Registered patients"
        />
        <StatCard
          icon={Building2}
          label="Active Providers"
          value={formatNumber(analytics.totalProviders)}
          tone="indigo"
          helper="Registered providers"
        />
        <StatCard
          icon={FileText}
          label="Active Policies"
          value={formatNumber(analytics.totalPolicies)}
          tone="slate"
          helper="Active policies"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ChartCard
          title="Monthly Claims Volume"
          subtitle="Claims and fraud cases over time"
          icon={TrendingUp}
          className="lg:col-span-2"
        >
          <Line
            data={monthlyChartData}
            options={{
              ...chartOptions,
              plugins: { legend: { display: true, position: 'top', labels: { color: '#64748b', boxWidth: 10 } } },
            }}
          />
        </ChartCard>

        <ChartCard
          title="Claim Status Distribution"
          subtitle="Current status breakdown"
          icon={Activity}
        >
          <Doughnut
            data={claimStatusChartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              animation: { duration: 700 },
              plugins: { legend: { position: 'bottom', labels: { color: '#64748b', boxWidth: 10 } } },
            }}
          />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard
          title="Top Fraud Providers"
          subtitle="Providers with most fraud claims"
          icon={Building2}
        >
          <Bar
            data={fraudByProviderChartData}
            options={{
              ...chartOptions,
              plugins: { legend: { display: true, position: 'top', labels: { color: '#64748b', boxWidth: 10 } } },
              scales: {
                x: { grid: { display: false } },
                y: { beginAtZero: true },
              },
            }}
          />
        </ChartCard>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h3 className="flex items-center gap-2 text-sm font-black text-textPrimary">
            <span className="rounded-lg bg-warning/10 p-1.5 text-warning">
              <Activity size={15} />
            </span>
            Key Performance Indicators
          </h3>
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-border bg-bg/50 p-4">
              <p className="text-[11px] font-black uppercase tracking-widest text-textSecondary">Avg. Claim Cost</p>
              <p className="mt-2 text-xl font-black text-textPrimary">
                {formatCurrency(analytics.avgClaimAmount)}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-bg/50 p-4">
              <p className="text-[11px] font-black uppercase tracking-widest text-textSecondary">Fraud Rate</p>
              <p className="mt-2 text-xl font-black text-red-500">
                {`${analytics.fraudRate.toFixed(1)}%`}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-bg/50 p-4">
              <p className="text-[11px] font-black uppercase tracking-widest text-textSecondary">Total Premium</p>
              <p className="mt-2 text-xl font-black text-textPrimary">
                {formatCompactCurrency(analytics.totalPremium)}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-bg/50 p-4">
              <p className="text-[11px] font-black uppercase tracking-widest text-textSecondary">Total Copay</p>
              <p className="mt-2 text-xl font-black text-orange-500">
                {formatCompactCurrency(analytics.totalCopay)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

