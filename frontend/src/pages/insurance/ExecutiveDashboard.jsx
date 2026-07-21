import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  TrendingUp, TrendingDown, DollarSign, AlertTriangle, ShieldCheck, BrainCircuit,
  BarChart3, PieChart, Download, Lightbulb, ArrowUpRight, Clock,
  Activity, Users, Building2, Sparkles, Target, ShieldAlert,
  Landmark, ChevronRight, CheckCircle, ArrowRight, Info,
  AlertCircle, RefreshCw, Minus, Search,
  BarChart4, Layers, ExternalLink, FileText, FileDown, Eye
} from "lucide-react";
import PlotlyChart from "../../components/PlotlyChart";
import Skeleton from "../../components/Skeleton";
import { formatCurrency, formatCompactCurrency, formatNumber } from "../../data/dataUtils";

// ═══════════════════════════════════════════════════════════════
// SECTION 0: UNIFIED DATA MODEL — SINGLE SOURCE OF TRUTH
// ═══════════════════════════════════════════════════════════════
const TOTAL_CLAIMS = 200;
const TOTAL_FRAUD_CLAIMS = 15;
const FRAUD_RATE = +(TOTAL_FRAUD_CLAIMS / TOTAL_CLAIMS * 100).toFixed(1);
const TOTAL_PATIENTS = 500;
const ACTIVE_POLICIES = 41;
const TOTAL_CLAIM_VALUE = 2_500_000;
const FRAUD_PREVENTED = 275_000;
const INVESTIGATION_COST = 50_000;
const RISK_ADJUSTED_ROI = +(FRAUD_PREVENTED / INVESTIGATION_COST).toFixed(1);
const INDUSTRY_BENCHMARK_RECALL = 78.0;

const MONTHLY_DATA = [
  { month: 'Jan 2026', shortMonth: 'Jan', claims: 25, fraud_claims: 2, amount: 312_500, fraud_amount: 25_000 },
  { month: 'Feb 2026', shortMonth: 'Feb', claims: 28, fraud_claims: 2, amount: 350_000, fraud_amount: 25_000 },
  { month: 'Mar 2026', shortMonth: 'Mar', claims: 32, fraud_claims: 3, amount: 400_000, fraud_amount: 37_500 },
  { month: 'Apr 2026', shortMonth: 'Apr', claims: 26, fraud_claims: 2, amount: 325_000, fraud_amount: 25_000 },
  { month: 'May 2026', shortMonth: 'May', claims: 35, fraud_claims: 3, amount: 437_500, fraud_amount: 37_500 },
  { month: 'Jun 2026', shortMonth: 'Jun', claims: 27, fraud_claims: 1, amount: 337_500, fraud_amount: 12_500 },
  { month: 'Jul 2026', shortMonth: 'Jul', claims: 27, fraud_claims: 2, amount: 337_500, fraud_amount: 25_000 },
];
const COST_SAVINGS_ACTUAL = [
  { month: 'Jan 2026', shortMonth: 'Jan', saved: 28_000 },
  { month: 'Feb 2026', shortMonth: 'Feb', saved: 60_000 },
  { month: 'Mar 2026', shortMonth: 'Mar', saved: 98_000 },
  { month: 'Apr 2026', shortMonth: 'Apr', saved: 140_000 },
  { month: 'May 2026', shortMonth: 'May', saved: 188_000 },
  { month: 'Jun 2026', shortMonth: 'Jun', saved: 238_000 },
  { month: 'Jul 2026', shortMonth: 'Jul', saved: 275_000 },
];
const COST_SAVINGS_FORECAST = [
  { month: 'Aug 2026', shortMonth: 'Aug', saved: 315_000 },
  { month: 'Sep 2026', shortMonth: 'Sep', saved: 353_000 },
  { month: 'Oct 2026', shortMonth: 'Oct', saved: 389_000 },
  { month: 'Nov 2026', shortMonth: 'Nov', saved: 433_000 },
  { month: 'Dec 2026', shortMonth: 'Dec', saved: 475_000 },
];
const MONEY_SAVED = COST_SAVINGS_ACTUAL[COST_SAVINGS_ACTUAL.length - 1].saved;

const OVERDUE_INVESTIGATIONS = 28 + 35; // Under Review + AI Scored = active pipeline

const INVESTIGATION_WORKLOAD = [
  { status: 'Submitted', count: 42 },
  { status: 'AI Scored', count: 35 },
  { status: 'Under Review', count: 28 },
  { status: 'Approved', count: 50 },
  { status: 'Rejected', count: 30 },
  { status: 'Fraud Confirmed', count: TOTAL_FRAUD_CLAIMS },
];
const WORKLOAD_COLORS = {
  'Submitted': '#6366f1', 'AI Scored': '#8b5cf6', 'Under Review': '#f59e0b',
  'Approved': '#10b981', 'Rejected': '#ef4444', 'Fraud Confirmed': '#dc2626',
};

const FRAUD_PROB_BUCKETS = [
  { range: '0-10%', count: 79, midpoint: 5 },
  { range: '10-20%', count: 58, midpoint: 15 },
  { range: '20-30%', count: 44, midpoint: 25 },
  { range: '30-40%', count: 1, midpoint: 35 },
  { range: '40-50%', count: 1, midpoint: 45 },
  { range: '50-60%', count: 1, midpoint: 55 },
  { range: '60-70%', count: 1, midpoint: 65 },
  { range: '70-80%', count: 6, midpoint: 75 },
  { range: '80-90%', count: 5, midpoint: 85 },
  { range: '90-100%', count: 4, midpoint: 95 },
];

const PROVIDER_RISK = [
  { name: 'Metropolitan General Hospital', claimCount: 28, fraudCount: 12, totalAmount: 350_000, state: 'NY' },
  { name: 'St. Mary Medical Center', claimCount: 24, fraudCount: 8, totalAmount: 300_000, state: 'CA' },
  { name: 'Pacific Wellness Group', claimCount: 18, fraudCount: 6, totalAmount: 225_000, state: 'CA' },
  { name: 'City Health Network', claimCount: 22, fraudCount: 2, totalAmount: 275_000, state: 'IL' },
  { name: 'Summit Healthcare Partners', claimCount: 16, fraudCount: 1, totalAmount: 200_000, state: 'CO' },
  { name: 'Lakeside Medical Associates', claimCount: 14, fraudCount: 1, totalAmount: 175_000, state: 'MN' },
  { name: 'Valley Regional Hospital', claimCount: 12, fraudCount: 1, totalAmount: 150_000, state: 'AZ' },
  { name: 'Northeast Health Services', claimCount: 10, fraudCount: 1, totalAmount: 125_000, state: 'MA' },
].map(p => ({ ...p, fraudRate: +((p.fraudCount / p.claimCount) * 100).toFixed(1) }));
const TOP3_PROVIDERS = PROVIDER_RISK.slice(0, 3);

const REGIONAL_DATA = [
  { state: 'CA', claims: 34, fraud: 3 }, { state: 'TX', claims: 30, fraud: 2 },
  { state: 'FL', claims: 30, fraud: 4 }, { state: 'NY', claims: 26, fraud: 2 },
  { state: 'IL', claims: 20, fraud: 1 }, { state: 'PA', claims: 18, fraud: 1 },
  { state: 'OH', claims: 16, fraud: 1 }, { state: 'GA', claims: 14, fraud: 1 },
  { state: 'NC', claims: 8, fraud: 0 },  { state: 'MI', claims: 4, fraud: 0 },
].map(r => ({ ...r, fraudRate: +((r.fraud / r.claims) * 100).toFixed(1) }));

const DIAGNOSES = [
  { code: 'M54.5', desc: 'Low Back Pain', claims: 32, fraud: 4 },
  { code: 'E11.9', desc: 'Type 2 Diabetes', claims: 28, fraud: 3 },
  { code: 'M17.9', desc: 'Osteoarthritis', claims: 24, fraud: 2 },
  { code: 'I25.10', desc: 'Coronary Artery Disease', claims: 22, fraud: 2 },
  { code: 'M79.3', desc: 'Panniculitis', claims: 18, fraud: 1 },
  { code: 'G43.909', desc: 'Migraine', claims: 16, fraud: 1 },
  { code: 'F32.1', desc: 'Depression', claims: 14, fraud: 1 },
  { code: 'N18.9', desc: 'Chronic Kidney Disease', claims: 12, fraud: 1 },
].map(d => ({ ...d, fraudRate: +((d.fraud / d.claims) * 100).toFixed(1) }));
const TOP3_DIAGNOSES = DIAGNOSES.slice(0, 3);

const MODEL_ACCURACY = 94.6;
const MODEL_PRECISION = 86.2;
const MODEL_RECALL = 85.9;
const MODEL_F1 = 86.1;
const MODEL_FPR = 3.3;
const MODEL_FNR = +(100 - MODEL_RECALL).toFixed(1);
const MODEL_ROC_AUC = 96.5;

const MODEL_ACCURACY_TREND = [
  { month: 'Feb 2026', accuracy: 93.2 },
  { month: 'Mar 2026', accuracy: 93.5 },
  { month: 'Apr 2026', accuracy: 93.8 },
  { month: 'May 2026', accuracy: 94.1 },
  { month: 'Jun 2026', accuracy: 94.3 },
  { month: 'Jul 2026', accuracy: 94.6 },
];

const FRAUD_DETECTION_FUNNEL = [
  { stage: 'Total Claims', value: TOTAL_CLAIMS, color: '#6366f1' },
  { stage: 'AI Scored', value: TOTAL_CLAIMS, color: '#8b5cf6' },
  { stage: 'Flagged', value: TOTAL_FRAUD_CLAIMS, color: '#f59e0b' },
  { stage: 'Escalated', value: 8, color: '#ef4444' },
];

const FRAUD_CATEGORIES = [
  { category: 'Upcoding', count: 4 },
  { category: 'Duplicate Claims', count: 3 },
  { category: 'Phantom Billing', count: 3 },
  { category: 'Unbundling', count: 2 },
  { category: 'Kickback Schemes', count: 1 },
  { category: 'Identity Fraud', count: 1 },
  { category: 'Compliance Risk', count: 1 },
];

const RISK = { LOW: 40, MEDIUM: 70 };
function riskLabel(score) {
  if (score >= RISK.MEDIUM) return { label: 'Critical', color: 'text-red-500', bg: 'bg-red-500/10' };
  if (score >= RISK.LOW) return { label: 'Medium', color: 'text-warning', bg: 'bg-warning/10' };
  return { label: 'Low', color: 'text-success', bg: 'bg-success/10' };
}

// ═══════════════════════════════════════════════════════════════
// SECTION 1: HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════

function AnimatedCounter({ value, suffix = '', duration = 1200 }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const end = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.]/g, '')) || 0;
    const startTime = performance.now();
    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(end * eased);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value, duration]);
  const formatted = typeof value === 'number'
    ? (Number.isInteger(value) ? Math.round(display).toLocaleString() : display.toFixed(1))
    : String(value);
  return <>{formatted}{suffix}</>;
}

function DeltaIndicator({ value, direction = 'up-bad' }) {
  if (value === undefined || value === null || value === 0) {
    return <span className="inline-flex items-center gap-0.5 text-textSecondary font-bold"><Minus size={12} />0%</span>;
  }
  const isPositive = value > 0;
  const isGood = direction === 'up-good' ? isPositive : !isPositive;
  const colorClass = isGood ? 'text-success' : 'text-danger';
  const Icon = isPositive ? ArrowUpRight : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-0.5 ${colorClass} font-bold`}>
      <Icon size={12} />{isPositive ? '+' : ''}{typeof value === 'number' ? value.toFixed(1) : value}%
    </span>
  );
}

function ProjectedBadge({ className = '' }) {
  return (
    <span className={`text-[8px] font-bold uppercase tracking-wider text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 ${className}`}>
      Projected
    </span>
  );
}

function KpiCard({ title, value, subtitle, icon: Icon, bgClass, iconTextClass, delta, deltaDirection = 'up-bad', delay = 0, rawValue, badge, tooltip }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/80 bg-surface p-5 cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgb(0_0_0_/_0.08)] hover:border-primary/20 animate-fade-in-up" style={{ animationDelay: `${delay}ms` }} title={tooltip}>
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-textSecondary">{title}</p>
          <p className="mt-2 text-2xl font-black text-textPrimary font-mono tracking-tight">
            {rawValue !== undefined ? <AnimatedCounter value={rawValue} /> : value}
          </p>
          {subtitle && (
            <p className="mt-2.5 text-[11px] text-textSecondary font-semibold flex items-center gap-1">
              {delta !== undefined && <DeltaIndicator value={delta} direction={deltaDirection} />}
              <span className="truncate">{subtitle}</span>
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <div className={`p-3 rounded-xl transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg ${bgClass} ${iconTextClass}`}>
            <Icon size={20} />
          </div>
          {badge && (
            <span className="text-[8px] font-bold uppercase tracking-wider text-textSecondary bg-bg/80 px-1.5 py-0.5 rounded border border-border/60">{badge}</span>
          )}
        </div>
      </div>
    </div>
  );
}

const SECTION_HEADER = ({ icon: Icon, title, action, accent = 'primary' }) => (
  <div className="border-b border-border/60 px-5 py-4 flex items-center justify-between">
    <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2">
      <Icon size={16} className={`text-${accent}`} />
      {title}
    </h3>
    {action && (
      <span className="rounded-full bg-bg/80 px-2.5 py-0.5 text-[9px] font-black text-textSecondary uppercase tracking-wider border border-border/60">
        {action}
      </span>
    )}
  </div>
);

// ═══════════════════════════════════════════════════════════════
// SECTION 2: MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const RECOMMENDATIONS_INITIAL = [
  { id: 1, priority: 'critical', title: 'Implement Pre-Payment Claim Scrubbing', description: 'Deploy automated claim auditing before payment. Estimated 23% reduction in fraud losses.', metric: '23% Reduction', icon: ShieldAlert, owner: 'SIU Division', dueDate: 'Aug 15, 2026', status: 'Pending' },
  { id: 2, priority: 'high', title: 'Expand AI Model to All Claim Types', description: 'Only 67% of categories covered. Extending to dental/vision/pharmacy saves additional $2.8M/yr.', metric: '+$2.8M Savings', icon: BrainCircuit, owner: 'Data Science', dueDate: 'Sep 1, 2026', status: 'In Progress' },
  { id: 3, priority: 'medium', title: 'Provider Network Optimization', description: 'High-risk providers in regions with fraud rates >10%. Review agreements and tiered monitoring.', metric: '12% Risk Drop', icon: Building2, owner: 'Network Ops', dueDate: 'Sep 30, 2026', status: 'Pending' },
  { id: 4, priority: 'low', title: 'Member Fraud Reporting Education', description: 'Organizations with whistleblower programs report 31% higher detection rates.', metric: '+31% Detection', icon: Users, owner: 'Member Services', dueDate: 'Oct 15, 2026', status: 'Dismissed' },
];

const AI_INSIGHTS_DATA = [
  { title: 'Provider Anomaly Detected', desc: '3 new providers billing >$200K within 30 days of enrollment.', priority: 'high', type: 'Provider Risk' },
  { title: 'Geographic Fraud Cluster', desc: 'Southeast region shows 42% higher fraud rate than national average.', priority: 'high', type: 'Regional' },
  { title: 'Model Drift Warning', desc: 'Detection sensitivity decreased 1.2% this month.', priority: 'medium', type: 'ML Ops' },
  { title: 'Billing Pattern Shift', desc: 'Upcoding of E/M level 5 visits increased 18% vs last quarter.', priority: 'medium', type: 'Trend' },
  { title: 'Auto-Adjudication Optimization', desc: 'Expanding AI approval scope could reduce manual review backlog by 34%.', priority: 'low', type: 'Optimization' },
];

export default function ExecutiveDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [recs, setRecs] = useState(RECOMMENDATIONS_INITIAL);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  const prevMonth = MONTHLY_DATA[MONTHLY_DATA.length - 2];
  const currMonth = MONTHLY_DATA[MONTHLY_DATA.length - 1];
  const fraudRateDelta = +(((currMonth.fraud_claims / currMonth.claims) - (prevMonth.fraud_claims / prevMonth.claims)) * 100).toFixed(1);
  const claimsDelta = +(((currMonth.claims - prevMonth.claims) / prevMonth.claims) * 100).toFixed(1);
  const claimValueDelta = +(((currMonth.amount - prevMonth.amount) / prevMonth.amount) * 100).toFixed(1);
  const accuracyDelta = +(MODEL_ACCURACY_TREND[MODEL_ACCURACY_TREND.length - 1].accuracy - MODEL_ACCURACY_TREND[MODEL_ACCURACY_TREND.length - 2].accuracy).toFixed(1);

  const forecast = useMemo(() => {
    const recent3 = MONTHLY_DATA.slice(-3);
    const avgClaims = recent3.reduce((s, m) => s + m.claims, 0) / 3;
    const avgFraudRate = recent3.reduce((s, m) => s + m.fraud_claims / m.claims, 0) / 3;
    const q2Claims = MONTHLY_DATA.slice(3, 6).reduce((s, m) => s + m.claims, 0);
    const q1Claims = MONTHLY_DATA.slice(0, 3).reduce((s, m) => s + m.claims, 0);
    const growthRate = +(((q2Claims - q1Claims) / q1Claims) * 100).toFixed(1);
    return {
      nextQuarterClaims: Math.round(avgClaims * 3),
      projectedFraudRate: +(avgFraudRate * 100).toFixed(1),
      projectedFraudCases: Math.round(avgClaims * 3 * avgFraudRate),
      projectedSavingsYTD: COST_SAVINGS_FORECAST[COST_SAVINGS_FORECAST.length - 1].saved,
      growthRate,
    };
  }, []);

  const cycleColor = (i) => {
    const colors = ['bg-indigo-500/10 text-indigo-500', 'bg-emerald-500/10 text-emerald-500', 'bg-amber-500/10 text-amber-500', 'bg-rose-500/10 text-rose-500', 'bg-cyan-500/10 text-cyan-500', 'bg-purple-500/10 text-purple-500', 'bg-pink-500/10 text-pink-500', 'bg-teal-500/10 text-teal-500'];
    return colors[i % colors.length];
  };

  const handleRecStatus = (id, newStatus) => {
    setRecs(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
  };

  const handleExportPDF = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(9)].map((_, i) => <Skeleton key={i} type="card" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton rows={10} className="bg-surface rounded-2xl border border-border/80 p-5" />
          <Skeleton rows={10} className="bg-surface rounded-2xl border border-border/80 p-5" />
          <Skeleton rows={10} className="bg-surface rounded-2xl border border-border/80 p-5" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ─── HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-accent w-fit mb-3">
            <Sparkles size={12} />
            Executive Summary
          </div>
          <h1 className="text-2xl font-black text-textPrimary">Executive Command Center</h1>
          <p className="text-sm text-textSecondary font-medium">Strategic intelligence for decision-makers — summarized, not operational.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-textSecondary font-mono flex items-center gap-1">
            <Clock size={10} /> Jul 20, 2026
          </span>
          <button onClick={() => {
            const rows = [
              ['Metric', 'Value'], ['Total Claims', TOTAL_CLAIMS], ['Fraud Claims', TOTAL_FRAUD_CLAIMS],
              ['Fraud Rate', `${FRAUD_RATE}%`], ['Total Claim Value', `$${formatNumber(TOTAL_CLAIM_VALUE)}`],
              ['Fraud Prevented (YTD)', `$${formatNumber(FRAUD_PREVENTED)}`], ['Model Accuracy', `${MODEL_ACCURACY}%`],
              ['Risk-Adjusted ROI', `${RISK_ADJUSTED_ROI}x`],
            ];
            const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'executive-summary-2026-07-20.csv';
            a.click();
          }} className="inline-flex items-center gap-2 bg-surface hover:bg-bg/60 border border-border/80 text-textSecondary hover:text-primary px-4 py-2.5 rounded-xl text-xs font-bold transition-all">
            <Download size={14} /> CSV
          </button>
          <button onClick={handleExportPDF} className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30">
            <FileDown size={14} /> Export PDF
          </button>
        </div>
      </div>

      {/* ─── INFO BANNER ─── */}
      <div className="bg-bg/40 rounded-2xl border border-border/60 px-5 py-3 text-xs text-textSecondary flex items-center gap-3">
        <Info size={14} className="text-primary shrink-0" />
        <span><strong className="text-textPrimary">Dashboard</strong> = operational detail for every claim. <strong className="text-textPrimary">Executive Summary</strong> = strategic overview for decision-makers and investment justification.</span>
      </div>

      {/* ═══════════════════════════════════════════════════════
          ROW 1: 9 KPI CARDS (4+5 grid)
          ═══════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard title="Total Claims" value={formatNumber(TOTAL_CLAIMS)} subtitle="Jul vs Jun" icon={FileText} bgClass="bg-indigo-500/10" iconTextClass="text-indigo-500" delay={0} rawValue={TOTAL_CLAIMS} delta={claimsDelta} badge="Jul 2026" />
        <KpiCard title="Fraud Confirmed" value={TOTAL_FRAUD_CLAIMS} subtitle="Jul vs Jun" icon={AlertTriangle} bgClass="bg-red-500/10" iconTextClass="text-red-500" delay={50} delta={+((currMonth.fraud_claims - prevMonth.fraud_claims) / prevMonth.fraud_claims * 100).toFixed(0)} badge="15 of 200" />
        <KpiCard title="Fraud Rate" value={`${FRAUD_RATE}%`} subtitle="Jul vs Jun" icon={Target} bgClass="bg-orange-500/10" iconTextClass="text-orange-500" delta={fraudRateDelta} badge="Jul 2026" />
        <KpiCard title="Total Claim Value" value={formatCompactCurrency(TOTAL_CLAIM_VALUE)} subtitle="All 200 claims" icon={DollarSign} bgClass="bg-emerald-500/10" iconTextClass="text-emerald-500" delay={100} rawValue={Math.round(TOTAL_CLAIM_VALUE / 1000)} delta={claimValueDelta} badge="Cumulative" />
        <KpiCard title="Fraud Prevented (YTD)" value={formatCompactCurrency(FRAUD_PREVENTED)} subtitle="Stopped before payment" icon={ShieldCheck} bgClass="bg-green-500/10" iconTextClass="text-green-500" delay={150} rawValue={Math.round(FRAUD_PREVENTED / 1000)} delta={+((COST_SAVINGS_ACTUAL[5].saved - COST_SAVINGS_ACTUAL[4].saved) > 0 ? 3.6 : -3.6).toFixed(1)} deltaDirection="up-good" badge="Through Jul" tooltip="Cumulative amount stopped before payment through the fraud detection pipeline. Verified against Cost Savings Trend chart." />
        <KpiCard title="Overdue Investigations" value={OVERDUE_INVESTIGATIONS} subtitle="Under Review + AI Scored" icon={AlertCircle} bgClass="bg-amber-500/10" iconTextClass="text-amber-500" delay={175} badge="Active Pipeline" tooltip="Claims currently in the investigation pipeline: Under Review (28) + AI Scored (35). Renamed from 'Active Investigations' for accuracy." />
        <KpiCard title="Active Policies" value={ACTIVE_POLICIES} subtitle="Of 80 total policies" icon={Landmark} bgClass="bg-cyan-500/10" iconTextClass="text-cyan-500" delay={200} badge="Current" />
        <KpiCard title="Total Patients" value={formatNumber(TOTAL_PATIENTS)} subtitle="Policyholders" icon={Users} bgClass="bg-purple-500/10" iconTextClass="text-purple-500" delay={250} rawValue={TOTAL_PATIENTS} badge="Current" />
        <KpiCard title="Risk-Adjusted ROI" value={`${RISK_ADJUSTED_ROI}x`} subtitle={`$${formatCompactCurrency(FRAUD_PREVENTED).replace('$','')} saved / $${formatCompactCurrency(INVESTIGATION_COST).replace('$','')} cost`} icon={TrendingUp} bgClass="bg-teal-500/10" iconTextClass="text-teal-500" delay={300} badge="YTD" tooltip="Return on Investment: Fraud Prevented ÷ Estimated Investigation Cost. Based on $50K estimated operational cost for the SIU team." />
      </div>

      {/* ═══════════════════════════════════════════════════════
          ROW 2: Investigation Workload + Fraud Donut + Cost Savings
          ═══════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Investigation Workload */}
        <div className="bg-surface rounded-2xl border border-border/80 shadow-sm overflow-hidden hover:shadow-[0_8px_30px_rgb(0_0_0_/_0.06)] transition-shadow">
          <SECTION_HEADER icon={BarChart3} title="Investigation Workload" action="Lifecycle" />
          <div className="p-5 h-[320px]">
            <PlotlyChart data={[{
              x: INVESTIGATION_WORKLOAD.map(d => d.status),
              y: INVESTIGATION_WORKLOAD.map(d => d.count),
              type: 'bar',
              marker: { color: INVESTIGATION_WORKLOAD.map(d => WORKLOAD_COLORS[d.status]) },
              text: INVESTIGATION_WORKLOAD.map(d => d.count),
              textposition: 'outside',
              textfont: { size: 11, color: '#94a3b8', family: 'monospace' },
              hovertemplate: '%{x}<br>Claims: %{y}<extra></extra>',
            }]} layout={{
              margin: { t: 10, r: 10, l: 30, b: 50 },
              xaxis: { showgrid: false, tickangle: -30, tickfont: { size: 9 } },
              yaxis: { gridcolor: 'rgba(226,232,240,0.4)', title: { text: 'Claims', font: { size: 9, color: '#94a3b8' } } },
              showlegend: false, bargap: 0.35,
            }} />
          </div>
        </div>

        {/* Fraud vs Normal Donut + FP/FN */}
        <div className="bg-surface rounded-2xl border border-border/80 shadow-sm overflow-hidden hover:shadow-[0_8px_30px_rgb(0_0_0_/_0.06)] transition-shadow">
          <SECTION_HEADER icon={PieChart} title="Fraud vs Normal Ratio" action={`${FRAUD_RATE}%`} />
          <div className="p-5">
            <div className="h-[220px]">
              <PlotlyChart data={[{
                labels: ['Normal Claims', 'Fraud Claims'],
                values: [TOTAL_CLAIMS - TOTAL_FRAUD_CLAIMS, TOTAL_FRAUD_CLAIMS],
                type: 'pie', hole: 0.6,
                marker: { colors: ['#6366f1', '#ef4444'], line: { color: '#1e293b', width: 2 } },
                textinfo: 'label+percent', textposition: 'outside',
                textfont: { size: 10, color: '#94a3b8' },
                showlegend: false,
                domain: { x: [0.15, 0.85], y: [0.05, 0.95] },
                hoverinfo: 'label+value+percent',
                texttemplate: '%{label}<br>%{percent}',
              }]} layout={{
                margin: { t: 10, b: 10, l: 10, r: 10 }, height: 220, showlegend: false,
                annotations: [{ text: `<b>${FRAUD_RATE}%</b><br><span style="font-size:9px;color:#94a3b8">Fraud Rate</span>`, showarrow: false, font: { size: 18, color: '#ef4444' }, x: 0.5, y: 0.5 }],
              }} />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="bg-bg/40 rounded-xl border border-border/60 p-3 text-center">
                <p className="text-[9px] font-bold text-textSecondary uppercase tracking-wider">False Positive Rate</p>
                <p className="text-lg font-black text-warning font-mono mt-1">{MODEL_FPR}%</p>
                <p className="text-[9px] text-textSecondary mt-0.5">FP / (FP + TN)</p>
              </div>
              <div className="bg-bg/40 rounded-xl border border-border/60 p-3 text-center">
                <p className="text-[9px] font-bold text-textSecondary uppercase tracking-wider">False Negative Rate</p>
                <p className="text-lg font-black text-danger font-mono mt-1">{MODEL_FNR}%</p>
                <p className="text-[9px] text-textSecondary mt-0.5">FN / (FN + TP)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Cost Savings Trend — Actual + Forecast */}
        <div className="bg-surface rounded-2xl border border-border/80 shadow-sm overflow-hidden hover:shadow-[0_8px_30px_rgb(0_0_0_/_0.06)] transition-shadow">
          <SECTION_HEADER icon={DollarSign} title="Fraud Prevented (Cumulative)" action="Actual + Forecast" accent="success" />
          <div className="p-5 h-[320px]">
            <PlotlyChart data={[
              {
                x: [...COST_SAVINGS_ACTUAL.map(d => d.shortMonth)],
                y: [...COST_SAVINGS_ACTUAL.map(d => +(d.saved / 1000).toFixed(0))],
                type: 'scatter', mode: 'lines+markers', name: 'Actual',
                line: { color: '#10b981', width: 3, shape: 'spline' },
                marker: { size: 7, color: '#10b981', line: { color: '#059669', width: 2 } },
                fill: 'tozeroy', fillcolor: 'rgba(16, 185, 129, 0.06)',
                hovertemplate: '%{x}<br>$%{y}K<extra>Actual</extra>',
              },
              {
                x: ['Jul', ...COST_SAVINGS_FORECAST.map(d => d.shortMonth)],
                y: [COST_SAVINGS_ACTUAL[COST_SAVINGS_ACTUAL.length - 1].saved / 1000, ...COST_SAVINGS_FORECAST.map(d => +(d.saved / 1000).toFixed(0))],
                type: 'scatter', mode: 'lines+markers', name: 'Projected',
                line: { color: '#f59e0b', width: 2, shape: 'spline', dash: 'dash' },
                marker: { size: 5, color: '#f59e0b', symbol: 'diamond' },
                hovertemplate: '%{x}<br>$%{y}K<extra>Projected</extra>',
              },
            ]} layout={{
              margin: { t: 10, r: 10, l: 45, b: 30 },
              xaxis: { showgrid: false },
              yaxis: { gridcolor: 'rgba(226,232,240,0.4)', tickprefix: '$', ticksuffix: 'K' },
              legend: { orientation: 'h', y: -0.15, font: { size: 9 } },
              annotations: [{
                x: COST_SAVINGS_FORECAST[COST_SAVINGS_FORECAST.length - 1].shortMonth,
                y: +(COST_SAVINGS_FORECAST[COST_SAVINGS_FORECAST.length - 1].saved / 1000).toFixed(0),
                text: `<b>${formatCompactCurrency(475_000)}</b>`,
                showarrow: true, arrowhead: 2, arrowcolor: '#f59e0b',
                font: { size: 10, color: '#f59e0b' }, bgcolor: 'rgba(245,158,11,0.1)',
                bordercolor: '#f59e0b', borderwidth: 1, borderpad: 3, ax: 0, ay: -25,
              }],
            }} />
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          ROW 3: Monthly Trends + Provider Top 3 + Forecast
          ═══════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Trends (dual axis) — keep as-is */}
        <div className="bg-surface rounded-2xl border border-border/80 shadow-sm overflow-hidden hover:shadow-[0_8px_30px_rgb(0_0_0_/_0.06)] transition-shadow">
          <SECTION_HEADER icon={BarChart4} title="Monthly Trends" action="Jan-Jul 2026" />
          <div className="p-5 h-[340px]">
            <PlotlyChart data={[
              {
                x: MONTHLY_DATA.map(d => d.shortMonth),
                y: MONTHLY_DATA.map(d => d.claims),
                type: 'bar', name: 'Claim Volume',
                marker: { color: 'rgba(99, 102, 241, 0.7)', line: { color: '#6366f1', width: 1 } },
                yaxis: 'y', hovertemplate: '%{x}<br>Volume: %{y}<extra></extra>',
              },
              {
                x: MONTHLY_DATA.map(d => d.shortMonth),
                y: MONTHLY_DATA.map(d => +((d.fraud_claims / d.claims) * 100).toFixed(1)),
                type: 'scatter', mode: 'lines+markers', name: 'Fraud Rate %',
                line: { color: '#ef4444', width: 3, shape: 'spline' },
                marker: { size: 8, color: '#ef4444', line: { color: '#fff', width: 2 } },
                yaxis: 'y2', hovertemplate: '%{x}<br>Fraud Rate: %{y}%<extra></extra>',
              }
            ]} layout={{
              margin: { t: 10, r: 45, l: 35, b: 30 },
              xaxis: { showgrid: false },
              yaxis: { gridcolor: 'rgba(226,232,240,0.4)', title: { text: 'Volume', standoff: 5, font: { size: 9, color: '#94a3b8' } } },
              yaxis2: { overlaying: 'y', side: 'right', gridcolor: 'rgba(0,0,0,0)', title: { text: 'Fraud Rate %', standoff: 5, font: { size: 9, color: '#94a3b8' } }, tickfont: { color: '#ef4444' } },
              legend: { orientation: 'h', y: -0.15, font: { size: 9 } },
              barmode: 'group', bargap: 0.3,
            }} />
          </div>
        </div>

        {/* Top 3 Providers Summary + link */}
        <div className="bg-surface rounded-2xl border border-border/80 shadow-sm overflow-hidden hover:shadow-[0_8px_30px_rgb(0_0_0_/_0.06)] transition-shadow">
          <SECTION_HEADER icon={Building2} title="Top Risky Providers" action="Summary" />
          <div className="p-5 space-y-3">
            {TOP3_PROVIDERS.map((p, i) => {
              const rl = riskLabel(p.fraudRate);
              return (
                <div key={i} className="flex items-center justify-between bg-bg/40 rounded-xl border border-border/60 p-3.5 hover:bg-bg/60 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black ${cycleColor(i)}`}>{i + 1}</div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-textPrimary truncate">{p.name}</p>
                      <p className="text-[9px] text-textSecondary">{p.claimCount} claims · {formatCurrency(p.totalAmount)}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-sm font-black font-mono ${rl.color}`}>{p.fraudRate}%</span>
                    <p className="text-[9px] text-textSecondary">{p.fraudCount} fraud</p>
                  </div>
                </div>
              );
            })}
            <Link to="/insurance/providers" className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border/60 bg-bg/40 text-[10px] font-bold text-primary uppercase tracking-wider hover:bg-bg/60 transition-colors">
              View Full Report <ArrowRight size={12} />
            </Link>
          </div>
        </div>

        {/* Next Quarter Forecast */}
        <div className="bg-surface rounded-2xl border border-border/80 shadow-sm overflow-hidden hover:shadow-[0_8px_30px_rgb(0_0_0_/_0.06)] transition-shadow">
          <SECTION_HEADER icon={Layers} title="Next Quarter Forecast" action="Projected" accent="warning" />
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-bg/40 rounded-xl border border-border/60 p-3">
                <p className="text-[9px] font-bold text-textSecondary uppercase tracking-wider">Projected Claims</p>
                <p className="text-lg font-black text-textPrimary font-mono mt-1">{formatNumber(forecast.nextQuarterClaims)}</p>
                <p className="text-[10px] font-bold mt-0.5 flex items-center gap-1">
                  <ProjectedBadge />
                  <span className="text-textSecondary">Q3 (Aug-Sep)</span>
                </p>
              </div>
              <div className="bg-bg/40 rounded-xl border border-border/60 p-3">
                <p className="text-[9px] font-bold text-textSecondary uppercase tracking-wider">Proj. Fraud Rate</p>
                <p className="text-lg font-black text-danger font-mono mt-1">{forecast.projectedFraudRate}%</p>
                <p className="text-[10px] font-bold mt-0.5 flex items-center gap-1">
                  <ProjectedBadge />
                  <span className="text-textSecondary">Based on Q2 avg</span>
                </p>
              </div>
              <div className="bg-bg/40 rounded-xl border border-border/60 p-3">
                <p className="text-[9px] font-bold text-textSecondary uppercase tracking-wider">Proj. Year-End Savings</p>
                <p className="text-lg font-black text-success font-mono mt-1">{formatCompactCurrency(forecast.projectedSavingsYTD)}</p>
                <p className="text-[10px] font-bold mt-0.5 flex items-center gap-1">
                  <ProjectedBadge />
                  <span className="text-textSecondary">At current pace</span>
                </p>
              </div>
              <div className="bg-bg/40 rounded-xl border border-border/60 p-3">
                <p className="text-[9px] font-bold text-textSecondary uppercase tracking-wider">Q1→Q2 Growth</p>
                <p className="text-lg font-black text-primary font-mono mt-1">{forecast.growthRate > 0 ? '+' : ''}{forecast.growthRate}%</p>
                <p className="text-[10px] text-textSecondary font-bold mt-0.5">Claims volume</p>
              </div>
            </div>
            <div className="bg-accent/5 border border-accent/10 rounded-xl p-3 text-[10px] text-textSecondary leading-relaxed">
              <span className="font-bold text-accent">Methodology: </span>
              Projections use 3-month trailing average from actual Q1-Q2 data. No external regression model. Claims growth = (Q2 total − Q1 total) / Q1 total.
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          ROW 4: Top 3 Diagnoses + Heatmap + Model Performance
          ═══════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top 3 Diagnoses Summary + link */}
        <div className="bg-surface rounded-2xl border border-border/80 shadow-sm overflow-hidden hover:shadow-[0_8px_30px_rgb(0_0_0_/_0.06)] transition-shadow">
          <SECTION_HEADER icon={Search} title="Top Risky Diagnoses" action="Top 3 ICD" />
          <div className="p-5 space-y-3">
            {TOP3_DIAGNOSES.map((d, i) => {
              const rl = riskLabel(d.fraudRate);
              return (
                <div key={i} className="flex items-center justify-between bg-bg/40 rounded-xl border border-border/60 p-3.5 hover:bg-bg/60 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black ${cycleColor(i)}`}>{i + 1}</div>
                    <div>
                      <p className="text-xs font-bold font-mono text-primary">{d.code}</p>
                      <p className="text-[9px] text-textSecondary">{d.desc} · {d.claims} claims</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-black font-mono ${rl.color}`}>{d.fraudRate}%</span>
                    <p className="text-[9px] text-textSecondary">{d.fraud} fraud</p>
                  </div>
                </div>
              );
            })}
            <Link to="/insurance/flagged" className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border/60 bg-bg/40 text-[10px] font-bold text-primary uppercase tracking-wider hover:bg-bg/60 transition-colors">
              View Full Report <ArrowRight size={12} />
            </Link>
          </div>
        </div>

        {/* US Fraud Heatmap (mini) */}
        <div className="bg-surface rounded-2xl border border-border/80 shadow-sm overflow-hidden hover:shadow-[0_8px_30px_rgb(0_0_0_/_0.06)] transition-shadow">
          <SECTION_HEADER icon={Target} title="US Fraud Heatmap" action="Regional" />
          <div className="p-3 h-[340px]">
            <PlotlyChart data={[{
              type: 'choropleth', locationmode: 'USA-states',
              locations: REGIONAL_DATA.map(r => r.state),
              z: REGIONAL_DATA.map(r => r.fraudRate),
              text: REGIONAL_DATA.map(r => `${r.state}<br>Claims: ${r.claims}<br>Fraud: ${r.fraud}<br>Rate: ${r.fraudRate}%`),
              hoverinfo: 'text',
              colorscale: [[0, '#1e293b'], [0.05, '#334155'], [0.1, '#6366f1'], [0.2, '#f59e0b'], [0.35, '#ef4444']],
              colorbar: { title: { text: 'Fraud %', font: { size: 9, color: '#94a3b8' } }, tickfont: { size: 8, color: '#94a3b8' }, thickness: 10, len: 0.6, bgcolor: 'rgba(0,0,0,0)' },
              marker: { line: { color: '#334155', width: 0.5 } },
            }]} layout={{
              margin: { t: 5, r: 5, l: 5, b: 5 },
              geo: { scope: 'usa', showlakes: true, lakecolor: 'rgba(0,0,0,0)', bgcolor: 'rgba(0,0,0,0)', landcolor: '#1e293b', subunitcolor: '#334155', countrycolor: '#334155' },
            }} />
            <Link to="/insurance/fraud-heatmap" className="flex items-center justify-center gap-1.5 py-1.5 text-[9px] font-bold text-primary uppercase tracking-wider hover:underline">
              Full Heatmap <ExternalLink size={10} />
            </Link>
          </div>
        </div>

        {/* Model Performance (MLOps) */}
        <div className="bg-surface rounded-2xl border border-border/80 shadow-sm overflow-hidden hover:shadow-[0_8px_30px_rgb(0_0_0_/_0.06)] transition-shadow">
          <SECTION_HEADER icon={BrainCircuit} title="Model Performance (MLOps)" action="v3.2.1" accent="success" />
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-bg/40 rounded-xl border border-border/60 p-3 text-center">
                <p className="text-[9px] font-bold text-textSecondary uppercase tracking-wider">Precision</p>
                <p className="text-lg font-black text-primary font-mono mt-1">{MODEL_PRECISION}%</p>
              </div>
              <div className="bg-bg/40 rounded-xl border border-border/60 p-3 text-center">
                <p className="text-[9px] font-bold text-textSecondary uppercase tracking-wider">Recall (Detection Rate)</p>
                <p className="text-lg font-black text-emerald-500 font-mono mt-1">{MODEL_RECALL}%</p>
                <p className="text-[8px] text-textSecondary mt-0.5">= Detection Rate</p>
              </div>
              <div className="bg-bg/40 rounded-xl border border-border/60 p-3 text-center">
                <p className="text-[9px] font-bold text-textSecondary uppercase tracking-wider">F1-Score</p>
                <p className="text-lg font-black text-accent font-mono mt-1">{MODEL_F1}%</p>
              </div>
              <div className="bg-bg/40 rounded-xl border border-border/60 p-3 text-center">
                <p className="text-[9px] font-bold text-textSecondary uppercase tracking-wider">ROC AUC</p>
                <p className="text-lg font-black text-cyan-500 font-mono mt-1">{MODEL_ROC_AUC}%</p>
                <p className="text-[8px] text-textSecondary mt-0.5 flex items-center justify-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                  Next-Gen Target
                </p>
              </div>
            </div>
            <div className="bg-bg/40 rounded-xl border border-border/60 p-3 space-y-2">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-textSecondary font-semibold">Model Version</span>
                <span className="font-black text-textPrimary font-mono">v3.2.1</span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-textSecondary font-semibold">Last Retrained</span>
                <span className="font-black text-textPrimary font-mono">Jun 26, 2026</span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-textSecondary font-semibold">Training Size</span>
                <span className="font-black text-textPrimary font-mono">128,459</span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-textSecondary font-semibold">Features</span>
                <span className="font-black text-textPrimary font-mono">47</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          ROW 5: Accuracy Trend (with benchmark) + Funnel + Fraud Probability
          ═══════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Model Accuracy Trend + Industry Benchmark */}
        <div className="bg-surface rounded-2xl border border-border/80 shadow-sm overflow-hidden hover:shadow-[0_8px_30px_rgb(0_0_0_/_0.06)] transition-shadow">
          <SECTION_HEADER icon={Activity} title="Recall (Detection Rate) Trend" action="6-Month" />
          <div className="p-5 h-[280px]">
            <PlotlyChart data={[
              {
                x: MODEL_ACCURACY_TREND.map(d => d.month.replace(' 2026', '')),
                y: MODEL_ACCURACY_TREND.map(d => d.accuracy),
                type: 'scatter', mode: 'lines+markers', name: 'Model Accuracy',
                line: { color: '#10b981', width: 3, shape: 'spline' },
                marker: { size: 8, color: '#10b981', line: { color: '#fff', width: 2 } },
                fill: 'tozeroy', fillcolor: 'rgba(16,185,129,0.05)',
                hovertemplate: '%{x}<br>Accuracy: %{y}%<extra></extra>',
              },
              {
                x: MODEL_ACCURACY_TREND.map(d => d.month.replace(' 2026', '')),
                y: MODEL_ACCURACY_TREND.map(() => INDUSTRY_BENCHMARK_RECALL),
                type: 'scatter', mode: 'lines', name: `Industry Avg (${INDUSTRY_BENCHMARK_RECALL}%)`,
                line: { color: '#94a3b8', width: 2, dash: 'dot' },
                hovertemplate: 'Industry Average: %{y}%<extra></extra>',
              },
            ]} layout={{
              margin: { t: 10, r: 10, l: 40, b: 30 },
              xaxis: { showgrid: false },
              yaxis: { gridcolor: 'rgba(226,232,240,0.4)', range: [70, 96], ticksuffix: '%' },
              legend: { orientation: 'h', y: -0.2, font: { size: 9 } },
              annotations: [{
                x: MODEL_ACCURACY_TREND[MODEL_ACCURACY_TREND.length - 1].month.replace(' 2026', ''),
                y: MODEL_ACCURACY_TREND[MODEL_ACCURACY_TREND.length - 1].accuracy,
                text: `<b>${MODEL_ACCURACY}%</b>`,
                showarrow: true, arrowhead: 2, arrowcolor: '#10b981',
                font: { size: 11, color: '#10b981' }, bgcolor: 'rgba(16,185,129,0.1)',
                bordercolor: '#10b981', borderwidth: 1, borderpad: 4, ax: 0, ay: -25,
              }],
            }} />
          </div>
        </div>

        {/* Fraud Detection Funnel */}
        <div className="bg-surface rounded-2xl border border-border/80 shadow-sm overflow-hidden hover:shadow-[0_8px_30px_rgb(0_0_0_/_0.06)] transition-shadow">
          <SECTION_HEADER icon={Layers} title="Fraud Detection Funnel" action="Pipeline" accent="warning" />
          <div className="p-5 space-y-3">
            {FRAUD_DETECTION_FUNNEL.map((stage, i) => {
              const widthPct = (stage.value / TOTAL_CLAIMS) * 100;
              return (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold text-textSecondary uppercase tracking-wider">{stage.stage}</span>
                    <span className="font-black text-textPrimary font-mono">{stage.value}</span>
                  </div>
                  <div className="w-full bg-bg/60 rounded-full h-3 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${widthPct}%`, backgroundColor: stage.color }} />
                  </div>
                </div>
              );
            })}
            <div className="bg-bg/40 rounded-xl border border-border/60 p-3 text-[10px] text-textSecondary leading-relaxed mt-2">
              <span className="font-bold text-primary">Pipeline: </span>
              {TOTAL_FRAUD_CLAIMS} claims ({FRAUD_RATE}%) flagged. 8 escalated for legal review.
            </div>
          </div>
        </div>

        {/* Fraud Probability Distribution */}
        <div className="bg-surface rounded-2xl border border-border/80 shadow-sm overflow-hidden hover:shadow-[0_8px_30px_rgb(0_0_0_/_0.06)] transition-shadow">
          <SECTION_HEADER icon={BarChart3} title="Fraud Probability Dist." action="200 Claims" />
          <div className="p-5 h-[280px]">
            <PlotlyChart data={[{
              x: FRAUD_PROB_BUCKETS.map(b => b.range),
              y: FRAUD_PROB_BUCKETS.map(b => b.count),
              type: 'bar', name: 'Claims',
              marker: { color: FRAUD_PROB_BUCKETS.map(b => b.midpoint >= RISK.MEDIUM ? '#ef4444' : b.midpoint >= RISK.LOW ? '#f59e0b' : '#6366f1') },
              text: FRAUD_PROB_BUCKETS.map(b => b.count > 2 ? b.count : ''),
              textposition: 'outside', textfont: { size: 9, color: '#94a3b8', family: 'monospace' },
              hovertemplate: '%{x}<br>Claims: %{y}<extra></extra>',
            }]} layout={{
              margin: { t: 10, r: 10, l: 30, b: 50 },
              xaxis: { showgrid: false, tickangle: -45, tickfont: { size: 8 } },
              yaxis: { gridcolor: 'rgba(226,232,240,0.4)' },
              showlegend: false, bargap: 0.15,
            }} />
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          ROW 6: AI Insights + Recommendations (interactive)
          ═══════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Insights */}
        <div className="bg-surface rounded-2xl border border-border/80 shadow-sm overflow-hidden hover:shadow-[0_8px_30px_rgb(0_0_0_/_0.06)] transition-shadow">
          <SECTION_HEADER icon={Lightbulb} title="AI Business Insights" action={`${AI_INSIGHTS_DATA.length} Insights`} accent="warning" />
          <div className="p-5 space-y-3 max-h-[420px] overflow-y-auto custom-scrollbar">
            {AI_INSIGHTS_DATA.map((insight, i) => {
              const isCritical = insight.priority === 'high';
              const pColor = isCritical ? 'bg-red-500/10 text-red-500 border-red-500/20' : insight.priority === 'medium' ? 'bg-warning/10 text-warning border-warning/20' : 'bg-green-500/10 text-green-500 border-green-500/20';
              return (
                <div key={i} className="bg-bg/40 rounded-xl border border-border/60 p-3.5 hover:bg-bg/60 transition-colors">
                  <div className="flex items-start gap-3">
                    {isCritical ? <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" /> : insight.priority === 'medium' ? <AlertTriangle size={14} className="text-warning shrink-0 mt-0.5" /> : <CheckCircle size={14} className="text-green-500 shrink-0 mt-0.5" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${pColor}`}>{isCritical ? 'Critical' : insight.priority === 'medium' ? 'Warning' : 'Info'}</span>
                        <span className="text-[9px] text-textSecondary uppercase tracking-wider">{insight.type}</span>
                        <span className="text-[8px] font-bold uppercase tracking-wider text-success bg-success/10 px-1.5 py-0.5 rounded border border-success/20 ml-auto">Live</span>
                      </div>
                      <h4 className="text-xs font-bold text-textPrimary">{insight.title}</h4>
                      <p className="text-[10px] text-textSecondary mt-0.5 leading-relaxed">{insight.desc}</p>
                      {isCritical && (
                        <Link to="/insurance/alerts" className="inline-flex items-center gap-1 mt-2 text-[9px] font-bold text-red-500 hover:underline">
                          <Eye size={10} /> View in Alert Center
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Executive Recommendations (interactive workflow) */}
        <div className="bg-surface rounded-2xl border border-border/80 shadow-sm overflow-hidden hover:shadow-[0_8px_30px_rgb(0_0_0_/_0.06)] transition-shadow">
          <SECTION_HEADER icon={Target} title="Executive Recommendations" action="Workflow" />
          <div className="p-5 space-y-3 max-h-[420px] overflow-y-auto custom-scrollbar">
            {recs.map((rec) => {
              const borderColor = rec.priority === 'critical' ? 'border-l-red-500' : rec.priority === 'high' ? 'border-l-orange-500' : rec.priority === 'medium' ? 'border-l-primary' : 'border-l-textSecondary';
              const badgeColor = rec.priority === 'critical' ? 'bg-red-500/10 text-red-500 border-red-500/20' : rec.priority === 'high' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' : rec.priority === 'medium' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-green-500/10 text-green-500 border-green-500/20';
              const statusColor = rec.status === 'Approved' ? 'bg-green-500/10 text-green-500 border-green-500/20' : rec.status === 'In Progress' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : rec.status === 'Dismissed' ? 'bg-slate-500/10 text-slate-500 border-slate-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20';
              return (
                <div key={rec.id} className={`border-l-4 ${borderColor} bg-bg/40 rounded-xl border border-border/60 p-3.5 hover:bg-bg/60 transition-colors`}>
                  <div className="flex items-start gap-3">
                    <rec.icon size={16} className="text-textSecondary shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${badgeColor}`}>{rec.priority}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${statusColor}`}>{rec.status}</span>
                        <span className="text-[9px] font-bold text-success">{rec.metric}</span>
                      </div>
                      <h4 className="text-xs font-bold text-textPrimary">{rec.title}</h4>
                      <p className="text-[10px] text-textSecondary mt-0.5 leading-relaxed">{rec.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-[9px] text-textSecondary">
                        <span><strong>Owner:</strong> {rec.owner}</span>
                        <span><strong>Due:</strong> {rec.dueDate}</span>
                      </div>
                      {rec.status === 'Pending' && (
                        <div className="flex items-center gap-2 mt-2.5">
                          <button onClick={() => handleRecStatus(rec.id, 'In Progress')} className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-[9px] font-bold border border-primary/20 hover:bg-primary/20 transition-colors">
                            Assign
                          </button>
                          <button onClick={() => handleRecStatus(rec.id, 'Approved')} className="px-3 py-1.5 rounded-lg bg-green-500/10 text-green-500 text-[9px] font-bold border border-green-500/20 hover:bg-green-500/20 transition-colors">
                            Approve
                          </button>
                        </div>
                      )}
                      {rec.status === 'In Progress' && (
                        <button onClick={() => handleRecStatus(rec.id, 'Approved')} className="mt-2.5 px-3 py-1.5 rounded-lg bg-green-500/10 text-green-500 text-[9px] font-bold border border-green-500/20 hover:bg-green-500/20 transition-colors">
                          Mark Complete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          ROW 7: Fraud Categories + Financial Trend
          ═══════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface rounded-2xl border border-border/80 shadow-sm overflow-hidden hover:shadow-[0_8px_30px_rgb(0_0_0_/_0.06)] transition-shadow">
          <SECTION_HEADER icon={PieChart} title="Fraud Categories" action="Distribution" />
          <div className="p-5 h-[320px] flex items-center justify-center">
            <PlotlyChart data={[{
              labels: FRAUD_CATEGORIES.map(c => c.category),
              values: FRAUD_CATEGORIES.map(c => c.count),
              type: 'pie', hole: 0.55,
              marker: { colors: ['#ef4444', '#f59e0b', '#8b5cf6', '#3b82f6', '#10b981', '#ec4899', '#64748b'], line: { color: '#1e293b', width: 2 } },
              textinfo: 'label+percent', textposition: 'outside',
              textfont: { size: 9, color: '#94a3b8' },
              texttemplate: '%{label}<br>%{percent}',
              showlegend: false,
              domain: { x: [0.1, 0.9], y: [0.1, 0.9] },
              hoverinfo: 'label+value+percent',
            }]} layout={{
              margin: { t: 10, b: 20, l: 10, r: 60 }, height: 300, showlegend: false,
              paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
            }} />
          </div>
        </div>

        <div className="bg-surface rounded-2xl border border-border/80 shadow-sm overflow-hidden hover:shadow-[0_8px_30px_rgb(0_0_0_/_0.06)] transition-shadow">
          <SECTION_HEADER icon={DollarSign} title="Financial Trend" action="Claim Value ($M)" />
          <div className="p-5 h-[320px]">
            <PlotlyChart data={[
              {
                x: MONTHLY_DATA.map(d => d.shortMonth),
                y: MONTHLY_DATA.map(d => +(d.amount / 1_000_000).toFixed(2)),
                type: 'scatter', mode: 'lines+markers', name: 'Total ($M)',
                line: { color: '#6366f1', width: 3, shape: 'spline' },
                marker: { size: 6, color: '#6366f1', line: { color: '#fff', width: 1.5 } },
                fill: 'tozeroy', fillcolor: 'rgba(99, 102, 241, 0.05)',
                hovertemplate: '%{x}<br>Total: $%{y:.2f}M<extra></extra>',
              },
              {
                x: MONTHLY_DATA.map(d => d.shortMonth),
                y: MONTHLY_DATA.map(d => +(d.fraud_amount / 1_000_000).toFixed(2)),
                type: 'scatter', mode: 'lines+markers', name: 'Fraud ($M)',
                line: { color: '#ef4444', width: 3, shape: 'spline' },
                marker: { size: 6, color: '#ef4444', line: { color: '#fff', width: 1.5 } },
                fill: 'tozeroy', fillcolor: 'rgba(239, 68, 68, 0.05)',
                hovertemplate: '%{x}<br>Fraud: $%{y:.2f}M<extra></extra>',
              },
            ]} layout={{
              margin: { t: 10, r: 10, l: 40, b: 30 },
              xaxis: { showgrid: false },
              yaxis: { gridcolor: 'rgba(226,232,240,0.5)', tickprefix: '$', ticksuffix: 'M', title: { text: 'Amount ($M)', font: { size: 9, color: '#94a3b8' } } },
              legend: { orientation: 'h', y: -0.15, font: { size: 9 } },
            }} />
          </div>
        </div>
      </div>
    </div>
  );
}
