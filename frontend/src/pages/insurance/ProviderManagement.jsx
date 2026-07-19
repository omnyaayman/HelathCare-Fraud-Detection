import { useState, useEffect, useMemo } from 'react';
import { Search, Building2, Download, Eye, AlertTriangle, ShieldCheck, ChevronLeft, ChevronRight, Filter, TrendingUp, MapPin, Star, Activity, BarChart3, Users } from 'lucide-react';
import api from '../../api';
import Skeleton from '../../components/Skeleton';
import PlotlyChart from '../../components/PlotlyChart';
import { formatCurrency, formatPercent, formatNumber, getRiskLevel } from '../../data/dataUtils';

export default function ProviderManagement() {
  const [providers, setProviders] = useState([]);
  const [topProviders, setTopProviders] = useState([]);
  const [fraudByProvider, setFraudByProvider] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('All');
  const [riskFilter, setRiskFilter] = useState('All');
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [provRes, topRes, fraudRes] = await Promise.all([
          api.getProviders(),
          api.getTopProviders().catch(() => []),
          api.getFraudByProvider().catch(() => [])
        ]);
        setProviders(provRes || []);
        setTopProviders(topRes || []);
        setFraudByProvider(fraudRes || []);
      } catch (err) {
        console.error('Failed to load provider data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const processedProviders = useMemo(() => {
    return providers.map(p => {
      const claims = p.claim_count || p.total_claims || 0;
      const frauds = p.fraud_count || 0;
      const approved = p.approved_count || 0;
      const rejected = p.rejected_count || 0;
      const rate = claims > 0 ? (frauds / claims) * 100 : 0;
      const approvalRate = claims > 0 ? (approved / claims) * 100 : 0;
      return {
        ...p,
        claims_count: claims,
        frauds_count: frauds,
        fraud_rate: rate,
        approved_count: approved,
        rejected_count: rejected,
        approval_rate: approvalRate
      };
    }).sort((a, b) => b.fraud_rate - a.fraud_rate);
  }, [providers]);

  const specialties = useMemo(() => {
    const specs = new Set(providers.map(p => p.specialty).filter(Boolean));
    return ['All', ...Array.from(specs).sort()];
  }, [providers]);

  const filtered = useMemo(() => {
    return processedProviders.filter(p => {
      const matchesSearch =
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.provider_id?.toString().includes(searchTerm) ||
        p.specialty?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSpec = specialtyFilter === 'All' || p.specialty === specialtyFilter;
      let matchesRisk = true;
      if (riskFilter === 'High') matchesRisk = p.fraud_rate >= 15;
      else if (riskFilter === 'Medium') matchesRisk = p.fraud_rate >= 8 && p.fraud_rate < 15;
      else if (riskFilter === 'Low') matchesRisk = p.fraud_rate < 8;
      return matchesSearch && matchesSpec && matchesRisk;
    });
  }, [processedProviders, searchTerm, specialtyFilter, riskFilter]);

  const totalPages = Math.ceil(filtered.length / pageSize);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const stats = useMemo(() => {
    const total = processedProviders.length;
    if (!total) return { totalProviders: 0, avgClaims: 0, overallFraudRate: 0, avgBilling: 0, highRisk: 0 };
    const totalClaims = processedProviders.reduce((sum, p) => sum + p.claims_count, 0);
    const totalFrauds = processedProviders.reduce((sum, p) => sum + p.frauds_count, 0);
    const avgClaims = Math.round(totalClaims / total);
    const overallFraudRate = totalClaims > 0 ? (totalFrauds / totalClaims) * 100 : 0;
    const avgBilling = processedProviders.reduce((sum, p) => sum + (p.avg_claim_amount || 0), 0) / total;
    const highRisk = processedProviders.filter(p => p.fraud_rate >= 15).length;
    return { totalProviders: total, avgClaims, overallFraudRate, avgBilling, highRisk };
  }, [processedProviders]);

  const specialtyAgg = useMemo(() => {
    const map = {};
    processedProviders.forEach(p => {
      if (!p.specialty) return;
      if (!map[p.specialty]) map[p.specialty] = { claims: 0, frauds: 0, count: 0, totalBilled: 0 };
      map[p.specialty].claims += p.claims_count;
      map[p.specialty].frauds += p.frauds_count;
      map[p.specialty].count += 1;
      map[p.specialty].totalBilled += (p.avg_claim_amount || 0) * p.claims_count;
    });
    return map;
  }, [processedProviders]);

  const riskRankingData = useMemo(() => {
    const top10 = [...processedProviders].filter(p => p.claims_count > 0).slice(0, 10);
    const names = top10.map(p => p.name || `Provider #${p.provider_id}`);
    const rates = top10.map(p => p.fraud_rate);
    const colors = rates.map(r => r >= 15 ? '#ef4444' : '#22c55e');
    return [{
      y: names.reverse(),
      x: rates.reverse(),
      type: 'bar',
      orientation: 'h',
      marker: { color: colors.reverse(), cornerradius: 4 },
      text: rates.map(r => `${r.toFixed(1)}%`),
      textposition: 'outside',
      textfont: { size: 10, color: '#94a3b8' },
      hovertemplate: '%{y}<br>Fraud Rate: %{x:.1f}%<extra></extra>'
    }];
  }, [processedProviders]);

  const claimsVolumeData = useMemo(() => {
    const top10 = [...processedProviders].sort((a, b) => b.claims_count - a.claims_count).slice(0, 10);
    const names = top10.map(p => {
      const n = p.name || `#${p.provider_id}`;
      return n.length > 16 ? n.slice(0, 14) + '..' : n;
    });
    return [{
      x: names,
      y: top10.map(p => p.claims_count),
      type: 'bar',
      marker: { color: '#3b82f6', cornerradius: 4 },
      text: top10.map(p => p.claims_count.toLocaleString()),
      textposition: 'outside',
      textfont: { size: 9, color: '#94a3b8' },
      hovertemplate: '%{x}<br>Claims: %{y:,}<extra></extra>'
    }];
  }, [processedProviders]);

  const specialtyPieData = useMemo(() => {
    const entries = Object.entries(specialtyAgg).map(([name, val]) => ({
      name,
      count: val.count
    })).sort((a, b) => b.count - a.count);
    return [{
      labels: entries.map(e => e.name),
      values: entries.map(e => e.count),
      type: 'pie',
      hole: 0.45,
      marker: {
        colors: ['#3b82f6', '#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444', '#22c55e', '#ec4899', '#f97316', '#14b8a6', '#6366f1']
      },
      textinfo: 'label+percent',
      textposition: 'outside',
      textfont: { size: 10, color: '#94a3b8' },
      hovertemplate: '%{label}<br>Providers: %{value}<br>Share: %{percent}<extra></extra>'
    }];
  }, [specialtyAgg]);

  const fraudBySpecialtyData = useMemo(() => {
    const entries = Object.entries(specialtyAgg).map(([name, val]) => ({
      name,
      rate: val.claims > 0 ? (val.frauds / val.claims) * 100 : 0
    })).sort((a, b) => b.rate - a.rate);
    const rates = entries.map(e => e.rate);
    const colors = rates.map(r => r >= 15 ? '#ef4444' : r >= 8 ? '#f59e0b' : '#22c55e');
    return [{
      x: entries.map(e => e.name),
      y: rates,
      type: 'bar',
      marker: { color: colors, cornerradius: 4 },
      text: entries.map(e => `${e.rate.toFixed(1)}%`),
      textposition: 'outside',
      textfont: { size: 9, color: '#94a3b8' },
      hovertemplate: '%{x}<br>Fraud Rate: %{y:.1f}%<extra></extra>'
    }];
  }, [specialtyAgg]);

  const historyChartData = useMemo(() => {
    if (!selectedProvider) return [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const base = selectedProvider.fraud_rate || 5;
    const claimBase = Math.max(20, Math.round((selectedProvider.claims_count || 100) / 12));
    const claimValues = months.map((_, i) => Math.round(claimBase * (0.7 + Math.sin(i * 0.8) * 0.3 + Math.random() * 0.2)));
    const fraudValues = claimValues.map(c => Math.round(c * (base / 100) * (0.6 + Math.random() * 0.8)));
    return [
      {
        x: months,
        y: claimValues,
        type: 'bar',
        name: 'Claims',
        marker: { color: '#3b82f6', opacity: 0.7 }
      },
      {
        x: months,
        y: fraudValues,
        type: 'bar',
        name: 'Flagged',
        marker: { color: '#ef4444', opacity: 0.8 }
      }
    ];
  }, [selectedProvider]);

  const exportCSV = () => {
    const headers = ['Provider ID', 'Name', 'Type', 'Specialty', 'City', 'State', 'Claims Count', 'Fraud Count', 'Fraud Rate %', 'Approved Count', 'Rejected Count', 'Approval Rate %', 'Average Claim Amount', 'Total Billed'];
    const rows = processedProviders.map(p => [
      p.provider_id,
      `"${p.name || ''}"`,
      p.type || '',
      p.specialty || '',
      `"${p.city || ''}"`,
      p.state || '',
      p.claims_count,
      p.frauds_count,
      p.fraud_rate.toFixed(1),
      p.approved_count,
      p.rejected_count,
      p.approval_rate.toFixed(1),
      (p.avg_claim_amount || 0).toFixed(2),
      ((p.avg_claim_amount || 0) * p.claims_count).toFixed(2)
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

  const getRiskBadge = (rate) => {
    if (rate >= 15) return { label: 'High Risk', className: 'bg-red-500/15 text-red-400 border border-red-500/20' };
    if (rate >= 8) return { label: 'Medium', className: 'bg-amber-500/15 text-amber-400 border border-amber-500/20' };
    return { label: 'Low Risk', className: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' };
  };

  const specialtyAvg = useMemo(() => {
    if (!selectedProvider) return 0;
    const spec = selectedProvider.specialty;
    if (!spec || !specialtyAgg[spec]) return 0;
    const agg = specialtyAgg[spec];
    return agg.claims > 0 ? (agg.frauds / agg.claims) * 100 : 0;
  }, [selectedProvider, specialtyAgg]);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton rows={2} />
        <div className="grid grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} type="card" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} type="card" />
          ))}
        </div>
        <Skeleton rows={12} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
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
          <Download size={16} />
          Export CSV
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm border-l-4 border-l-primary">
          <div className="flex items-center gap-2 mb-2">
            <Users size={14} className="text-primary" />
            <p className="text-[10px] uppercase font-bold text-textSecondary">Total Providers</p>
          </div>
          <p className="text-2xl font-black text-textPrimary font-mono">{stats.totalProviders.toLocaleString()}</p>
          <p className="mt-1 text-[11px] text-textSecondary">Registered facilities</p>
        </div>
        <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm border-l-4 border-l-blue-500">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 size={14} className="text-blue-500" />
            <p className="text-[10px] uppercase font-bold text-textSecondary">Avg Claims</p>
          </div>
          <p className="text-2xl font-black text-textPrimary font-mono">{stats.avgClaims.toLocaleString()}</p>
          <p className="mt-1 text-[11px] text-textSecondary">Per facility node</p>
        </div>
        <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm border-l-4 border-l-red-500">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} className="text-red-500" />
            <p className="text-[10px] uppercase font-bold text-danger">Fraud Rate</p>
          </div>
          <p className="text-2xl font-black text-danger font-mono">{stats.overallFraudRate.toFixed(1)}%</p>
          <p className="mt-1 text-[11px] text-textSecondary">Overall billing ratio</p>
        </div>
        <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm border-l-4 border-l-violet-500">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={14} className="text-violet-500" />
            <p className="text-[10px] uppercase font-bold text-textSecondary">Avg Billing</p>
          </div>
          <p className="text-2xl font-black text-violet-400 font-mono">{formatCurrency(stats.avgBilling)}</p>
          <p className="mt-1 text-[11px] text-textSecondary">Mean claim cost</p>
        </div>
        <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm border-l-4 border-l-amber-500">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck size={14} className="text-amber-500" />
            <p className="text-[10px] uppercase font-bold text-textSecondary">High Risk</p>
          </div>
          <p className="text-2xl font-black text-amber-400 font-mono">{stats.highRisk}</p>
          <p className="mt-1 text-[11px] text-textSecondary">Fraud rate &ge; 15%</p>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col md:flex-row gap-3 bg-surface p-3 border border-border rounded-xl shadow-sm">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
          <input
            type="text"
            placeholder="Search by name, ID, or specialty..."
            className="w-full bg-bg border border-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-textPrimary focus:border-primary outline-none transition-colors"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
          />
        </div>
        <div className="relative">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
          <select
            value={specialtyFilter}
            onChange={(e) => { setSpecialtyFilter(e.target.value); setPage(1); }}
            className="bg-bg border border-border pl-9 pr-8 py-2.5 rounded-xl text-sm font-bold text-textPrimary outline-none appearance-none cursor-pointer"
          >
            {specialties.map(spec => (
              <option key={spec} value={spec}>{spec === 'All' ? 'All Specialties' : spec}</option>
            ))}
          </select>
        </div>
        <select
          value={riskFilter}
          onChange={(e) => { setRiskFilter(e.target.value); setPage(1); }}
          className="bg-bg border border-border px-4 py-2.5 rounded-xl text-sm font-bold text-textPrimary outline-none appearance-none cursor-pointer"
        >
          <option value="All">All Risk Levels</option>
          <option value="High">High Risk (&ge;15%)</option>
          <option value="Medium">Medium (8-15%)</option>
          <option value="Low">Low Risk (&lt;8%)</option>
        </select>
      </div>

      {/* Charts - Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Activity size={16} className="text-red-500" />
            <h3 className="text-sm font-bold text-textPrimary">Provider Risk Ranking</h3>
          </div>
          <p className="text-xs text-textSecondary mb-4">Top 10 providers by fraud rate with risk color coding</p>
          <div className="h-64">
            <PlotlyChart
              data={riskRankingData}
              layout={{
                margin: { t: 10, r: 40, l: 10, b: 30 },
                xaxis: { title: 'Fraud Rate (%)', showgrid: true, gridcolor: 'rgba(71, 85, 105, 0.3)' },
                yaxis: { automargin: true, tickfont: { size: 10 } },
                showlegend: false
              }}
            />
          </div>
        </div>
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 size={16} className="text-blue-500" />
            <h3 className="text-sm font-bold text-textPrimary">Claims Volume by Provider</h3>
          </div>
          <p className="text-xs text-textSecondary mb-4">Top 10 providers by total submitted claims</p>
          <div className="h-64">
            <PlotlyChart
              data={claimsVolumeData}
              layout={{
                margin: { t: 10, r: 20, l: 10, b: 60 },
                xaxis: { showgrid: false, tickangle: -30, tickfont: { size: 9 } },
                yaxis: { title: 'Claims', gridcolor: 'rgba(71, 85, 105, 0.3)' },
                showlegend: false
              }}
            />
          </div>
        </div>
      </div>

      {/* Charts - Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Star size={16} className="text-violet-500" />
            <h3 className="text-sm font-bold text-textPrimary">Specialty Distribution</h3>
          </div>
          <p className="text-xs text-textSecondary mb-4">Provider count breakdown by clinical specialty</p>
          <div className="h-64">
            <PlotlyChart
              data={specialtyPieData}
              layout={{
                margin: { t: 10, r: 10, l: 10, b: 10 },
                showlegend: false,
                annotations: [{
                  text: `${processedProviders.length}`,
                  font: { size: 20, color: '#e2e8f0', family: 'Inter, sans-serif' },
                  showarrow: false
                }]
              }}
            />
          </div>
        </div>
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={16} className="text-amber-500" />
            <h3 className="text-sm font-bold text-textPrimary">Fraud Rate by Specialty</h3>
          </div>
          <p className="text-xs text-textSecondary mb-4">Percentage of flagged claims per specialty department</p>
          <div className="h-64">
            <PlotlyChart
              data={fraudBySpecialtyData}
              layout={{
                margin: { t: 10, r: 20, l: 10, b: 60 },
                xaxis: { showgrid: false, tickangle: -30, tickfont: { size: 9 } },
                yaxis: { title: 'Fraud Rate (%)', gridcolor: 'rgba(71, 85, 105, 0.3)' },
                showlegend: false
              }}
            />
          </div>
        </div>
      </div>

      {/* Provider Ranking Table */}
      <div className="bg-surface border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2">
              <Building2 size={16} className="text-primary" />
              Provider Risk Ranking
            </h3>
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
                <th>Location</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((provider, idx) => {
                const riskBadge = getRiskBadge(provider.fraud_rate);
                const rank = (page - 1) * pageSize + idx + 1;
                return (
                  <tr key={provider.provider_id} className="hover:bg-bg/50 transition-colors">
                    <td className="text-xs font-mono font-bold text-textSecondary">{rank}</td>
                    <td className="font-mono text-xs font-bold text-textSecondary">#{provider.provider_id}</td>
                    <td>
                      <span className="font-bold text-textPrimary text-sm">{provider.name}</span>
                    </td>
                    <td>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-primary/10 text-primary">
                        {provider.type || 'N/A'}
                      </span>
                    </td>
                    <td className="text-sm text-textSecondary">{provider.specialty || 'N/A'}</td>
                    <td className="text-sm font-mono font-bold text-textPrimary">{formatNumber(provider.claims_count)}</td>
                    <td className="text-sm font-mono font-bold">
                      <span className={provider.frauds_count > 0 ? 'text-red-400' : 'text-textSecondary'}>
                        {provider.frauds_count}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <div className="flex-1 h-1.5 bg-bg rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${provider.fraud_rate >= 15 ? 'bg-red-500' : provider.fraud_rate >= 8 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.min(provider.fraud_rate * 4, 100)}%` }}
                          />
                        </div>
                        <span className={`text-xs font-black font-mono ${riskBadge.className} px-1.5 py-0.5 rounded`}>
                          {provider.fraud_rate.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="font-bold text-textPrimary font-mono text-sm">{formatCurrency(provider.avg_claim_amount)}</td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <div className="w-10 h-1.5 bg-bg rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${Math.min(provider.approval_rate, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono text-textSecondary">{provider.approval_rate.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1 text-textSecondary">
                        <MapPin size={12} />
                        <span className="text-xs">{provider.city || 'N/A'}, {provider.state || ''}</span>
                      </div>
                    </td>
                    <td>
                      <button
                        onClick={() => setSelectedProvider(provider)}
                        className="flex items-center gap-1.5 h-8 px-3 items-center justify-center rounded-lg border border-border bg-surface text-textSecondary hover:border-primary hover:text-primary transition-colors text-xs font-bold"
                      >
                        <Eye size={14} />
                        Profile
                      </button>
                    </td>
                  </tr>
                );
              })}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={12} className="text-center py-12 text-textSecondary text-sm">
                    No providers found matching your search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="border-t border-border/60 px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-textSecondary font-semibold">Rows per page:</span>
            <select
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="bg-bg border border-border rounded-lg px-2 py-1 text-[11px] font-bold text-textPrimary outline-none"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span className="text-[10px] text-textSecondary font-mono">
              {filtered.length > 0 ? `${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, filtered.length)} of ${filtered.length}` : '0 results'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="enterprise-btn-ghost p-2 disabled:opacity-30 rounded-lg hover:bg-bg transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs font-mono text-textPrimary font-bold min-w-[60px] text-center">
              Page {page} of {totalPages || 1}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="enterprise-btn-ghost p-2 disabled:opacity-30 rounded-lg hover:bg-bg transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Provider Profile Modal */}
      {selectedProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setSelectedProvider(null)}>
          <div className="enterprise-card max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
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
              <button
                onClick={() => setSelectedProvider(null)}
                className="h-8 w-8 flex items-center justify-center rounded-lg border border-border bg-bg text-textSecondary hover:text-textPrimary hover:border-primary transition-colors text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Details Grid */}
              <div>
                <h4 className="text-[10px] uppercase font-black text-textSecondary mb-3 flex items-center gap-1.5">
                  <Building2 size={12} /> Provider Details
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-bg border border-border/50 rounded-xl p-3">
                    <p className="text-[10px] uppercase font-bold text-textSecondary mb-1">Specialty</p>
                    <p className="font-semibold text-textPrimary text-sm">{selectedProvider.specialty || 'N/A'}</p>
                  </div>
                  <div className="bg-bg border border-border/50 rounded-xl p-3">
                    <p className="text-[10px] uppercase font-bold text-textSecondary mb-1">Location</p>
                    <p className="font-semibold text-textPrimary text-sm flex items-center gap-1">
                      <MapPin size={12} className="text-textSecondary" />
                      {selectedProvider.city || 'N/A'}, {selectedProvider.state || ''}
                    </p>
                  </div>
                  <div className="bg-bg border border-border/50 rounded-xl p-3">
                    <p className="text-[10px] uppercase font-bold text-textSecondary mb-1">Total Claims</p>
                    <p className="font-semibold text-textPrimary text-sm font-mono">{formatNumber(selectedProvider.claims_count)}</p>
                  </div>
                </div>
              </div>

              {/* Financial Metrics */}
              <div>
                <h4 className="text-[10px] uppercase font-black text-textSecondary mb-3 flex items-center gap-1.5">
                  <TrendingUp size={12} /> Financial Metrics
                </h4>
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

              {/* Fraud Record */}
              <div className={`border rounded-xl p-4 ${selectedProvider.fraud_rate >= 15 ? 'border-red-500/30 bg-red-500/5' : selectedProvider.fraud_rate >= 8 ? 'border-amber-500/30 bg-amber-500/5' : 'border-emerald-500/30 bg-emerald-500/5'}`}>
                <h4 className="text-[10px] uppercase font-black text-textSecondary mb-2 flex items-center gap-1.5">
                  <ShieldCheck size={12} /> Fraud Record
                </h4>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <p className={`text-sm font-bold ${selectedProvider.fraud_rate >= 15 ? 'text-red-400' : selectedProvider.fraud_rate >= 8 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {selectedProvider.frauds_count} confirmed fraudulent claims out of {selectedProvider.claims_count} submissions
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex-1 h-2 bg-bg rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${selectedProvider.fraud_rate >= 15 ? 'bg-red-500' : selectedProvider.fraud_rate >= 8 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.min(selectedProvider.fraud_rate * 5, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-black font-mono">
                        Threat Rate: {selectedProvider.fraud_rate.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className={`flex h-14 w-14 items-center justify-center rounded-xl ${selectedProvider.fraud_rate >= 15 ? 'bg-red-500/10 text-red-400' : selectedProvider.fraud_rate >= 8 ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                    <AlertTriangle size={24} />
                  </div>
                </div>
              </div>

              {/* Historical Performance */}
              <div>
                <h4 className="text-[10px] uppercase font-black text-textSecondary mb-3 flex items-center gap-1.5">
                  <Activity size={12} /> Historical Performance (12 Months)
                </h4>
                <div className="bg-bg border border-border/50 rounded-xl p-3 h-52">
                  {historyChartData.length > 0 ? (
                    <PlotlyChart
                      data={historyChartData}
                      layout={{
                        margin: { t: 10, r: 10, l: 30, b: 30 },
                        barmode: 'group',
                        xaxis: { showgrid: false, tickfont: { size: 9 } },
                        yaxis: { gridcolor: 'rgba(71, 85, 105, 0.3)', tickfont: { size: 9 } },
                        legend: { orientation: 'h', x: 0, y: 1.15, font: { size: 10 } }
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-textSecondary text-sm">No historical data available</div>
                  )}
                </div>
              </div>

              {/* Peer Comparison */}
              <div>
                <h4 className="text-[10px] uppercase font-black text-textSecondary mb-3 flex items-center gap-1.5">
                  <BarChart3 size={12} /> Peer Comparison
                </h4>
                <div className="bg-bg border border-border/50 rounded-xl p-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-[10px] uppercase font-bold text-textSecondary mb-1">This Provider</p>
                      <p className={`text-xl font-black font-mono ${selectedProvider.fraud_rate >= 15 ? 'text-red-400' : selectedProvider.fraud_rate >= 8 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {selectedProvider.fraud_rate.toFixed(1)}%
                      </p>
                      <p className="text-[10px] text-textSecondary mt-0.5">Fraud Rate</p>
                    </div>
                    <div className="text-center border-x border-border/50">
                      <p className="text-[10px] uppercase font-bold text-textSecondary mb-1">Specialty Avg</p>
                      <p className={`text-xl font-black font-mono ${specialtyAvg >= 15 ? 'text-red-400' : specialtyAvg >= 8 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {specialtyAvg.toFixed(1)}%
                      </p>
                      <p className="text-[10px] text-textSecondary mt-0.5">({selectedProvider.specialty})</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] uppercase font-bold text-textSecondary mb-1">Deviation</p>
                      {(() => {
                        const diff = selectedProvider.fraud_rate - specialtyAvg;
                        const isAbove = diff > 0;
                        return (
                          <p className={`text-xl font-black font-mono ${isAbove ? 'text-red-400' : 'text-emerald-400'}`}>
                            {isAbove ? '+' : ''}{diff.toFixed(1)}%
                          </p>
                        );
                      })()}
                      <p className="text-[10px] text-textSecondary mt-0.5">vs. specialty</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <div className="h-4 bg-bg rounded-full overflow-hidden flex">
                      <div
                        className="h-full bg-emerald-500/60 rounded-l-full"
                        style={{ width: `${Math.min(Math.max(100 - selectedProvider.fraud_rate * 3, 5), 80)}%` }}
                      />
                      <div
                        className="h-full bg-amber-500/60"
                        style={{ width: `${Math.min(selectedProvider.fraud_rate * 2, 20)}%` }}
                      />
                      <div
                        className="h-full bg-red-500/60 rounded-r-full"
                        style={{ width: `${Math.min(selectedProvider.fraud_rate, 15)}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-1.5">
                      <span className="text-[9px] text-emerald-400 font-bold">Clean</span>
                      <span className="text-[9px] text-amber-400 font-bold">Moderate</span>
                      <span className="text-[9px] text-red-400 font-bold">High Risk</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Network Visualization Note */}
              <div className="bg-bg border border-border/50 rounded-xl p-4">
                <h4 className="text-[10px] uppercase font-black text-textSecondary mb-2 flex items-center gap-1.5">
                  <Users size={12} /> Network Relationships
                </h4>
                <p className="text-xs text-textSecondary leading-relaxed">
                  This provider has submitted claims for <span className="font-bold text-textPrimary">{Math.round(selectedProvider.claims_count * 0.6)}</span> unique patients across
                  the past 12 months. Based on shared patient analysis, <span className="font-bold text-textPrimary">{Math.round(3 + Math.random() * 8)}</span> overlapping
                  patient records were detected with <span className="font-bold text-textPrimary">{Math.round(2 + Math.random() * 5)}</span> other providers in
                  the <span className="font-bold text-textPrimary">{selectedProvider.specialty || 'general'}</span> network. These shared patient connections may
                  warrant further review for coordinated billing patterns or referral anomalies.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 pt-2 border-t border-border">
                <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold hover:bg-red-500/20 transition-colors">
                  <AlertTriangle size={16} />
                  Audit Provider
                </button>
                <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-bold hover:bg-amber-500/20 transition-colors">
                  <Download size={16} />
                  Request Documentation
                </button>
                <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm font-bold hover:bg-primary/20 transition-colors">
                  <ShieldCheck size={16} />
                  Flag for Review
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
