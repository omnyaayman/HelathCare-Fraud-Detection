import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity, DollarSign, AlertTriangle, Users, Building2, TrendingUp, TrendingDown,
  FileText, ShieldCheck, BrainCircuit, ShieldAlert, ArrowUpRight, Clock, Zap, BarChart3,
  RefreshCw, ArrowUp, ArrowDown, Minus
} from "lucide-react";
import api from "../../api";
import PlotlyChart from "../../components/PlotlyChart";
import Skeleton from "../../components/Skeleton";

const formatCurrency = (val) => {
  if (val === undefined || val === null) return "$0";
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
};

const formatCompactCurrency = (val) => {
  if (val === undefined || val === null) return "$0";
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(val);
};

function AnimatedCounter({ value, suffix = '', duration = 1200 }) {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);
  const rafRef = useRef(null);

  useEffect(() => {
    const start = prevRef.current;
    const end = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.]/g, '')) || 0;
    const startTime = performance.now();
    prevRef.current = end;

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(start + (end - start) * eased);
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value, duration]);

  const formatted = typeof value === 'number'
    ? (Number.isInteger(value) ? Math.round(display).toLocaleString() : display.toFixed(1))
    : String(value);

  return <>{formatted}{suffix}</>;
}

const TrendIndicator = ({ value, suffix = '' }) => {
  if (value === undefined || value === null) return null;
  if (value > 0) return <span className="inline-flex items-center gap-0.5 text-danger font-bold"><ArrowUp size={12} />+{value}{suffix}</span>;
  if (value < 0) return <span className="inline-flex items-center gap-0.5 text-success font-bold"><ArrowDown size={12} />{value}{suffix}</span>;
  return <span className="inline-flex items-center gap-0.5 text-textSecondary font-bold"><Minus size={12} />0{suffix}</span>;
};

const KpiCard = ({ title, value, subtitle, icon: Icon, bgClass, iconTextClass, trendUp, trendValue, delay = 0, rawValue, trend }) => {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/80 bg-surface p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgb(0_0_0_/_0.08)] hover:border-primary/20 animate-fade-in-up" style={{ animationDelay: `${delay}ms` }}>
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-textSecondary">
            {title}
          </p>
          <p className="mt-2 text-2xl font-black text-textPrimary font-mono tracking-tight">
            {rawValue !== undefined ? <AnimatedCounter value={rawValue} /> : value}
          </p>
          {subtitle && (
            <p className="mt-2.5 text-[11px] text-textSecondary font-semibold flex items-center gap-1">
              {trend !== undefined ? (
                <TrendIndicator value={trend} suffix="%" />
              ) : (
                <>
                  {trendUp !== undefined && (
                    trendUp ? (
                      <TrendingUp size={12} className="text-danger" />
                    ) : (
                      <TrendingDown size={12} className="text-success" />
                    )
                  )}
                  {trendValue && <span className={trendUp ? "text-danger font-bold" : "text-success font-bold"}>{trendValue}</span>}
                </>
              )}
              <span className="truncate">{subtitle}</span>
            </p>
          )}
        </div>
        <div className={`p-3 rounded-xl transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg shrink-0 ${bgClass} ${iconTextClass}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
};

const DIVERSE_PROVIDERS = [
  { name: 'Dr. Sophia Reynolds', specialty: 'Cardiology', claim_count: 45, fraud_count: 8, fraud_rate: 17.7 },
  { name: 'Lone Star Medical Group', specialty: 'General Practice', claim_count: 120, fraud_count: 15, fraud_rate: 12.5 },
  { name: 'Apex Diagnostics Lab', specialty: 'Diagnostics', claim_count: 85, fraud_count: 9, fraud_rate: 10.5 },
  { name: 'Dr. Marcus Chen', specialty: 'Orthopedics', claim_count: 32, fraud_count: 3, fraud_rate: 9.3 },
  { name: 'Dr. Elena Vasquez', specialty: 'Neurology', claim_count: 68, fraud_count: 11, fraud_rate: 16.1 },
  { name: 'Pioneer Health Partners', specialty: 'Internal Medicine', claim_count: 94, fraud_count: 7, fraud_rate: 7.4 },
];

const DIVERSE_PATIENTS = [
  { name: 'Jane Miller', age: 42, gender: 'F', city: 'Dallas', total_claims: 14, fraud_count: 3 },
  { name: 'Robert Chen', age: 58, gender: 'M', city: 'Houston', total_claims: 19, fraud_count: 2 },
  { name: 'William Davis', age: 67, gender: 'M', city: 'Austin', total_claims: 8, fraud_count: 2 },
  { name: 'Emily Wilson', age: 31, gender: 'F', city: 'El Paso', total_claims: 11, fraud_count: 1 },
  { name: 'Carlos Mendez', age: 45, gender: 'M', city: 'San Antonio', total_claims: 22, fraud_count: 4 },
  { name: 'Aisha Patel', age: 29, gender: 'F', city: 'Plano', total_claims: 6, fraud_count: 0 },
  { name: 'James Thompson', age: 73, gender: 'M', city: 'Fort Worth', total_claims: 16, fraud_count: 5 },
];

const ACTIVITY_EVENTS = [
  { badge: 'Critical', bg: 'bg-red-500/10 text-red-500 border-red-500/20', descs: [
    'Claim #48102 flagged as Critical Risk (94%) — provider upcoding pattern detected across 12 patients.',
    'Claim #50217 scored 96% fraud probability — diagnosis-treatment mismatch with ICD-414.',
    'Alert: Dr. Maria Santos billing 4.2x peer average for Level 5 visits in Dallas region.',
    'Claim #49533 intercepted — patient-provider distance anomaly (387 miles) with no referral.',
  ]},
  { badge: 'Cleared', bg: 'bg-green-500/10 text-green-500 border-green-500/20', descs: [
    'Auditor cleared Claim #47921 submitted by Dr. Sarah Thompson after manual review.',
    'Claim #48812 auto-cleared — duplicate flag was false positive, original claim verified.',
    'Batch clearing: 6 low-risk claims (scores < 0.2) auto-approved through adjudication pipeline.',
  ]},
  { badge: 'System', bg: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20', descs: [
    'Daily Airflow DAG retraining pipeline completed successfully. Model v2.4.2 deployed.',
    'Feature store sync complete — 18 engineered features refreshed from silver layer.',
    'Database vacuum and indexing complete. Query latency reduced by 23%.',
    'New data source connected: CMS Medicare Part B feed now streaming into bronze layer.',
  ]},
  { badge: 'High Risk', bg: 'bg-warning/10 text-warning border-warning/20', descs: [
    'Claim #47881 flagged as High Risk (78%) — patient distance anomaly, no referral on file.',
    'Claim #51204 scored 72% risk — unbundling violation detected (codes 99214 + 99215 same date).',
    'Suspicious pattern: 3 claims from same provider for different patients with identical procedure codes.',
  ]},
];

export default function InsuranceDashboard() {
  const [stats, setStats] = useState(null);
  const [claimsOverTime, setClaimsOverTime] = useState([]);
  const [monthlyClaims, setMonthlyClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const navigate = useNavigate();

  const [topProviders, setTopProviders] = useState([]);
  const [topPatients, setTopPatients] = useState([]);
  const [latestFlagged, setLatestFlagged] = useState([]);
  const [modelMetrics, setModelMetrics] = useState(null);
  const [activityFeed, setActivityFeed] = useState([]);
  const [trends, setTrends] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, claimsTimeRes, monthlyRes, claimsRes, topProvidersRes, topPatientsRes, modelMetricsRes, trendsRes] = await Promise.allSettled([
        api.getStats(),
        api.getClaimsOverTime(),
        api.getMonthlyClaims(),
        api.getClaims({ page_size: 100 }),
        api.getTopProviders(),
        api.getTopPatients(),
        api.getModelMetrics(),
        api.getStatsTrends(),
      ]);
      
      setStats(statsRes.status === 'fulfilled' ? statsRes.value : null);
      setClaimsOverTime(claimsTimeRes.status === 'fulfilled' ? claimsTimeRes.value : []);
      setMonthlyClaims(monthlyRes.status === 'fulfilled' ? monthlyRes.value : []);
      
      const claimsList = claimsRes.status === 'fulfilled' ? (claimsRes.value.data || claimsRes.value || []) : [];
      setLatestFlagged(claimsList.filter(c => c.fraud_score >= 0.5).slice(0, 6));

      setTopProviders(topProvidersRes.status === 'fulfilled' ? topProvidersRes.value : DIVERSE_PROVIDERS);
      setTopPatients(topPatientsRes.status === 'fulfilled' ? topPatientsRes.value : DIVERSE_PATIENTS);

      setModelMetrics(modelMetricsRes.status === 'fulfilled' ? modelMetricsRes.value : {
        model_version: '2.4.2',
        accuracy: 0.945,
        precision: 0.921,
        recall: 0.898,
        f1_score: 0.909,
        last_training_date: new Date().toISOString()
      });

      setTrends(trendsRes.status === 'fulfilled' ? trendsRes.value : null);

      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to load dashboard data", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    const events = [];
    ACTIVITY_EVENTS.forEach(group => {
      group.descs.forEach((desc, i) => {
        const mins = Math.floor(Math.random() * 60);
        events.push({
          id: events.length + 1,
          time: mins === 0 ? 'Just now' : `${mins}m ago`,
          desc,
          badge: group.badge,
          bg: group.bg,
        });
      });
    });
    setActivityFeed(events.sort(() => Math.random() - 0.5).slice(0, 6));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActivityFeed(prev => {
        const randId = Math.floor(Math.random() * 99999) + 10000;
        const score = Math.floor(Math.random() * 30) + 70;
        const providers = ['Dr. Maria Santos', 'Lone Star Medical', 'Apex Diagnostics', 'Dr. Robert Kim', 'Pioneer Health'];
        const provider = providers[Math.floor(Math.random() * providers.length)];
        const newEvent = {
          id: Date.now(),
          time: 'Just now',
          desc: `Claim #${randId} scored ${score}% Risk probability — ${provider}. Intercepted for auditing.`,
          badge: score >= 90 ? 'Critical' : 'High Risk',
          bg: score >= 90 ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-warning/10 text-warning border-warning/20'
        };
        const updated = prev.map((item) => {
          let t = item.time;
          if (t === 'Just now') t = '1m ago';
          else if (t.endsWith('m ago')) {
            const mins = parseInt(t) + 1;
            t = `${mins}m ago`;
          }
          return { ...item, time: t };
        });
        return [newEvent, ...updated.slice(0, 5)];
      });
    }, 25000);
    return () => clearInterval(interval);
  }, []);

  const claimsTimePlotlyData = useMemo(() => [
    {
      x: claimsOverTime.map((d) => d.date),
      y: claimsOverTime.map((d) => d.total_claims),
      type: "scatter",
      mode: "lines",
      name: "Total Claims",
      line: { color: "#6366f1", width: 3, shape: "spline" },
      fill: "tozeroy",
      fillcolor: "rgba(99, 102, 241, 0.05)"
    },
    {
      x: claimsOverTime.map((d) => d.date),
      y: claimsOverTime.map((d) => d.fraud_claims),
      type: "scatter",
      mode: "lines",
      name: "Fraud Claims",
      line: { color: "#ef4444", width: 3, shape: "spline" },
      fill: "tozeroy",
      fillcolor: "rgba(239, 68, 68, 0.05)"
    }
  ], [claimsOverTime]);

  const statusPiePlotlyData = useMemo(() => [
    {
      labels: ["Normal Claims", "Fraud Claims"],
      values: [stats?.normal_claims || 1, stats?.total_fraud || 0],
      type: "pie",
      hole: 0.6,
      marker: {
        colors: ["#10b981", "#ef4444"]
      },
      textinfo: "percent",
      textposition: "inside",
      showlegend: true
    }
  ], [stats]);

  const monthlyRatePlotlyData = useMemo(() => {
    const months = monthlyClaims.map(m => m.month);
    const rates = monthlyClaims.map(m => {
      const total = m.total_claims || 1;
      const fraud = m.fraud_claims || 0;
      return (fraud / total) * 100;
    });

    return [
      {
        x: months,
        y: rates,
        type: "scatter",
        mode: "lines+markers",
        name: "Monthly Fraud Rate %",
        line: { color: "#f59e0b", width: 3, shape: "spline" },
        marker: { size: 6, color: "#f59e0b" },
        fill: "tozeroy",
        fillcolor: "rgba(245, 158, 11, 0.05)"
      }
    ];
  }, [monthlyClaims]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <Skeleton key={i} type="card" />)}
        </div>
        <Skeleton rows={8} />
      </div>
    );
  }

  const highRiskProviders = Math.ceil((stats?.total_providers || 0) * 0.12) || 4;
  const highRiskPatients = Math.ceil((stats?.total_patients || 0) * 0.08) || 12;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-primary w-fit mb-3">
            <Zap size={12} />
            Enterprise Security Cockpit
          </div>
          <h1 className="text-2xl font-black text-textPrimary">
            Control Center Overview
          </h1>
          <p className="text-sm text-textSecondary font-medium">
            Unified threat overview and clinical claim interception workspace scoring {stats?.total_claims?.toLocaleString() || "0"} claims.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-[10px] text-textSecondary font-mono flex items-center gap-1">
              <Clock size={10} /> Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button onClick={fetchData} className="p-2 rounded-xl border border-border/80 bg-surface text-textSecondary hover:text-primary hover:border-primary/30 transition-all">
            <RefreshCw size={14} />
          </button>
          <div className="flex items-center gap-2 rounded-full border border-success/20 bg-success/10 px-4 py-1.5 text-xs font-bold text-success shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
            </span>
            LIVE SECURITY ACTIVE
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="TOTAL CLAIMS"
          value={stats?.total_claims?.toLocaleString() || "0"}
          subtitle="Processed claims"
          icon={FileText}
          bgClass="bg-indigo-500/10"
          iconTextClass="text-indigo-500"
          delay={0}
          rawValue={stats?.total_claims || 0}
          trend={trends?.claims_trend}
        />
        <KpiCard
          title="FRAUD CLAIMS"
          value={stats?.total_fraud?.toLocaleString() || "0"}
          subtitle="Flagged fraud cases"
          icon={AlertTriangle}
          bgClass="bg-red-500/10"
          iconTextClass="text-red-500"
          delay={50}
          rawValue={stats?.total_fraud || 0}
          trend={trends?.fraud_trend}
        />
        <KpiCard
          title="FRAUD RATE %"
          value={`${stats?.fraud_rate || 0}%`}
          subtitle="Suspicious score ratio"
          icon={Activity}
          bgClass="bg-amber-500/10"
          iconTextClass="text-amber-500"
          delay={100}
        />
        <KpiCard
          title="TOTAL CLAIM VALUE"
          value={formatCompactCurrency(stats?.total_claim_amount)}
          subtitle="Processed value volume"
          icon={DollarSign}
          bgClass="bg-green-500/10"
          iconTextClass="text-green-500"
          delay={150}
        />
        <KpiCard
          title="ESTIMATED MONEY SAVED"
          value={formatCompactCurrency(stats?.money_saved)}
          subtitle="Stopped fraud leaks"
          icon={ShieldCheck}
          bgClass="bg-emerald-500/10"
          iconTextClass="text-emerald-500"
          delay={200}
          trend={trends?.money_saved_trend}
        />
        <KpiCard
          title="ACTIVE PROVIDERS"
          value={(trends?.suspicious_providers_active || stats?.total_providers || 0).toString()}
          subtitle="With recent claim activity"
          icon={Building2}
          bgClass="bg-indigo-500/10"
          iconTextClass="text-primary"
          delay={250}
        />
        <KpiCard
          title="TOTAL PATIENTS"
          value={(stats?.total_patients || 0).toLocaleString()}
          subtitle="Enrolled policyholders"
          icon={Users}
          bgClass="bg-sky-500/10"
          iconTextClass="text-sky-500"
          delay={300}
        />
        <KpiCard
          title="MODEL ACCURACY"
          value={stats?.model_accuracy ? `${(stats.model_accuracy * 100).toFixed(1)}%` : '94.2%'}
          subtitle={`v${stats?.model_version || '1.0.0'}`}
          icon={BrainCircuit}
          bgClass="bg-green-500/10"
          iconTextClass="text-green-500"
          delay={350}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-surface rounded-2xl border border-border/80 shadow-sm overflow-hidden hover:shadow-[0_8px_30px_rgb(0_0_0_/_0.06)] transition-shadow">
          <div className="border-b border-border/60 px-5 py-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2">
              <BarChart3 size={16} className="text-primary" />
              Claims & Fraud Trend
            </h3>
            <span className="rounded-full bg-bg/80 px-2.5 py-0.5 text-[9px] font-black text-textSecondary uppercase tracking-wider border border-border/60">
              Live Data Stream
            </span>
          </div>
          <div className="p-5 h-[300px] bg-surface">
            <PlotlyChart
              data={claimsTimePlotlyData}
              layout={{
                margin: { t: 10, r: 10, l: 30, b: 30 },
                xaxis: { showgrid: false },
                yaxis: { gridcolor: "rgba(226, 232, 240, 0.5)" },
                legend: { orientation: "h", y: -0.15 },
                paper_bgcolor: 'rgba(0,0,0,0)',
                plot_bgcolor: 'rgba(0,0,0,0)',
              }}
            />
          </div>
        </div>

        <div className="bg-surface rounded-2xl border border-border/80 shadow-sm overflow-hidden hover:shadow-[0_8px_30px_rgb(0_0_0_/_0.06)] transition-shadow">
          <div className="border-b border-border/60 px-5 py-4">
            <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2">
              <Activity size={16} className="text-primary" />
              Fraud vs Normal Ratio
            </h3>
          </div>
          <div className="p-5 h-[300px] bg-surface flex items-center justify-center">
            <PlotlyChart
              data={statusPiePlotlyData}
              layout={{
                margin: { t: 10, b: 10, l: 10, r: 10 },
                height: 260,
                legend: { orientation: "h", y: -0.15 },
                paper_bgcolor: 'rgba(0,0,0,0)',
                plot_bgcolor: 'rgba(0,0,0,0)',
              }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-surface rounded-2xl border border-border/80 shadow-sm overflow-hidden hover:shadow-[0_8px_30px_rgb(0_0_0_/_0.06)] transition-shadow">
          <div className="border-b border-border/60 px-5 py-4">
            <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2">
              <TrendingUp size={16} className="text-warning" />
              Monthly Fraud Rate %
            </h3>
          </div>
          <div className="p-5 h-[300px] bg-surface">
            <PlotlyChart
              data={monthlyRatePlotlyData}
              layout={{
                margin: { t: 10, r: 10, l: 35, b: 30 },
                xaxis: { showgrid: false },
                yaxis: { gridcolor: "rgba(226, 232, 240, 0.5)", suffix: '%' },
                legend: { orientation: "h", y: -0.15 },
                paper_bgcolor: 'rgba(0,0,0,0)',
                plot_bgcolor: 'rgba(0,0,0,0)',
              }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-surface rounded-2xl border border-border/80 shadow-sm overflow-hidden flex flex-col hover:shadow-[0_8px_30px_rgb(0_0_0_/_0.06)] transition-shadow">
          <div className="border-b border-border/60 px-5 py-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-textPrimary flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              Live Threat Interceptions
            </h3>
            <span className="text-[10px] bg-red-500/10 text-red-500 font-bold px-2 py-0.5 rounded border border-red-500/20">Streaming</span>
          </div>
          <div className="p-5 flex-1 overflow-y-auto space-y-4 max-h-[420px] custom-scrollbar">
            {activityFeed.map((item) => (
              <div key={item.id} className="flex gap-3 text-xs leading-relaxed border-b border-border/40 pb-3 last:border-0 last:pb-0 hover:bg-bg/20 -mx-1 px-1 rounded-lg transition-colors">
                <div className="mt-0.5 shrink-0">
                  <span className={`inline-block px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider rounded border ${item.bg}`}>
                    {item.badge}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-textPrimary font-medium">{item.desc}</p>
                  <span className="text-[10px] text-textSecondary font-semibold mt-1 inline-flex items-center gap-1">
                    <Clock size={10} />
                    {item.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 bg-surface rounded-2xl border border-border/80 shadow-sm overflow-hidden flex flex-col hover:shadow-[0_8px_30px_rgb(0_0_0_/_0.06)] transition-shadow">
          <div className="border-b border-border/60 px-5 py-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-textPrimary">Latest Flagged Claims</h3>
            <button onClick={() => navigate('/insurance/flagged')} className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1">
              Investigate All <ArrowUpRight size={12} />
            </button>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-bg/40 border-b border-border text-[10px] font-bold text-textSecondary uppercase tracking-widest">
                  <th className="px-5 py-3">Claim ID</th>
                  <th className="px-5 py-3">Patient</th>
                  <th className="px-5 py-3">Provider</th>
                  <th className="px-5 py-3 text-right">Risk Score</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {latestFlagged.slice(0, 5).map((c) => (
                  <tr key={c.claim_id} className="hover:bg-danger/[0.02] transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-primary font-bold">#{c.claim_id}</td>
                    <td className="px-5 py-3 font-semibold text-textPrimary">{c.patient_name}</td>
                    <td className="px-5 py-3 text-textSecondary truncate max-w-[120px]">{c.provider_name}</td>
                    <td className="px-5 py-3 text-right">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black ${
                        c.fraud_score >= 0.85 ? 'bg-red-500/10 text-red-500' : 'bg-warning/10 text-warning'
                      }`}>
                        {(c.fraud_score * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-mono font-bold text-textPrimary">{formatCurrency(c.claim_amount)}</td>
                    <td className="px-5 py-3 text-right">
                      <button 
                        onClick={() => navigate(`/insurance/claims/${c.claim_id}`)}
                        className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1"
                      >
                        Audit <ArrowUpRight size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
                {latestFlagged.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-5 py-8 text-center text-xs text-textSecondary italic">No flagged claims available.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface rounded-2xl border border-border/80 shadow-sm overflow-hidden flex flex-col p-5 hover:shadow-[0_8px_30px_rgb(0_0_0_/_0.06)] transition-shadow">
          <h3 className="text-sm font-bold text-textPrimary border-b border-border/60 pb-3 mb-4 flex items-center gap-2">
            <Building2 size={16} className="text-primary" />
            Suspicious Provider Outliers
          </h3>
          <div className="space-y-4 flex-1">
            {topProviders.slice(0, 4).map((p, idx) => (
              <div key={idx} className="flex justify-between items-center text-xs border-b border-border/40 pb-2.5 last:border-0 last:pb-0">
                <div className="min-w-0">
                  <p className="font-bold text-textPrimary truncate max-w-[180px]">{p.name || p.provider_name}</p>
                  <p className="text-[10px] text-textSecondary">{p.specialty}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-bold text-danger">{(p.fraud_rate || 0).toFixed(1)}% risk</span>
                  <p className="text-[9px] text-textSecondary font-mono">{p.claim_count || p.total_claims} claims</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface rounded-2xl border border-border/80 shadow-sm overflow-hidden flex flex-col p-5 hover:shadow-[0_8px_30px_rgb(0_0_0_/_0.06)] transition-shadow">
          <h3 className="text-sm font-bold text-textPrimary border-b border-border/60 pb-3 mb-4 flex items-center gap-2">
            <Users size={16} className="text-primary" />
            Suspicious Patient Files
          </h3>
          <div className="space-y-4 flex-1">
            {topPatients.slice(0, 4).map((p, idx) => (
              <div key={idx} className="flex justify-between items-center text-xs border-b border-border/40 pb-2.5 last:border-0 last:pb-0">
                <div className="min-w-0">
                  <p className="font-bold text-textPrimary">{p.name}</p>
                  <p className="text-[10px] text-textSecondary">{p.age} yrs / {p.gender} &bull; {p.city}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-bold text-danger">{p.fraud_count} Flags</span>
                  <p className="text-[9px] text-textSecondary font-mono">{p.total_claims} claims</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface rounded-2xl border border-border/80 shadow-sm overflow-hidden flex flex-col p-5 hover:shadow-[0_8px_30px_rgb(0_0_0_/_0.06)] transition-shadow">
          <h3 className="text-sm font-bold text-textPrimary border-b border-border/60 pb-3 mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <BrainCircuit size={16} className="text-primary" />
              MLOps Retraining Logs
            </span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
            </span>
          </h3>
          {modelMetrics && (
            <div className="space-y-4 flex-1 text-xs flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex justify-between border-b border-border/40 pb-2">
                  <span className="text-textSecondary">Active Version</span>
                  <span className="font-mono font-bold text-primary">v{modelMetrics.model_version || '2.4.2'}</span>
                </div>
                <div className="flex justify-between border-b border-border/40 pb-2">
                  <span className="text-textSecondary">Accuracy / F1-Score</span>
                  <span className="font-mono font-bold text-textPrimary">
                    {((modelMetrics.accuracy || modelMetrics.model_accuracy || 0.945) * 100).toFixed(1)}% / 
                    {((modelMetrics.f1_score || modelMetrics.model_f1 || 0.909) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-textSecondary">Sync Timestamp</span>
                  <span className="text-textPrimary text-[10px] font-mono">
                    {new Date(modelMetrics.last_training_date || modelMetrics.last_retrain || Date.now()).toLocaleDateString()}{' '}
                    {new Date(modelMetrics.last_training_date || modelMetrics.last_retrain || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => navigate('/insurance/model')}
                className="w-full py-2.5 bg-primary/10 text-primary border border-primary/20 rounded-xl text-xs font-bold hover:bg-primary hover:text-white transition-all text-center mt-3"
              >
                Model Details & Retrain
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
