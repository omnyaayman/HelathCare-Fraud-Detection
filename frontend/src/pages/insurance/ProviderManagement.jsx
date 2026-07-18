import { useState, useEffect, useMemo } from 'react';
import { Search, Building2, Download, Eye, AlertTriangle, ShieldCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../api';
import Skeleton from '../../components/Skeleton';
import PlotlyChart from '../../components/PlotlyChart';

const formatCurrency = (val) => {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num);
};

export default function ProviderManagement() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('All');
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.getProviders();
        setProviders(res || []);
      } catch (err) {
        console.error('Failed to load providers', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Fix database keys: backend returns `fraud_count` and `claim_count`
  const processedProviders = useMemo(() => {
    return providers.map(p => {
      const claims = p.claim_count || p.total_claims || 0;
      const frauds = p.fraud_count || 0;
      const rate = claims > 0 ? (frauds / claims) * 100 : 0;
      return {
        ...p,
        claims_count: claims,
        frauds_count: frauds,
        fraud_rate: rate
      };
    }).sort((a, b) => b.fraud_rate - a.fraud_rate); // Provider Risk Ranking
  }, [providers]);

  const filtered = useMemo(() => {
    return processedProviders.filter(p => {
      const matchesSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.provider_id?.toString().includes(searchTerm);
      const matchesSpec = specialtyFilter === 'All' || p.specialty === specialtyFilter;
      return matchesSearch && matchesSpec;
    });
  }, [processedProviders, searchTerm, specialtyFilter]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const specialties = useMemo(() => {
    const specs = new Set(providers.map(p => p.specialty).filter(Boolean));
    return ['All', ...Array.from(specs).sort()];
  }, [providers]);

  // Chart 1: Fraud by Specialty
  const specialtyChartData = useMemo(() => {
    const specMap = {};
    processedProviders.forEach(p => {
      if (!p.specialty) return;
      if (!specMap[p.specialty]) specMap[p.specialty] = { frauds: 0, claims: 0 };
      specMap[p.specialty].frauds += p.frauds_count;
      specMap[p.specialty].claims += p.claims_count;
    });

    const entries = Object.entries(specMap).map(([name, val]) => ({
      name,
      rate: val.claims > 0 ? (val.frauds / val.claims) * 100 : 0
    })).sort((a, b) => b.rate - a.rate).slice(0, 5);

    return [
      {
        x: entries.map(e => e.name),
        y: entries.map(e => e.rate),
        type: 'bar',
        marker: { color: '#ef4444' }
      }
    ];
  }, [processedProviders]);

  // Chart 2: Top Providers by Claim Volume
  const topProvidersChartData = useMemo(() => {
    const top5 = [...processedProviders]
      .sort((a, b) => b.claims_count - a.claims_count)
      .slice(0, 5);

    return [
      {
        x: top5.map(p => p.name),
        y: top5.map(p => p.claims_count),
        type: 'bar',
        marker: { color: '#2563eb' }
      }
    ];
  }, [processedProviders]);

  const stats = useMemo(() => {
    const total = processedProviders.length;
    if (!total) return { avgClaims: 0, overallFraudRate: 0, avgBilling: 0, highRisk: 0 };
    const totalClaims = processedProviders.reduce((sum, p) => sum + p.claims_count, 0);
    const totalFrauds = processedProviders.reduce((sum, p) => sum + p.frauds_count, 0);
    const avgClaims = Math.round(totalClaims / total);
    const overallFraudRate = totalClaims > 0 ? (totalFrauds / totalClaims) * 100 : 0;
    const avgBilling = processedProviders.reduce((sum, p) => sum + (p.avg_claim_amount || 0), 0) / total;
    const highRisk = processedProviders.filter(p => p.fraud_rate >= 15).length;
    return { avgClaims, overallFraudRate, avgBilling, highRisk };
  }, [processedProviders]);

  const exportCSV = () => {
    const headers = ['Provider ID', 'Name', 'Type', 'Specialty', 'Location', 'Claims Count', 'Fraud Count', 'Fraud Rate %', 'Average Claim'];
    const csvContent = [
      headers.join(','),
      ...processedProviders.map(p => [
        p.provider_id,
        `"${p.name || ''}"`,
        p.type || '',
        p.specialty || '',
        `"${p.city || ''}, ${p.state || ''}"`,
        p.claims_count,
        p.frauds_count,
        p.fraud_rate.toFixed(1),
        p.avg_claim_amount || 0
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `providers_registry.csv`);
    link.click();
  };

  if (loading) {
    return <div className="p-6"><Skeleton rows={8} /></div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-textPrimary">Provider Management</h1>
          <p className="mt-1 text-sm text-textSecondary">Monitor healthcare provider threat scores, claim volumes, and specialty audits.</p>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-bold text-textPrimary hover:bg-bg transition-colors">
          <Download size={16} />
          Export CSV
        </button>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm">
          <p className="text-[10px] uppercase font-bold text-textSecondary">Average Claims</p>
          <p className="mt-2 text-2xl font-black text-textPrimary font-mono">{stats.avgClaims.toLocaleString()}</p>
          <p className="mt-1 text-[11px] text-textSecondary">Per facility node</p>
        </div>
        <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm border-l-4 border-l-red-500">
          <p className="text-[10px] uppercase font-bold text-danger">Overall Fraud %</p>
          <p className="mt-2 text-2xl font-black text-danger font-mono">{stats.overallFraudRate.toFixed(1)}%</p>
          <p className="mt-1 text-[11px] text-textSecondary">Fraud billing ratio</p>
        </div>
        <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm">
          <p className="text-[10px] uppercase font-bold text-primary">Average Billing</p>
          <p className="mt-2 text-2xl font-black text-primary font-mono">{formatCurrency(stats.avgBilling)}</p>
          <p className="mt-1 text-[11px] text-textSecondary">Mean claim cost</p>
        </div>
        <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm">
          <p className="text-[10px] uppercase font-bold text-textSecondary font-sans">High Risk Providers</p>
          <p className="mt-2 text-2xl font-black text-textPrimary font-mono">{stats.highRisk}</p>
          <p className="mt-1 text-[11px] text-textSecondary">Threshold anomaly &gt; 15%</p>
        </div>
      </div>

      {/* Specialty Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 bg-surface p-3 border border-border rounded-xl">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
          <input
            type="text"
            placeholder="Search provider ID or facility name..."
            className="w-full bg-bg border border-border rounded-xl py-2 pl-10 pr-4 text-sm text-textPrimary focus:border-primary outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          value={specialtyFilter}
          onChange={(e) => setSpecialtyFilter(e.target.value)}
          className="bg-bg border border-border px-4 py-2 rounded-xl text-sm font-bold text-textPrimary outline-none w-full md:w-48"
        >
          {specialties.map(spec => (
            <option key={spec} value={spec}>{spec === 'All' ? 'All Specialties' : spec}</option>
          ))}
        </select>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-textPrimary mb-1">Top Fraud Rates by Specialty</h3>
          <p className="text-xs text-textSecondary mb-4">Average fraud rate (%) per clinical department specialty</p>
          <div className="h-56 bg-surface p-2">
            <PlotlyChart data={specialtyChartData} layout={{ margin: { t: 10, r: 10, l: 30, b: 35 }, xaxis: { showgrid: false }, yaxis: { gridcolor: 'rgba(226, 232, 240, 0.5)' } }} />
          </div>
        </div>
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-textPrimary mb-1">Top Providers by Volume</h3>
          <p className="text-xs text-textSecondary mb-4">Providers submitting the highest count of claims</p>
          <div className="h-56 bg-surface p-2">
            <PlotlyChart data={topProvidersChartData} layout={{ margin: { t: 10, r: 10, l: 30, b: 35 }, xaxis: { showgrid: false }, yaxis: { gridcolor: 'rgba(226, 232, 240, 0.5)' } }} />
          </div>
        </div>
      </div>

      {/* Directory Ranking Grid */}
      <div className="enterprise-card">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-bold text-textPrimary">Provider Risk Ranking</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="enterprise-table">
            <thead>
              <tr>
                <th>Provider ID</th>
                <th>Provider</th>
                <th>Specialty</th>
                <th>Claims</th>
                <th>Fraud Rate</th>
                <th>Average Claim</th>
                <th>Location</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((provider) => {
                const isRisk = provider.fraud_rate >= 15;
                return (
                  <tr key={provider.provider_id}>
                    <td className="font-mono text-xs font-bold text-textSecondary">#{provider.provider_id}</td>
                    <td className="font-semibold text-textPrimary">{provider.name}</td>
                    <td className="text-sm text-textSecondary">{provider.specialty}</td>
                    <td className="text-sm text-textSecondary font-mono">{provider.claims_count} ({provider.frauds_count})</td>
                    <td className="font-mono font-bold">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-black ${
                        isRisk ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'
                      }`}>
                        {provider.fraud_rate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="font-bold text-textPrimary font-mono">{formatCurrency(provider.avg_claim_amount)}</td>
                    <td className="text-sm text-textSecondary">{provider.city}, {provider.state}</td>
                    <td>
                      <button
                        onClick={() => setSelectedProvider(provider)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-textSecondary hover:border-primary hover:text-primary transition-colors"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border/60 px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-textSecondary font-semibold">Rows per page:</span>
            <select
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="bg-bg border border-border rounded-lg px-2 py-1 text-[10px] font-bold text-textPrimary outline-none"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-[10px] text-textSecondary font-mono">Page {page} of {totalPages || 1}</span>
          </div>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}
              className="enterprise-btn-ghost p-2 disabled:opacity-30"><ChevronLeft size={14} /></button>
            <span className="text-xs font-mono text-textPrimary font-bold">{page}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
              className="enterprise-btn-ghost p-2 disabled:opacity-30"><ChevronRight size={14} /></button>
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {selectedProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedProvider(null)}>
          <div className="enterprise-card max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-border px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-black text-textPrimary">Provider Directory Profile</h3>
              <button onClick={() => setSelectedProvider(null)} className="text-textSecondary hover:text-textPrimary text-xl">
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-white text-2xl font-black">
                  <Building2 size={28} />
                </div>
                <div>
                  <h4 className="text-xl font-black text-textPrimary">{selectedProvider.name}</h4>
                  <p className="text-sm text-textSecondary">Provider No. #{selectedProvider.provider_id} &bull; {selectedProvider.type}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase text-textSecondary">Clinical Specialty</p>
                  <p className="font-semibold text-textPrimary">{selectedProvider.specialty}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-textSecondary">Location</p>
                  <p className="font-semibold text-textPrimary">{selectedProvider.city}, {selectedProvider.state}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-textSecondary">Total Submitted Claims</p>
                  <p className="font-semibold text-textPrimary">{selectedProvider.claims_count}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-textSecondary">Average Claim Amount</p>
                  <p className="font-semibold text-textPrimary font-mono">{formatCurrency(selectedProvider.avg_claim_amount)}</p>
                </div>
                <div className="col-span-2 border-t border-border pt-3">
                  <p className="text-[10px] font-black uppercase text-textSecondary">Fraud Record Audit</p>
                  <p className={`font-bold text-sm mt-1 ${selectedProvider.frauds_count > 0 ? 'text-danger' : 'text-success'}`}>
                    {selectedProvider.frauds_count} confirmed fraudulent cases out of {selectedProvider.claims_count} submissions ({selectedProvider.fraud_rate.toFixed(1)}% threat rate).
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
