import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search, Download, ShieldCheck, AlertCircle, FileText, Activity,
  Eye, Filter, ChevronLeft, ChevronRight, Clock, Calendar,
  DollarSign, AlertTriangle, TrendingUp, Users
} from 'lucide-react';
import api from '../../api';
import PlotlyChart from '../../components/PlotlyChart';
import Skeleton from '../../components/Skeleton';
import { formatCurrency, formatCompactCurrency, formatPercent, formatNumber, getRiskLevel } from '../../data/dataUtils';

const MAX_EXPECTED_CLAIMS = 60;

const getPolicyType = (deductible) => {
  if (deductible >= 6000) return 'Corporate Gold';
  if (deductible >= 4000) return 'Family Premium';
  return 'Individual Starter';
};

const getCoverageClass = (copay) => {
  if (copay <= 100) return 'Platinum';
  if (copay <= 250) return 'Gold';
  if (copay <= 500) return 'Silver';
  return 'Bronze';
};

const getCoverageClassColor = (copay) => {
  if (copay <= 100) return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
  if (copay <= 250) return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
  if (copay <= 500) return 'bg-slate-400/10 text-slate-300 border-slate-400/20';
  return 'bg-amber-700/10 text-amber-500 border-amber-700/20';
};

const getPremium = (p) => {
  const base = p.annual_deductible || 2000;
  return (base * 0.18) + (p.copay_amount || 250);
};

const getFraudRate = (p) => {
  const claims = p.claim_count || 0;
  const frauds = p.fraud_count || 0;
  return claims > 0 ? (frauds / claims) * 100 : 0;
};

const getRenewalStatus = (p) => {
  if (p.policy_status === 'Expired') return 'Expired';
  if (p.policy_status !== 'Active') return p.policy_status || 'Unknown';
  if (!p.policy_end_date) return 'Current';
  const endDate = new Date(p.policy_end_date);
  const now = new Date();
  const diffMs = endDate.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays <= 60 && diffDays >= 0) return 'Renewal Due';
  return 'Current';
};

const getRenewalColor = (status) => {
  if (status === 'Renewal Due') return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  if (status === 'Current') return 'bg-green-500/10 text-green-400 border-green-500/20';
  if (status === 'Expired') return 'bg-red-500/10 text-red-400 border-red-500/20';
  return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
};

const getDaysRemaining = (endDate) => {
  if (!endDate) return null;
  const end = new Date(endDate);
  const now = new Date();
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
};

const getRiskScore = (fraudRate) => {
  if (fraudRate >= 25) return 0.9;
  if (fraudRate >= 20) return 0.8;
  if (fraudRate >= 15) return 0.7;
  if (fraudRate >= 10) return 0.5;
  if (fraudRate >= 5) return 0.35;
  if (fraudRate > 0) return 0.15;
  return 0.05;
};

export default function Policies() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [riskFilter, setRiskFilter] = useState('All');
  const [sortBy, setSortBy] = useState('policy_id');
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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

  const processedPolicies = useMemo(() => {
    return policies.map((p) => {
      const fraudRate = getFraudRate(p);
      const premium = getPremium(p);
      const avgClaim = (p.claim_count || 0) > 0 ? (p.total_billed || 0) / p.claim_count : 0;
      const fraudExposureScore = (p.fraud_count || 0) * avgClaim;
      const coverageUtil = Math.min(100, ((p.claim_count || 0) / MAX_EXPECTED_CLAIMS) * 100);
      const daysRemaining = getDaysRemaining(p.policy_end_date);
      const renewalStatus = getRenewalStatus(p);
      const riskScore = getRiskScore(fraudRate);
      const riskLevel = getRiskLevel(riskScore);

      return {
        ...p,
        policy_type: getPolicyType(p.annual_deductible),
        coverage_class: getCoverageClass(p.copay_amount),
        annual_premium: premium,
        fraud_rate: fraudRate,
        fraud_exposure_score: fraudExposureScore,
        coverage_utilization: coverageUtil,
        days_remaining: daysRemaining,
        renewal_status: renewalStatus,
        risk_score: riskScore,
        risk_level: riskLevel,
      };
    });
  }, [policies]);

  const filtered = useMemo(() => {
    let result = processedPolicies.filter((p) => {
      const term = searchTerm.toLowerCase();
      const matchSearch =
        !term ||
        (p.policy_id || '').toLowerCase().includes(term) ||
        (p.patient_name || '').toLowerCase().includes(term) ||
        (p.policy_type || '').toLowerCase().includes(term) ||
        (p.patient_id || '').toLowerCase().includes(term);

      const matchStatus =
        statusFilter === 'All' ||
        (statusFilter === 'Active' && p.policy_status === 'Active') ||
        (statusFilter === 'Expired' && p.policy_status === 'Expired');

      let matchRisk = true;
      if (riskFilter === 'High Risk') matchRisk = p.fraud_rate > 15;
      else if (riskFilter === 'Medium Risk') matchRisk = p.fraud_rate > 5 && p.fraud_rate <= 15;
      else if (riskFilter === 'Low Risk') matchRisk = p.fraud_rate <= 5;

      return matchSearch && matchStatus && matchRisk;
    });

    result.sort((a, b) => {
      switch (sortBy) {
        case 'policy_id':
          return (a.policy_id || '').localeCompare(b.policy_id || '');
        case 'premium':
          return (b.annual_premium || 0) - (a.annual_premium || 0);
        case 'claims':
          return (b.claim_count || 0) - (a.claim_count || 0);
        case 'fraud_rate':
          return (b.fraud_rate || 0) - (a.fraud_rate || 0);
        case 'end_date':
          return new Date(a.policy_end_date || 0) - new Date(b.policy_end_date || 0);
        default:
          return 0;
      }
    });

    return result;
  }, [processedPolicies, searchTerm, statusFilter, riskFilter, sortBy]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter, riskFilter, sortBy, pageSize]);

  const activePolicies = policies.filter((p) => p.policy_status === 'Active');
  const expiredPolicies = policies.filter((p) => p.policy_status === 'Expired');
  const totalActive = activePolicies.length;
  const totalExpired = expiredPolicies.length;
  const annualPremiumPool = processedPolicies
    .filter((p) => p.policy_status === 'Active')
    .reduce((sum, p) => sum + (p.annual_premium || 0), 0);
  const fraudExposure = processedPolicies
    .filter((p) => p.policy_status === 'Active')
    .reduce((sum, p) => {
      const claims = p.claim_count || 0;
      const frauds = p.fraud_count || 0;
      const billed = p.total_billed || 0;
      if (claims === 0) return sum;
      return sum + ((frauds / claims) * billed);
    }, 0);

  const exportCSV = useCallback(() => {
    const headers = [
      'Policy ID', 'Patient Name', 'Patient ID', 'Policy Type', 'Coverage Class',
      'Annual Premium', 'Annual Deductible', 'Copay', 'Claim Count', 'Total Billed',
      'Fraud Rate %', 'Fraud Exposure Score', 'Start Date', 'End Date',
      'Days Remaining', 'Renewal Status', 'Coverage Utilization %', 'Status'
    ];
    const rows = filtered.map((p) => [
      p.policy_id,
      `"${(p.patient_name || '').replace(/"/g, '""')}"`,
      p.patient_id,
      p.policy_type,
      p.coverage_class,
      p.annual_premium.toFixed(2),
      (p.annual_deductible || 0).toFixed(2),
      (p.copay_amount || 0).toFixed(2),
      p.claim_count || 0,
      (p.total_billed || 0).toFixed(2),
      p.fraud_rate.toFixed(2),
      p.fraud_exposure_score.toFixed(2),
      p.policy_start_date || '',
      p.policy_end_date || '',
      p.days_remaining ?? '',
      p.renewal_status,
      p.coverage_utilization.toFixed(1),
      p.policy_status
    ].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'policies_database_export.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  }, [filtered]);

  if (loading) {
    return <Skeleton rows={12} />;
  }

  const coverageDonutData = [
    {
      labels: ['Active', 'Expired'],
      values: [totalActive, totalExpired],
      type: 'pie',
      hole: 0.65,
      marker: { colors: ['#22c55e', '#ef4444'] },
      textinfo: 'value',
      textfont: { color: '#e2e8f0', size: 14, family: 'monospace' },
      hovertemplate: '%{label}: %{value}<extra></extra>',
      showlegend: true,
      direction: 'clockwise',
      sort: false,
    }
  ];
  const coverageDonutLayout = {
    margin: { t: 10, b: 10, l: 10, r: 10 },
    height: 220,
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    legend: { orientation: 'h', y: -0.1, font: { color: '#94a3b8', size: 11 } },
    showlegend: true,
    annotations: [{
      text: `${totalActive + totalExpired}`,
      showarrow: false,
      font: { size: 22, color: '#e2e8f0', family: 'monospace', weight: 'bold' },
      x: 0.5, y: 0.5
    }]
  };

  const top10Policies = [...processedPolicies]
    .sort((a, b) => (b.annual_premium || 0) - (a.annual_premium || 0))
    .slice(0, 10);

  const premiumBarData = [
    {
      x: top10Policies.map((p) => p.policy_id),
      y: top10Policies.map((p) => p.annual_premium || 0),
      type: 'bar',
      name: 'Annual Premium',
      marker: {
        color: top10Policies.map((p) => p.policy_status === 'Active' ? '#6366f1' : '#475569'),
        line: { color: 'rgba(99,102,241,0.3)', width: 1 }
      },
      hovertemplate: '%{x}<br>Premium: $%{y:,.0f}<extra></extra>'
    },
    {
      x: top10Policies.map((p) => p.policy_id),
      y: top10Policies.map((p) => p.annual_deductible || 0),
      type: 'bar',
      name: 'Deductible',
      marker: {
        color: top10Policies.map((p) => p.policy_status === 'Active' ? '#f97316' : '#475569'),
        line: { color: 'rgba(249,115,22,0.3)', width: 1 }
      },
      hovertemplate: '%{x}<br>Deductible: $%{y:,.0f}<extra></extra>'
    }
  ];
  const premiumBarLayout = {
    margin: { t: 20, r: 10, l: 55, b: 50 },
    barmode: 'group',
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    xaxis: {
      tickangle: -35, automargin: true,
      tickfont: { color: '#94a3b8', size: 10, family: 'monospace' },
      gridcolor: 'rgba(226,232,240,0.05)'
    },
    yaxis: {
      gridcolor: 'rgba(226,232,240,0.08)',
      tickfont: { color: '#94a3b8', size: 10, family: 'monospace' },
      tickprefix: '$'
    },
    legend: { orientation: 'h', y: -0.3, font: { color: '#94a3b8', size: 11 } },
    height: 260
  };

  const scatterData = [
    {
      x: processedPolicies.map((p) => p.claim_count || 0),
      y: processedPolicies.map((p) => p.total_billed || 0),
      text: processedPolicies.map((p) => `${p.policy_id}<br>${p.patient_name || 'N/A'}<br>Claims: ${p.claim_count || 0}<br>Billed: $${(p.total_billed || 0).toLocaleString()}`),
      mode: 'markers',
      type: 'scatter',
      marker: {
        size: processedPolicies.map((p) => Math.max(8, Math.min(30, (p.total_billed || 0) / 5000))),
        color: processedPolicies.map((p) => p.fraud_rate),
        colorscale: [[0, '#22c55e'], [0.5, '#f59e0b'], [1, '#ef4444']],
        colorbar: {
          title: { text: 'Fraud %', font: { color: '#94a3b8', size: 10 } },
          tickfont: { color: '#94a3b8', size: 9 },
          thickness: 12, len: 0.8
        },
        opacity: 0.8,
        line: { color: 'rgba(226,232,240,0.2)', width: 1 }
      },
      hovertemplate: '%{text}<extra></extra>'
    }
  ];
  const scatterLayout = {
    margin: { t: 10, r: 10, l: 60, b: 50 },
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    xaxis: {
      title: { text: 'Claim Count', font: { color: '#94a3b8', size: 11 } },
      gridcolor: 'rgba(226,232,240,0.08)',
      tickfont: { color: '#94a3b8', size: 10 }
    },
    yaxis: {
      title: { text: 'Total Billed ($)', font: { color: '#94a3b8', size: 11 } },
      gridcolor: 'rgba(226,232,240,0.08)',
      tickfont: { color: '#94a3b8', size: 10 },
      tickprefix: '$'
    },
    height: 260
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-primary/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-primary w-fit">
            <FileText size={14} />
            Policy Database
          </div>
          <h1 className="mt-4 text-2xl font-black text-textPrimary">Policy Management</h1>
          <p className="text-sm text-textSecondary mt-1">
            Manage active policy coverage, deductible thresholds, premiums, and suspicious claim rates.
          </p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-bold text-textPrimary hover:bg-bg transition-colors shadow-sm"
        >
          <Download size={16} />
          Export CSV
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm group hover:border-primary/30 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] uppercase font-bold text-textSecondary tracking-wider">Total Policies</p>
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users size={15} className="text-primary" />
            </div>
          </div>
          <p className="text-3xl font-black text-textPrimary font-mono">{formatNumber(policies.length)}</p>
          <p className="mt-1 text-[11px] text-textSecondary">All contracts in database</p>
        </div>

        <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm group hover:border-green-500/30 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] uppercase font-bold text-green-500 tracking-wider">Active Policies</p>
            <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center">
              <ShieldCheck size={15} className="text-green-500" />
            </div>
          </div>
          <p className="text-3xl font-black text-green-500 font-mono">{formatNumber(totalActive)}</p>
          <p className="mt-1 text-[11px] text-textSecondary">Currently active coverage</p>
        </div>

        <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm group hover:border-red-500/30 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] uppercase font-bold text-red-500 tracking-wider">Expired Policies</p>
            <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center">
              <AlertCircle size={15} className="text-red-500" />
            </div>
          </div>
          <p className="text-3xl font-black text-red-500 font-mono">{formatNumber(totalExpired)}</p>
          <p className="mt-1 text-[11px] text-textSecondary">Expired contracts</p>
        </div>

        <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm group hover:border-indigo-500/30 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">Premium Pool</p>
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
              <DollarSign size={15} className="text-indigo-400" />
            </div>
          </div>
          <p className="text-3xl font-black text-indigo-400 font-mono">{formatCompactCurrency(annualPremiumPool)}</p>
          <p className="mt-1 text-[11px] text-textSecondary">Annual premium total</p>
        </div>

        <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm group hover:border-orange-500/30 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] uppercase font-bold text-orange-400 tracking-wider">Fraud Exposure</p>
            <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <AlertTriangle size={15} className="text-orange-400" />
            </div>
          </div>
          <p className="text-3xl font-black text-orange-400 font-mono">{formatCompactCurrency(fraudExposure)}</p>
          <p className="mt-1 text-[11px] text-textSecondary">Weighted fraud amount</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Activity size={15} className="text-primary" />
            <h3 className="text-sm font-bold text-textPrimary">Coverage Status</h3>
          </div>
          <p className="text-xs text-textSecondary mb-3">Active vs Expired policy distribution</p>
          <PlotlyChart data={coverageDonutData} layout={coverageDonutLayout} />
        </div>

        <div className="lg:col-span-2 bg-surface border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={15} className="text-primary" />
            <h3 className="text-sm font-bold text-textPrimary">Premium vs Deductible</h3>
          </div>
          <p className="text-xs text-textSecondary mb-3">Top 10 policies by estimated premium</p>
          <PlotlyChart data={premiumBarData} layout={premiumBarLayout} />
        </div>
      </div>

      {/* Scatter chart full width */}
      <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <DollarSign size={15} className="text-primary" />
          <h3 className="text-sm font-bold text-textPrimary">Claim Utilization</h3>
        </div>
        <p className="text-xs text-textSecondary mb-3">Claims count vs total billed per policy (bubble size = billed volume, color = fraud rate)</p>
        <PlotlyChart data={scatterData} layout={scatterLayout} />
      </div>

      {/* Directory Section */}
      <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-primary" />
            <h2 className="text-base font-bold text-textPrimary">Policy Directory</h2>
          </div>
          <span className="text-xs text-textSecondary font-mono bg-bg border border-border px-3 py-1 rounded-lg">
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
            <input
              type="text"
              placeholder="Search by Policy ID, Patient Name, or Type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-bg border border-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-textPrimary placeholder-textSecondary/60 focus:border-primary outline-none transition-colors"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-bg border border-border px-4 py-2.5 rounded-xl text-sm font-bold text-textPrimary outline-none w-full lg:w-40 cursor-pointer"
          >
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Expired">Expired</option>
          </select>
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="bg-bg border border-border px-4 py-2.5 rounded-xl text-sm font-bold text-textPrimary outline-none w-full lg:w-44 cursor-pointer"
          >
            <option value="All">All Risk Levels</option>
            <option value="High Risk">High Risk (&gt;15%)</option>
            <option value="Medium Risk">Medium Risk (5-15%)</option>
            <option value="Low Risk">Low Risk (&lt;5%)</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-bg border border-border px-4 py-2.5 rounded-xl text-sm font-bold text-textPrimary outline-none w-full lg:w-44 cursor-pointer"
          >
            <option value="policy_id">Sort by Policy ID</option>
            <option value="premium">Sort by Premium</option>
            <option value="claims">Sort by Claims</option>
            <option value="fraud_rate">Sort by Fraud Rate</option>
            <option value="end_date">Sort by End Date</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="enterprise-table">
            <thead>
              <tr>
                <th>Policy ID</th>
                <th>Policy Holder</th>
                <th>Policy Type</th>
                <th>Coverage Class</th>
                <th>Annual Premium</th>
                <th>Utilization</th>
                <th>Claims</th>
                <th>Total Billed</th>
                <th>Fraud Rate</th>
                <th>Fraud Exposure</th>
                <th>Effective</th>
                <th>Expiration</th>
                <th>Renewal</th>
                <th>Status</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((policy) => (
                <tr key={policy.policy_id} className="hover:bg-bg/40 transition-colors">
                  <td>
                    <button
                      onClick={() => setSelectedPolicy(policy)}
                      className="font-mono text-xs font-black text-primary hover:underline text-left"
                    >
                      {policy.policy_id}
                    </button>
                  </td>
                  <td>
                    <span className="font-bold text-textPrimary text-sm">{policy.patient_name || policy.patient_id}</span>
                  </td>
                  <td>
                    <span className="text-xs font-semibold text-textSecondary">{policy.policy_type}</span>
                  </td>
                  <td>
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase border ${getCoverageClassColor(policy.copay_amount)}`}>
                      {policy.coverage_class}
                    </span>
                  </td>
                  <td>
                    <span className="font-mono font-bold text-primary text-sm">{formatCurrency(policy.annual_premium)}</span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-bg rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            policy.coverage_utilization >= 80 ? 'bg-red-500' :
                            policy.coverage_utilization >= 50 ? 'bg-amber-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(100, policy.coverage_utilization)}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-textSecondary">{policy.coverage_utilization.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td>
                    <span className="font-mono text-textPrimary text-xs">{formatNumber(policy.claim_count || 0)}</span>
                  </td>
                  <td>
                    <span className="font-mono text-textPrimary text-xs">{formatCurrency(policy.total_billed || 0)}</span>
                  </td>
                  <td>
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                      policy.fraud_rate > 15 ? 'bg-red-500/10 text-red-500' :
                      policy.fraud_rate > 5 ? 'bg-amber-500/10 text-amber-500' :
                      'bg-green-500/10 text-green-500'
                    }`}>
                      {policy.fraud_rate.toFixed(1)}%
                    </span>
                  </td>
                  <td>
                    <span className={`font-mono text-xs font-bold ${
                      policy.fraud_exposure_score > 10000 ? 'text-red-500' :
                      policy.fraud_exposure_score > 2000 ? 'text-amber-500' : 'text-textSecondary'
                    }`}>
                      {formatCurrency(policy.fraud_exposure_score)}
                    </span>
                  </td>
                  <td>
                    <span className="text-xs font-mono text-textSecondary">
                      {policy.policy_start_date
                        ? new Date(policy.policy_start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
                        : 'N/A'}
                    </span>
                  </td>
                  <td>
                    <span className={`text-xs font-mono ${
                      policy.days_remaining !== null && policy.days_remaining <= 60 && policy.policy_status === 'Active'
                        ? 'text-amber-400 font-bold' : 'text-textSecondary'
                    }`}>
                      {policy.policy_end_date
                        ? new Date(policy.policy_end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
                        : 'N/A'}
                    </span>
                  </td>
                  <td>
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase border ${getRenewalColor(policy.renewal_status)}`}>
                      {policy.renewal_status === 'Renewal Due' ? '⚠ Renewal Due' : policy.renewal_status}
                    </span>
                  </td>
                  <td>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${
                      policy.policy_status === 'Expired'
                        ? 'bg-red-500/10 text-red-500'
                        : 'bg-green-500/10 text-green-500'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${
                        policy.policy_status === 'Expired' ? 'bg-red-500' : 'bg-green-500'
                      }`} />
                      {policy.policy_status}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => setSelectedPolicy(policy)}
                      className="p-1.5 rounded-lg hover:bg-primary/10 text-textSecondary hover:text-primary transition-colors"
                      title="View Details"
                    >
                      <Eye size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan="15" className="px-6 py-12 text-center text-sm text-textSecondary italic">
                    No matching policies found. Try adjusting your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filtered.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-5 pt-4 border-t border-border">
            <div className="flex items-center gap-3">
              <span className="text-xs text-textSecondary">Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-bg border border-border px-3 py-1.5 rounded-lg text-xs font-bold text-textPrimary outline-none cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span className="text-xs text-textSecondary font-mono">
                Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, filtered.length)} of {filtered.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page <= 1}
                className="p-2 rounded-lg border border-border hover:bg-bg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} className="text-textPrimary" />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                      page === pageNum
                        ? 'bg-primary text-white'
                        : 'border border-border hover:bg-bg text-textSecondary'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page >= totalPages}
                className="p-2 rounded-lg border border-border hover:bg-bg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} className="text-textPrimary" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Policy Details Modal */}
      {selectedPolicy && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setSelectedPolicy(null)}
        >
          <div
            className="bg-surface border border-border rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="border-b border-border px-6 py-4 flex items-center justify-between sticky top-0 bg-surface rounded-t-2xl z-10">
              <h3 className="text-lg font-black text-textPrimary">Policy Details</h3>
              <button
                onClick={() => setSelectedPolicy(null)}
                className="text-textSecondary hover:text-textPrimary text-xl leading-none p-1 hover:bg-bg rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Policy Identity */}
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20">
                  <FileText size={28} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h4 className="text-xl font-black text-primary font-mono">{selectedPolicy.policy_id}</h4>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${
                      selectedPolicy.policy_status === 'Expired'
                        ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${
                        selectedPolicy.policy_status === 'Expired' ? 'bg-red-500' : 'bg-green-500'
                      }`} />
                      {selectedPolicy.policy_status}
                    </span>
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase border ${getRenewalColor(selectedPolicy.renewal_status)}`}>
                      {selectedPolicy.renewal_status}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-textPrimary mt-1">{selectedPolicy.patient_name || selectedPolicy.patient_id}</p>
                </div>
              </div>

              {/* Coverage Details */}
              <div>
                <h5 className="text-xs font-black uppercase text-textSecondary tracking-wider mb-3 flex items-center gap-2">
                  <ShieldCheck size={14} className="text-primary" />
                  Coverage Details
                </h5>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-bg/50 rounded-xl p-4 border border-border">
                  <div>
                    <p className="text-[10px] font-black uppercase text-textSecondary">Policy Type</p>
                    <p className="font-bold text-textPrimary text-sm mt-1">{selectedPolicy.policy_type}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-textSecondary">Coverage Class</p>
                    <p className="mt-1">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase border ${getCoverageClassColor(selectedPolicy.copay_amount)}`}>
                        {selectedPolicy.coverage_class}
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-textSecondary">Annual Premium</p>
                    <p className="font-bold text-primary font-mono text-sm mt-1">{formatCurrency(selectedPolicy.annual_premium)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-textSecondary">Annual Deductible</p>
                    <p className="font-bold text-textPrimary font-mono text-sm mt-1">{formatCurrency(selectedPolicy.annual_deductible)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-textSecondary">Copay Amount</p>
                    <p className="font-bold text-textPrimary font-mono text-sm mt-1">{formatCurrency(selectedPolicy.copay_amount)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-textSecondary">Coverage Utilization</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-16 h-1.5 bg-border rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            selectedPolicy.coverage_utilization >= 80 ? 'bg-red-500' :
                            selectedPolicy.coverage_utilization >= 50 ? 'bg-amber-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(100, selectedPolicy.coverage_utilization)}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono text-textPrimary font-bold">{selectedPolicy.coverage_utilization.toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Policy Dates */}
              <div>
                <h5 className="text-xs font-black uppercase text-textSecondary tracking-wider mb-3 flex items-center gap-2">
                  <Calendar size={14} className="text-primary" />
                  Policy Dates
                </h5>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-bg/50 rounded-xl p-4 border border-border">
                  <div>
                    <p className="text-[10px] font-black uppercase text-textSecondary">Start Date</p>
                    <p className="font-semibold text-textPrimary text-sm mt-1">
                      {selectedPolicy.policy_start_date
                        ? new Date(selectedPolicy.policy_start_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-textSecondary">End Date</p>
                    <p className="font-semibold text-textPrimary text-sm mt-1">
                      {selectedPolicy.policy_end_date
                        ? new Date(selectedPolicy.policy_end_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-textSecondary">Days Remaining</p>
                    <p className={`font-bold text-sm mt-1 ${
                      selectedPolicy.days_remaining !== null && selectedPolicy.policy_status === 'Active'
                        ? selectedPolicy.days_remaining <= 60 ? 'text-amber-400' : 'text-textPrimary'
                        : 'text-textSecondary'
                    }`}>
                      {selectedPolicy.policy_status === 'Active' && selectedPolicy.days_remaining !== null
                        ? `${selectedPolicy.days_remaining} days`
                        : selectedPolicy.policy_status === 'Expired' ? 'Expired' : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Claims Utilization */}
              <div>
                <h5 className="text-xs font-black uppercase text-textSecondary tracking-wider mb-3 flex items-center gap-2">
                  <Activity size={14} className="text-primary" />
                  Claims Utilization
                </h5>
                <div className="grid grid-cols-3 gap-4 bg-bg/50 rounded-xl p-4 border border-border">
                  <div>
                    <p className="text-[10px] font-black uppercase text-textSecondary">Claims Count</p>
                    <p className="font-bold text-textPrimary font-mono text-sm mt-1">{formatNumber(selectedPolicy.claim_count || 0)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-textSecondary">Total Billed</p>
                    <p className="font-bold text-primary font-mono text-sm mt-1">{formatCurrency(selectedPolicy.total_billed || 0)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-textSecondary">Avg per Claim</p>
                    <p className="font-bold text-textPrimary font-mono text-sm mt-1">
                      {(selectedPolicy.claim_count || 0) > 0
                        ? formatCurrency((selectedPolicy.total_billed || 0) / selectedPolicy.claim_count)
                        : '$0'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Fraud Exposure */}
              <div>
                <h5 className="text-xs font-black uppercase text-textSecondary tracking-wider mb-3 flex items-center gap-2">
                  <AlertTriangle size={14} className="text-red-500" />
                  Fraud Exposure
                </h5>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-bg/50 rounded-xl p-4 border border-border">
                  <div>
                    <p className="text-[10px] font-black uppercase text-textSecondary">Fraud Count</p>
                    <p className={`font-bold font-mono text-sm mt-1 ${(selectedPolicy.fraud_count || 0) > 0 ? 'text-red-500' : 'text-textPrimary'}`}>
                      {selectedPolicy.fraud_count || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-textSecondary">Fraud Rate</p>
                    <p className="mt-1">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        selectedPolicy.fraud_rate > 15 ? 'bg-red-500/10 text-red-500' :
                        selectedPolicy.fraud_rate > 5 ? 'bg-amber-500/10 text-amber-500' :
                        'bg-green-500/10 text-green-500'
                      }`}>
                        {selectedPolicy.fraud_rate.toFixed(1)}%
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-textSecondary">Risk Level</p>
                    <p className="mt-1">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase border ${selectedPolicy.risk_level.bg} ${selectedPolicy.risk_level.color} ${selectedPolicy.risk_level.border}`}>
                        {selectedPolicy.risk_level.label}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Risk Assessment Bar */}
              <div>
                <h5 className="text-xs font-black uppercase text-textSecondary tracking-wider mb-3 flex items-center gap-2">
                  <ShieldCheck size={14} className="text-primary" />
                  Risk Assessment
                </h5>
                <div className="bg-bg/50 rounded-xl p-4 border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-textSecondary">Risk Score</span>
                    <span className={`text-xs font-black ${selectedPolicy.risk_level.color}`}>
                      {(selectedPolicy.risk_score * 100).toFixed(0)}% — {selectedPolicy.risk_level.label}
                    </span>
                  </div>
                  <div className="w-full h-3 bg-border rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        selectedPolicy.risk_score >= 0.65 ? 'bg-gradient-to-r from-red-500 to-red-600' :
                        selectedPolicy.risk_score >= 0.45 ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
                        selectedPolicy.risk_score >= 0.25 ? 'bg-gradient-to-r from-blue-500 to-blue-400' :
                        'bg-gradient-to-r from-green-500 to-green-400'
                      }`}
                      style={{ width: `${selectedPolicy.risk_score * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-[9px] text-green-500 font-bold">LOW</span>
                    <span className="text-[9px] text-amber-500 font-bold">MEDIUM</span>
                    <span className="text-[9px] text-red-500 font-bold">HIGH</span>
                  </div>
                </div>
              </div>

              {/* Associated Claims Summary */}
              <div>
                <h5 className="text-xs font-black uppercase text-textSecondary tracking-wider mb-3 flex items-center gap-2">
                  <Clock size={14} className="text-primary" />
                  Claims Summary
                </h5>
                <div className="bg-bg/50 rounded-xl p-4 border border-border">
                  <p className="text-sm text-textPrimary">
                    <span className="font-mono font-bold">{selectedPolicy.claim_count || 0}</span> claims filed
                    {selectedPolicy.fraud_count > 0 && (
                      <>
                        , <span className="font-mono font-bold text-red-500">{selectedPolicy.fraud_count}</span> flagged as fraudulent
                        ({formatPercent(selectedPolicy.fraud_rate)})
                      </>
                    )}
                    {selectedPolicy.fraud_count === 0 && (
                      <span className="text-green-500 font-bold"> — no fraud indicators detected</span>
                    )}
                  </p>
                  <p className="text-xs text-textSecondary mt-2">
                    Total billed amount: <span className="font-mono font-bold text-primary">{formatCurrency(selectedPolicy.total_billed || 0)}</span>
                    {selectedPolicy.fraud_count > 0 && (
                      <> — estimated fraud exposure: <span className="font-mono font-bold text-red-500">{formatCurrency(selectedPolicy.fraud_exposure_score)}</span></>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="border-t border-border px-6 py-4 flex items-center justify-end gap-3 sticky bottom-0 bg-surface rounded-b-2xl">
              <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-bg text-sm font-bold text-textPrimary hover:bg-surface transition-colors">
                <FileText size={15} />
                Generate Report
              </button>
              <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-bg text-sm font-bold text-textPrimary hover:bg-surface transition-colors">
                <AlertTriangle size={15} />
                Request Audit
              </button>
              <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors shadow-sm">
                <TrendingUp size={15} />
                Renew Policy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
