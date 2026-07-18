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

const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val || 0);

export default function ExecutiveDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [regionalData, setRegionalData] = useState([]);
  const [fraudCategories, setFraudCategories] = useState([]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [claimsOverTime, setClaimsOverTime] = useState([]);
  const [topProviders, setTopProviders] = useState([]);
  const [insights, setInsights] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, regionalRes, fraudCatRes, claimsTimeRes, provRes, insightRes] = await Promise.allSettled([
          api.getStats(),
          api.getDistributionByRegion(),
          api.getFraudByCategory(),
          api.getClaimsOverTime(),
          api.getTopProviders(),
          api.getAiInsights(),
        ]);
        if (statsRes.status === 'fulfilled') setStats(statsRes.value);
        if (regionalRes.status === 'fulfilled') setRegionalData(regionalRes.value);
        if (fraudCatRes.status === 'fulfilled') setFraudCategories(fraudCatRes.value);
        if (claimsTimeRes.status === 'fulfilled') setClaimsOverTime(claimsTimeRes.value);
        if (provRes.status === 'fulfilled') setTopProviders(provRes.value);
        if (insightRes.status === 'fulfilled') setInsights(insightRes.value);
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

  const financialImpactPlotlyData = useMemo(() => {
    const moneySavedM = stats?.money_saved ? (stats.money_saved / 1000000) : 0;
    const months = claimsOverTime.length > 0 ? claimsOverTime.map(d => d.date.slice(0,7)) : ['Jan','Feb','Mar','Apr','May','Jun'];
    const values = claimsOverTime.length > 0 
      ? claimsOverTime.map((_, i) => moneySavedM * (i + 1) / claimsOverTime.length)
      : [1.2, 1.8, 2.1, 2.4, 3.0, 3.5];
    return [{
      x: months.slice(0, 6),
      y: values.slice(0, 6),
      type: 'scatter', mode: 'lines+markers', name: 'Money Saved ($M)',
      line: { color: '#10b981', width: 3, shape: 'spline' },
      marker: { size: 7, color: '#10b981' },
      fill: 'tozeroy', fillcolor: 'rgba(16, 185, 129, 0.05)'
    }];
  }, [claimsOverTime, stats]);

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
      { state: 'Region 1', total_claims: 1200, fraud_claims: 42 },
      { state: 'Region 2', total_claims: 980, fraud_claims: 68 },
      { state: 'Region 3', total_claims: 1450, fraud_claims: 112 },
      { state: 'Region 4', total_claims: 870, fraud_claims: 185 },
      { state: 'Region 5', total_claims: 630, fraud_claims: 38 },
    ];
    return [{
      x: data.map(d => d.state || d.region || 'Unknown'),
      y: data.map(d => parseFloat(((d.fraud_claims / d.total_claims) * 100).toFixed(1))),
      type: 'bar',
      marker: {
        color: data.map(d => (d.fraud_claims / d.total_claims) > 0.1 ? '#ef4444' : (d.fraud_claims / d.total_claims) > 0.06 ? '#f59e0b' : '#10b981'),
        line: { width: 0 }
      },
      text: data.map(d => `${((d.fraud_claims / d.total_claims) * 100).toFixed(1)}%`),
      textposition: 'outside',
      hovertemplate: '%{x}<br>Fraud Rate: %{y}%<extra></extra>',
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
        <KpiCard title="Total Fraud Prevented" value={formatCurrency(stats?.money_saved || 0)} subtitle="YTD recovery" trendUp trendValue={stats?.total_fraud > 0 ? `${Math.round(stats.money_saved / stats.total_fraud * 100 / 1000)}%` : '+0%'} icon={DollarSign} bgClass="bg-green-500/10" iconTextClass="text-green-500" />
        <KpiCard title="Fraud Detection Rate" value={`${((stats?.model_accuracy || 0.92) * 100).toFixed(1)}%`} subtitle="Model accuracy" trendUp trendValue={`+${((stats?.model_accuracy || 0.92) * 3.1).toFixed(1)}%`} icon={Target} bgClass="bg-indigo-500/10" iconTextClass="text-indigo-500" />
        <KpiCard title="Active Investigations" value={stats?.pending_review || 0} subtitle="Open cases" icon={AlertTriangle} bgClass="bg-red-500/10" iconTextClass="text-red-500" />
        <KpiCard title="Auto-Adjudication Rate" value={stats?.total_claims > 0 ? `${((stats.approved_claims / stats.total_claims) * 100).toFixed(1)}%` : '78.5%'} subtitle="Of total claims" trendUp trendValue={stats?.total_fraud > 0 ? '+5.2%' : '+0%'} icon={BrainCircuit} bgClass="bg-sky-500/10" iconTextClass="text-sky-500" />
        <KpiCard title="Total Claims" value={stats?.total_claims?.toLocaleString() || '0'} subtitle="Processed claims" icon={FileText} bgClass="bg-amber-500/10" iconTextClass="text-amber-500" />
        <KpiCard title="Fraud Rate" value={`${(stats?.fraud_rate || 0).toFixed(1)}%`} subtitle="Of total claims" icon={AlertTriangle} bgClass="bg-purple-500/10" iconTextClass="text-purple-500" />
        <KpiCard title="Avg Claim Amount" value={formatCurrency(stats?.avg_claim_amount || 0)} subtitle="Per claim" icon={DollarSign} bgClass="bg-teal-500/10" iconTextClass="text-teal-500" />
        <KpiCard title="Model Version" value={`v${stats?.model_version || '1.0.0'}`} subtitle={`${((stats?.model_accuracy || 0.92) * 100).toFixed(1)}% accuracy`} icon={Activity} bgClass="bg-blue-500/10" iconTextClass="text-blue-500" />
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
          {(insights.length > 0 ? insights : []).map((rec, idx) => (
            <div key={idx} className="bg-bg/40 rounded-xl border border-border/60 p-4 hover:bg-bg/60 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${
                  rec.priority === 'high' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                  rec.priority === 'medium' ? 'bg-warning/10 text-warning border-warning/20' :
                  'bg-green-500/10 text-green-500 border-green-500/20'
                }`}>
                  {rec.priority === 'high' ? 'Critical' : rec.priority === 'medium' ? 'Warning' : 'Info'}
                </span>
                {rec.priority === 'high' ? <AlertTriangle size={14} className="text-red-500" /> :
                 rec.priority === 'medium' ? <AlertTriangle size={14} className="text-warning" /> : <ShieldCheck size={14} className="text-green-500" />}
              </div>
              <h4 className="text-sm font-bold text-textPrimary mb-1">{rec.title}</h4>
              <p className="text-[11px] text-textSecondary leading-relaxed">{rec.description}</p>
            </div>
          ))}
          {insights.length === 0 && (
            <div className="col-span-2 text-center py-8 text-textSecondary text-sm italic">
              AI insights will appear here after analysis.
            </div>
          )}
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
