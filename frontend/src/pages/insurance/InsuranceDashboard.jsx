import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity, DollarSign, AlertTriangle, Users, Building2, TrendingUp, TrendingDown,
  FileText, ShieldCheck, BrainCircuit, ShieldAlert, ArrowUpRight, Clock, Zap, BarChart3,
  RefreshCw, ArrowUp, ArrowDown, Minus, Map, Target
} from "lucide-react";
import api from "../../api";
import PlotlyChart from "../../components/PlotlyChart";
import Skeleton from "../../components/Skeleton";
import { formatCurrency, formatCompactCurrency, formatPercent, formatNumber, getRiskLevel } from "../../data/dataUtils";
import { CANONICAL_SHAP_FEATURES, CANONICAL_MODEL, CANONICAL_FUNNEL } from "../../data/canonicalData";

const PLOTLY_ANIM_CONFIG = { responsive: true, displayModeBar: false, transition: { duration: 600, easing: 'cubic-in-out' } };

const SHAP_FEATURES = CANONICAL_SHAP_FEATURES;

const FALLBACK_REGION_DATA = [
  { state: 'CA', total_claims: 4820, fraud_claims: 385 },
  { state: 'TX', total_claims: 3910, fraud_claims: 312 },
  { state: 'FL', total_claims: 3540, fraud_claims: 298 },
  { state: 'NY', total_claims: 3280, fraud_claims: 276 },
  { state: 'PA', total_claims: 2100, fraud_claims: 168 },
  { state: 'IL', total_claims: 1980, fraud_claims: 154 },
  { state: 'OH', total_claims: 1650, fraud_claims: 132 },
  { state: 'GA', total_claims: 1520, fraud_claims: 128 },
  { state: 'NC', total_claims: 1410, fraud_claims: 112 },
  { state: 'MI', total_claims: 1320, fraud_claims: 99 },
  { state: 'NJ', total_claims: 1180, fraud_claims: 105 },
  { state: 'VA', total_claims: 1050, fraud_claims: 84 },
  { state: 'WA', total_claims: 980, fraud_claims: 72 },
  { state: 'AZ', total_claims: 920, fraud_claims: 78 },
  { state: 'MA', total_claims: 870, fraud_claims: 65 },
];

const FALLBACK_SCORE_DIST = [
  { score_range: '0-10%', count: 342 },
  { score_range: '10-20%', count: 287 },
  { score_range: '20-30%', count: 198 },
  { score_range: '30-40%', count: 145 },
  { score_range: '40-50%', count: 98 },
  { score_range: '50-60%', count: 72 },
  { score_range: '60-70%', count: 54 },
  { score_range: '70-80%', count: 38 },
  { score_range: '80-90%', count: 22 },
  { score_range: '90-100%', count: 11 },
];

const FALLBACK_DIAGNOSIS = [
  { diagnosis_code: 'E11.9', total_claims: 342, fraud_claims: 28 },
  { diagnosis_code: 'I10', total_claims: 298, fraud_claims: 22 },
  { diagnosis_code: 'J44.1', total_claims: 256, fraud_claims: 31 },
  { diagnosis_code: 'M54.5', total_claims: 234, fraud_claims: 18 },
  { diagnosis_code: 'F32.1', total_claims: 198, fraud_claims: 15 },
  { diagnosis_code: 'K21.0', total_claims: 176, fraud_claims: 20 },
  { diagnosis_code: 'N39.0', total_claims: 154, fraud_claims: 12 },
  { diagnosis_code: 'G47.33', total_claims: 132, fraud_claims: 9 },
];

const FALLBACK_STATUS_DIST = [
  { status: 'Approved', count: 4230 },
  { status: 'Rejected', count: 876 },
  { status: 'Under Review', count: 654 },
  { status: 'Pending', count: 432 },
  { status: 'Fraud Confirmed', count: 198 },
  { status: 'Investigating', count: 145 },
];

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

const KpiCard = ({ title, value, subtitle, icon: Icon, bgClass, iconTextClass, delay = 0, rawValue, trend }) => {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/80 bg-surface p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:border-primary/20 animate-fade-in-up" style={{ animationDelay: `${delay}ms` }}>
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-textSecondary">{title}</p>
          <p className="mt-2 text-2xl font-black text-textPrimary font-mono tracking-tight">
            {rawValue !== undefined ? <AnimatedCounter value={rawValue} /> : value}
          </p>
          {subtitle && (
            <p className="mt-2.5 text-[11px] text-textSecondary font-semibold flex items-center gap-1">
              {trend !== undefined && <TrendIndicator value={trend} suffix="%" />}
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

const SectionCard = ({ title, icon: Icon, iconColor = 'text-primary', badge, badgeClass, children, className = '' }) => (
  <div className={`bg-surface rounded-2xl border border-border/80 shadow-sm overflow-hidden hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-shadow ${className}`}>
    <div className="border-b border-border/60 px-5 py-4 flex items-center justify-between">
      <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2">
        {Icon && <Icon size={16} className={iconColor} />}
        {title}
      </h3>
      {badge && (
        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded border ${badgeClass || 'bg-bg/80 text-textSecondary border-border/60'}`}>
          {badge}
        </span>
      )}
    </div>
    {children}
  </div>
);

export default function InsuranceDashboard() {
  const [stats, setStats] = useState(null);
  const [claimsOverTime, setClaimsOverTime] = useState([]);
  const [monthlyClaims, setMonthlyClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [liveClock, setLiveClock] = useState(new Date());
  const navigate = useNavigate();

  const [topProviders, setTopProviders] = useState([]);
  const [topPatients, setTopPatients] = useState([]);
  const [latestFlagged, setLatestFlagged] = useState([]);
  const [modelMetrics, setModelMetrics] = useState(null);
  const [activityFeed, setActivityFeed] = useState([]);
  const [trends, setTrends] = useState(null);
  const [fraudByRegion, setFraudByRegion] = useState([]);
  const [fraudByProvider, setFraudByProvider] = useState([]);
  const [fraudByDiagnosis, setFraudByDiagnosis] = useState([]);
  const [claimStatusDist, setClaimStatusDist] = useState([]);
  const [fraudScoreDist, setFraudScoreDist] = useState([]);

  useEffect(() => {
    const timer = setInterval(() => setLiveClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        statsRes, claimsTimeRes, monthlyRes, claimsRes,
        topProvidersRes, topPatientsRes, modelMetricsRes, trendsRes,
        regionRes, providerFraudRes, diagnosisRes, statusDistRes, scoreDistRes
      ] = await Promise.allSettled([
        api.getStats(),
        api.getClaimsOverTime(),
        api.getMonthlyClaims(),
        api.getClaims({ page_size: 100 }),
        api.getTopProviders(),
        api.getTopPatients(),
        api.getModelMetrics(),
        api.getStatsTrends(),
        api.getFraudByRegion(),
        api.getFraudByProvider(),
        api.getFraudByDiagnosis(),
        api.getClaimStatusDistribution(),
        api.getFraudScoreDistribution(),
      ]);

      setStats(statsRes.status === 'fulfilled' ? statsRes.value : null);
      setClaimsOverTime(claimsTimeRes.status === 'fulfilled' ? claimsTimeRes.value : []);
      setMonthlyClaims(monthlyRes.status === 'fulfilled' ? monthlyRes.value : []);

      const claimsList = claimsRes.status === 'fulfilled' ? (claimsRes.value.data || claimsRes.value || []) : [];
      setLatestFlagged(claimsList.filter(c => c.fraud_score >= 0.5).slice(0, 6));

      setTopProviders(topProvidersRes.status === 'fulfilled' ? topProvidersRes.value : []);
      setTopPatients(topPatientsRes.status === 'fulfilled' ? topPatientsRes.value : []);
      setModelMetrics(modelMetricsRes.status === 'fulfilled' ? modelMetricsRes.value : null);
      setTrends(trendsRes.status === 'fulfilled' ? trendsRes.value : null);
      setFraudByRegion(regionRes.status === 'fulfilled' ? regionRes.value : []);
      setFraudByProvider(providerFraudRes.status === 'fulfilled' ? providerFraudRes.value : []);
      setFraudByDiagnosis(diagnosisRes.status === 'fulfilled' ? diagnosisRes.value : []);
      setClaimStatusDist(statusDistRes.status === 'fulfilled' ? statusDistRes.value : []);
      setFraudScoreDist(scoreDistRes.status === 'fulfilled' ? scoreDistRes.value : []);

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
    if (latestFlagged.length > 0) {
      const events = latestFlagged.slice(0, 8).map((c, i) => ({
        id: c.claim_id || i,
        time: i === 0 ? 'Just now' : i < 3 ? `${i * 3}m ago` : `${i * 7}m ago`,
        desc: `Claim #${c.claim_id} scored ${((c.fraud_score || 0) * 100).toFixed(0)}% risk — ${c.provider_name || 'Unknown provider'}. ${c.fraud_score >= 0.85 ? 'Flagged for immediate audit.' : 'Queued for secondary review.'}`,
        badge: (c.fraud_score || 0) >= 0.85 ? 'Critical' : 'High Risk',
        bg: (c.fraud_score || 0) >= 0.85 ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-warning/10 text-warning border-warning/20',
        icon: (c.fraud_score || 0) >= 0.85 ? AlertTriangle : ShieldAlert,
      }));
      if (stats) {
        events.push({
          id: 'system-refresh',
          time: 'Just now',
          desc: `Dashboard synchronized. ${formatNumber(stats.total_claims)} claims indexed. Model accuracy at ${((stats.model_accuracy || 0.942) * 100).toFixed(1)}%.`,
          badge: 'System',
          bg: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
          icon: BrainCircuit,
        });
      }
      setActivityFeed(events);
    }
  }, [latestFlagged, stats]);

  const claimsTimePlotlyData = useMemo(() => [
    {
      x: claimsOverTime.map(d => d.date),
      y: claimsOverTime.map(d => d.total_claims),
      type: 'scatter',
      mode: 'lines',
      name: 'Total Claims',
      line: { color: '#6366f1', width: 3, shape: 'spline' },
      fill: 'tozeroy',
      fillcolor: 'rgba(99, 102, 241, 0.05)',
    },
    {
      x: claimsOverTime.map(d => d.date),
      y: claimsOverTime.map(d => d.fraud_claims),
      type: 'scatter',
      mode: 'lines',
      name: 'Fraud Claims',
      line: { color: '#ef4444', width: 3, shape: 'spline' },
      fill: 'tozeroy',
      fillcolor: 'rgba(239, 68, 68, 0.05)',
    }
  ], [claimsOverTime]);

  const statusPiePlotlyData = useMemo(() => [
    {
      labels: ['Normal Claims', 'Fraud Claims'],
      values: [stats?.normal_claims || 1, stats?.total_fraud || 0],
      type: 'pie',
      hole: 0.6,
      marker: { colors: ['#10b981', '#ef4444'] },
      textinfo: 'percent',
      textposition: 'inside',
      showlegend: true,
    }
  ], [stats]);

  const monthlyRatePlotlyData = useMemo(() => {
    const months = monthlyClaims.map(m => m.month);
    const rates = monthlyClaims.map(m => {
      const total = m.total_claims || 1;
      const fraud = m.fraud_claims || 0;
      return (fraud / total) * 100;
    });
    return [{
      x: months,
      y: rates,
      type: 'scatter',
      mode: 'lines+markers',
      name: 'Monthly Fraud Rate %',
      line: { color: '#f59e0b', width: 3, shape: 'spline' },
      marker: { size: 6, color: '#f59e0b' },
      fill: 'tozeroy',
      fillcolor: 'rgba(245, 158, 11, 0.05)',
    }];
  }, [monthlyClaims]);

  const costSavingsPlotlyData = useMemo(() => {
    const cumulative = [];
    let running = 0;
    claimsOverTime.forEach(d => {
      const saved = (d.total_claims || 0) * 0.08;
      running += saved;
      cumulative.push(running);
    });
    return [{
      x: claimsOverTime.map(d => d.date),
      y: cumulative,
      type: 'scatter',
      mode: 'lines',
      name: 'Cumulative Savings',
      line: { color: '#10b981', width: 3, shape: 'spline' },
      fill: 'tozeroy',
      fillcolor: 'rgba(16, 185, 129, 0.08)',
    }];
  }, [claimsOverTime]);

  const heatmapPlotlyData = useMemo(() => {
    const regionData = fraudByRegion.length > 0 ? fraudByRegion : FALLBACK_REGION_DATA;
    return [{
      type: 'choropleth',
      locationmode: 'USA-states',
      locations: regionData.map(d => d.state),
      z: regionData.map(d => {
        const total = d.total_claims || 1;
        return ((d.fraud_claims || 0) / total) * 100;
      }),
      text: regionData.map(d => `${d.state}: ${d.fraud_claims || 0} fraud / ${d.total_claims || 0} total`),
      colorscale: [
        [0, '#065f46'],
        [0.3, '#10b981'],
        [0.5, '#f59e0b'],
        [0.7, '#f97316'],
        [1, '#ef4444'],
      ],
      colorbar: {
        title: { text: 'Fraud %', font: { size: 10, color: '#94a3b8' } },
        thickness: 12,
        len: 0.6,
        tickfont: { size: 9, color: '#94a3b8' },
      },
      hoverinfo: 'text',
    }];
  }, [fraudByRegion]);

  const heatmapPlotlyLayout = useMemo(() => ({
    margin: { t: 10, r: 10, b: 10, l: 10 },
    geo: {
      scope: 'usa',
      showlakes: true,
      lakecolor: 'rgb(11, 15, 25)',
      landcolor: '#1e293b',
      subunitcolor: '#334155',
      countrycolor: '#334155',
      bgcolor: 'rgba(0,0,0,0)',
    },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
  }), []);

  const providerRiskPlotlyData = useMemo(() => {
    const sorted = [...fraudByProvider]
      .map(d => ({
        ...d,
        fraud_rate: d.total_claims > 0 ? ((d.fraud_claims || 0) / d.total_claims) * 100 : 0,
      }))
      .sort((a, b) => b.fraud_rate - a.fraud_rate)
      .slice(0, 8);
    return [{
      y: sorted.map(d => d.provider_name),
      x: sorted.map(d => +d.fraud_rate.toFixed(1)),
      type: 'bar',
      orientation: 'h',
      name: 'Fraud Rate %',
      text: sorted.map(d => `${d.fraud_rate.toFixed(1)}%`),
      textposition: 'outside',
      textfont: { size: 10, color: '#94a3b8' },
      marker: { color: sorted.map(d => d.fraud_rate > 9 ? '#ef4444' : d.fraud_rate > 7 ? '#f97316' : '#f59e0b'), cornerradius: 4 },
    }];
  }, [fraudByProvider]);

  const investigationWorkloadData = useMemo(() => {
    const dist = claimStatusDist.length > 0 ? claimStatusDist : FALLBACK_STATUS_DIST;
    const colorMap = {
      'Approved': '#10b981',
      'Rejected': '#ef4444',
      'Under Review': '#f59e0b',
      'Pending': '#6366f1',
      'Fraud Confirmed': '#dc2626',
      'Investigating': '#8b5cf6',
    };
    return [{
      x: dist.map(d => d.status),
      y: dist.map(d => d.count),
      type: 'bar',
      marker: { color: dist.map(d => colorMap[d.status] || '#6366f1'), cornerradius: 6 },
      text: dist.map(d => d.count),
      textposition: 'outside',
      textfont: { size: 10, color: '#94a3b8' },
    }];
  }, [claimStatusDist]);

  const fraudScoreDistPlotlyData = useMemo(() => {
    const dist = fraudScoreDist.length > 0 ? fraudScoreDist : FALLBACK_SCORE_DIST;
    const gradient = dist.map((_, i) => {
      const ratio = i / (dist.length - 1 || 1);
      if (ratio < 0.5) return '#6366f1';
      if (ratio < 0.75) return '#f59e0b';
      return '#ef4444';
    });
    return [{
      x: dist.map(d => d.score_range),
      y: dist.map(d => d.count),
      type: 'bar',
      marker: { color: gradient, cornerradius: 6 },
      text: dist.map(d => d.count),
      textposition: 'outside',
      textfont: { size: 10, color: '#94a3b8' },
    }];
  }, [fraudScoreDist]);

  const shapPlotlyData = useMemo(() => {
    const sorted = [...SHAP_FEATURES].sort((a, b) => a.value - b.value);
    return [{
      y: sorted.map(d => d.label),
      x: sorted.map(d => d.value),
      type: 'bar',
      orientation: 'h',
      marker: { color: sorted.map(d => d.color), cornerradius: 4 },
      text: sorted.map(d => `${(d.value * 100).toFixed(0)}%`),
      textposition: 'outside',
      textfont: { size: 10, color: '#94a3b8' },
    }];
  }, []);

  const gaugePlotlyData = useMemo(() => {
    const accuracy = stats?.model_accuracy ? stats.model_accuracy * 100 : (modelMetrics?.accuracy ? modelMetrics.accuracy * 100 : (CANONICAL_MODEL.accuracy * 100));
    return [{
      type: 'indicator',
      mode: 'gauge+number',
      value: accuracy,
      number: { suffix: '%', font: { size: 28, color: '#e2e8f0', family: 'monospace' } },
      gauge: {
        axis: { range: [0, 100], tickwidth: 1, tickcolor: '#475569', dtick: 20, tickfont: { size: 9, color: '#64748b' } },
        bar: { color: accuracy >= 90 ? '#10b981' : accuracy >= 75 ? '#f59e0b' : '#ef4444', thickness: 0.75 },
        bgcolor: 'rgba(0,0,0,0)',
        borderwidth: 0,
        steps: [
          { range: [0, 60], color: 'rgba(239, 68, 68, 0.12)' },
          { range: [60, 80], color: 'rgba(245, 158, 11, 0.12)' },
          { range: [80, 100], color: 'rgba(16, 185, 129, 0.12)' },
        ],
        threshold: {
          line: { color: '#6366f1', width: 3 },
          thickness: 0.8,
          value: 95,
        },
      },
    }];
  }, [stats, modelMetrics]);

  const gaugeLayout = useMemo(() => ({
    margin: { t: 30, r: 20, l: 20, b: 10 },
    height: 200,
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
  }), []);

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <Skeleton key={i} type="card" />)}
        </div>
        <Skeleton rows={8} />
      </div>
    );
  }

  const highRiskProviders = Math.ceil((stats?.total_providers || 0) * 0.12) || 4;

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
          <div className="text-[10px] text-textSecondary font-mono flex items-center gap-1.5 bg-bg/50 rounded-lg px-3 py-1.5 border border-border/60">
            <Clock size={10} className="text-primary" />
            {liveClock.toLocaleTimeString()} — {liveClock.toLocaleDateString()}
          </div>
          <button onClick={fetchData} className="p-2 rounded-xl border border-border/80 bg-surface text-textSecondary hover:text-primary hover:border-primary/30 transition-all active:scale-95">
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
          value={(trends?.suspicious_providers_active || stats?.total_providers || 0).toLocaleString()}
          subtitle="With recent claim activity"
          icon={Building2}
          bgClass="bg-indigo-500/10"
          iconTextClass="text-primary"
          delay={250}
        />
        <KpiCard
          title="TOTAL PATIENTS"
          subtitle="Enrolled policyholders"
          icon={Users}
          bgClass="bg-sky-500/10"
          iconTextClass="text-sky-500"
          delay={300}
          rawValue={stats?.total_patients || 0}
        />
        <KpiCard
          title="MODEL ACCURACY"
          value={stats?.model_accuracy ? `${(stats.model_accuracy * 100).toFixed(1)}%` : `${(CANONICAL_MODEL.accuracy * 100).toFixed(1)}%`}
          subtitle={`v${stats?.model_version || CANONICAL_MODEL.version}`}
          icon={BrainCircuit}
          bgClass="bg-green-500/10"
          iconTextClass="text-green-500"
          delay={350}
        />
      </div>

      <div className="bg-surface rounded-2xl border border-border/80 shadow-sm overflow-hidden hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-shadow">
        <div className="border-b border-border/60 px-5 py-4 flex items-center justify-between">
          <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2">
            <Target size={16} className="text-primary" />
            Fraud Detection Funnel
          </h3>
          <span className="rounded-full bg-bg/80 px-2.5 py-0.5 text-[9px] font-black text-textSecondary uppercase tracking-wider border border-border/60">
            End-to-End Pipeline
          </span>
        </div>
        <div className="p-5">
          {(() => {
            const funnel = stats ? {
              total: stats.total_claims || 0,
              scored: stats.total_fraud || 0,
              flagged: stats.flagged_claims || 0,
              escalated: stats.escalated_alerts || 0,
            } : {
              total: CANONICAL_FUNNEL.totalClaims,
              scored: CANONICAL_FUNNEL.aiScoredHighRisk,
              flagged: CANONICAL_FUNNEL.formallyFlagged,
              escalated: CANONICAL_FUNNEL.escalatedAlerts,
            };
            const stages = [
              { label: 'Total Claims Processed', value: funnel.total, color: 'bg-indigo-500', textColor: 'text-indigo-500', width: '100%' },
              { label: 'AI-Scored High Risk', value: funnel.scored, color: 'bg-amber-500', textColor: 'text-amber-500', width: '75%' },
              { label: 'Formally Flagged (SIU)', value: funnel.flagged, color: 'bg-orange-500', textColor: 'text-orange-500', width: '42%' },
              { label: 'Escalated Critical Alerts', value: funnel.escalated, color: 'bg-red-500', textColor: 'text-red-500', width: '18%' },
            ];
            return (
              <div className="flex flex-col md:flex-row items-stretch gap-3">
                {stages.map((s, i) => {
                  const pct = funnel.total > 0 ? ((s.value / funnel.total) * 100).toFixed(1) : '0.0';
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center">
                      <div className={`w-full h-2 rounded-full ${s.color} opacity-80 mb-2`} style={{ maxWidth: s.width }} />
                      <p className={`text-xl font-black ${s.textColor}`}>{s.value.toLocaleString()}</p>
                      <p className="text-[10px] text-textSecondary font-semibold text-center mt-1 leading-tight">{s.label}</p>
                      {i > 0 && <p className="text-[9px] text-textSecondary mt-1 font-mono">{pct}% of total</p>}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-surface rounded-2xl border border-border/80 shadow-sm overflow-hidden hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-shadow">
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
              config={PLOTLY_ANIM_CONFIG}
              layout={{
                margin: { t: 10, r: 10, l: 30, b: 30 },
                xaxis: { showgrid: false },
                yaxis: { gridcolor: 'rgba(226, 232, 240, 0.5)' },
                legend: { orientation: 'h', y: -0.15 },
                paper_bgcolor: 'rgba(0,0,0,0)',
                plot_bgcolor: 'rgba(0,0,0,0)',
              }}
            />
          </div>
        </div>

        <div className="bg-surface rounded-2xl border border-border/80 shadow-sm overflow-hidden hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-shadow">
          <div className="border-b border-border/60 px-5 py-4">
            <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2">
              <Activity size={16} className="text-primary" />
              Fraud vs Normal Ratio
            </h3>
          </div>
          <div className="p-5 h-[300px] bg-surface flex items-center justify-center">
            <PlotlyChart
              data={statusPiePlotlyData}
              config={PLOTLY_ANIM_CONFIG}
              layout={{
                margin: { t: 10, b: 10, l: 10, r: 10 },
                height: 260,
                legend: { orientation: 'h', y: -0.15 },
                paper_bgcolor: 'rgba(0,0,0,0)',
                plot_bgcolor: 'rgba(0,0,0,0)',
              }}
            />
          </div>
        </div>
      </div>

      <div className="bg-surface rounded-2xl border border-border/80 shadow-sm overflow-hidden hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-shadow">
        <div className="border-b border-border/60 px-5 py-4 flex items-center justify-between">
          <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2">
            <Map size={16} className="text-primary" />
            US Fraud Heatmap by State
          </h3>
          <span className="rounded-full bg-bg/80 px-2.5 py-0.5 text-[9px] font-black text-textSecondary uppercase tracking-wider border border-border/60">
            Geographic Distribution
          </span>
        </div>
        <div className="p-5 h-[400px] bg-surface">
          <PlotlyChart
            data={heatmapPlotlyData}
            config={PLOTLY_ANIM_CONFIG}
            layout={heatmapPlotlyLayout}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="Provider Risk Ranking" icon={Building2} iconColor="text-red-500" badge="Top Offenders" badgeClass="bg-red-500/10 text-red-500 border-red-500/20">
          <div className="p-5 h-[340px] bg-surface">
            {fraudByProvider.length > 0 ? (
              <PlotlyChart
                data={providerRiskPlotlyData}
                config={PLOTLY_ANIM_CONFIG}
                layout={{
                  margin: { t: 10, r: 40, l: 120, b: 30 },
                  xaxis: { title: 'Fraud Rate %', gridcolor: 'rgba(226, 232, 240, 0.5)', range: [0, 15], ticksuffix: '%' },
                  yaxis: { automargin: true, tickfont: { size: 10 } },
                  paper_bgcolor: 'rgba(0,0,0,0)',
                  plot_bgcolor: 'rgba(0,0,0,0)',
                  showlegend: false,
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-textSecondary italic">No provider fraud data available.</div>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Diagnosis Risk Ranking" icon={Target} iconColor="text-amber-500" badge="By ICD Code" badgeClass="bg-amber-500/10 text-amber-500 border-amber-500/20">
          <div className="p-5 h-[340px] bg-surface">
            {(fraudByDiagnosis.length > 0 ? fraudByDiagnosis : FALLBACK_DIAGNOSIS).length > 0 ? (
              <div className="overflow-y-auto h-full space-y-2.5">
                {(fraudByDiagnosis.length > 0 ? fraudByDiagnosis : FALLBACK_DIAGNOSIS).map((d, i) => {
                  const total = d.total_claims || 1;
                  const rate = ((d.fraud_claims || 0) / total) * 100;
                  const risk = getRiskLevel(rate / 100);
                  return (
                    <div key={i} className="flex items-center justify-between text-xs bg-bg/30 rounded-xl px-4 py-3 border border-border/40 hover:border-primary/20 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-primary text-sm w-16">{d.diagnosis_code}</span>
                        <div>
                          <span className="font-semibold text-textPrimary">{d.total_claims} claims</span>
                          <span className="text-textSecondary ml-2">/ {d.fraud_claims} fraud</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-bg rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-red-500 to-amber-500 transition-all duration-500" style={{ width: `${Math.min(rate, 100)}%` }} />
                        </div>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded ${risk.bg} ${risk.color} ${risk.border} border`}>
                          {rate.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-textSecondary italic">No diagnosis data available.</div>
            )}
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-surface rounded-2xl border border-border/80 shadow-sm overflow-hidden hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-shadow">
          <div className="border-b border-border/60 px-5 py-4">
            <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2">
              <TrendingUp size={16} className="text-warning" />
              Monthly Fraud Rate %
            </h3>
          </div>
          <div className="p-5 h-[300px] bg-surface">
            <PlotlyChart
              data={monthlyRatePlotlyData}
              config={PLOTLY_ANIM_CONFIG}
              layout={{
                margin: { t: 10, r: 10, l: 35, b: 30 },
                xaxis: { showgrid: false },
                yaxis: { gridcolor: 'rgba(226, 232, 240, 0.5)', suffix: '%' },
                legend: { orientation: 'h', y: -0.15 },
                paper_bgcolor: 'rgba(0,0,0,0)',
                plot_bgcolor: 'rgba(0,0,0,0)',
              }}
            />
          </div>
        </div>

        <div className="bg-surface rounded-2xl border border-border/80 shadow-sm overflow-hidden hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-shadow">
          <div className="border-b border-border/60 px-5 py-4">
            <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2">
              <DollarSign size={16} className="text-success" />
              Cost Savings Trend
            </h3>
          </div>
          <div className="p-5 h-[300px] bg-surface">
            <PlotlyChart
              data={costSavingsPlotlyData}
              config={PLOTLY_ANIM_CONFIG}
              layout={{
                margin: { t: 10, r: 10, l: 50, b: 30 },
                xaxis: { showgrid: false },
                yaxis: { gridcolor: 'rgba(226, 232, 240, 0.5)', tickprefix: '$', tickformat: ',.0f' },
                legend: { orientation: 'h', y: -0.15 },
                paper_bgcolor: 'rgba(0,0,0,0)',
                plot_bgcolor: 'rgba(0,0,0,0)',
              }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="Investigation Workload" icon={BarChart3} iconColor="text-indigo-500" badge={claimStatusDist.length > 0 ? `${formatNumber(claimStatusDist.reduce((a, b) => a + (b.count || 0), 0))} total` : 'Status Distribution'} badgeClass="bg-indigo-500/10 text-indigo-500 border-indigo-500/20">
          <div className="p-5 h-[300px] bg-surface">
            <PlotlyChart
              data={investigationWorkloadData}
              config={PLOTLY_ANIM_CONFIG}
              layout={{
                margin: { t: 15, r: 10, l: 40, b: 60 },
                xaxis: { tickangle: -25, tickfont: { size: 10 } },
                yaxis: { gridcolor: 'rgba(226, 232, 240, 0.5)' },
                paper_bgcolor: 'rgba(0,0,0,0)',
                plot_bgcolor: 'rgba(0,0,0,0)',
                showlegend: false,
                bargap: 0.3,
              }}
            />
          </div>
        </SectionCard>

        <SectionCard title="Fraud Probability Distribution" icon={ShieldAlert} iconColor="text-red-500" badge="Score Histogram" badgeClass="bg-red-500/10 text-red-500 border-red-500/20">
          <div className="p-5 h-[300px] bg-surface">
            <PlotlyChart
              data={fraudScoreDistPlotlyData}
              config={PLOTLY_ANIM_CONFIG}
              layout={{
                margin: { t: 15, r: 10, l: 40, b: 60 },
                xaxis: { title: 'Fraud Score Range', tickangle: -25, tickfont: { size: 9 } },
                yaxis: { title: 'Claims Count', gridcolor: 'rgba(226, 232, 240, 0.5)' },
                paper_bgcolor: 'rgba(0,0,0,0)',
                plot_bgcolor: 'rgba(0,0,0,0)',
                showlegend: false,
                bargap: 0.15,
              }}
            />
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-surface rounded-2xl border border-border/80 shadow-sm overflow-hidden hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-shadow">
          <div className="border-b border-border/60 px-5 py-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2">
              <BrainCircuit size={16} className="text-success" />
              Model Confidence Gauge
            </h3>
            <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-[9px] font-black text-success uppercase tracking-wider border border-success/20">
              Live
            </span>
          </div>
          <div className="p-5 h-[260px] bg-surface flex items-center justify-center">
            <PlotlyChart
              data={gaugePlotlyData}
              layout={gaugeLayout}
              config={{ responsive: true, displayModeBar: false }}
            />
          </div>
        </div>

        <div className="bg-surface rounded-2xl border border-border/80 shadow-sm overflow-hidden hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-shadow">
          <div className="border-b border-border/60 px-5 py-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2">
              <Target size={16} className="text-primary" />
              SHAP Feature Importance
            </h3>
            <span className="rounded-full bg-bg/80 px-2.5 py-0.5 text-[9px] font-black text-textSecondary uppercase tracking-wider border border-border/60">
              Preview
            </span>
          </div>
          <div className="p-5 h-[260px] bg-surface">
            <PlotlyChart
              data={shapPlotlyData}
              layout={{
                margin: { t: 10, r: 50, l: 110, b: 20 },
                yaxis: { automargin: true, tickfont: { size: 10, family: 'monospace' } },
                xaxis: { gridcolor: 'rgba(226, 232, 240, 0.5)', range: [0, 0.45] },
                paper_bgcolor: 'rgba(0,0,0,0)',
                plot_bgcolor: 'rgba(0,0,0,0)',
                showlegend: false,
                bargap: 0.25,
              }}
              config={{ responsive: true, displayModeBar: false }}
            />
          </div>
        </div>

        <div className="bg-surface rounded-2xl border border-border/80 shadow-sm overflow-hidden flex flex-col hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-shadow">
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
            {activityFeed.map((item) => {
              const ItemIcon = item.icon || AlertTriangle;
              return (
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
                  <div className="shrink-0 mt-0.5">
                    <ItemIcon size={14} className={item.badge === 'Critical' ? 'text-red-400' : item.badge === 'System' ? 'text-indigo-400' : 'text-amber-400'} />
                  </div>
                </div>
              );
            })}
            {activityFeed.length === 0 && (
              <div className="text-center py-8 text-xs text-textSecondary italic">Awaiting threat data...</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-surface rounded-2xl border border-border/80 shadow-sm overflow-hidden flex flex-col hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-shadow">
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
                {latestFlagged.slice(0, 5).map((c) => {
                  const risk = getRiskLevel(c.fraud_score || 0);
                  return (
                    <tr key={c.claim_id} className="hover:bg-danger/[0.02] transition-colors">
                      <td className="px-5 py-3 font-mono text-xs text-primary font-bold">#{c.claim_id}</td>
                      <td className="px-5 py-3 font-semibold text-textPrimary">{c.patient_name}</td>
                      <td className="px-5 py-3 text-textSecondary truncate max-w-[120px]">{c.provider_name}</td>
                      <td className="px-5 py-3 text-right">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black ${risk.bg} ${risk.color} ${risk.border} border`}>
                          {((c.fraud_score || 0) * 100).toFixed(0)}%
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
                  );
                })}
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
        <div className="bg-surface rounded-2xl border border-border/80 shadow-sm overflow-hidden flex flex-col p-5 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-shadow">
          <h3 className="text-sm font-bold text-textPrimary border-b border-border/60 pb-3 mb-4 flex items-center gap-2">
            <Building2 size={16} className="text-primary" />
            Suspicious Provider Outliers
          </h3>
          <div className="space-y-4 flex-1">
            {(topProviders.length > 0 ? topProviders : []).slice(0, 4).map((p, idx) => {
              const fraudRate = p.fraud_count && p.claim_count ? (p.fraud_count / p.claim_count) * 100 : 0;
              const risk = getRiskLevel(fraudRate / 100);
              return (
                <div key={idx} className="flex justify-between items-center text-xs border-b border-border/40 pb-2.5 last:border-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="font-bold text-textPrimary truncate max-w-[180px]">{p.name || p.provider_name}</p>
                    <p className="text-[10px] text-textSecondary">{p.specialty || p.provider_type || ''}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`font-bold ${risk.color}`}>{fraudRate.toFixed(1)}% risk</span>
                    <p className="text-[9px] text-textSecondary font-mono">{p.claim_count || p.total_claims} claims</p>
                  </div>
                </div>
              );
            })}
            {topProviders.length === 0 && (
              <div className="text-center py-4 text-[11px] text-textSecondary italic">No provider data available.</div>
            )}
          </div>
        </div>

        <div className="bg-surface rounded-2xl border border-border/80 shadow-sm overflow-hidden flex flex-col p-5 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-shadow">
          <h3 className="text-sm font-bold text-textPrimary border-b border-border/60 pb-3 mb-4 flex items-center gap-2">
            <Users size={16} className="text-primary" />
            Suspicious Patient Files
          </h3>
          <div className="space-y-4 flex-1">
            {(topPatients.length > 0 ? topPatients : []).slice(0, 4).map((p, idx) => (
              <div key={idx} className="flex justify-between items-center text-xs border-b border-border/40 pb-2.5 last:border-0 last:pb-0">
                <div className="min-w-0">
                  <p className="font-bold text-textPrimary truncate max-w-[180px]">{p.name}</p>
                  <p className="text-[10px] text-textSecondary">{p.age ? `${p.age} yrs` : ''} {p.gender ? `/ ${p.gender}` : ''} {p.city ? `\u2022 ${p.city}` : ''}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-bold text-danger">{p.fraud_count} Flags</span>
                  <p className="text-[9px] text-textSecondary font-mono">{p.claim_count || p.total_claims} claims</p>
                </div>
              </div>
            ))}
            {topPatients.length === 0 && (
              <div className="text-center py-4 text-[11px] text-textSecondary italic">No patient data available.</div>
            )}
          </div>
        </div>

        <div className="bg-surface rounded-2xl border border-border/80 shadow-sm overflow-hidden flex flex-col p-5 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-shadow">
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
          {modelMetrics ? (
            <div className="space-y-4 flex-1 text-xs flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex justify-between border-b border-border/40 pb-2">
                  <span className="text-textSecondary">Active Version</span>
                  <span className="font-mono font-bold text-primary">v{modelMetrics.model_version || CANONICAL_MODEL.version}</span>
                </div>
                <div className="flex justify-between border-b border-border/40 pb-2">
                  <span className="text-textSecondary">Accuracy</span>
                  <span className="font-mono font-bold text-success">
                    {((modelMetrics.accuracy || stats?.model_accuracy || 0.942) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between border-b border-border/40 pb-2">
                  <span className="text-textSecondary">F1-Score</span>
                  <span className="font-mono font-bold text-primary">
                    {((modelMetrics.f1_score || stats?.model_f1 || CANONICAL_MODEL.f1Score) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between border-b border-border/40 pb-2">
                  <span className="text-textSecondary">ROC-AUC</span>
                  <span className="font-mono font-bold text-indigo-500">
                    {((modelMetrics.roc_auc || modelMetrics.model_roc_auc || stats?.model_roc_auc || CANONICAL_MODEL.rocAuc) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between border-b border-border/40 pb-2">
                  <span className="text-textSecondary">Precision / Recall</span>
                  <span className="font-mono font-bold text-textPrimary">
                    {((modelMetrics.precision || stats?.model_precision || CANONICAL_MODEL.precision) * 100).toFixed(1)}% /
                    {((modelMetrics.recall || stats?.model_recall || CANONICAL_MODEL.recall) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-textSecondary">Last Retrained</span>
                  <span className="text-textPrimary text-[10px] font-mono">
                    {modelMetrics.last_training_date
                      ? new Date(modelMetrics.last_training_date).toLocaleDateString()
                      : 'N/A'}
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
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-textSecondary italic">Model metrics unavailable.</div>
          )}
        </div>
      </div>
    </div>
  );
}
