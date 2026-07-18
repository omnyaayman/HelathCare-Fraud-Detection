import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Download, ShieldCheck, AlertCircle, FileText, Activity } from 'lucide-react';
import api from '../../api';
import Skeleton from '../../components/Skeleton';
import PlotlyChart from '../../components/PlotlyChart';

const formatCurrency = (val) => {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num);
};

// Generate realistic policy type based on deductible value
const getPolicyType = (deductible) => {
  if (deductible >= 6000) return 'Corporate Gold';
  if (deductible >= 4000) return 'Family Premium';
  return 'Individual Starter';
};

// Estimate premium based on deductible limits
const getEstimatedPremium = (p) => {
  const base = p.annual_deductible || 2000;
  return (base * 0.18) + (p.copay_amount || 250);
};

export default function Policies() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedPolicy, setSelectedPolicy] = useState(null);

  const fetchPolicies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getPolicies();
      setPolicies(res || []);
    } catch (err) {
      console.error('Failed to load policies', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  // Map additional details like Premium, Policy Type, and Fraud Rate
  const processedPolicies = useMemo(() => {
    return policies.map(p => {
      const type = getPolicyType(p.annual_deductible);
      const premium = getEstimatedPremium(p);
      const claims = p.claim_count || 0;
      const frauds = p.fraud_count || 0;
      const fraudRate = claims > 0 ? (frauds / claims) * 100 : 0;
      return {
        ...p,
        policy_type: type,
        annual_premium: premium,
        fraud_rate: fraudRate
      };
    });
  }, [policies]);

  const filtered = useMemo(() => {
    return processedPolicies.filter((p) => {
      const matchSearch =
        p.policy_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.policy_type?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchStatus =
        statusFilter === 'All' ||
        (statusFilter === 'Active' && p.policy_status === 'Active') ||
        (statusFilter === 'Expired' && p.policy_status === 'Expired');

      return matchSearch && matchStatus;
    });
  }, [processedPolicies, searchTerm, statusFilter]);

  const activeCount = policies.filter((p) => p.policy_status === 'Active').length;
  const expiredCount = policies.filter((p) => p.policy_status === 'Expired').length;
  const overallPremiumSum = processedPolicies.reduce((sum, p) => sum + p.annual_premium, 0);

  if (loading) {
    return <Skeleton rows={10} />;
  }

  // Coverage Status Donut
  const coverageData = [
    {
      labels: ['Active', 'Expired'],
      values: [activeCount, expiredCount],
      type: 'pie',
      hole: 0.6,
      marker: { colors: ['#22c55e', '#ef4444'] },
      textinfo: 'none',
      showlegend: true
    }
  ];

  const coverageLayout = {
    margin: { t: 10, b: 10, l: 10, r: 10 },
    height: 180,
    legend: { orientation: 'h', y: -0.15 }
  };

  // Deductible vs Copay Bar Chart
  const chartPolicies = filtered.slice(0, 10);
  const barData = [
    {
      x: chartPolicies.map((p) => p.policy_id),
      y: chartPolicies.map((p) => p.annual_premium || 0),
      type: 'bar',
      name: 'Estimated Premium',
      marker: { color: '#6366f1' }
    },
    {
      x: chartPolicies.map((p) => p.policy_id),
      y: chartPolicies.map((p) => p.annual_deductible || 0),
      type: 'bar',
      name: 'Annual Deductible',
      marker: { color: '#f97316' }
    }
  ];

  const barLayout = {
    margin: { t: 20, r: 10, l: 50, b: 40 },
    xaxis: { tickangle: -20, automargin: true },
    yaxis: { gridcolor: 'rgba(226, 232, 240, 0.5)' },
    legend: { orientation: 'h', y: -0.2 }
  };

  const exportCSV = () => {
    const headers = ['Policy ID', 'Patient', 'Policy Type', 'Premium', 'Claims Count', 'Fraud Rate %', 'Status'];
    const csv = [
      headers.join(','),
      ...processedPolicies.map(p => [
        p.policy_id,
        `"${p.patient_name || ''}"`,
        p.policy_type,
        p.annual_premium.toFixed(0),
        p.claim_count || 0,
        p.fraud_rate.toFixed(1),
        p.policy_status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'policies_registry.csv';
    a.click();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-primary/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-primary w-fit">
            <FileText size={14} />
            Policy Database
          </div>
          <h1 className="mt-4 text-2xl font-black text-textPrimary">Policy Management</h1>
          <p className="text-sm text-textSecondary">Manage active policy coverage, deductible thresholds, premiums, and suspicious claim rates.</p>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-bold text-textPrimary hover:bg-bg transition-colors">
          <Download size={16} />
          Export CSV
        </button>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm">
          <p className="text-[10px] uppercase font-bold text-textSecondary">Total Active Policies</p>
          <p className="mt-2 text-3xl font-black text-textPrimary font-mono">{policies.length.toLocaleString()}</p>
          <p className="mt-1 text-[11px] text-textSecondary">Contracts in DB</p>
        </div>
        <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm">
          <p className="text-[10px] uppercase font-bold text-green-500">Active Coverage</p>
          <p className="mt-2 text-3xl font-black text-green-500 font-mono">{activeCount.toLocaleString()}</p>
          <p className="mt-1 text-[11px] text-textSecondary">Currently active</p>
        </div>
        <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm">
          <p className="text-[10px] uppercase font-bold text-red-500">Expired Contracts</p>
          <p className="mt-2 text-3xl font-black text-red-500 font-mono">{expiredCount.toLocaleString()}</p>
          <p className="mt-1 text-[11px] text-textSecondary">Expired contracts</p>
        </div>
        <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm">
          <p className="text-[10px] uppercase font-bold text-primary">Annual Premium Pool</p>
          <p className="mt-2 text-3xl font-black text-primary font-mono">{formatCurrency(overallPremiumSum)}</p>
          <p className="mt-1 text-[11px] text-textSecondary">Total estimated revenue</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-textPrimary mb-1">Coverage Status</h3>
          <p className="text-xs text-textSecondary mb-4">Estimated active vs expired contracts</p>
          <div className="h-48 bg-surface p-2">
            <PlotlyChart data={coverageData} layout={coverageLayout} />
          </div>
        </div>

        <div className="lg:col-span-2 bg-surface border border-border rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-textPrimary mb-1">Premium limits vs Deductibles</h3>
          <p className="text-xs text-textSecondary mb-4">Financial thresholds per policy limits</p>
          <div className="h-48 bg-surface p-2">
            <PlotlyChart data={barData} layout={barLayout} />
          </div>
        </div>
      </div>

      {/* Directory Section */}
      <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-textPrimary">Policy Directory</h2>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-5">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
            <input
              type="text"
              placeholder="Search by Policy No, Patient Name, or Policy Type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-bg border border-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-textPrimary focus:border-primary outline-none"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-bg border border-border px-4 py-2 rounded-xl text-sm font-bold text-textPrimary outline-none w-full md:w-48"
          >
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Expired">Expired</option>
          </select>
        </div>

        {/* Policies Table */}
        <div className="overflow-x-auto">
          <table className="enterprise-table">
            <thead>
              <tr>
                <th>Policy No.</th>
                <th>Patient</th>
                <th>Policy Type</th>
                <th>Premium</th>
                <th>Claims</th>
                <th>Fraud Rate</th>
                <th>Deductible / Copay</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((policy) => (
                <tr key={policy.policy_id} className="hover:bg-bg/40 transition-colors">
                  <td>
                    <button
                      onClick={() => setSelectedPolicy(policy)}
                      className="font-mono text-xs font-black text-primary hover:underline text-left"
                    >
                      {policy.policy_id}
                    </button>
                  </td>
                  <td className="font-bold text-textPrimary">{policy.patient_name || policy.patient_id}</td>
                  <td className="text-sm font-semibold text-textSecondary">{policy.policy_type}</td>
                  <td className="font-mono font-bold text-primary">{formatCurrency(policy.annual_premium)}</td>
                  <td className="font-mono text-textPrimary text-xs">{policy.claim_count || 0}</td>
                  <td>
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                      policy.fraud_rate > 15 ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'
                    }`}>
                      {policy.fraud_rate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="font-mono text-textSecondary text-xs">
                    {formatCurrency(policy.annual_deductible)} / {formatCurrency(policy.copay_amount)}
                  </td>
                  <td>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${
                      policy.policy_status === 'Expired'
                        ? 'bg-red-500/10 text-red-500'
                        : 'bg-green-500/10 text-green-500'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${policy.policy_status === 'Expired' ? 'bg-red-500' : 'bg-green-500'}`} />
                      {policy.policy_status}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="8" className="px-6 py-10 text-center text-sm text-textSecondary italic">
                    No matching policies found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {selectedPolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedPolicy(null)}>
          <div className="enterprise-card max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-border px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-black text-textPrimary">Policy File details</h3>
              <button onClick={() => setSelectedPolicy(null)} className="text-textSecondary hover:text-textPrimary text-xl">
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
                  <Activity size={28} />
                </div>
                <div>
                  <h4 className="text-xl font-black text-[#4f46e5]">{selectedPolicy.policy_id}</h4>
                  <p className="text-sm font-bold text-textPrimary">{selectedPolicy.patient_name || selectedPolicy.patient_id}</p>
                </div>
              </div>
              <hr className="border-border" />
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-[10px] font-black uppercase text-textSecondary">Coverage Class</p>
                  <p className="font-semibold text-textPrimary">{selectedPolicy.policy_type}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-textSecondary">Premium Limit</p>
                  <p className="font-bold text-textPrimary font-mono">{formatCurrency(selectedPolicy.annual_premium)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-textSecondary">Start Date</p>
                  <p className="font-semibold text-textPrimary">
                    {selectedPolicy.policy_start_date ? new Date(selectedPolicy.policy_start_date).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-textSecondary">End Date</p>
                  <p className="font-semibold text-textPrimary">
                    {selectedPolicy.policy_end_date ? new Date(selectedPolicy.policy_end_date).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-textSecondary">Annual Deductible</p>
                  <p className="font-bold text-textPrimary font-mono">{formatCurrency(selectedPolicy.annual_deductible)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-textSecondary">Copay Amount</p>
                  <p className="font-bold text-textPrimary font-mono">{formatCurrency(selectedPolicy.copay_amount)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-textSecondary">Total Claims Count</p>
                  <p className="font-mono text-textPrimary font-bold">{selectedPolicy.claim_count || 0} claims</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-textSecondary">Total Claims Value</p>
                  <p className="font-mono text-green-600 font-bold">{formatCurrency(selectedPolicy.total_billed)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
