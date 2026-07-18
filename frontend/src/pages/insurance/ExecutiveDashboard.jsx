import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp, TrendingDown, DollarSign, AlertTriangle, ShieldCheck, BrainCircuit,
  BarChart3, PieChart, MapPin, Download, Lightbulb, ArrowUpRight, Clock,
  FileText, Activity, Users, Building2, Sparkles, Target
} from "lucide-react";
import api from "../../api";
import PlotlyChart from "../../components/PlotlyChart";
import Skeleton from "../../components/Skeleton";
import Modal from "../../components/Modal";

const KpiCard = ({ title, value, icon: Icon, bgClass, iconTextClass, trendUp, trendValue, subtitle }) => (
  <div className="group relative overflow-hidden rounded-2xl border border-border/80 bg-surface p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgb(0_0_0_/_0.08)] hover:border-accent/20">
    <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    <div className="relative flex items-start justify-between">
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-textSecondary">{title}</p>
        <p className="mt-2 text-2xl font-black text-textPrimary font-mono tracking-tight">{value}</p>
        {subtitle && (
          <p className="mt-2.5 text-[11px] text-textSecondary font-semibold flex items-center gap-1">
            {trendUp !== undefined && (trendUp ? <TrendingUp size={12} className="text-success" /> : <TrendingDown size={12} className="text-danger" />)}
            {trendValue && <span className={trendUp ? "text-success font-bold" : "text-danger font-bold"}>{trendValue}</span>}
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

const DEFAULT_RECOMMENDATIONS = [
  {
    id: 1,
    type: 'critical',
    title: 'High-Risk Provider Targeted Audit',
    desc: 'Dr. John Doe is producing 17.7% anomaly rate vs 3.2% peer average. Recommended: immediate billing audit.',
    impact: '$230K rescue',
    badgeClass: 'bg-red-500/10 text-red-500 border-red-500/20',
  },
  {
    id: 2,
    type: 'critical',
    title: 'Isolated Region Drift Detected',
    desc: 'Region 4 anomaly rate rose 220% MoM. Deploy local model variant for population-specific risk calibration.',
    impact: 'Model tuning needed',
    badgeClass: 'bg-red-500/10 text-red-500 border-red-500/20',
  },
  {
    id: 3,
    type: 'warning',
    title: 'Fraud & Abuse Policy Gap',
    desc: '28% of denied claims not escalated for review. Policy enforcement gap detected in Patient Grievance workflow.',
    impact: 'Policy updates',
    badgeClass: 'bg-warning/10 text-warning border-warning/20',
  },
  {
    id: 4,
    type: 'success',
    title: 'Auto-Adjudication Savings On Track',
    desc: 'Automation pipeline processed 45% more claims QoQ. Estimated $2.7M saved in manual review costs this quarter.',
    impact: '$2.7M saved',
    badgeClass: 'bg-green-500/10 text-green-500 border-green-500/20',
  },
  {
    id: 5,
    type: 'success',
    title: 'Model Retraining Completed',
    desc: 'XGBoost v2.4.1 deployed. Precision improved from 0.89 to 0.921. False positive rate down by 14%.',
    impact: 'Model improved',
    badgeClass: 'bg-green-500/10 text-green-500 border-green-500/20',
  },
];

export default function ExecutiveDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [regionalData, setRegionalData] = useState([]);
  const [fraudCategories, setFraudCategories] = useState([]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [claimsOverTime, setClaimsOverTime] = useState([]);
  const [topProviders, setTopProviders] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, regionalRes, fraudCatRes, claimsTimeRes, provRes] = await Promise.allSettled([
          api.getStats(),
          api.getDistributionByRegion(),
          api.getFraudByCategory(),
          api.getClaimsOverTime(),
          api.getTopProviders(),
        ]);
        setStats(statsRes.status === 'fulfilled' ? statsRes.value : statsRes);
        setRegionalData(regionalRes.status === 'fulfilled' ? regionalRes.value : []);
        setFraudCategories(fraudCatRes.status === 'fulfilled' ? fraudCatRes.value : []);
        setClaimsOverTime(claimsTimeRes.status === 'fulfilled' ? claimsTimeRes.value : []);
        setTopProviders(provRes.status === 'fulfilled' ? provRes.value : []);
      } catch (err) {
        console.error("Executive dashboard fetch error", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const trendPlotlyData = useMemo(() => [
    {
      x: claimsOverTime.map(d => d.date),
      y: claimsOverTime.map(d => d.total_claims),
      type: 'scatter', mode: 'lines', name: 'Total Claims',
      line: { color: '#4f46e5', width: 3, shape: 'spline' },
      fill: 'tozeroy', fillcolor: 'rgba(79, 70, 229, 0.05)'
    },
    {
      x: claimsOverTime.map(d => d.date),
      y: claimsOverTime.map(d => d.fraud_claims),
      type: 'scatter', mode: 'lines', name: 'Fraud Claims',
      line: { color: '#ef4444', width: 3, shape: 'spline' },
      fill: 'tozeroy', fillcolor: 'rgba(239, 68, 68, 0.05)'
    },
  ], [claimsOverTime]);

  const financialImpactPlotlyData = useMemo(() => [
    {
      x: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      y: [1.2, 1.8, 2.1, 2.4, 3.0, 3.5],
      type: 'scatter', mode: 'lines+markers', name: 'Money Saved ($M)',
      line: { color: '#10b981', width: 3, shape: 'spline' },
      marker: { size: 7, color: '#10b981' },
      fill: 'tozeroy', fillcolor: 'rgba(16, 185, 129, 0.05)'
    }
  ], []);

  const categoryPlotlyData = useMemo(() => [
    {
      labels: fraudCategories.length > 0 ? fraudCategories.map(c => c.category) : ['Upcoding', 'Billing for Non-Covered', 'Identity Theft', 'Duplicate Claims', 'Unbundling', 'Other'],
      values: fraudCategories.length > 0 ? fraudCategories.map(c => c.count) : [28, 20, 15, 12, 8, 17],
      type: 'pie', hole: 0.5,
      marker: { colors: ['#ef4444', '#f59e0b', '#8b5cf6', '#3b82f6', '#10b981', '#64748b'] },
      textinfo: 'label+percent', textposition: 'outside',
      showlegend: false
    }
  ], [fraudCategories]);

  const regionalPlotlyData = useMemo(() => {
    const data = regionalData.length > 0 ? regionalData : [
      { region: 'Region 1', total: 1200, fraud: 42 },
      { region: 'Region 2', total: 980, fraud: 68 },
      { region: 'Region 3', total: 1450, fraud: 112 },
      { region: 'Region 4', total: 870, fraud: 185 },
      { region: 'Region 5', total: 630, fraud: 38 },
    ];
    return [{
      x: data.map(d => d.region),
      y: data.map(d => parseFloat(((d.fraud / d.total) * 100).toFixed(1))),
      type: 'bar',
      marker: {
        color: data.map(d => (d.fraud / d.total) > 0.1 ? '#ef4444' : (d.fraud / d.total) > 0.06 ? '#f59e0b' : '#10b981'),
        line: { width: 0 }
      },
      text: data.map(d => `${((d.fraud / d.total) * 100).toFixed(1)}%`),
      textposition: 'outside',
      hovertemplate: 'Region %{x}<br>Fraud Rate: %{y}%<br>Total: ' + data.map(d => d.total).join(',') + '<extra></extra>',
    }];
  }, [regionalData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <Skeleton key={i} type="card" />)}
        </div>
        <Skeleton rows={12} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-accent w-fit mb-3">
            <Sparkles size={12} />
            Executive Intelligence
          </div>
          <h1 className="text-2xl font-black text-textPrimary">
            Enterprise Command Center
          </h1>
          <p className="text-sm text-textSecondary font-medium">
            Strategic insights, financial impact, and fraud mitigation metrics.
          </p>
        </div>
        <button
          onClick={() => setShowReportModal(true)}
          className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all"
        >
          <Download size={14} /> Generate Executive Report
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total Fraud Prevented" value="$3.5M" subtitle="YTD recovery" trendUp trendValue="+22%" icon={DollarSign} bgClass="bg-green-500/10" iconTextClass="text-green-500" />
        <KpiCard title="Fraud Detection Rate" value="94.2%" subtitle="Model accuracy" trendUp trendValue="+3.1%" icon={Target} bgClass="bg-indigo-500/10" iconTextClass="text-indigo-500" />
        <KpiCard title="Active Investigations" value="64" subtitle="Open cases" icon={AlertTriangle} bgClass="bg-red-500/10" iconTextClass="text-red-500" />
        <KpiCard title="Auto-Adjudication Rate" value="78.5%" subtitle="Of total claims" trendUp trendValue="+5.2%" icon={BrainCircuit} bgClass="bg-sky-500/10" iconTextClass="text-sky-500" />
        <KpiCard title="Avg Time to Detect" value="2.4 days" subtitle="Down from 4.1 days" trendUp trendValue="-41%" icon={Clock} bgClass="bg-amber-500/10" iconTextClass="text-amber-500" />
        <KpiCard title="Provider Audit Rate" value="12.8%" subtitle="Monthly random audit" icon={Building2} bgClass="bg-purple-500/10" iconTextClass="text-purple-500" />
        <KpiCard title="Member Savings" value="$2.1M" subtitle="Passed to members" trendUp trendValue="+18%" icon={Users} bgClass="bg-teal-500/10" iconTextClass="text-teal-500" />
        <KpiCard title="Model Uptime" value="99.97%" subtitle="30-day SLA" trendUp trendValue="+0.02%" icon={Activity} bgClass="bg-blue-500/10" iconTextClass="text-blue-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface rounded-2xl border border-border/80 shadow-sm overflow-hidden">
          <div className="border-b border-border/60 px-5 py-4">
            <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2">
              <BarChart3 size={16} className="text-primary" />
              Claims & Fraud Trend
            </h3>
          </div>
          <div className="p-5 h-[300px]">
            <PlotlyChart data={trendPlotlyData} layout={{ margin: { t: 10, r: 10, l: 30, b: 30 }, xaxis: { showgrid: false }, yaxis: { gridcolor: 'rgba(226, 232, 240, 0.5)' }, legend: { orientation: 'h', y: -0.15 } }} />
          </div>
        </div>
        <div className="bg-surface rounded-2xl border border-border/80 shadow-sm overflow-hidden">
          <div className="border-b border-border/60 px-5 py-4">
            <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2">
              <DollarSign size={16} className="text-success" />
              Financial Impact ($M Saved)
            </h3>
          </div>
          <div className="p-5 h-[300px]">
            <PlotlyChart data={financialImpactPlotlyData} layout={{ margin: { t: 10, r: 10, l: 35, b: 30 }, xaxis: { showgrid: false }, yaxis: { gridcolor: 'rgba(226, 232, 240, 0.5)' }, legend: { orientation: 'h', y: -0.15 } }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-surface rounded-2xl border border-border/80 shadow-sm overflow-hidden">
          <div className="border-b border-border/60 px-5 py-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2">
              <MapPin size={16} className="text-primary" />
              Regional Risk Summary
            </h3>
            <span className="text-[9px] text-textSecondary font-bold uppercase tracking-wider bg-bg/80 border border-border/60 px-2 py-0.5 rounded">Fraud Rate by Region</span>
          </div>
          <div className="p-5 h-[320px]">
            <PlotlyChart data={regionalPlotlyData} layout={{
              margin: { t: 10, r: 10, l: 35, b: 40 },
              xaxis: { showgrid: false },
              yaxis: { gridcolor: 'rgba(226, 232, 240, 0.5)', suffix: '%', title: { text: 'Fraud Rate %', standoff: 10 } },
              hovermode: 'x unified',
            }} />
          </div>
        </div>
        <div className="bg-surface rounded-2xl border border-border/80 shadow-sm overflow-hidden">
          <div className="border-b border-border/60 px-5 py-4">
            <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2">
              <PieChart size={16} className="text-primary" />
              Top Fraud Categories
            </h3>
          </div>
          <div className="p-5 h-[320px]">
            <PlotlyChart data={categoryPlotlyData} layout={{
              margin: { t: 10, b: 30, l: 10, r: 10 },
              height: 280,
              showlegend: false,
            }} />
          </div>
        </div>
      </div>

      <div className="bg-surface rounded-2xl border border-border/80 shadow-sm overflow-hidden">
        <div className="border-b border-border/60 px-5 py-4">
          <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2">
            <Lightbulb size={16} className="text-warning" />
            AI-Generated Recommendations
          </h3>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          {DEFAULT_RECOMMENDATIONS.map((rec) => (
            <div key={rec.id} className="bg-bg/40 rounded-xl border border-border/60 p-4 hover:bg-bg/60 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${rec.badgeClass}`}>
                  {rec.impact}
                </span>
                {rec.type === 'critical' ? <AlertTriangle size={14} className="text-red-500" /> :
                 rec.type === 'warning' ? <AlertTriangle size={14} className="text-warning" /> : <ShieldCheck size={14} className="text-green-500" />}
              </div>
              <h4 className="text-sm font-bold text-textPrimary mb-1">{rec.title}</h4>
              <p className="text-[11px] text-textSecondary leading-relaxed">{rec.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <Modal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        title="Generate Executive Report"
      >
        <div className="p-6 space-y-4">
          <p className="text-sm text-textSecondary">Select report format and scope:</p>
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 rounded-xl border border-border/80 bg-bg/40 hover:bg-bg/60 cursor-pointer">
              <input type="radio" name="reportType" defaultChecked className="accent-primary" />
              <div>
                <p className="text-sm font-bold text-textPrimary">Comprehensive PDF Report</p>
                <p className="text-xs text-textSecondary">Full analytics, charts, and recommendations</p>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-xl border border-border/80 bg-bg/40 hover:bg-bg/60 cursor-pointer">
              <input type="radio" name="reportType" className="accent-primary" />
              <div>
                <p className="text-sm font-bold text-textPrimary">Executive Summary (PPT)</p>
                <p className="text-xs text-textSecondary">Board-ready presentation deck</p>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-xl border border-border/80 bg-bg/40 hover:bg-bg/60 cursor-pointer">
              <input type="radio" name="reportType" className="accent-primary" />
              <div>
                <p className="text-sm font-bold text-textPrimary">CSV Data Export</p>
                <p className="text-xs text-textSecondary">Raw data for external analysis</p>
              </div>
            </label>
          </div>
          <button className="w-full py-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl text-sm transition-all">
            Generate & Download
          </button>
        </div>
      </Modal>
    </div>
  );
}
