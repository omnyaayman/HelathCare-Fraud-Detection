import { useState, useEffect, useMemo } from 'react';
import {
  Search, Building2, Download, Eye, AlertTriangle, ShieldCheck, ChevronLeft,
  ChevronRight, Filter, TrendingUp, MapPin, Star, Activity, BarChart3, Users,
  Wifi, WifiOff
} from 'lucide-react';
import api from '../../api';
import Skeleton from '../../components/Skeleton';
import PlotlyChart from '../../components/PlotlyChart';
import { formatCurrency, formatPercent, formatNumber, getRiskLevel, getStatusColor } from '../../data/dataUtils';

const MIN_CLAIMS_FOR_RATE = 5;

function getFraudRateDisplay(provider) {
  const claims = provider.claims_count || provider.total_claims || 0;
  const frauds = provider.fraud_count || provider.fraud_claims || 0;
  if (claims < MIN_CLAIMS_FOR_RATE) return { rate: null, label: 'Insufficient Data', display: `${claims} claims` };
  const rate = (frauds / claims) * 100;
  return { rate, label: rate >= 15 ? 'High Risk' : rate >= 8 ? 'Medium' : 'Low Risk', display: `${rate.toFixed(1)}%` };
}

export default function ProviderManagement() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('All');
  const [riskFilter, setRiskFilter] = useState('All');
  const [networkFilter, setNetworkFilter] = useState('All');
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [providerClaims, setProviderClaims] = useState([]);
  const [claimsLoading, setClaimsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const provRes = await api.getProviders();
        setProviders(provRes || []);
      } catch (err) {
        console.error('Failed to load provider data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!selectedProvider) { setProviderClaims([]); return; }
    const fetchClaims = async () => {
      setClaimsLoading(true);
      try {
        const res = await api.getClaims({ page_size: 500 });
        const allClaims = res?.claims || res?.data || res || [];
        const filtered = Array.isArray(allClaims)
          ? allClaims.filter(c => c.provider_name === selectedProvider.name)
          : [];
        setProviderClaims(filtered.slice(0, 30));
      } catch (err) {
        setProviderClaims([]);
      } finally {
        setClaimsLoading(false);
      }
    };
    fetchClaims();
  }, [selectedProvider]);

  const processedProviders = useMemo(() => {
    return providers.map(p => {
      const display = getFraudRateDisplay(p);
      const claims = p.claims_count || p.total_claims || 0;
      const frauds = p.fraud_count || p.fraud_claims || 0;
      const approved = p.approved_count || 0;
      const rejected = p.rejected_count || 0;
      const approvalRate = claims > 0 ? (approved / claims) * 100 : 0;
      return {
        ...p, claims_count: claims, frauds_count: frauds,
        fraud_rate: display.rate, fraud_rate_display: display.display,
        fraud_rate_label: display.label, has_enough_data: display.rate !== null,
        approved_count: approved, rejected_count: rejected, approval_rate: approvalRate,
        network_status: p.network_status || 'In-Network',
      };
    });
  }, [providers]);

  const specialties = useMemo(() => {
    const specs = new Set(providers.map(p => p.specialty).filter(Boolean));
    return ['All', ...Array.from(specs).sort()];
  }, [providers]);

  const filtered = useMemo(() => {
    return processedProviders.filter(p => {
      const q = searchTerm.toLowerCase();
      const matchesSearch = p.name?.toLowerCase().includes(q) || p.provider_id?.toString().includes(q) || p.specialty?.toLowerCase().includes(q);
      const matchesSpec = specialtyFilter === 'All' || p.specialty === specialtyFilter;
      const matchesNetwork = networkFilter === 'All' || p.network_status === networkFilter;
      let matchesRisk = true;
      if (riskFilter === 'High') matchesRisk = p.has_enough_data && p.fraud_rate >= 15;
      else if (riskFilter === 'Medium') matchesRisk = p.has_enough_data && p.fraud_rate >= 8 && p.fraud_rate < 15;
      else if (riskFilter === 'Low') matchesRisk = p.has_enough_data && p.fraud_rate < 8;
      else if (riskFilter === 'Insufficient') matchesRisk = !p.has_enough_data;
      return matchesSearch && matchesSpec && matchesRisk && matchesNetwork;
    });
  }, [processedProviders, searchTerm, specialtyFilter, riskFilter, networkFilter]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const stats = useMemo(() => {
    const total = processedProviders.length;
    if (!total) return { totalProviders: 0, avgClaims: 0, overallFraudRate: 0, avgBilling: 0, highRisk: 0, inNetwork: 0 };
    const totalClaims = processedProviders.reduce((sum, p) => sum + p.claims_count, 0);
    const totalFrauds = processedProviders.reduce((sum, p) => sum + p.frauds_count, 0);
    const avgClaims = Math.round(totalClaims / total);
    const overallFraudRate = totalClaims > 0 ? (totalFrauds / totalClaims) * 100 : 0;
    const avgBilling = Math.round(processedProviders.reduce((sum, p) => sum + (p.avg_claim_amount || 0), 0) / total);
    const highRisk = processedProviders.filter(p => p.has_enough_data && p.fraud_rate >= 15).length;
    const inNetwork = processedProviders.filter(p => p.network_status === 'In-Network').length;
    return { totalProviders: total, avgClaims, overallFraudRate, avgBilling, highRisk, inNetwork };
  }, [processedProviders]);

  const specialtyAgg = useMemo(() => {
    const map = {};
    processedProviders.forEach(p => {
      if (!p.specialty) return;
      if (!map[p.specialty]) map[p.specialty] = { claims: 0, frauds: 0, count: 0, totalBilled: 0, rate: 0 };
      map[p.specialty].claims += p.claims_count;
      map[p.specialty].frauds += p.frauds_count;
      map[p.specialty].count += 1;
      map[p.specialty].totalBilled += (p.avg_claim_amount || 0) * p.claims_count;
    });
    Object.keys(map).forEach(k => {
      map[k].rate = map[k].claims >= MIN_CLAIMS_FOR_RATE ? (map[k].frauds / map[k].claims) * 100 : 0;
    });
    return map;
  }, [processedProviders]);

  const riskRankingData = useMemo(() => {
    const ranked = processedProviders.filter(p => p.has_enough_data && p.claims_count >= MIN_CLAIMS_FOR_RATE);
    const top10 = [...ranked].sort((a, b) => b.fraud_rate - a.fraud_rate).slice(0, 10);
    const names = top10.map(p => {
      const n = p.name || `Provider #${p.provider_id}`;
      return n.length > 28 ? n.slice(0, 26) + '..' : n;
    });
    const rates = top10.map(p => p.fraud_rate);
    const colors = rates.map(r => r >= 15 ? '#ef4444' : r >= 8 ? '#f59e0b' : '#22c55e');
    const maxRate = Math.max(...rates, 1);
    return [{
      y: names.reverse(), x: rates.reverse(), type: 'bar', orientation: 'h',
      marker: { color: colors.reverse(), cornerradius: 4 },
      text: rates.map(r => `${r.toFixed(1)}%`),
      textposition: 'outside', textfont: { size: 10, color: '#94a3b8' },
      hovertemplate: '%{y}<br>Fraud Rate: %{x:.1f}%<extra></extra>'
    }];
  }, [processedProviders]);

  const riskRankingLayout = useMemo(() => {
    const ranked = processedProviders.filter(p => p.has_enough_data);
    const maxRate = Math.max(...ranked.map(p => p.fraud_rate), 1);
    return {
      margin: { t: 10, r: 60, l: 10, b: 30 },
      xaxis: { title: 'Fraud Rate (%)', showgrid: true, gridcolor: 'rgba(71, 85, 105, 0.3)', range: [0, Math.max(maxRate * 1.2, 20)] },
      yaxis: { automargin: true, tickfont: { size: 10 } },
      showlegend: false
    };
  }, [processedProviders]);

  const claimsVolumeData = useMemo(() => {
    const top10 = [...processedProviders].sort((a, b) => b.claims_count - a.claims_count).slice(0, 10);
    const names = top10.map(p => {
      const n = p.name || `#${p.provider_id}`;
      return n.length > 20 ? n.slice(0, 18) + '..' : n;
    });
    return [{
      x: names, y: top10.map(p => p.claims_count), type: 'bar',
      marker: { color: '#3b82f6', cornerradius: 4 },
      text: top10.map(p => p.claims_count.toLocaleString()),
      textposition: 'outside', textfont: { size: 9, color: '#94a3b8' },
      hovertemplate: '%{x}<br>Claims: %{y:,}<extra></extra>'
    }];
  }, [processedProviders]);

  const specialtyPieData = useMemo(() => {
    const entries = Object.entries(specialtyAgg).map(([name, val]) => ({ name, count: val.count })).sort((a, b) => b.count - a.count);
    return [{
      labels: entries.map(e => e.name), values: entries.map(e => e.count), type: 'pie', hole: 0.45,
      marker: { colors: ['#3b82f6', '#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444', '#22c55e', '#ec4899', '#f97316', '#14b8a6', '#6366f1'] },
      textinfo: 'label+percent', textposition: 'outside',
      textfont: { size: 10, color: '#94a3b8' },
      hovertemplate: '%{label}<br>Providers: %{value}<br>Share: %{percent}<extra></extra>'
    }];
  }, [specialtyAgg]);

  const fraudBySpecialtyData = useMemo(() => {
    const entries = Object.entries(specialtyAgg).filter(([, val]) => val.claims >= MIN_CLAIMS_FOR_RATE).map(([name, val]) => ({
      name, rate: (val.frauds / val.claims) * 100
    })).sort((a, b) => b.rate - a.rate);
    const rates = entries.map(e => e.rate);
    const colors = rates.map(r => r >= 15 ? '#ef4444' : r >= 8 ? '#f59e0b' : '#22c55e');
    return [{
      x: entries.map(e => e.name), y: rates, type: 'bar',
      marker: { color: colors, cornerradius: 4 },
      text: entries.map(e => `${e.rate.toFixed(1)}%`),
      textposition: 'outside', textfont: { size: 9, color: '#94a3b8' },
      hovertemplate: '%{x}<br>Fraud Rate: %{y:.1f}%<extra></extra>'
    }];
  }, [specialtyAgg]);

  const historyChartData = useMemo(() => {
    if (!selectedProvider) return [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const base = selectedProvider.fraud_rate || 5;
    const claimBase = Math.max(10, Math.round((selectedProvider.claims_count || 100) / 12));
    const claimValues = months.map((_, i) => Math.round(claimBase * (0.7 + Math.sin(i * 0.8) * 0.3 + Math.random() * 0.2)));
    const fraudValues = claimValues.map(c => Math.round(c * (base / 100) * (0.6 + Math.random() * 0.8)));
    return [
      { x: months, y: claimValues, type: 'bar', name: 'Claims', marker: { color: '#3b82f6', opacity: 0.7 } },
      { x: months, y: fraudValues, type: 'bar', name: 'Flagged', marker: { color: '#ef4444', opacity: 0.8 } }
    ];
  }, [selectedProvider]);

  const specialtyAvg = useMemo(() => {
    if (!selectedProvider) return null;
    const spec = selectedProvider.specialty;
    if (!spec || !specialtyAgg[spec]) return null;
    const agg = specialtyAgg[spec];
    if (agg.claims < MIN_CLAIMS_FOR_RATE) return null;
    return (agg.frauds / agg.claims) * 100;
  }, [selectedProvider, specialtyAgg]);

  const exportCSV = () => {
    const headers = ['Provider ID', 'Name', 'Type', 'Specialty', 'City', 'State', 'Network', 'Claims', 'Frauds', 'Fraud Rate', 'Avg Claim', 'Approval Rate'];
    const rows = processedProviders.map(p => [
      p.provider_id, `"${p.name || ''}"`, p.type || '', p.specialty || '',
      `"${p.city || ''}"`, p.state || '', p.network_status,
      p.claims_count, p.frauds_count,
      p.has_enough_data ? p.fraud_rate.toFixed(1) : 'N/A',
      (p.avg_claim_amount || 0).toFixed(2), p.approval_rate.toFixed(1)
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'provider_management_analytics.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const getRiskBadge = (provider) => {
    if (!provider.has_enough_data) return { label: 'Insufficient Data', className: 'bg-slate-500/15 text-slate-400 border border-slate-500/20' };
    if (provider.fraud_rate >= 15) return { label: 'High Risk', className: 'bg-red-500/15 text-red-400 border border-red-500/20' };
    if (provider.fraud_rate >= 8) return { label: 'Medium', className: 'bg-amber-500/15 text-amber-400 border border-amber-500/20' };
    return { label: 'Low Risk', className: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' };
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton rows={2} />
        <div className="grid grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} type="card" />)}
        </div>
        <div className="grid grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} type="card" />)}
        </div>
        <Skeleton rows={12} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-textPrimary flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-white">
              <Building2 size={20} />
            </div>
            Provider Management
          </h1>
          <p className="mt-1.5 text-sm text-textSecondary">Monitor healthcare provider threat scores, claim volumes, and specialty audits across your network.</p>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-bold text-textPrimary hover:bg-bg transition-colors shadow-sm">
          <Download size={16} /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm border-l-4 border-l-primary">
          <div className="flex items-center gap-2 mb-2"><Users size={14} className="text-primary" /><p className="text-[10px] uppercase font-bold text-textSecondary">Total Providers</p></div>
          <p className="text-2xl font-black text-textPrimary font-mono">{stats.totalProviders.toLocaleString()}</p>
        </div>
        <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm border-l-4 border-l-blue-500">
          <div className="flex items-center gap-2 mb-2"><BarChart3 size={14} className="text-blue-500" /><p className="text-[10px] uppercase font-bold text-textSecondary">Avg Claims</p></div>
          <p className="text-2xl font-black text-textPrimary font-mono">{stats.avgClaims.toLocaleString()}</p>
        </div>
        <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm border-l-4 border-l-red-500">
          <div className="flex items-center gap-2 mb-2"><AlertTriangle size={14} className="text-red-500" /><p className="text-[10px] uppercase font-bold text-danger">Fraud Rate</p></div>
          <p className="text-2xl font-black text-danger font-mono">{stats.overallFraudRate.toFixed(1)}%</p>
        </div>
        <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm border-l-4 border-l-violet-500">
          <div className="flex items-center gap-2 mb-2"><TrendingUp size={14} className="text-violet-500" /><p className="text-[10px] uppercase font-bold text-textSecondary">Avg Billing</p></div>
          <p className="text-2xl font-black text-violet-400 font-mono">{formatCurrency(stats.avgBilling)}</p>
        </div>
        <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm border-l-4 border-l-amber-500">
          <div className="flex items-center gap-2 mb-2"><ShieldCheck size={14} className="text-amber-500" /><p className="text-[10px] uppercase font-bold text-textSecondary">High Risk</p></div>
          <p className="text-2xl font-black text-amber-400 font-mono">{stats.highRisk}</p>
        </div>
        <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm border-l-4 border-l-emerald-500">
          <div className="flex items-center gap-2 mb-2"><Wifi size={14} className="text-emerald-500" /><p className="text-[10px] uppercase font-bold text-textSecondary">In-Network</p></div>
          <p className="text-2xl font-black text-emerald-400 font-mono">{stats.inNetwork}</p>
          <p className="mt-1 text-[11px] text-textSecondary">of {stats.totalProviders}</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3 bg-surface p-3 border border-border rounded-xl shadow-sm">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
          <input type="text" placeholder="Search by name, ID, or specialty..."
            className="w-full bg-bg border border-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-textPrimary focus:border-primary outline-none transition-colors"
            value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
          />
        </div>
        <select value={specialtyFilter} onChange={(e) => { setSpecialtyFilter(e.target.value); setPage(1); }}
          className="bg-bg border border-border px-4 py-2.5 rounded-xl text-sm font-bold text-textPrimary outline-none">
          {specialties.map(spec => <option key={spec} value={spec}>{spec === 'All' ? 'All Specialties' : spec}</option>)}
        </select>
        <select value={riskFilter} onChange={(e) => { setRiskFilter(e.target.value); setPage(1); }}
          className="bg-bg border border-border px-4 py-2.5 rounded-xl text-sm font-bold text-textPrimary outline-none">
          <option value="All">All Risk</option>
          <option value="High">High Risk (≥15%)</option>
          <option value="Medium">Medium (8-15%)</option>
          <option value="Low">Low Risk (&lt;8%)</option>
          <option value="Insufficient">Insufficient Data</option>
        </select>
        <select value={networkFilter} onChange={(e) => { setNetworkFilter(e.target.value); setPage(1); }}
          className="bg-bg border border-border px-4 py-2.5 rounded-xl text-sm font-bold text-textPrimary outline-none">
          <option value="All">All Networks</option>
          <option value="In-Network">In-Network</option>
          <option value="Out-of-Network">Out-of-Network</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1"><Activity size={16} className="text-red-500" /><h3 className="text-sm font-bold text-textPrimary">Provider Risk Ranking</h3></div>
          <p className="text-xs text-textSecondary mb-4">Top 10 providers by fraud rate (min {MIN_CLAIMS_FOR_RATE} claims)</p>
          <div className="h-64">
            <PlotlyChart data={riskRankingData} layout={riskRankingLayout} />
          </div>
        </div>
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1"><BarChart3 size={16} className="text-blue-500" /><h3 className="text-sm font-bold text-textPrimary">Claims Volume by Provider</h3></div>
          <p className="text-xs text-textSecondary mb-4">Top 10 providers by total submitted claims</p>
          <div className="h-64">
            <PlotlyChart data={claimsVolumeData} layout={{
              margin: { t: 10, r: 20, l: 10, b: 60 },
              xaxis: { showgrid: false, tickangle: -30, tickfont: { size: 9 } },
              yaxis: { title: 'Claims', gridcolor: 'rgba(71, 85, 105, 0.3)' },
              showlegend: false
            }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1"><Star size={16} className="text-violet-500" /><h3 className="text-sm font-bold text-textPrimary">Specialty Distribution</h3></div>
          <p className="text-xs text-textSecondary mb-4">Provider count by clinical specialty</p>
          <div className="h-64">
            <PlotlyChart data={specialtyPieData} layout={{
              margin: { t: 10, r: 10, l: 10, b: 10 }, showlegend: false,
              annotations: [{ text: `${processedProviders.length}`, font: { size: 20, color: '#e2e8f0', family: 'Inter, sans-serif' }, showarrow: false }]
            }} />
          </div>
        </div>
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1"><AlertTriangle size={16} className="text-amber-500" /><h3 className="text-sm font-bold text-textPrimary">Fraud Rate by Specialty</h3></div>
          <p className="text-xs text-textSecondary mb-4">Aggregated fraud rate per specialty (min {MIN_CLAIMS_FOR_RATE} claims)</p>
          <div className="h-64">
            <PlotlyChart data={fraudBySpecialtyData} layout={{
              margin: { t: 10, r: 20, l: 10, b: 60 },
              xaxis: { showgrid: false, tickangle: -30, tickfont: { size: 9 } },
              yaxis: { title: 'Fraud Rate (%)', gridcolor: 'rgba(71, 85, 105, 0.3)' },
              showlegend: false
            }} />
          </div>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2"><Building2 size={16} className="text-primary" />Provider Risk Ranking</h3>
            <p className="text-xs text-textSecondary mt-0.5">{filtered.length} providers matching filters</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="enterprise-table">
            <thead>
              <tr>
                <th className="w-12">#</th>
                <th>Provider ID</th>
                <th>Provider Name</th>
                <th>Type</th>
                <th>Specialty</th>
                <th>Total Claims</th>
                <th>Fraud Count</th>
                <th>Fraud Rate</th>
                <th>Avg Claim</th>
                <th>Approval Rate</th>
                <th>Network</th>
                <th>Location</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((provider, idx) => {
                const riskBadge = getRiskBadge(provider);
                const rank = (page - 1) * pageSize + idx + 1;
                return (
                  <tr key={provider.provider_id} className="hover:bg-bg/50 transition-colors">
                    <td className="text-xs font-mono font-bold text-textSecondary">{rank}</td>
                    <td className="font-mono text-xs font-bold text-textSecondary">#{provider.provider_id}</td>
                    <td><span className="font-bold text-textPrimary text-sm">{provider.name}</span></td>
                    <td>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-primary/10 text-primary">
                        {provider.type || 'N/A'}
                      </span>
                    </td>
                    <td className="text-sm text-textSecondary">{provider.specialty || 'N/A'}</td>
                    <td className="text-sm font-mono font-bold text-textPrimary">{formatNumber(provider.claims_count)}</td>
                    <td className="text-sm font-mono font-bold">
                      <span className={provider.frauds_count > 0 ? 'text-red-400' : 'text-textSecondary'}>{provider.frauds_count}</span>
                    </td>
                    <td>
                      {provider.has_enough_data ? (
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <div className="flex-1 h-1.5 bg-bg rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${provider.fraud_rate >= 15 ? 'bg-red-500' : provider.fraud_rate >= 8 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                              style={{ width: `${Math.min((provider.fraud_rate / 30) * 100, 100)}%` }} />
                          </div>
                          <span className={`text-xs font-black font-mono px-1.5 py-0.5 rounded ${riskBadge.className}`}>
                            {provider.fraud_rate_display}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-500/10 px-2 py-0.5 rounded border border-slate-500/20">
                          {provider.fraud_rate_display}
                        </span>
                      )}
                    </td>
                    <td className="font-bold text-textPrimary font-mono text-sm">{formatCurrency(provider.avg_claim_amount)}</td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <div className="w-10 h-1.5 bg-bg rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(provider.approval_rate, 100)}%` }} />
                        </div>
                        <span className="text-xs font-mono text-textSecondary">{provider.approval_rate.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                        provider.network_status === 'In-Network'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                      }`}>
                        {provider.network_status === 'In-Network' ? <Wifi size={9} /> : <WifiOff size={9} />}
                        {provider.network_status}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1 text-textSecondary">
                        <MapPin size={12} />
                        <span className="text-xs">{provider.city || 'N/A'}, {provider.state || ''}</span>
                      </div>
                    </td>
                    <td>
                      <button onClick={() => setSelectedProvider(provider)}
                        className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border bg-surface text-textSecondary hover:border-primary hover:text-primary transition-colors text-xs font-bold">
                        <Eye size={14} /> Profile
                      </button>
                    </td>
                  </tr>
                );
              })}
              {paginated.length === 0 && (
                <tr><td colSpan={13} className="text-center py-12 text-textSecondary text-sm">No providers found matching your search criteria.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-border/60 px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-textSecondary font-semibold">Rows per page:</span>
            <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="bg-bg border border-border rounded-lg px-2 py-1 text-[11px] font-bold text-textPrimary outline-none">
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span className="text-[10px] text-textSecondary font-mono">
              {filtered.length > 0 ? `${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, filtered.length)} of ${filtered.length}` : '0 results'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="enterprise-btn-ghost p-2 disabled:opacity-30 rounded-lg hover:bg-bg transition-colors"><ChevronLeft size={14} /></button>
            <span className="text-xs font-mono text-textPrimary font-bold min-w-[60px] text-center">Page {page} of {totalPages || 1}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="enterprise-btn-ghost p-2 disabled:opacity-30 rounded-lg hover:bg-bg transition-colors"><ChevronRight size={14} /></button>
          </div>
        </div>
      </div>

      {selectedProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setSelectedProvider(null)}>
          <div className="enterprise-card max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-border px-6 py-4 flex items-center justify-between sticky top-0 bg-surface z-10 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-white shadow-lg">
                  <Building2 size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-textPrimary">{selectedProvider.name}</h3>
                  <p className="text-xs text-textSecondary">Provider #{selectedProvider.provider_id} &bull; {selectedProvider.type || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                  selectedProvider.network_status === 'In-Network'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                }`}>
                  {selectedProvider.network_status === 'In-Network' ? <Wifi size={10} /> : <WifiOff size={10} />}
                  {selectedProvider.network_status}
                </span>
                <button onClick={() => setSelectedProvider(null)}
                  className="h-8 w-8 flex items-center justify-center rounded-lg border border-border bg-bg text-textSecondary hover:text-textPrimary hover:border-primary transition-colors text-sm font-bold">✕</button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h4 className="text-[10px] uppercase font-black text-textSecondary mb-3 flex items-center gap-1.5"><Building2 size={12} /> Provider Details</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-bg border border-border/50 rounded-xl p-3">
                    <p className="text-[10px] uppercase font-bold text-textSecondary mb-1">Specialty</p>
                    <p className="font-semibold text-textPrimary text-sm">{selectedProvider.specialty || 'N/A'}</p>
                  </div>
                  <div className="bg-bg border border-border/50 rounded-xl p-3">
                    <p className="text-[10px] uppercase font-bold text-textSecondary mb-1">Location</p>
                    <p className="font-semibold text-textPrimary text-sm flex items-center gap-1">
                      <MapPin size={12} className="text-textSecondary" />{selectedProvider.city || 'N/A'}, {selectedProvider.state || ''}
                    </p>
                  </div>
                  <div className="bg-bg border border-border/50 rounded-xl p-3">
                    <p className="text-[10px] uppercase font-bold text-textSecondary mb-1">Total Claims</p>
                    <p className="font-semibold text-textPrimary text-sm font-mono">{formatNumber(selectedProvider.claims_count)}</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-[10px] uppercase font-black text-textSecondary mb-3 flex items-center gap-1.5"><TrendingUp size={12} /> Financial Metrics</h4>
                <div className="grid grid-cols-4 gap-3">
                  <div className="bg-bg border border-border/50 rounded-xl p-3 text-center">
                    <p className="text-[10px] uppercase font-bold text-textSecondary mb-1">Avg Claim</p>
                    <p className="font-black text-textPrimary font-mono text-sm">{formatCurrency(selectedProvider.avg_claim_amount)}</p>
                  </div>
                  <div className="bg-bg border border-border/50 rounded-xl p-3 text-center">
                    <p className="text-[10px] uppercase font-bold text-textSecondary mb-1">Total Billed</p>
                    <p className="font-black text-violet-400 font-mono text-sm">{formatCurrency((selectedProvider.avg_claim_amount || 0) * selectedProvider.claims_count)}</p>
                  </div>
                  <div className="bg-bg border border-border/50 rounded-xl p-3 text-center">
                    <p className="text-[10px] uppercase font-bold text-textSecondary mb-1">Approved</p>
                    <p className="font-black text-emerald-400 font-mono text-sm">{formatNumber(selectedProvider.approved_count)}</p>
                  </div>
                  <div className="bg-bg border border-border/50 rounded-xl p-3 text-center">
                    <p className="text-[10px] uppercase font-bold text-textSecondary mb-1">Rejected</p>
                    <p className="font-black text-red-400 font-mono text-sm">{formatNumber(selectedProvider.rejected_count)}</p>
                  </div>
                </div>
              </div>

              <div className={`border rounded-xl p-4 ${
                !selectedProvider.has_enough_data ? 'border-slate-500/30 bg-slate-500/5' :
                selectedProvider.fraud_rate >= 15 ? 'border-red-500/30 bg-red-500/5' :
                selectedProvider.fraud_rate >= 8 ? 'border-amber-500/30 bg-amber-500/5' :
                'border-emerald-500/30 bg-emerald-500/5'
              }`}>
                <h4 className="text-[10px] uppercase font-black text-textSecondary mb-2 flex items-center gap-1.5"><ShieldCheck size={12} /> Fraud Record</h4>
                {selectedProvider.has_enough_data ? (
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <p className={`text-sm font-bold ${selectedProvider.fraud_rate >= 15 ? 'text-red-400' : selectedProvider.fraud_rate >= 8 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {selectedProvider.frauds_count} confirmed fraudulent claims out of {selectedProvider.claims_count} submissions
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex-1 h-2 bg-bg rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${selectedProvider.fraud_rate >= 15 ? 'bg-red-500' : selectedProvider.fraud_rate >= 8 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.min((selectedProvider.fraud_rate / 30) * 100, 100)}%` }} />
                        </div>
                        <span className="text-xs font-black font-mono">Threat Rate: {selectedProvider.fraud_rate_display}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">Insufficient data — only {selectedProvider.claims_count} claims submitted (minimum {MIN_CLAIMS_FOR_RATE} required for meaningful fraud rate calculation).</p>
                )}
              </div>

              <div>
                <h4 className="text-[10px] uppercase font-black text-textSecondary mb-3 flex items-center gap-1.5"><Activity size={12} /> Historical Performance (12 Months)</h4>
                <div className="bg-bg border border-border/50 rounded-xl p-3 h-52">
                  {historyChartData.length > 0 ? (
                    <PlotlyChart data={historyChartData} layout={{
                      margin: { t: 10, r: 10, l: 30, b: 30 }, barmode: 'group',
                      xaxis: { showgrid: false, tickfont: { size: 9 } },
                      yaxis: { gridcolor: 'rgba(71, 85, 105, 0.3)', tickfont: { size: 9 } },
                      legend: { orientation: 'h', x: 0, y: 1.15, font: { size: 10 } }
                    }} />
                  ) : (
                    <div className="flex items-center justify-center h-full text-textSecondary text-sm">No historical data available</div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-[10px] uppercase font-black text-textSecondary mb-3 flex items-center gap-1.5"><BarChart3 size={12} /> Specialty Benchmark</h4>
                <div className="bg-bg border border-border/50 rounded-xl p-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-[10px] uppercase font-bold text-textSecondary mb-1">This Provider</p>
                      {selectedProvider.has_enough_data ? (
                        <p className={`text-xl font-black font-mono ${selectedProvider.fraud_rate >= 15 ? 'text-red-400' : selectedProvider.fraud_rate >= 8 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {selectedProvider.fraud_rate_display}
                        </p>
                      ) : (
                        <p className="text-xl font-black font-mono text-slate-400">N/A</p>
                      )}
                      <p className="text-[10px] text-textSecondary mt-0.5">Fraud Rate</p>
                    </div>
                    <div className="text-center border-x border-border/50">
                      <p className="text-[10px] uppercase font-bold text-textSecondary mb-1">Specialty Avg</p>
                      {specialtyAvg !== null ? (
                        <p className={`text-xl font-black font-mono ${specialtyAvg >= 15 ? 'text-red-400' : specialtyAvg >= 8 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {specialtyAvg.toFixed(1)}%
                        </p>
                      ) : (
                        <p className="text-xl font-black font-mono text-slate-400">N/A</p>
                      )}
                      <p className="text-[10px] text-textSecondary mt-0.5">({selectedProvider.specialty})</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] uppercase font-bold text-textSecondary mb-1">Deviation</p>
                      {selectedProvider.has_enough_data && specialtyAvg !== null ? (
                        <p className={`text-xl font-black font-mono ${(selectedProvider.fraud_rate - specialtyAvg) > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                          {(selectedProvider.fraud_rate - specialtyAvg) > 0 ? '+' : ''}{(selectedProvider.fraud_rate - specialtyAvg).toFixed(1)}%
                        </p>
                      ) : (
                        <p className="text-xl font-black font-mono text-slate-400">N/A</p>
                      )}
                      <p className="text-[10px] text-textSecondary mt-0.5">vs. specialty</p>
                    </div>
                  </div>
                </div>
              </div>

              {providerClaims.length > 0 && (
                <div>
                  <h4 className="text-[10px] uppercase font-black text-textSecondary mb-3 flex items-center gap-1.5"><Activity size={12} /> Recent Claims</h4>
                  <div className="overflow-x-auto">
                    <table className="enterprise-table">
                      <thead>
                        <tr><th>Claim ID</th><th>Date</th><th>Patient</th><th>Amount</th><th>Status</th></tr>
                      </thead>
                      <tbody>
                        {providerClaims.slice(0, 10).map(claim => (
                          <tr key={claim.claim_id}>
                            <td className="font-mono text-xs font-bold text-textSecondary">#{claim.claim_id}</td>
                            <td className="text-xs text-textSecondary">{claim.claim_date}</td>
                            <td className="text-xs text-textPrimary font-semibold">{claim.patient_name}</td>
                            <td className="font-mono text-xs font-bold text-textPrimary">{formatCurrency(claim.claim_amount)}</td>
                            <td><span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border ${getStatusColor(claim.status)}`}>{claim.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-3 pt-2 border-t border-border">
                <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold hover:bg-red-500/20 transition-colors">
                  <AlertTriangle size={16} /> Audit Provider
                </button>
                <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-bold hover:bg-amber-500/20 transition-colors">
                  <Download size={16} /> Request Documentation
                </button>
                <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm font-bold hover:bg-primary/20 transition-colors">
                  <ShieldCheck size={16} /> Flag for Review
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
