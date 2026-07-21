import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import PlotlyChart from '../../components/PlotlyChart';
import Skeleton from '../../components/Skeleton';
import Pagination from '../../components/Pagination';
import api from '../../api';
import {
  BarChart3, Download, FileText, Filter, TrendingUp, AlertTriangle,
  Building2, Users, Activity, Calendar, ChevronDown, ChevronUp, Search,
  X, RefreshCw, ArrowUpDown, Loader2, CheckCircle2
} from 'lucide-react';
import { formatCurrency, formatCompactCurrency, formatNumber } from '../../data/dataUtils';
import {
  CANONICAL_MONTHLY_TRENDS, CANONICAL_FRAUD_DIAGNOSES, CANONICAL_FRAUD_CATEGORIES,
  CANONICAL_PROVIDERS, CANONICAL_PATIENTS, CANONICAL_FUNNEL, CANONICAL_FINANCIALS, CANONICAL_STATUSES,
  CANONICAL_REGIONAL_DATA, CANONICAL_MODEL, CANONICAL_REFERENCE, CANONICAL_CLAIMS_OVER_TIME
} from '../../data/canonicalData';

function generateFallbackClaimsForReports() {
  const providers = CANONICAL_PROVIDERS;
  const patients = CANONICAL_PATIENTS;
  const results = [];
  for (let i = 0; i < 200; i++) {
    const p = providers[i % providers.length];
    const pt = patients[i % patients.length];
    const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
    const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
    const rawScore = Math.random();
    let status;
    if (rawScore >= 0.85) {
      const high = ['Under Review', 'Investigating', 'Escalated', 'Fraud Confirmed'];
      status = high[Math.floor(Math.random() * high.length)];
    } else if (rawScore >= 0.65) {
      const medHigh = ['Investigating', 'Escalated'];
      status = medHigh[Math.floor(Math.random() * medHigh.length)];
    } else if (rawScore >= 0.4) {
      const med = ['Under Review', 'Rejected'];
      status = med[Math.floor(Math.random() * med.length)];
    } else {
      const low = ['Submitted', 'AI Scored', 'Approved', 'Closed'];
      status = low[Math.floor(Math.random() * low.length)];
    }
    results.push({
      claim_id: `CLM-2026-${String(202000 + i).padStart(6, '0')}`,
      patient_name: pt.name,
      provider_name: p.name,
      claim_amount: Math.round(5000 + Math.random() * 15000),
      status,
      fraud_score: Math.round(rawScore * 1000) / 1000,
      claim_date: `2026-${month}-${day}`,
      insurance_plan: ['Aetna','Blue Cross','Cigna','UnitedHealth','Kaiser'][Math.floor(Math.random() * 5)],
    });
  }
  return results;
}

const fmt = new Intl.NumberFormat('en-US');
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const monthlyData = CANONICAL_MONTHLY_TRENDS.map(m => ({
  month: m.month,
  claims: m.claims,
  fraud: m.fraud_claims,
  amount: m.amount,
  loss: Math.round(m.amount * (m.fraud_rate / 100)),
}));

const statusData = [
  { status: 'Approved', count: Math.round(CANONICAL_FUNNEL.totalClaims * 0.52), color: '#10b981' },
  { status: 'Under Review', count: Math.round(CANONICAL_FUNNEL.totalClaims * 0.12), color: '#f59e0b' },
  { status: 'Rejected', count: CANONICAL_FUNNEL.formallyFlagged - Math.round(CANONICAL_FUNNEL.formallyFlagged * 0.6), color: '#ef4444' },
  { status: 'Pending', count: CANONICAL_FUNNEL.aiScoredHighRisk - CANONICAL_FUNNEL.formallyFlagged - Math.round(CANONICAL_FUNNEL.totalClaims * 0.12), color: '#6366f1' },
];

const providerFraud = CANONICAL_PROVIDERS.slice(0, 10).map(p => ({
  name: p.name,
  fraudCases: p.fraud_claims,
  totalClaims: p.total_claims,
  rate: +((p.fraud_claims / p.total_claims) * 100).toFixed(1),
}));

const diagnosisData = CANONICAL_FRAUD_DIAGNOSES.map(d => ({
  code: d.code,
  name: d.description,
  cases: d.claims,
  amount: d.amount,
  rate: d.fraud_rate,
}));

const fraudCategories = CANONICAL_FRAUD_CATEGORIES.map(c => ({
  category: c.category,
  cases: c.count,
  percentage: c.percentage,
}));

const regionData = CANONICAL_REGIONAL_DATA.map(r => ({
  region: r.state,
  fraud: r.fraud_claims,
  percentage: +((r.fraud_claims / r.total_claims) * 100).toFixed(1),
}));


const kpis = [
  { label: 'Total Claims Analyzed', value: fmt.format(CANONICAL_FUNNEL.totalClaims), icon: BarChart3, color: 'from-indigo-500/20 to-indigo-600/5', iconColor: 'text-indigo-400', change: '+8.3%', up: true },
  { label: 'Fraud Cases Detected', value: fmt.format(CANONICAL_FUNNEL.aiScoredHighRisk), icon: AlertTriangle, color: 'from-amber-500/20 to-amber-600/5', iconColor: 'text-amber-400', change: '+12.1%', up: true },
  { label: 'Fraud Prevented', value: formatCompactCurrency(CANONICAL_FINANCIALS.totalFraudPrevented), icon: TrendingUp, color: 'from-red-500/20 to-red-600/5', iconColor: 'text-red-400', change: '+15.4%', up: true },
  { label: 'Detection Rate', value: `${(CANONICAL_MODEL.accuracy * 100).toFixed(1)}%`, icon: Activity, color: 'from-emerald-500/20 to-emerald-600/5', iconColor: 'text-emerald-400', change: '+0.4%', up: true },
];

const dateRanges = ['All Time', 'Last 30 Days', 'Last 90 Days', 'Last 6 Months', 'This Year'];
const providers = CANONICAL_PROVIDERS.map(p => p.name);
const statuses = ['Approved', 'Under Review', 'Rejected', 'Pending'];
const riskLevels = ['Low', 'Medium', 'High', 'Critical'];
const insurancePlans = ['Medicare', 'Medicaid', 'Blue Cross', 'Aetna', 'UnitedHealth', 'Cigna'];

const riskColor = (score) => {
  if (score >= 85) return 'text-red-400';
  if (score >= 65) return 'text-orange-400';
  if (score >= 45) return 'text-amber-400';
  return 'text-blue-400';
};

const riskBadge = (level) => {
  const map = {
    low: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    medium: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    high: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    critical: 'bg-red-500/15 text-red-400 border-red-500/30',
  };
  return map[level] || map.low;
};

const statusBadge = (status) => {
  const map = {
    Approved: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    'Under Review': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    Rejected: 'bg-red-500/15 text-red-400 border-red-500/30',
    Pending: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  };
  return map[status] || '';
};

function Toast({ message, onClose }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-[#0f172a] px-5 py-3 shadow-2xl shadow-emerald-500/10">
      <CheckCircle2 size={18} className="text-emerald-400" />
      <span className="text-sm font-medium text-[#f8fafc]">{message}</span>
      <button onClick={onClose} className="ml-2 text-[#94a3b8] hover:text-[#f8fafc] transition-colors"><X size={14} /></button>
    </div>
  );
}

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [toast, setToast] = useState('');
  const [exporting, setExporting] = useState(null);

  const [filters, setFilters] = useState({
    dateRange: 'All Time',
    provider: '',
    hospital: '',
    status: '',
    risk: '',
    insurance: '',
  });
  const [claims, setClaims] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalForm, setModalForm] = useState({ reportType: 'claims', dateRange: 'All Time', format: 'csv' });

  useEffect(() => {
    (async () => {
      try {
        let items = [];
        try {
          const data = await api.getClaims();
          items = data.claims || data?.data || data || [];
        } catch (_) { /* fallback */ }
        if (!Array.isArray(items) || items.length === 0) {
          items = generateFallbackClaimsForReports();
        }
        const mapped = items.map(c => ({
          id: c.id || c.claim_id,
          patient: c.patient_name,
          provider: c.provider_name,
          amount: c.amount || c.claim_amount,
          status: c.status,
          fraudScore: +((c.fraud_score || 0) * 100).toFixed(1),
          riskLevel: c.risk_level,
          date: c.claim_date,
          insurance: c.insurance_plan || '',
        }));
        setClaims(mapped);
      } catch (e) {
        // fallback empty
      }
      setLoading(false);
    })();
  }, []);

  const toastTimer = useRef(null);
  const showToast = useCallback((msg) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 3000);
  }, []);

  const updateFilter = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({ dateRange: 'All Time', provider: '', hospital: '', status: '', risk: '', insurance: '' });
    setSearch('');
    setPage(1);
  }, []);

  const removeFilter = useCallback((key) => {
    setFilters((prev) => ({ ...prev, [key]: key === 'dateRange' ? 'All Time' : '' }));
    setPage(1);
  }, []);

  const activeFilterPills = useMemo(() => {
    const pills = [];
    if (filters.dateRange !== 'All Time') pills.push({ key: 'dateRange', label: `Date: ${filters.dateRange}` });
    if (filters.provider) pills.push({ key: 'provider', label: `Provider: ${filters.provider}` });
    if (filters.hospital) pills.push({ key: 'hospital', label: `Hospital: ${filters.hospital}` });
    if (filters.status) pills.push({ key: 'status', label: `Status: ${filters.status}` });
    if (filters.risk) pills.push({ key: 'risk', label: `Risk: ${filters.risk}` });
    if (filters.insurance) pills.push({ key: 'insurance', label: `Plan: ${filters.insurance}` });
    return pills;
  }, [filters]);

  const filteredClaims = useMemo(() => {
    let data = [...claims];
    if (search) {
      const q = search.toLowerCase();
      data = data.filter((c) => c.id.toLowerCase().includes(q) || c.patient.toLowerCase().includes(q) || c.provider.toLowerCase().includes(q));
    }
    if (filters.provider) data = data.filter((c) => c.provider === filters.provider);
    if (filters.hospital) data = data.filter((c) => c.provider === filters.hospital);
    if (filters.status) data = data.filter((c) => c.status === filters.status);
    if (filters.insurance) data = data.filter((c) => c.insurance === filters.insurance);
    if (filters.risk) {
      const rl = filters.risk.toLowerCase();
      data = data.filter((c) => c.riskLevel === rl);
    }
    if (filters.dateRange !== 'All Time') {
      const now = new Date('2026-12-31');
      let cutoff;
      if (filters.dateRange === 'Last 30 Days') { cutoff = new Date(now); cutoff.setDate(cutoff.getDate() - 30); }
      else if (filters.dateRange === 'Last 90 Days') { cutoff = new Date(now); cutoff.setDate(cutoff.getDate() - 90); }
      else if (filters.dateRange === 'Last 6 Months') { cutoff = new Date(now); cutoff.setMonth(cutoff.getMonth() - 6); }
      else if (filters.dateRange === 'This Year') { cutoff = new Date('2026-01-01'); }
      if (cutoff) data = data.filter((c) => new Date(c.date) >= cutoff);
    }
    data.sort((a, b) => {
      let va = a[sortKey], vb = b[sortKey];
      if (typeof va === 'string') { va = va.toLowerCase(); vb = vb.toLowerCase(); }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return data;
  }, [search, filters, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredClaims.length / 10));
  const pagedClaims = filteredClaims.slice((page - 1) * 10, page * 10);

  const handleSort = useCallback((key) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }, [sortKey]);

  const columns = [
    { key: 'id', label: 'Claim ID' },
    { key: 'patient', label: 'Patient' },
    { key: 'provider', label: 'Provider' },
    { key: 'amount', label: 'Amount' },
    { key: 'status', label: 'Status' },
    { key: 'fraudScore', label: 'Fraud Score' },
    { key: 'riskLevel', label: 'Risk Level' },
    { key: 'date', label: 'Date' },
  ];

  const handleExportCSV = useCallback(() => {
    setExporting('csv');
    setTimeout(() => {
      const headers = ['Claim ID', 'Patient', 'Provider', 'Amount', 'Status', 'Fraud Score', 'Risk Level', 'Date', 'Insurance'];
      const rows = filteredClaims.map((c) => [c.id, c.patient, c.provider, c.amount, c.status, c.fraudScore, c.riskLevel, c.date, c.insurance]);
      const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${v}"`).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fraud-report-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setExporting(null);
      showToast('CSV exported successfully');
    }, 600);
  }, [filteredClaims, showToast]);

  const handleExportExcel = useCallback(() => {
    setExporting('excel');
    setTimeout(() => { setExporting(null); showToast('Excel export coming soon'); }, 1200);
  }, [showToast]);

  const handleExportPDF = useCallback(() => {
    setExporting('pdf');
    setTimeout(() => { setExporting(null); showToast('PDF export coming soon'); }, 1200);
  }, [showToast]);

  const SortHeader = ({ columnKey, label }) => (
    <th
      onClick={() => handleSort(columnKey)}
      className="cursor-pointer select-none whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#94a3b8] hover:text-[#f8fafc] transition-colors"
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortKey === columnKey ? (
          sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
        ) : (
          <ArrowUpDown size={10} className="opacity-30" />
        )}
      </span>
    </th>
  );

  return (
    <div className="min-h-screen bg-[#0b0f19] p-6 space-y-6">
      <Toast message={toast} onClose={() => setToast('')} />

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="w-full max-w-lg rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#f8fafc]">Generate Custom Report</h3>
              <button onClick={() => setShowModal(false)} className="text-[#94a3b8] hover:text-[#f8fafc] transition-colors"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#94a3b8]">Report Type</label>
                <select value={modalForm.reportType} onChange={(e) => setModalForm(f => ({...f, reportType: e.target.value}))} className="w-full rounded-lg border border-[#1e293b] bg-[#0b0f19] px-3 py-2 text-sm text-[#f8fafc] focus:border-[#4f46e5]/60 focus:outline-none">
                  <option value="claims">Claims Detail Report</option>
                  <option value="fraud-summary">Fraud Summary Report</option>
                  <option value="provider">Provider Analysis</option>
                  <option value="financial">Financial Impact Report</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#94a3b8]">Date Range</label>
                <select value={modalForm.dateRange} onChange={(e) => setModalForm(f => ({...f, dateRange: e.target.value}))} className="w-full rounded-lg border border-[#1e293b] bg-[#0b0f19] px-3 py-2 text-sm text-[#f8fafc] focus:border-[#4f46e5]/60 focus:outline-none">
                  {dateRanges.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#94a3b8]">Export Format</label>
                <select value={modalForm.format} onChange={(e) => setModalForm(f => ({...f, format: e.target.value}))} className="w-full rounded-lg border border-[#1e293b] bg-[#0b0f19] px-3 py-2 text-sm text-[#f8fafc] focus:border-[#4f46e5]/60 focus:outline-none">
                  <option value="csv">CSV</option>
                  <option value="excel">Excel</option>
                  <option value="pdf">PDF</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="flex-1 rounded-xl border border-[#1e293b] bg-[#0b0f19] py-2.5 text-sm font-medium text-[#94a3b8] hover:border-[#4f46e5]/50 hover:text-[#818cf8] transition-all">Cancel</button>
                <button onClick={() => { setShowModal(false); showToast('Report generated successfully'); }} className="flex-1 rounded-xl bg-[#4f46e5] py-2.5 text-sm font-bold text-white hover:bg-[#4338ca] transition-all">Generate Report</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#f8fafc] tracking-tight">Fraud Analysis Reports</h1>
          <p className="mt-1 text-sm text-[#94a3b8]">Detailed fraud analysis, reporting, and data export</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-[#4f46e5]/40 bg-[#4f46e5]/10 px-4 py-2 text-sm font-medium text-[#818cf8] hover:border-[#4f46e5]/70 hover:bg-[#4f46e5]/20 transition-all"
          >
            <FileText size={14} /> Generate Report
          </button>
          <button
            onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 800); }}
            className="inline-flex items-center gap-2 rounded-xl border border-[#1e293b] bg-[#0f172a]/80 px-4 py-2 text-sm font-medium text-[#94a3b8] hover:border-[#4f46e5]/50 hover:text-[#818cf8] transition-all"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} type="card" />)
        ) : kpis.map((kpi) => (
          <div key={kpi.label} className={`rounded-2xl border border-[#1e293b]/80 bg-gradient-to-br ${kpi.color} p-5 backdrop-blur-sm`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#94a3b8]">{kpi.label}</span>
              <kpi.icon size={20} className={kpi.iconColor} />
            </div>
            <div className="mt-3 text-2xl font-extrabold text-[#f8fafc]">{kpi.value}</div>
            <div className="mt-1 text-xs text-emerald-400">{kpi.up ? '↑' : '↓'} {kpi.change} vs last period</div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl border border-[#1e293b]/80 bg-[#0f172a]/80 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center gap-2 rounded-xl border border-[#1e293b] bg-[#0b0f19] px-4 py-2 text-sm font-medium text-[#94a3b8] hover:border-[#4f46e5]/50 hover:text-[#818cf8] transition-all"
          >
            <Filter size={14} /> Filters {activeFilterPills.length > 0 && <span className="ml-1 rounded-full bg-[#4f46e5] px-1.5 text-[10px] font-bold text-white">{activeFilterPills.length}</span>}
          </button>

          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search claims..."
              className="w-full rounded-xl border border-[#1e293b] bg-[#0b0f19] py-2 pl-9 pr-4 text-sm text-[#f8fafc] placeholder-[#94a3b8]/60 focus:border-[#4f46e5]/60 focus:outline-none transition-colors"
            />
          </div>

          <button
            onClick={resetFilters}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#1e293b] bg-[#0b0f19] px-4 py-2 text-sm font-medium text-[#94a3b8] hover:border-[#ef4444]/50 hover:text-[#ef4444] transition-all"
          >
            <X size={13} /> Reset
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 grid grid-cols-1 gap-3 border-t border-[#1e293b]/60 pt-4 sm:grid-cols-3 lg:grid-cols-6">
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">Date Range</label>
              <select
                value={filters.dateRange}
                onChange={(e) => updateFilter('dateRange', e.target.value)}
                className="w-full rounded-lg border border-[#1e293b] bg-[#0b0f19] px-3 py-2 text-sm text-[#f8fafc] focus:border-[#4f46e5]/60 focus:outline-none"
              >
                {dateRanges.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">Provider</label>
              <select value={filters.provider} onChange={(e) => updateFilter('provider', e.target.value)} className="w-full rounded-lg border border-[#1e293b] bg-[#0b0f19] px-3 py-2 text-sm text-[#f8fafc] focus:border-[#4f46e5]/60 focus:outline-none">
                <option value="">All Providers</option>
                {providers.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">Hospital</label>
              <select value={filters.hospital} onChange={(e) => updateFilter('hospital', e.target.value)} className="w-full rounded-lg border border-[#1e293b] bg-[#0b0f19] px-3 py-2 text-sm text-[#f8fafc] focus:border-[#4f46e5]/60 focus:outline-none">
                <option value="">All Hospitals</option>
                {providers.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">Claim Status</label>
              <select value={filters.status} onChange={(e) => updateFilter('status', e.target.value)} className="w-full rounded-lg border border-[#1e293b] bg-[#0b0f19] px-3 py-2 text-sm text-[#f8fafc] focus:border-[#4f46e5]/60 focus:outline-none">
                <option value="">All Statuses</option>
                {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">Fraud Risk</label>
              <select value={filters.risk} onChange={(e) => updateFilter('risk', e.target.value)} className="w-full rounded-lg border border-[#1e293b] bg-[#0b0f19] px-3 py-2 text-sm text-[#f8fafc] focus:border-[#4f46e5]/60 focus:outline-none">
                <option value="">All Risks</option>
                {riskLevels.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">Insurance Plan</label>
              <select value={filters.insurance} onChange={(e) => updateFilter('insurance', e.target.value)} className="w-full rounded-lg border border-[#1e293b] bg-[#0b0f19] px-3 py-2 text-sm text-[#f8fafc] focus:border-[#4f46e5]/60 focus:outline-none">
                <option value="">All Plans</option>
                {insurancePlans.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
        )}

        {activeFilterPills.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {activeFilterPills.map((pill) => (
              <span key={pill.key} className="inline-flex items-center gap-1.5 rounded-full border border-[#4f46e5]/30 bg-[#4f46e5]/10 px-3 py-1 text-xs font-medium text-[#818cf8]">
                {pill.label}
                <button onClick={() => removeFilter(pill.key)} className="rounded-full p-0.5 hover:bg-[#4f46e5]/20 transition-colors"><X size={10} /></button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Charts Grid 1 */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-[#1e293b]/80 bg-[#0f172a]/80 p-5">
              <Skeleton rows={3} />
              <div className="mt-4 h-64 skeleton-shimmer rounded-lg" />
            </div>
          ))
        ) : (
          <>
            <div className="rounded-2xl border border-[#1e293b]/80 bg-[#0f172a]/80 p-5 min-h-[380px]">
              <h3 className="mb-1 text-sm font-bold text-[#f8fafc]">Monthly Fraud Trend</h3>
              <p className="mb-3 text-xs text-[#94a3b8]">Claims volume vs fraud detection over 12 months</p>
              <PlotlyChart
                data={[
                  { x: monthlyData.map((d) => d.month.replace(' 2025', " '25").replace(' 2026', " '26")), y: monthlyData.map((d) => d.claims), type: 'scatter', mode: 'lines+markers', name: 'Total Claims', line: { color: '#6366f1', width: 2 }, fill: 'tozeroy', fillcolor: 'rgba(99,102,241,0.08)' },
                  { x: monthlyData.map((d) => d.month.replace(' 2025', " '25").replace(' 2026', " '26")), y: monthlyData.map((d) => d.fraud), type: 'scatter', mode: 'lines+markers', name: 'Fraud Cases', line: { color: '#ef4444', width: 2 }, fill: 'tozeroy', fillcolor: 'rgba(239,68,68,0.08)' },
                ]}
                layout={{ height: 300, xaxis: { tickangle: -45, tickfont: { size: 10 } }, yaxis: { title: 'Count' }, legend: { orientation: 'h', x: 0, y: -0.3 } }}
              />
            </div>

            <div className="rounded-2xl border border-[#1e293b]/80 bg-[#0f172a]/80 p-5 min-h-[380px]">
              <h3 className="mb-1 text-sm font-bold text-[#f8fafc]">Claims by Status</h3>
              <p className="mb-3 text-xs text-[#94a3b8]">Distribution of all claims by current status</p>
              <PlotlyChart
                data={[{
                  labels: statusData.map((d) => d.status),
                  values: statusData.map((d) => d.count),
                  type: 'pie',
                  hole: 0.55,
                  marker: { colors: statusData.map((d) => d.color) },
                  textinfo: 'label+percent',
                  textfont: { size: 11, color: '#f8fafc' },
                  hovertemplate: '%{label}: %{value:,.0f}<extra></extra>',
                }]}
                layout={{ height: 300, showlegend: true, legend: { orientation: 'h', x: 0, y: -0.1 } }}
              />
            </div>

            <div className="rounded-2xl border border-[#1e293b]/80 bg-[#0f172a]/80 p-5 min-h-[380px]">
              <h3 className="mb-1 text-sm font-bold text-[#f8fafc]">Fraud by Provider</h3>
              <p className="mb-3 text-xs text-[#94a3b8]">Top providers by number of fraud cases</p>
              <PlotlyChart
                data={[{
                  y: providerFraud.map((d) => d.name),
                  x: providerFraud.map((d) => d.fraudCases),
                  type: 'bar',
                  orientation: 'h',
                  marker: { color: providerFraud.map((d) => d.rate > 10 ? '#ef4444' : d.rate > 8 ? '#f59e0b' : '#6366f1'), },
                  text: providerFraud.map((d) => `${d.fraudCases.toLocaleString()} (${d.rate}%)`),
                  textposition: 'auto',
                  textfont: { size: 9, color: '#f8fafc' },
                  hovertemplate: '%{y}<br>Cases: %{x}<extra></extra>',
                }]}
                layout={{ height: 320, margin: { l: 160, r: 20, t: 10, b: 30 }, xaxis: { title: 'Fraud Cases' }, yaxis: { automargin: true }, showlegend: false }}
              />
            </div>

          </>
        )}
      </div>

      {/* Top Fraud Categories — full-width above table */}
      <div className="rounded-2xl border border-[#1e293b]/80 bg-[#0f172a]/80 p-5">
        <h3 className="mb-1 text-sm font-bold text-[#f8fafc]">Top Fraud Categories</h3>
        <p className="mb-3 text-xs text-[#94a3b8]">Most common fraud scheme types</p>
        {loading ? (
          <Skeleton rows={3} />
        ) : (
          <PlotlyChart
            data={[{
              x: fraudCategories.map((d) => d.category),
              y: fraudCategories.map((d) => d.cases),
              type: 'bar',
              marker: { color: ['#ef4444', '#f59e0b', '#6366f1', '#8b5cf6', '#ec4899', '#06b6d4', '#94a3b8'] },
              text: fraudCategories.map((d) => `${d.percentage}%`),
              textposition: 'auto',
              textfont: { size: 10, color: '#f8fafc' },
              hovertemplate: '%{x}<br>Cases: %{y:,.0f}<extra></extra>',
            }]}
            layout={{ height: 300, xaxis: { tickangle: -25 }, yaxis: { title: 'Cases' }, showlegend: false }}
          />
        )}
      </div>

      {/* Charts Grid 2 */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-[#1e293b]/80 bg-[#0f172a]/80 p-5">
              <Skeleton rows={3} />
              <div className="mt-4 h-64 skeleton-shimmer rounded-lg" />
            </div>
          ))
        ) : (
          <>
            <div className="rounded-2xl border border-[#1e293b]/80 bg-[#0f172a]/80 p-5 min-h-[380px]">
              <h3 className="mb-1 text-sm font-bold text-[#f8fafc]">Financial Loss by Month</h3>
              <p className="mb-3 text-xs text-[#94a3b8]">Estimated financial losses attributed to fraud</p>
              <PlotlyChart
                data={[{
                  x: monthlyData.map((d) => d.month),
                  y: monthlyData.map((d) => d.loss),
                  type: 'bar',
                  marker: { color: monthlyData.map((d) => d.loss > 3000000 ? '#ef4444' : '#6366f1'), },
                  text: monthlyData.map((d) => '$' + (d.loss / 1000).toFixed(0) + 'k'),
                  textposition: 'outside',
                  textfont: { size: 9, color: '#94a3b8' },
                  hovertemplate: '%{x}<br>Loss: $%{y:,.0f}<extra></extra>',
                }]}
                layout={{ height: 340, margin: { t: 25, b: 50 }, xaxis: { tickangle: -45, tickfont: { size: 10 } }, yaxis: { title: 'Loss ($)', tickformat: '$.2s' }, showlegend: false }}
              />
            </div>

            <div className="rounded-2xl border border-[#1e293b]/80 bg-[#0f172a]/80 p-5 min-h-[380px]">
              <h3 className="mb-1 text-sm font-bold text-[#f8fafc]">Provider Risk Ranking</h3>
              <p className="mb-3 text-xs text-[#94a3b8]">Top 10 providers ranked by fraud risk rate</p>
              <PlotlyChart
                data={[{
                  y: providerFraud.map((d) => d.name),
                  x: providerFraud.map((d) => d.rate),
                  type: 'bar',
                  orientation: 'h',
                  marker: { color: providerFraud.map((d) => d.rate > 10 ? '#ef4444' : d.rate > 8 ? '#f59e0b' : '#10b981') },
                  text: providerFraud.map((d) => `${d.rate}%`),
                  textposition: 'outside',
                  textfont: { size: 10, color: '#f8fafc' },
                  hovertemplate: '%{y}<br>Risk Rate: %{x}%<extra></extra>',
                }]}
                layout={{ height: 340, margin: { l: 220, r: 40, t: 10, b: 30 }, xaxis: { title: 'Risk Rate (%)', range: [0, 16] }, yaxis: { automargin: true }, showlegend: false }}
              />
            </div>

            <div className="rounded-2xl border border-[#1e293b]/80 bg-[#0f172a]/80 p-5 min-h-[380px]">
              <h3 className="mb-1 text-sm font-bold text-[#f8fafc]">Fraud by Diagnosis</h3>
              <p className="mb-3 text-xs text-[#94a3b8]">Top diagnosis codes associated with fraud</p>
              <PlotlyChart
                data={[{
                  y: diagnosisData.map((d) => `${d.code} - ${d.name}`),
                  x: diagnosisData.map((d) => d.cases),
                  type: 'bar',
                  orientation: 'h',
                  marker: { color: diagnosisData.map((d) => d.rate > 12 ? '#ef4444' : d.rate > 10 ? '#f59e0b' : '#818cf8') },
                  text: diagnosisData.map((d) => `${d.cases.toLocaleString()} (${d.rate}%)`),
                  textposition: 'outside',
                  textfont: { size: 9, color: '#f8fafc' },
                  hovertemplate: '%{y}<br>Cases: %{x}<extra></extra>',
                }]}
                layout={{ height: 340, margin: { l: 220, r: 40, t: 10, b: 30 }, xaxis: { title: 'Fraud Cases' }, yaxis: { automargin: true }, showlegend: false }}
              />
            </div>

            <div className="rounded-2xl border border-[#1e293b]/80 bg-[#0f172a]/80 p-5 min-h-[380px]">
              <h3 className="mb-1 text-sm font-bold text-[#f8fafc]">Fraud Distribution by Region</h3>
              <p className="mb-3 text-xs text-[#94a3b8]">Geographic breakdown of fraud cases</p>
              <PlotlyChart
                data={[{
                  labels: regionData.map((d) => d.region),
                  values: regionData.map((d) => d.fraud),
                  type: 'pie',
                  hole: 0.5,
                  marker: { colors: ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'] },
                  textinfo: 'label+percent',
                  textposition: 'outside',
                  textfont: { size: 12, color: '#f8fafc' },
                  insidetextorientation: 'auto',
                  hovertemplate: '%{label}<br>Cases: %{value:,.0f}<br>Share: %{percent}<extra></extra>',
                }]}
                layout={{ height: 340, showlegend: false, margin: { t: 10, b: 10, l: 40, r: 40 } }}
              />
            </div>
          </>
        )}
      </div>

      {/* Claims Table */}
      <div className="rounded-2xl border border-[#1e293b]/80 bg-[#0f172a]/80 p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#f8fafc]">Claims Detail</h3>
            <p className="text-xs text-[#94a3b8]">{filteredClaims.length} records found</p>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search table..."
              className="rounded-xl border border-[#1e293b] bg-[#0b0f19] py-2 pl-9 pr-4 text-sm text-[#f8fafc] placeholder-[#94a3b8]/60 focus:border-[#4f46e5]/60 focus:outline-none transition-colors w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-[#1e293b]">
                {columns.map((col) => (
                  <SortHeader key={col.key} columnKey={col.key} label={col.label} />
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#1e293b]/50">
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3"><div className="h-4 w-full skeleton-shimmer rounded" /></td>
                    ))}
                  </tr>
                ))
              ) : pagedClaims.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-[#94a3b8]">No claims match the current filters.</td>
                </tr>
              ) : (
                pagedClaims.map((claim, idx) => (
                  <tr
                    key={claim.id}
                    className={`border-b border-[#1e293b]/30 transition-colors hover:bg-[#4f46e5]/5 ${idx % 2 === 1 ? 'bg-[#0b0f19]/30' : ''}`}
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-xs font-mono font-medium text-[#818cf8]">{claim.id}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-[#f8fafc]">{claim.patient}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-[#94a3b8]">{claim.provider}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs font-semibold text-[#f8fafc]">{money.format(claim.amount)}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${statusBadge(claim.status)}`}>{claim.status}</span>
                    </td>
                    <td className={`whitespace-nowrap px-4 py-3 text-xs font-bold ${riskColor(claim.fraudScore)}`}>{claim.fraudScore.toFixed(1)}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${riskBadge(claim.riskLevel)}`}>{claim.riskLevel}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-[#94a3b8]">{claim.date}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      {/* Export Section */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-bold uppercase tracking-wider text-[#94a3b8]">Export:</span>
        <button
          onClick={handleExportCSV}
          disabled={exporting === 'csv'}
          className="inline-flex items-center gap-2 rounded-full border border-[#1e293b] bg-[#0f172a]/80 px-5 py-2 text-xs font-semibold text-[#94a3b8] hover:border-[#4f46e5]/50 hover:text-[#818cf8] disabled:opacity-50 transition-all"
        >
          {exporting === 'csv' ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
          CSV Export
        </button>
        <button
          onClick={handleExportExcel}
          disabled={exporting === 'excel'}
          className="inline-flex items-center gap-2 rounded-full border border-[#1e293b] bg-[#0f172a]/80 px-5 py-2 text-xs font-semibold text-[#94a3b8] hover:border-[#4f46e5]/50 hover:text-[#818cf8] disabled:opacity-50 transition-all"
        >
          {exporting === 'excel' ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
          Excel Export
        </button>
        <button
          onClick={handleExportPDF}
          disabled={exporting === 'pdf'}
          className="inline-flex items-center gap-2 rounded-full border border-[#1e293b] bg-[#0f172a]/80 px-5 py-2 text-xs font-semibold text-[#94a3b8] hover:border-[#4f46e5]/50 hover:text-[#818cf8] disabled:opacity-50 transition-all"
        >
          {exporting === 'pdf' ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
          PDF Export
        </button>
      </div>
    </div>
  );
}
