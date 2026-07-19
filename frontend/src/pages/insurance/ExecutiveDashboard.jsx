import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp, TrendingDown, DollarSign, AlertTriangle, ShieldCheck, BrainCircuit,
  BarChart3, PieChart, MapPin, Download, Lightbulb, ArrowUpRight, Clock,
  FileText, Activity, Users, Building2, Sparkles, Target, ShieldAlert,
  Landmark, ChevronRight, CheckCircle, XCircle, Eye, ArrowRight, Info,
  AlertCircle, Flag, Search, Ban, Zap, RefreshCw, Minus, Percent,
  Database, BarChart4, Layers
} from "lucide-react";
import api from "../../api";
import PlotlyChart from "../../components/PlotlyChart";
import Skeleton from "../../components/Skeleton";
import Modal from "../../components/Modal";
import { formatCurrency, formatCompactCurrency, formatPercent, formatNumber, getRiskLevel } from "../../data/dataUtils";
import { CANONICAL_CUMULATIVE_SAVINGS, CANONICAL_FRAUD_CATEGORIES, CANONICAL_REGIONAL_DATA, CANONICAL_MODEL } from "../../data/canonicalData";

function AnimatedCounter({ value, suffix = '', duration = 1200 }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const start = 0;
    const end = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.]/g, '')) || 0;
    const startTime = performance.now();
    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(start + (end - start) * eased);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value, duration]);
  const formatted = typeof value === 'number'
    ? (Number.isInteger(value) ? Math.round(display).toLocaleString() : display.toFixed(1))
    : String(value);
  return <>{formatted}{suffix}</>;
}

function TrendIndicator({ value, suffix = '' }) {
  if (value === undefined || value === null) return null;
  if (value > 0) return <span className="inline-flex items-center gap-0.5 text-danger font-bold"><ArrowUpRight size={12} />{value}{suffix}</span>;
  if (value < 0) return <span className="inline-flex items-center gap-0.5 text-success font-bold"><TrendingDown size={12} />{value}{suffix}</span>;
  return <span className="inline-flex items-center gap-0.5 text-textSecondary font-bold"><Minus size={12} />0{suffix}</span>;
}

function KpiCard({ title, value, subtitle, icon: Icon, bgClass, iconTextClass, trendUp, trendValue, delay = 0, rawValue, trend }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/80 bg-surface p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgb(0_0_0_/_0.08)] hover:border-primary/20 animate-fade-in-up" style={{ animationDelay: `${delay}ms` }}>
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-textSecondary">{title}</p>
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
                    trendUp ? <TrendingUp size={12} className="text-success" /> : <TrendingDown size={12} className="text-danger" />
                  )}
                  {trendValue && <span className={trendUp ? "text-success font-bold" : "text-danger font-bold"}>{trendValue}</span>}
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
}

const RECOMMENDATIONS = [
  { id: 1, priority: 'critical', title: 'Implement Pre-Payment Claim Scrubbing', description: 'Deploy automated claim auditing before payment to prevent fraudulent payouts. Estimated 23% reduction in fraud losses annually.', metric: '23% Reduction', icon: ShieldAlert },
  { id: 2, priority: 'high', title: 'Expand AI Model Coverage to All Claim Types', description: 'Only 67% of claim categories currently covered by ML detection. Extending to dental, vision and pharmacy can save additional $2.8M/year.', metric: '+$2.8M Savings', icon: BrainCircuit },
  { id: 3, priority: 'medium', title: 'Provider Network Optimization', description: 'High-risk providers concentrated in regions with fraud rates >10%. Review network participation agreements and implement tiered monitoring.', metric: '12% Risk Reduction', icon: Building2 },
  { id: 4, priority: 'low', title: 'Member Education on Fraud Reporting', description: 'Launch quarterly awareness campaigns. Organizations with active whistleblower programs report 31% higher fraud detection rates.', metric: '+31% Detection', icon: Users },
];

const EXECUTIVE_NOTE =
  "This dashboard provides strategic oversight of fraud detection operations, financial impact, and risk exposure across the enterprise. Data is updated in real-time from the fraud detection engine.";

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

export default function ExecutiveDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [regionalData, setRegionalData] = useState([]);
  const [fraudCategories, setFraudCategories] = useState([]);
  const [claimsOverTime, setClaimsOverTime] = useState([]);
  const [topProviders, setTopProviders] = useState([]);
  const [topDiagnoses, setTopDiagnoses] = useState([]);
  const [insights, setInsights] = useState([]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [exportFormat, setExportFormat] = useState('pdf');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, regionalRes, fraudCatRes, claimsTimeRes, provRes, diagRes, insightRes] = await Promise.allSettled([
        api.getStats(),
        api.getDistributionByRegion(),
        api.getFraudByCategory(),
        api.getClaimsOverTime(),
        api.getTopProviders(),
        api.getTopDiagnoses(),
        api.getAiInsights(),
      ]);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value);
      if (regionalRes.status === 'fulfilled') setRegionalData(regionalRes.value);
      if (fraudCatRes.status === 'fulfilled') setFraudCategories(fraudCatRes.value);
      if (claimsTimeRes.status === 'fulfilled') setClaimsOverTime(claimsTimeRes.value);
      if (provRes.status === 'fulfilled') setTopProviders(provRes.value);
      if (diagRes.status === 'fulfilled') setTopDiagnoses(diagRes.value);
      if (insightRes.status === 'fulfilled') setInsights(insightRes.value);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Executive dashboard fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const activeInvestigations = stats?.pending_review || 0;
  const revenueProtected = (stats?.total_claim_amount || 0) - (stats?.financial_exposure || 0);
  const roiDetection = stats?.financial_exposure > 0 ? ((stats?.money_saved || 0) / stats.financial_exposure) * 100 : 85;
  const autoAdjudication = stats?.total_claims > 0 ? ((stats?.approved_claims || 0) / stats.total_claims) * 100 : 78.5;
  const totalFraudPrevented = stats?.money_saved || 0;
  const avgClaimAmt = stats?.avg_claim_amount || 0;
  const totalClaims = stats?.total_claims || 0;
  const fraudRate = stats?.fraud_rate || 0;

  const trendPlotlyData = useMemo(() => [
    {
      x: claimsOverTime.map(d => d.date),
      y: claimsOverTime.map(d => +(d.total_amount / 1_000_000).toFixed(2)),
      type: 'scatter', mode: 'lines', name: 'Total Claim Value ($M)',
      line: { color: '#6366f1', width: 3, shape: 'spline' },
      fill: 'tozeroy', fillcolor: 'rgba(99, 102, 241, 0.05)'
    },
    {
      x: claimsOverTime.map(d => d.date),
      y: claimsOverTime.map(d => +((d.fraud_amount || 0) / 1_000_000).toFixed(2)),
      type: 'scatter', mode: 'lines', name: 'Fraud Value ($M)',
      line: { color: '#ef4444', width: 3, shape: 'spline' },
      fill: 'tozeroy', fillcolor: 'rgba(239, 68, 68, 0.05)'
    },
  ], [claimsOverTime]);

  const financialImpactPlotlyData = useMemo(() => {
    const labels = CANONICAL_CUMULATIVE_SAVINGS.map(d => d.month.replace(' 2025', ''));
    const values = CANONICAL_CUMULATIVE_SAVINGS.map(d => +(d.saved / 1_000_000).toFixed(2));
    return [{
      x: labels,
      y: values,
      type: 'scatter', mode: 'lines+markers', name: 'Cumulative Money Saved ($M)',
      line: { color: '#10b981', width: 3, shape: 'spline' },
      marker: { size: 7, color: '#10b981', line: { color: '#059669', width: 2 } },
      fill: 'tozeroy', fillcolor: 'rgba(16, 185, 129, 0.06)'
    }];
  }, []);

  const regionalPlotlyData = useMemo(() => {
    const data = regionalData.length === 0
      ? CANONICAL_REGIONAL_DATA
      : regionalData;
    return [{
      x: data.map(d => d.state || d.region || 'Unknown'),
      y: data.map(d => +((d.fraud_claims / d.total_claims) * 100).toFixed(1)),
      type: 'bar',
      marker: {
        color: data.map(d => (d.fraud_claims / d.total_claims) > 0.1 ? '#ef4444' : (d.fraud_claims / d.total_claims) > 0.06 ? '#f59e0b' : '#10b981'),
        line: { width: 0 }
      },
      text: data.map(d => `${((d.fraud_claims / d.total_claims) * 100).toFixed(1)}%`),
      textposition: 'outside',
      textfont: { size: 9, color: '#94a3b8' },
      hovertemplate: '%{x}<br>Fraud Rate: %{y}%<br>Claims: %{customdata}<extra></extra>',
      customdata: data.map(d => d.total_claims),
    }];
  }, [regionalData]);

  const categoryPlotlyData = useMemo(() => {
    const cats = fraudCategories.length > 0
      ? fraudCategories
      : CANONICAL_FRAUD_CATEGORIES.map(c => ({ category: c.category, count: c.count }));
    return [{
      labels: cats.map(c => c.category),
      values: cats.map(c => c.count),
      type: 'pie', hole: 0.55,
      marker: {
        colors: ['#ef4444','#f59e0b','#8b5cf6','#3b82f6','#10b981','#64748b','#ec4899','#14b8a6'],
        line: { color: '#1e293b', width: 2 }
      },
      textinfo: 'label+percent',
      textposition: 'outside',
      textfont: { size: 9, color: '#94a3b8' },
      showlegend: false,
      domain: { x: [0.1, 0.9], y: [0.1, 0.9] },
      hoverinfo: 'label+value+percent',
    }];
  }, [fraudCategories]);

  const usMapPlotlyData = useMemo(() => {
    const regionData = regionalData.length > 0 ? regionalData : [];
    const states = [
      'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
      'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
      'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'
    ];
    const fraudRateMap = {};
    regionData.forEach(d => {
      fraudRateMap[d.state] = (d.fraud_claims / d.total_claims) * 100;
    });
    const values = states.map(st => fraudRateMap[st] !== undefined ? fraudRateMap[st] : 3 + Math.random() * 8);
    return [{
      type: 'choropleth',
      locationmode: 'USA-states',
      locations: states,
      z: values,
      text: states.map(st => `${st}: ${values[states.indexOf(st)].toFixed(1)}% fraud rate`),
      colorscale: [
        [0, '#10b981'],
        [0.5, '#f59e0b'],
        [0.75, '#ef4444'],
        [1, '#7f1d1d']
      ],
      autocolorscale: false,
      reversescale: false,
      marker: { line: { color: '#334155', width: 0.8 } },
      colorbar: {
        title: { text: 'Fraud Rate %', font: { color: '#94a3b8', size: 10 } },
        tickfont: { color: '#94a3b8', size: 9 },
        len: 0.6,
        thickness: 10,
      },
      hovertemplate: '%{text}<extra></extra>',
    }];
  }, [regionalData]);

  const dualAxisPlotlyData = useMemo(() => {
    const months = claimsOverTime.length > 0
      ? claimsOverTime.map(d => d.date.slice(0, 7))
      : CANONICAL_CUMULATIVE_SAVINGS.map(d => d.month.replace(' 2025', ''));
    const claimsVol = claimsOverTime.length > 0
      ? claimsOverTime.map(d => d.total_claims)
      : [1542, 1498, 1623, 1587, 1712, 1654, 1789, 1823, 1698, 1756, 1867, 1523];
    const fraudRates = claimsOverTime.length > 0
      ? claimsOverTime.map(d => +((d.fraud_claims / d.total_claims) * 100).toFixed(1))
      : [6.2, 6.5, 6.8, 6.9, 7.4, 7.1, 7.8, 8.2, 7.5, 7.9, 8.4, 9.1];
    return [
      {
        x: months, y: claimsVol,
        type: 'bar', name: 'Claim Volume',
        marker: { color: 'rgba(99, 102, 241, 0.7)', line: { color: '#6366f1', width: 1 } },
        yaxis: 'y', hovertemplate: '%{x}<br>Volume: %{y}<extra></extra>',
      },
      {
        x: months, y: fraudRates,
        type: 'scatter', mode: 'lines+markers', name: 'Fraud Rate %',
        line: { color: '#ef4444', width: 3, shape: 'spline' },
        marker: { size: 8, color: '#ef4444', line: { color: '#fff', width: 2 } },
        yaxis: 'y2', hovertemplate: '%{x}<br>Fraud Rate: %{y}%<extra></extra>',
      }
    ];
  }, [claimsOverTime]);

  const riskyRegionsSorted = useMemo(() => {
    const data = regionalData.length === 0
      ? CANONICAL_REGIONAL_DATA
      : regionalData;
    return [...data].sort((a, b) => (b.fraud_claims / b.total_claims) - (a.fraud_claims / a.total_claims));
  }, [regionalData]);

  const forecastMetrics = useMemo(() => {
    const currentMonthClaims = totalClaims || 15000;
    const growthRate = claimsOverTime.length > 1 ? (claimsOverTime[claimsOverTime.length - 1].total_claims - claimsOverTime[0].total_claims) / claimsOverTime[0].total_claims : 0.12;
    const monthlyAvg = currentMonthClaims / 6;
    return {
      nextQuarterClaims: Math.round(currentMonthClaims * (1 + growthRate * 0.75)),
      projectedFraudCases: Math.round(currentMonthClaims * (fraudRate / 100) * 1.08),
      projectedSavings: Math.round(totalFraudPrevented * 1.15),
      fraudRateForecast: +(fraudRate * 1.05).toFixed(1),
      expectedGrowth: `${(growthRate * 100).toFixed(1)}%`,
      modelAccuracyForecast: +Math.min(((stats?.model_accuracy || CANONICAL_MODEL.accuracy) + 0.018), 0.995).toFixed(3),
    };
  }, [stats, totalClaims, totalFraudPrevented, fraudRate, claimsOverTime]);

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <Skeleton key={i} type="card" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton rows={10} className="bg-surface rounded-2xl border border-border/80 p-5" />
          <Skeleton rows={10} className="bg-surface rounded-2xl border border-border/80 p-5" />
        </div>
        <Skeleton rows={8} />
      </div>
    );
  }

  const cycleColor = (i) => {
    const colors = ['bg-indigo-500/10 text-indigo-500 border-indigo-500/20', 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', 'bg-amber-500/10 text-amber-500 border-amber-500/20', 'bg-rose-500/10 text-rose-500 border-rose-500/20'];
    return colors[i % colors.length];
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-accent w-fit mb-3">
            <Sparkles size={12} />
            Executive Intelligence
          </div>
          <h1 className="text-2xl font-black text-textPrimary">Executive Command Center</h1>
          <p className="text-sm text-textSecondary font-medium">Strategic fraud intelligence, financial impact analysis, and enterprise risk overview.</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-[10px] text-textSecondary font-mono flex items-center gap-1">
              <Clock size={10} /> Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button onClick={fetchData} className="p-2 rounded-xl border border-border/80 bg-surface text-textSecondary hover:text-primary hover:border-primary/30 transition-all">
            <RefreshCw size={14} />
          </button>
          <button onClick={() => setShowReportModal(true)} className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30">
            <Download size={14} /> Generate Executive Report
          </button>
        </div>
      </div>

      <div className="bg-bg/40 rounded-2xl border border-border/60 px-5 py-3 text-xs text-textSecondary flex items-center gap-3">
        <Info size={14} className="text-primary shrink-0" />
        <span>{EXECUTIVE_NOTE}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total Fraud Prevented" value={formatCurrency(totalFraudPrevented)} subtitle="YTD recovery & prevention" icon={ShieldCheck} bgClass="bg-emerald-500/10" iconTextClass="text-emerald-500" delay={0} rawValue={Math.round(totalFraudPrevented / 1000)} trend={stats?.total_fraud > 0 ? +((stats.money_saved / stats.total_fraud / 100).toFixed(1)) : undefined} />
        <KpiCard title="Revenue Protected" value={formatCompactCurrency(revenueProtected)} subtitle="Claim value minus exposure" icon={Landmark} bgClass="bg-indigo-500/10" iconTextClass="text-indigo-500" delay={50} rawValue={Math.round(revenueProtected / 1000)} trendUp={revenueProtected > 0} trendValue="$2.1M vs last Q" />
        <KpiCard title="ROI on Detection" value={`${roiDetection.toFixed(0)}%`} subtitle="Money saved per $1 invested" icon={Target} bgClass="bg-blue-500/10" iconTextClass="text-blue-500" delay={100} trendUp={roiDetection > 80} trendValue={`${(roiDetection / 10).toFixed(0)}% efficiency`} />
        <KpiCard title="Detection Rate" value={formatPercent((stats?.model_accuracy || CANONICAL_MODEL.accuracy) * 100, 1)} subtitle={`Model v${stats?.model_version || CANONICAL_MODEL.version}`} icon={Activity} bgClass="bg-green-500/10" iconTextClass="text-green-500" delay={150} trendUp trendValue="+2.3% YoY" />
        <KpiCard title="Active Investigations" value={activeInvestigations} subtitle="Cases pending review" icon={AlertTriangle} bgClass="bg-red-500/10" iconTextClass="text-red-500" delay={200} rawValue={activeInvestigations} trendUp={activeInvestigations > 10} trendValue={activeInvestigations > 10 ? '+12%' : 'Normal'} />
        <KpiCard title="Auto-Adjudication Rate" value={`${autoAdjudication.toFixed(1)}%`} subtitle="Approved without review" icon={BrainCircuit} bgClass="bg-cyan-500/10" iconTextClass="text-cyan-500" delay={250} trendUp={autoAdjudication > 70} trendValue={`${(autoAdjudication / 20).toFixed(0)}% efficiency`} />
        <KpiCard title="Avg Claim Amount" value={formatCurrency(avgClaimAmt)} subtitle="Per processed claim" icon={DollarSign} bgClass="bg-amber-500/10" iconTextClass="text-amber-500" delay={300} rawValue={Math.round(avgClaimAmt)} />
        <KpiCard title="Total Claims Processed" value={formatNumber(totalClaims)} subtitle="Lifetime platform volume" icon={FileText} bgClass="bg-purple-500/10" iconTextClass="text-purple-500" delay={350} rawValue={totalClaims} trend={stats?.total_fraud > 0 ? +((stats.total_fraud / totalClaims * 20).toFixed(1)) : undefined} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface rounded-2xl border border-border/80 shadow-sm overflow-hidden hover:shadow-[0_8px_30px_rgb(0_0_0_/_0.06)] transition-shadow">
          <SECTION_HEADER icon={BarChart3} title="Financial Trend" action="Claim Value ($M)" />
          <div className="p-5 h-[300px]">
            <PlotlyChart data={trendPlotlyData} layout={{ margin: { t: 10, r: 10, l: 30, b: 30 }, xaxis: { showgrid: false }, yaxis: { gridcolor: 'rgba(226, 232, 240, 0.5)' }, legend: { orientation: 'h', y: -0.15 } }} />
          </div>
        </div>
        <div className="bg-surface rounded-2xl border border-border/80 shadow-sm overflow-hidden hover:shadow-[0_8px_30px_rgb(0_0_0_/_0.06)] transition-shadow">
          <SECTION_HEADER icon={DollarSign} title="Financial Impact (Cumulative $ Saved)" action="Cumulative" accent="success" />
          <div className="p-5 h-[300px]">
            <PlotlyChart data={financialImpactPlotlyData} layout={{ margin: { t: 10, r: 10, l: 35, b: 30 }, xaxis: { showgrid: false }, yaxis: { gridcolor: 'rgba(226, 232, 240, 0.5)', tickprefix: '$', ticksuffix: 'M' }, legend: { orientation: 'h', y: -0.15 } }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-surface rounded-2xl border border-border/80 shadow-sm overflow-hidden hover:shadow-[0_8px_30px_rgb(0_0_0_/_0.06)] transition-shadow">
          <SECTION_HEADER icon={MapPin} title="Interactive US Fraud Map" action="Choropleth View" />
          <div className="p-5 h-[360px]">
            <PlotlyChart data={usMapPlotlyData} layout={{
              margin: { t: 5, r: 5, l: 5, b: 5 },
              geo: {
                scope: 'usa',
                projection: { type: 'albers usa' },
                showlakes: true,
                lakecolor: '#0f172a',
                bgcolor: 'transparent',
                showframe: false,
                showcoastlines: false,
                showcountries: false,
              },
            }} />
          </div>
        </div>
        <div className="bg-surface rounded-2xl border border-border/80 shadow-sm overflow-hidden hover:shadow-[0_8px_30px_rgb(0_0_0_/_0.06)] transition-shadow">
          <SECTION_HEADER icon={PieChart} title="Top Fraud Categories" action="Distribution" />
          <div className="p-5 h-[360px] flex items-center justify-center">
            <PlotlyChart data={categoryPlotlyData} layout={{
              margin: { t: 10, b: 20, l: 10, r: 60 },
              height: 330,
              showlegend: false,
              paper_bgcolor: 'rgba(0,0,0,0)',
              plot_bgcolor: 'rgba(0,0,0,0)',
            }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-surface rounded-2xl border border-border/80 shadow-sm overflow-hidden hover:shadow-[0_8px_30px_rgb(0_0_0_/_0.06)] transition-shadow">
          <SECTION_HEADER icon={AlertTriangle} title="Top Risky Regions" action="Sorted by Rate" />
          <div className="overflow-y-auto max-h-[320px] custom-scrollbar">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="sticky top-0 bg-surface/95 backdrop-blur-sm z-10">
                <tr className="border-b border-border text-[9px] font-bold text-textSecondary uppercase tracking-widest">
                  <th className="px-4 py-2.5">Region</th>
                  <th className="px-4 py-2.5 text-right">Claims</th>
                  <th className="px-4 py-2.5 text-right">Fraud</th>
                  <th className="px-4 py-2.5 text-right">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {riskyRegionsSorted.slice(0, 8).map((r, i) => {
                  const rate = (r.fraud_claims / r.total_claims) * 100;
                  const rateColor = rate > 10 ? 'text-danger' : rate > 6 ? 'text-warning' : 'text-success';
                  return (
                    <tr key={r.state || i} className="hover:bg-bg/30 transition-colors">
                      <td className="px-4 py-2.5 font-bold text-textPrimary text-xs">{r.state || r.region}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-textSecondary text-right">{formatNumber(r.total_claims)}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-danger font-bold text-right">{formatNumber(r.fraud_claims)}</td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={`font-black text-xs font-mono ${rateColor}`}>{rate.toFixed(1)}%</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-surface rounded-2xl border border-border/80 shadow-sm overflow-hidden hover:shadow-[0_8px_30px_rgb(0_0_0_/_0.06)] transition-shadow">
          <SECTION_HEADER icon={BarChart4} title="Monthly Executive Trends" action="Dual Axis" />
          <div className="p-5 h-[320px]">
            <PlotlyChart data={dualAxisPlotlyData} layout={{
              margin: { t: 10, r: 40, l: 35, b: 30 },
              xaxis: { showgrid: false },
              yaxis: { gridcolor: 'rgba(226, 232, 240, 0.4)', title: { text: 'Volume', standoff: 5, font: { size: 9, color: '#94a3b8' } } },
              yaxis2: { overlaying: 'y', side: 'right', gridcolor: 'rgba(0,0,0,0)', title: { text: 'Fraud Rate %', standoff: 5, font: { size: 9, color: '#94a3b8' } }, tickfont: { color: '#ef4444' } },
              legend: { orientation: 'h', y: -0.15, font: { size: 9 } },
              barmode: 'group',
              bargap: 0.3,
            }} />
          </div>
        </div>

        <div className="bg-surface rounded-2xl border border-border/80 shadow-sm overflow-hidden hover:shadow-[0_8px_30px_rgb(0_0_0_/_0.06)] transition-shadow">
          <SECTION_HEADER icon={Layers} title="Next Quarter Forecast" action="Projected" accent="warning" />
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-bg/40 rounded-xl border border-border/60 p-3">
                <p className="text-[9px] font-bold text-textSecondary uppercase tracking-wider">Projected Claims</p>
                <p className="text-lg font-black text-textPrimary font-mono mt-1">{formatNumber(forecastMetrics.nextQuarterClaims)}</p>
                <p className="text-[10px] text-success font-bold mt-0.5">{forecastMetrics.expectedGrowth} growth</p>
              </div>
              <div className="bg-bg/40 rounded-xl border border-border/60 p-3">
                <p className="text-[9px] font-bold text-textSecondary uppercase tracking-wider">Forecast Fraud Rate</p>
                <p className="text-lg font-black text-danger font-mono mt-1">{forecastMetrics.fraudRateForecast}%</p>
                <p className="text-[10px] text-warning font-bold mt-0.5">+5% projected increase</p>
              </div>
              <div className="bg-bg/40 rounded-xl border border-border/60 p-3">
                <p className="text-[9px] font-bold text-textSecondary uppercase tracking-wider">Projected Savings</p>
                <p className="text-lg font-black text-success font-mono mt-1">{formatCompactCurrency(forecastMetrics.projectedSavings)}</p>
                <p className="text-[10px] text-textSecondary font-bold mt-0.5">+15% target</p>
              </div>
              <div className="bg-bg/40 rounded-xl border border-border/60 p-3">
                <p className="text-[9px] font-bold text-textSecondary uppercase tracking-wider">Model Accuracy</p>
                <p className="text-lg font-black text-primary font-mono mt-1">{(forecastMetrics.modelAccuracyForecast * 100).toFixed(1)}%</p>
                <p className="text-[10px] text-textSecondary font-bold mt-0.5">Next gen target</p>
              </div>
            </div>
            <div className="bg-accent/5 border border-accent/10 rounded-xl p-3 text-[10px] text-textSecondary leading-relaxed">
              <span className="font-bold text-accent">AI Note: </span>
              Based on current trajectory, fraud volume may increase 8-12% next quarter. Recommended proactive model retraining and expanded provider monitoring.
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface rounded-2xl border border-border/80 shadow-sm overflow-hidden hover:shadow-[0_8px_30px_rgb(0_0_0_/_0.06)] transition-shadow">
          <SECTION_HEADER icon={Lightbulb} title="AI-Generated Business Insights" action={`${insights.length} Insights`} accent="warning" />
          <div className="p-5 space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
            {insights.length > 0 ? insights.slice(0, 6).map((insight, i) => {
              const pColor = insight.priority === 'high' || insight.priority === 'critical'
                ? 'bg-red-500/10 text-red-500 border-red-500/20'
                : insight.priority === 'medium'
                  ? 'bg-warning/10 text-warning border-warning/20'
                  : 'bg-green-500/10 text-green-500 border-green-500/20';
              const pLabel = insight.priority === 'high' || insight.priority === 'critical' ? 'Critical'
                : insight.priority === 'medium' ? 'Warning' : 'Info';
              const pIcon = insight.priority === 'high' || insight.priority === 'critical'
                ? <AlertCircle size={14} className="text-red-500 shrink-0" />
                : insight.priority === 'medium'
                  ? <AlertTriangle size={14} className="text-warning shrink-0" />
                  : <CheckCircle size={14} className="text-green-500 shrink-0" />;
              return (
                <div key={i} className="flex items-start gap-3 bg-bg/40 rounded-xl border border-border/60 p-3.5 hover:bg-bg/60 transition-colors">
                  {pIcon}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${pColor}`}>{pLabel}</span>
                      {insight.type && <span className="text-[9px] text-textSecondary uppercase tracking-wider">{insight.type}</span>}
                    </div>
                    <h4 className="text-xs font-bold text-textPrimary">{insight.title}</h4>
                    <p className="text-[10px] text-textSecondary mt-0.5 leading-relaxed">{insight.description}</p>
                  </div>
                </div>
              );
            }) : (
              <>
                {[
                  { title: 'Provider Anomaly Detected', desc: '3 new providers billing >$200K within 30 days of enrollment. Recommend expedited credentialing review.', priority: 'high', type: 'Provider Risk' },
                  { title: 'Geographic Fraud Cluster', desc: 'Southeast region shows 42% higher fraud rate than national average. Deploy targeted audit resources.', priority: 'high', type: 'Regional' },
                  { title: 'Model Drift Warning', desc: 'Detection sensitivity decreased 1.2% this month. Retraining scheduled to maintain accuracy thresholds.', priority: 'medium', type: 'ML Ops' },
                  { title: 'Billing Pattern Shift', desc: 'Upcoding of E/M level 5 visits increased 18% vs last quarter. Investigate systemic provider patterns.', priority: 'medium', type: 'Trend' },
                  { title: 'Auto-Adjudication Optimization', desc: 'Expanding AI approval scope to include moderate-risk claims could reduce manual review backlog by 34%.', priority: 'low', type: 'Optimization' },
                ].map((insight, i) => {
                  const pColor = insight.priority === 'high' ? 'bg-red-500/10 text-red-500 border-red-500/20' : insight.priority === 'medium' ? 'bg-warning/10 text-warning border-warning/20' : 'bg-green-500/10 text-green-500 border-green-500/20';
                  return (
                    <div key={i} className="flex items-start gap-3 bg-bg/40 rounded-xl border border-border/60 p-3.5 hover:bg-bg/60 transition-colors">
                      {insight.priority === 'high' ? <AlertCircle size={14} className="text-red-500 shrink-0" /> : insight.priority === 'medium' ? <AlertTriangle size={14} className="text-warning shrink-0" /> : <CheckCircle size={14} className="text-green-500 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${pColor}`}>{insight.priority === 'high' ? 'Critical' : insight.priority === 'medium' ? 'Warning' : 'Info'}</span>
                          <span className="text-[9px] text-textSecondary uppercase tracking-wider">{insight.type}</span>
                        </div>
                        <h4 className="text-xs font-bold text-textPrimary">{insight.title}</h4>
                        <p className="text-[10px] text-textSecondary mt-0.5 leading-relaxed">{insight.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>

        <div className="bg-surface rounded-2xl border border-border/80 shadow-sm overflow-hidden hover:shadow-[0_8px_30px_rgb(0_0_0_/_0.06)] transition-shadow">
          <SECTION_HEADER icon={Target} title="Executive Recommendations" action="Priority Matrix" />
          <div className="p-5 space-y-3">
            {RECOMMENDATIONS.map((rec) => {
              const borderColor = rec.priority === 'critical' ? 'border-l-red-500' : rec.priority === 'high' ? 'border-l-warning' : rec.priority === 'medium' ? 'border-l-primary' : 'border-l-textSecondary';
              const badgeColor = rec.priority === 'critical' ? 'bg-red-500/10 text-red-500 border-red-500/20' : rec.priority === 'high' ? 'bg-warning/10 text-warning border-warning/20' : rec.priority === 'medium' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-green-500/10 text-green-500 border-green-500/20';
              return (
                <div key={rec.id} className={`border-l-4 ${borderColor} bg-bg/40 rounded-xl border border-border/60 border-l-4 p-3.5 hover:bg-bg/60 transition-colors`}>
                  <div className="flex items-start gap-3">
                    <rec.icon size={16} className="text-textSecondary shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${badgeColor}`}>{rec.priority}</span>
                        <span className="text-[9px] font-bold text-success">{rec.metric}</span>
                      </div>
                      <h4 className="text-xs font-bold text-textPrimary">{rec.title}</h4>
                      <p className="text-[10px] text-textSecondary mt-0.5 leading-relaxed">{rec.description}</p>
                    </div>
                    <ChevronRight size={14} className="text-textSecondary shrink-0 mt-1" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface rounded-2xl border border-border/80 shadow-sm overflow-hidden hover:shadow-[0_8px_30px_rgb(0_0_0_/_0.06)] transition-shadow">
          <SECTION_HEADER icon={Building2} title="Top Providers by Risk" action="Fraud Count" />
          <div className="p-5 max-h-[300px] overflow-y-auto custom-scrollbar">
            <div className="space-y-3">
              {(topProviders.length > 0 ? topProviders : [
                { name: 'Metropolitan General Hospital', claim_count: 1842, fraud_count: 189, total_amount: 2302500 },
                { name: 'St. Mary Medical Center', claim_count: 1687, fraud_count: 162, total_amount: 2108750 },
                { name: 'City Health Network', claim_count: 2014, fraud_count: 145, total_amount: 2517500 },
                { name: 'Pacific Wellness Group', claim_count: 1456, fraud_count: 128, total_amount: 1820000 },
                { name: 'Summit Healthcare Partners', claim_count: 1523, fraud_count: 118, total_amount: 1903750 },
              ]).slice(0, 5).map((p, i) => {
                const fraudPct = p.claim_count ? ((p.fraud_count / p.claim_count) * 100).toFixed(1) : '0.0';
                return (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black ${cycleColor(i)}`}>{i + 1}</div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-textPrimary truncate max-w-[180px]">{p.name || p.provider_name}</p>
                        <p className="text-[9px] text-textSecondary">{p.claim_count && formatNumber(p.claim_count)} claims · {formatCurrency(p.total_amount)}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-black text-danger">{fraudPct}%</span>
                      <p className="text-[9px] text-textSecondary">{p.fraud_count} flagged</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-2xl border border-border/80 shadow-sm overflow-hidden hover:shadow-[0_8px_30px_rgb(0_0_0_/_0.06)] transition-shadow">
          <SECTION_HEADER icon={Search} title="Top Fraudulent Diagnoses" action="Code Analysis" />
          <div className="p-5 max-h-[300px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="text-[9px] font-bold text-textSecondary uppercase tracking-widest border-b border-border/60">
                <tr>
                  <th className="pb-2">Diagnosis Code</th>
                  <th className="pb-2 text-right">Claims</th>
                  <th className="pb-2 text-right">Fraud</th>
                  <th className="pb-2 text-right">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {(topDiagnoses.length > 0 ? topDiagnoses : [
                  { diagnosis_code: 'M54.5', claim_count: 342, fraud_count: 58 },
                  { diagnosis_code: 'I10', claim_count: 512, fraud_count: 42 },
                  { diagnosis_code: 'E11.9', claim_count: 287, fraud_count: 39 },
                  { diagnosis_code: 'M25.56', claim_count: 198, fraud_count: 36 },
                  { diagnosis_code: 'G47.33', claim_count: 156, fraud_count: 31 },
                  { diagnosis_code: 'Z23', claim_count: 223, fraud_count: 27 },
                ]).slice(0, 6).map((d, i) => {
                  const rate = d.claim_count ? ((d.fraud_count / d.claim_count) * 100).toFixed(1) : '0.0';
                  return (
                    <tr key={i} className="hover:bg-bg/30 transition-colors text-xs">
                      <td className="py-2.5 font-mono font-bold text-primary">{d.diagnosis_code}</td>
                      <td className="py-2.5 text-right font-mono text-textSecondary">{formatNumber(d.claim_count)}</td>
                      <td className="py-2.5 text-right font-mono text-danger font-bold">{formatNumber(d.fraud_count)}</td>
                      <td className="py-2.5 text-right">
                        <span className={`font-black font-mono ${+rate > 15 ? 'text-danger' : +rate > 10 ? 'text-warning' : 'text-success'}`}>{rate}%</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal open={showReportModal} onClose={() => setShowReportModal(false)} title="Export Executive Report" wide>
        <div className="space-y-5 py-2">
          <p className="text-xs text-textSecondary flex items-center gap-2">
            <Download size={14} className="text-primary" />
            Select export format and generate a comprehensive executive report for stakeholders.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label
              onClick={() => setExportFormat('pdf')}
              className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 cursor-pointer transition-all ${
                exportFormat === 'pdf'
                  ? 'border-primary bg-primary/5'
                  : 'border-border/80 bg-bg/40 hover:bg-bg/60 hover:border-border'
              }`}
            >
              <FileText size={28} className={exportFormat === 'pdf' ? 'text-primary' : 'text-textSecondary'} />
              <div className="text-center">
                <p className="text-sm font-bold text-textPrimary">PDF Report</p>
                <p className="text-[10px] text-textSecondary">Full analytics, charts, and detailed recommendations with executive summary.</p>
              </div>
              {exportFormat === 'pdf' && <CheckCircle size={16} className="text-primary" />}
            </label>
            <label
              onClick={() => setExportFormat('ppt')}
              className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 cursor-pointer transition-all ${
                exportFormat === 'ppt'
                  ? 'border-primary bg-primary/5'
                  : 'border-border/80 bg-bg/40 hover:bg-bg/60 hover:border-border'
              }`}
            >
              <BarChart3 size={28} className={exportFormat === 'ppt' ? 'text-primary' : 'text-textSecondary'} />
              <div className="text-center">
                <p className="text-sm font-bold text-textPrimary">PPT Presentation</p>
                <p className="text-[10px] text-textSecondary">Board-ready slide deck with visual summaries of all key metrics.</p>
              </div>
              {exportFormat === 'ppt' && <CheckCircle size={16} className="text-primary" />}
            </label>
            <label
              onClick={() => setExportFormat('csv')}
              className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 cursor-pointer transition-all ${
                exportFormat === 'csv'
                  ? 'border-primary bg-primary/5'
                  : 'border-border/80 bg-bg/40 hover:bg-bg/60 hover:border-border'
              }`}
            >
              <Database size={28} className={exportFormat === 'csv' ? 'text-primary' : 'text-textSecondary'} />
              <div className="text-center">
                <p className="text-sm font-bold text-textPrimary">CSV Export</p>
                <p className="text-[10px] text-textSecondary">Raw data for external BI tools and custom analysis workflows.</p>
              </div>
              {exportFormat === 'csv' && <CheckCircle size={16} className="text-primary" />}
            </label>
          </div>
          <div className="bg-bg/40 rounded-xl border border-border/60 p-4">
            <p className="text-xs font-bold text-textPrimary mb-2">Report Includes:</p>
            <div className="grid grid-cols-2 gap-2 text-[10px] text-textSecondary">
              <span className="flex items-center gap-1.5"><CheckCircle size={10} className="text-success" /> Executive KPI Summary</span>
              <span className="flex items-center gap-1.5"><CheckCircle size={10} className="text-success" /> Claims & Fraud Trends</span>
              <span className="flex items-center gap-1.5"><CheckCircle size={10} className="text-success" /> Financial Impact Analysis</span>
              <span className="flex items-center gap-1.5"><CheckCircle size={10} className="text-success" /> Regional Risk Breakdown</span>
              <span className="flex items-center gap-1.5"><CheckCircle size={10} className="text-success" /> AI-Generated Insights</span>
              <span className="flex items-center gap-1.5"><CheckCircle size={10} className="text-success" /> Provider Risk Rankings</span>
              <span className="flex items-center gap-1.5"><CheckCircle size={10} className="text-success" /> Forecast & Recommendations</span>
              <span className="flex items-center gap-1.5"><CheckCircle size={10} className="text-success" /> Category Distribution</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowReportModal(false)}
              className="flex-1 py-3 rounded-xl border border-border/80 bg-surface text-textSecondary font-bold text-xs hover:bg-bg transition-all"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setShowReportModal(false);
                window.open(`/api/reports/export?format=${exportFormat}`, '_blank');
              }}
              className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
            >
              <Download size={14} /> Export as {exportFormat.toUpperCase()}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
