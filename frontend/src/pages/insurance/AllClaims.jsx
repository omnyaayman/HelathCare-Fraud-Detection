import { useState, useEffect, useMemo } from "react";
import {
  Search, Filter, Download, ArrowUpDown, FileText, AlertTriangle,
  Clock, User, Building2, DollarSign, ChevronLeft, ChevronRight,
  CheckCircle, XCircle, Eye, Columns, BrainCircuit, X, ShieldCheck, History,
  CheckSquare, Square, Send
} from "lucide-react";
import api from "../../api";
import StatusBadge from "../../components/StatusBadge";
import Skeleton from "../../components/Skeleton";
import Modal from "../../components/Modal";
import { formatCurrency, getRiskLevel, buildSHAPExplanation } from "../../data/dataUtils";
import { CANONICAL_REFERENCE, CANONICAL_FINANCIALS, CANONICAL_PROVIDERS, CANONICAL_PATIENTS, CANONICAL_FRAUD_DIAGNOSES } from "../../data/canonicalData";

const STATUS_OPTIONS = ['All', 'Submitted', 'Under Review', 'AI Scored', 'Approved', 'Rejected', 'Fraud Confirmed', 'Closed'];

function generateFallbackAllClaims() {
  const providers = CANONICAL_PROVIDERS;
  const patients = CANONICAL_PATIENTS;
  const diagnoses = CANONICAL_FRAUD_DIAGNOSES;
  const procedures = ['99213','99214','99215','99203','99204','80053','71046','97110'];
  const services = ['Office Visit','Lab Work','Imaging','Surgery Consultation','Physical Therapy','Emergency Visit'];
  const results = [];
  for (let i = 0; i < 400; i++) {
    const p = providers[i % providers.length];
    const pt = patients[i % patients.length];
    const d = diagnoses[i % diagnoses.length];
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
      claim_id: `CLM-2026-${String(201000 + i).padStart(6, '0')}`,
      patient_name: pt.name,
      patient_id: pt.id,
      provider_name: p.name,
      provider_id: p.id,
      service_name: services[i % services.length],
      diagnosis_code: d.code,
      procedure_code: procedures[i % procedures.length],
      claim_amount: Math.round(5000 + Math.random() * 15000),
      fraud_score: Math.round(rawScore * 1000) / 1000,
      status,
      claim_date: `2026-${month}-${day}`,
      service_date: `2026-${month}-${day}`,
      number_of_previous_claims_patient: Math.floor(Math.random() * 15),
      number_of_procedures: Math.floor(Math.random() * 4) + 1,
      provider_patient_distance_miles: Math.floor(Math.random() * 400),
      claim_submitted_late: Math.random() > 0.85,
    });
  }
  return results;
}

const ALL_COLUMNS = [
  { key: 'claim_id', label: 'Claim ID', icon: FileText },
  { key: 'patient_name', label: 'Patient', icon: User },
  { key: 'provider_name', label: 'Provider', icon: Building2 },
  { key: 'service_name', label: 'Service', icon: FileText },
  { key: 'diagnosis_code', label: 'Diagnosis', icon: FileText },
  { key: 'claim_amount', label: 'Amount', icon: DollarSign },
  { key: 'fraud_score', label: 'Risk Score', icon: AlertTriangle },
  { key: 'status', label: 'Status', icon: CheckCircle },
  { key: 'investigator', label: 'Investigator', icon: User },
  { key: 'claim_date', label: 'Date', icon: Clock },
  { key: 'actions', label: 'Actions', icon: Eye },
];

function getRiskColorClass(score) {
  if (score >= 0.90) return 'bg-red-500';
  if (score >= 0.70) return 'bg-orange-500';
  if (score >= 0.40) return 'bg-amber-400';
  if (score >= 0.20) return 'bg-blue-500';
  return 'bg-emerald-500';
}

function RiskBadge({ score }) {
  const risk = getRiskLevel(score);
  const pct = ((score || 0) * 100).toFixed(0);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 max-w-[70px] bg-bg/60 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${getRiskColorClass(score)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black border ${risk.bg} ${risk.color} ${risk.border}`}>
        {risk.label}
      </span>
      <span className="text-[10px] font-mono font-bold text-textSecondary">{pct}%</span>
    </div>
  );
}

export default function AllClaims() {
  const [allClaims, setAllClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [minScore, setMinScore] = useState('');
  const [maxScore, setMaxScore] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortField, setSortField] = useState('claim_date');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [visibleColumns, setVisibleColumns] = useState(
    ALL_COLUMNS.map(c => c.key)
  );
  const [showColumnPanel, setShowColumnPanel] = useState(false);

  const [selectedClaim, setSelectedClaim] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [claimDetail, setClaimDetail] = useState(null);
  const [selectedClaims, setSelectedClaims] = useState(new Set());

  const toggleClaimSelection = (claimId) => {
    setSelectedClaims(prev => {
      const next = new Set(prev);
      if (next.has(claimId)) next.delete(claimId);
      else next.add(claimId);
      return next;
    });
  };

  const toggleAllVisible = () => {
    setSelectedClaims(prev => {
      if (prev.size === paginatedClaims.length) return new Set();
      return new Set(paginatedClaims.map(c => c.claim_id));
    });
  };

  const sendSelectedForReview = () => {
    const count = selectedClaims.size;
    if (count === 0) return;
    alert(count + ' claim(s) sent for review.');
    setSelectedClaims(new Set());
  };

  const hasActiveFilters = search || statusFilter !== 'All' || minScore || maxScore || dateFrom || dateTo;

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('All');
    setMinScore('');
    setMaxScore('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  useEffect(() => {
    const fetchClaims = async () => {
      setLoading(true);
      try {
        let data = [];
        try {
          const res = await api.getClaims({ page_size: 500 });
          data = Array.isArray(res) ? res : (res.claims || res.data || res?.results || []);
        } catch (_) { /* fallback */ }
        if (!data || data.length === 0) {
          data = generateFallbackAllClaims();
        }
        const clamped = data.map(c => ({
          ...c,
          claim_amount: Math.min(Math.max(c.claim_amount || 0, 150), 50000),
        }));
        setAllClaims(clamped);
      } catch (err) {
        console.error("Failed to load claims", err);
        setAllClaims([]);
      } finally {
        setLoading(false);
      }
    };
    fetchClaims();
  }, []);

  const filteredClaims = useMemo(() => {
    let result = [...allClaims];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        (c.claim_id || '').toLowerCase().includes(q) ||
        (c.patient_name || '').toLowerCase().includes(q) ||
        (c.provider_name || '').toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'All') {
      result = result.filter(c => c.status === statusFilter);
    }
    if (minScore) {
      const min = parseFloat(minScore);
      if (!isNaN(min)) result = result.filter(c => (c.fraud_score || 0) >= min);
    }
    if (maxScore) {
      const max = parseFloat(maxScore);
      if (!isNaN(max)) result = result.filter(c => (c.fraud_score || 0) <= max);
    }
    if (dateFrom) {
      const from = new Date(dateFrom);
      result = result.filter(c => c.claim_date && new Date(c.claim_date) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter(c => c.claim_date && new Date(c.claim_date) <= to);
    }
    result.sort((a, b) => {
      let aVal = a[sortField] ?? '';
      let bVal = b[sortField] ?? '';
      if (sortField === 'fraud_score' || sortField === 'claim_amount') {
        aVal = Number(aVal) || 0;
        bVal = Number(bVal) || 0;
      } else {
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  }, [allClaims, search, statusFilter, minScore, maxScore, dateFrom, dateTo, sortField, sortDir]);

  const kpiData = useMemo(() => ({
    total: CANONICAL_REFERENCE.totalClaims,
    totalClaimValue: CANONICAL_REFERENCE.totalClaimValue,
    totalPatients: CANONICAL_REFERENCE.totalPatients,
    fraudRate: CANONICAL_REFERENCE.fraudRate,
  }), []);

  const totalPages = Math.max(1, Math.ceil(filteredClaims.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedClaims = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredClaims.slice(start, start + pageSize);
  }, [filteredClaims, safePage, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
    setPage(1);
  };

  const toggleColumn = (key) => {
    setVisibleColumns(cols =>
      cols.includes(key) ? cols.filter(k => k !== key) : [...cols, key]
    );
  };

  const openDetail = async (claimId) => {
    setSelectedClaim(claimId);
    setDetailLoading(true);
    setClaimDetail(null);
    try {
      const res = await api.getClaim(claimId);
      setClaimDetail(res);
    } catch (err) {
      console.error("Failed to load claim detail", err);
    } finally {
      setDetailLoading(false);
    }
  };

  const exportCSV = () => {
    const headers = ['Claim ID', 'Patient', 'Provider', 'Service', 'Diagnosis', 'Amount', 'Risk Score', 'Risk Level', 'Status', 'Investigator', 'Date'];
    const rows = filteredClaims.map(c => {
      const risk = getRiskLevel(c.fraud_score);
      return [
        c.claim_id, c.patient_name, c.provider_name, c.service_name || '',
        c.diagnosis_code || '', c.claim_amount, `${((c.fraud_score || 0) * 100).toFixed(0)}%`,
        risk.label, c.status, c.investigator || '', c.claim_date
      ];
    });
    const csvContent = [headers, ...rows].map(r => r.map(v => `"${v || ''}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `claims_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderSortIcon = (field) => (
    <ArrowUpDown size={10} className={sortField === field ? 'text-primary' : 'text-textSecondary/40'} />
  );

  const colVisible = (key) => visibleColumns.includes(key);

  const pageNumbers = useMemo(() => {
    const pages = [];
    const start = Math.max(1, safePage - 2);
    const end = Math.min(totalPages, safePage + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }, [safePage, totalPages]);

  if (loading && allClaims.length === 0) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton rows={1} className="w-48" />
            <Skeleton rows={1} className="w-32 mt-2" />
          </div>
        </div>
        <div className="bg-surface rounded-2xl border border-border/80 p-4">
          <Skeleton rows={1} className="h-10" />
        </div>
        <div className="bg-surface rounded-2xl border border-border/80 shadow-sm overflow-hidden">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-border/30">
              <Skeleton rows={1} className="w-20" />
              <Skeleton rows={1} className="w-32" />
              <Skeleton rows={1} className="w-28" />
              <Skeleton rows={1} className="w-16" />
              <Skeleton rows={1} className="w-24" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-textPrimary tracking-tight">All Claims</h1>
          <p className="text-sm text-textSecondary font-medium">{allClaims.length} total claims</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowColumnPanel(!showColumnPanel)}
              className="enterprise-btn-ghost py-2 px-3 text-xs flex items-center gap-1.5"
            >
              <Columns size={14} /> Columns
            </button>
            {showColumnPanel && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowColumnPanel(false)} />
                <div className="absolute right-0 top-full mt-2 z-50 w-56 bg-surface border border-border/80 rounded-xl shadow-xl shadow-slate-950/20 p-3">
                  <p className="text-[10px] font-black text-textSecondary uppercase tracking-widest mb-2">Toggle Columns</p>
                  {ALL_COLUMNS.filter(c => c.key !== 'actions').map(col => (
                    <label key={col.key} className="flex items-center gap-2 py-1.5 cursor-pointer hover:bg-bg/30 rounded-lg px-2 -mx-2 transition-colors">
                      <input
                        type="checkbox"
                        checked={visibleColumns.includes(col.key)}
                        onChange={() => toggleColumn(col.key)}
                        className="rounded border-border accent-primary w-3.5 h-3.5"
                      />
                      <col.icon size={12} className="text-textSecondary" />
                      <span className="text-xs text-textPrimary font-medium">{col.label}</span>
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>
          <button onClick={exportCSV} className="enterprise-btn-ghost py-2 px-4 text-xs flex items-center gap-1.5">
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-surface rounded-xl p-3 shadow-sm">
          <p className="text-[10px] font-bold text-textSecondary uppercase tracking-wider">Total Claims</p>
          <p className="text-2xl font-black text-textPrimary font-mono">{kpiData.total}</p>
        </div>
        <div className="bg-surface rounded-xl p-3 shadow-sm">
          <p className="text-[10px] font-bold text-textSecondary uppercase tracking-wider">Total Claim Value</p>
          <p className="text-2xl font-black text-textPrimary font-mono">{formatCurrency(kpiData.totalClaimValue)}</p>
        </div>
        <div className="bg-surface rounded-xl p-3 shadow-sm">
          <p className="text-[10px] font-bold text-textSecondary uppercase tracking-wider">Total Patients</p>
          <p className="text-2xl font-black text-textPrimary font-mono">{kpiData.totalPatients}</p>
        </div>
        <div className="bg-surface rounded-xl p-3 shadow-sm">
          <p className="text-[10px] font-bold text-textSecondary uppercase tracking-wider">Fraud Rate</p>
          <p className="text-2xl font-black text-textPrimary font-mono">{kpiData.fraudRate}%</p>
        </div>
      </div>

      <div className="bg-surface rounded-2xl border border-border/80 p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
            <input
              type="text"
              placeholder="Search claim ID, patient, provider..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="enterprise-input pl-9 w-full text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={14} className="text-textSecondary" />
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              className="enterprise-select text-xs"
            >
              {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Min score"
              min={0}
              max={1}
              step={0.05}
              value={minScore}
              onChange={e => { setMinScore(e.target.value); setPage(1); }}
              className="enterprise-input text-xs w-24"
            />
            <span className="text-textSecondary text-[10px]">to</span>
            <input
              type="number"
              placeholder="Max score"
              min={0}
              max={1}
              step={0.05}
              value={maxScore}
              onChange={e => { setMaxScore(e.target.value); setPage(1); }}
              className="enterprise-input text-xs w-24"
            />
          </div>

          <div className="flex items-center gap-2">
            <Clock size={14} className="text-textSecondary" />
            <input
              type="date"
              value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); setPage(1); }}
              className="enterprise-input text-xs"
            />
            <span className="text-textSecondary text-[10px]">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => { setDateTo(e.target.value); setPage(1); }}
              className="enterprise-input text-xs"
            />
          </div>

          {hasActiveFilters && (
            <button onClick={clearFilters} className="enterprise-btn-ghost py-2 px-3 text-[10px] font-bold flex items-center gap-1 text-danger hover:bg-danger/10">
              <X size={12} /> Clear
            </button>
          )}
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/40">
          <span className="text-[10px] text-textSecondary font-mono">
            Showing {paginatedClaims.length} of {filteredClaims.length} filtered claims {filteredClaims.length !== allClaims.length ? `(from ${allClaims.length} total)` : ''}
          </span>
          {hasActiveFilters && (
            <span className="text-[10px] text-primary font-semibold">Filters active</span>
          )}
        </div>
      </div>

      <div className="bg-surface rounded-2xl border border-border/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="enterprise-table w-full text-sm text-left">
            <thead>
              <tr className="bg-bg/50 border-b border-border text-[10px] font-black text-textSecondary uppercase tracking-widest">
                  <th className="px-3 py-3.5 w-10">
                    <input
                      type="checkbox"
                      checked={selectedClaims.size === paginatedClaims.length && paginatedClaims.length > 0}
                      onChange={toggleAllVisible}
                      className="rounded border-border accent-indigo-500 w-3.5 h-3.5"
                    />
                  </th>
                {colVisible('claim_id') && (
                  <th className="px-5 py-3.5 cursor-pointer hover:text-primary whitespace-nowrap" onClick={() => handleSort('claim_id')}>
                    <span className="flex items-center gap-1">Claim ID {renderSortIcon('claim_id')}</span>
                  </th>
                )}
                {colVisible('patient_name') && (
                  <th className="px-5 py-3.5 cursor-pointer hover:text-primary whitespace-nowrap" onClick={() => handleSort('patient_name')}>
                    <span className="flex items-center gap-1"><User size={10} /> Patient {renderSortIcon('patient_name')}</span>
                  </th>
                )}
                {colVisible('provider_name') && (
                  <th className="px-5 py-3.5 cursor-pointer hover:text-primary whitespace-nowrap" onClick={() => handleSort('provider_name')}>
                    <span className="flex items-center gap-1"><Building2 size={10} /> Provider {renderSortIcon('provider_name')}</span>
                  </th>
                )}
                {colVisible('service_name') && (
                  <th className="px-5 py-3.5 cursor-pointer hover:text-primary whitespace-nowrap" onClick={() => handleSort('service_name')}>
                    <span className="flex items-center gap-1">Service {renderSortIcon('service_name')}</span>
                  </th>
                )}
                {colVisible('diagnosis_code') && (
                  <th className="px-5 py-3.5 cursor-pointer hover:text-primary whitespace-nowrap" onClick={() => handleSort('diagnosis_code')}>
                    <span className="flex items-center gap-1">Diagnosis {renderSortIcon('diagnosis_code')}</span>
                  </th>
                )}
                {colVisible('claim_amount') && (
                  <th className="px-5 py-3.5 cursor-pointer hover:text-primary text-right whitespace-nowrap" onClick={() => handleSort('claim_amount')}>
                    <span className="flex items-center justify-end gap-1"><DollarSign size={10} /> Amount {renderSortIcon('claim_amount')}</span>
                  </th>
                )}
                {colVisible('fraud_score') && (
                  <th className="px-5 py-3.5 cursor-pointer hover:text-primary whitespace-nowrap" onClick={() => handleSort('fraud_score')}>
                    <span className="flex items-center gap-1"><AlertTriangle size={10} /> Risk Score {renderSortIcon('fraud_score')}</span>
                  </th>
                )}
                {colVisible('status') && (
                  <th className="px-5 py-3.5 cursor-pointer hover:text-primary whitespace-nowrap" onClick={() => handleSort('status')}>
                    <span className="flex items-center gap-1">Status {renderSortIcon('status')}</span>
                  </th>
                )}
                {colVisible('investigator') && (
                  <th className="px-5 py-3.5 cursor-pointer hover:text-primary whitespace-nowrap" onClick={() => handleSort('investigator')}>
                    <span className="flex items-center gap-1"><User size={10} /> Investigator {renderSortIcon('investigator')}</span>
                  </th>
                )}
                {colVisible('claim_date') && (
                  <th className="px-5 py-3.5 cursor-pointer hover:text-primary whitespace-nowrap" onClick={() => handleSort('claim_date')}>
                    <span className="flex items-center gap-1"><Clock size={10} /> Date {renderSortIcon('claim_date')}</span>
                  </th>
                )}
                {colVisible('actions') && (
                  <th className="px-5 py-3.5 whitespace-nowrap">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {paginatedClaims.map((c) => (
                <tr key={c.claim_id} className="hover:bg-bg/30 transition-colors group cursor-pointer" onClick={() => openDetail(c.claim_id)}>
                  <td className="px-3 py-4 w-10" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedClaims.has(c.claim_id)}
                      onChange={() => toggleClaimSelection(c.claim_id)}
                      className="rounded border-border accent-indigo-500 w-3.5 h-3.5"
                    />
                  </td>
                  {colVisible('claim_id') && (
                    <td className="px-5 py-4 font-mono text-xs font-bold text-primary hover:underline">
                      #{c.claim_id}
                    </td>
                  )}
                  {colVisible('patient_name') && (
                    <td className="px-5 py-4 font-semibold text-textPrimary text-sm max-w-[160px] truncate">{c.patient_name}</td>
                  )}
                  {colVisible('provider_name') && (
                    <td className="px-5 py-4 text-textSecondary text-xs max-w-[160px] truncate">{c.provider_name}</td>
                  )}
                  {colVisible('service_name') && (
                    <td className="px-5 py-4 text-textSecondary text-xs max-w-[140px] truncate">{c.service_name || '—'}</td>
                  )}
                  {colVisible('diagnosis_code') && (
                    <td className="px-5 py-4 font-mono text-xs text-textPrimary">{c.diagnosis_code || '—'}</td>
                  )}
                  {colVisible('claim_amount') && (
                    <td className="px-5 py-4 font-mono text-sm font-bold text-textPrimary text-right">{formatCurrency(c.claim_amount)}</td>
                  )}
                  {colVisible('fraud_score') && (
                    <td className="px-5 py-4"><RiskBadge score={c.fraud_score} /></td>
                  )}
                  {colVisible('status') && (
                    <td className="px-5 py-4"><StatusBadge status={c.status || 'Submitted'} /></td>
                  )}
                  {colVisible('investigator') && (
                    <td className="px-5 py-4 text-[11px] text-textSecondary max-w-[150px]">
                      {c.investigator ? (
                        <span className="text-textPrimary font-semibold">{c.investigator}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold border border-gray-400/30 text-gray-400 bg-gray-500/5">
                            Unassigned
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); alert('Assign investigator to ' + c.claim_id); }}
                            className="text-[9px] font-bold text-primary hover:underline"
                          >
                            Assign
                          </button>
                        </span>
                      )}
                    </td>
                  )}
                  {colVisible('claim_date') && (
                    <td className="px-5 py-4 text-[11px] text-textSecondary font-mono whitespace-nowrap">
                      {c.claim_date ? new Date(c.claim_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </td>
                  )}
                  {colVisible('actions') && (
                    <td className="px-5 py-4">
                      <button
                        onClick={(e) => { e.stopPropagation(); openDetail(c.claim_id); }}
                        className="text-xs font-bold text-primary hover:underline opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                      >
                        <Eye size={12} /> View
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {paginatedClaims.length === 0 && (
                <tr>
                  <td colSpan={ALL_COLUMNS.filter(c => colVisible(c.key)).length || 1} className="px-5 py-16 text-center">
                    <AlertTriangle size={32} className="mx-auto text-textSecondary/30 mb-3" />
                    <p className="text-sm text-textSecondary font-semibold">No claims match your filters</p>
                    <p className="text-xs text-textSecondary/60 mt-1">Try adjusting your search or filter criteria</p>
                    {hasActiveFilters && (
                      <button onClick={clearFilters} className="mt-3 text-xs text-primary font-bold hover:underline">Clear all filters</button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-border/60 px-5 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
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
            <span className="text-[10px] text-textSecondary font-mono">
              Page {safePage} of {totalPages}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-textSecondary font-mono mr-2">
              {filteredClaims.length === 0 ? '0' : `${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, filteredClaims.length)} of ${filteredClaims.length}`}
            </span>
            <button
              disabled={safePage <= 1}
              onClick={() => setPage(1)}
              className="enterprise-btn-ghost px-2 py-1.5 text-[10px] font-bold disabled:opacity-30"
            >
              First
            </button>
            <button
              disabled={safePage <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="enterprise-btn-ghost p-2 disabled:opacity-30"
            >
              <ChevronLeft size={14} />
            </button>
            {pageNumbers.map(pn => (
              <button
                key={pn}
                onClick={() => setPage(pn)}
                className={`px-2.5 py-1.5 text-[10px] font-bold rounded-lg transition-colors ${
                  pn === safePage
                    ? 'bg-primary text-white'
                    : 'text-textSecondary hover:bg-bg/60'
                }`}
              >
                {pn}
              </button>
            ))}
            <button
              disabled={safePage >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="enterprise-btn-ghost p-2 disabled:opacity-30"
            >
              <ChevronRight size={14} />
            </button>
            <button
              disabled={safePage >= totalPages}
              onClick={() => setPage(totalPages)}
              className="enterprise-btn-ghost px-2 py-1.5 text-[10px] font-bold disabled:opacity-30"
            >
              Last
</button>
          <button
            onClick={sendSelectedForReview}
            className="enterprise-btn-primary py-2 px-4 text-xs flex items-center gap-1.5"
            style={{display: selectedClaims.size > 0 ? 'inline-flex' : 'none'}}
          >
            <Send size={14} /> Send Selected for Review
          </button>
        </div>
      </div>
      </div>

      <Modal open={!!selectedClaim} onClose={() => { setSelectedClaim(null); setClaimDetail(null); }} title="Claim Details" wide>
        {detailLoading && (
          <div className="space-y-4">
            <Skeleton type="card" />
            <Skeleton type="card" />
            <Skeleton type="card" />
          </div>
        )}

        {!detailLoading && claimDetail && (
          <ClaimDetailContent claimDetail={claimDetail} onClose={() => { setSelectedClaim(null); setClaimDetail(null); }} />
        )}
      </Modal>
    </div>
  );
}


function ClaimDetailContent({ claimDetail, onClose }) {
  const { claim, patient_history, shap_contributions, base_value, audit_log } = claimDetail;
  const [actionLoading, setActionLoading] = useState(null);

  const risk = getRiskLevel(claim.fraud_score);
  const shap = buildSHAPExplanation(claim);

  const handleAction = async (action) => {
    setActionLoading(action);
    try {
      const newStatus = action === 'approve' ? 'Approved' : action === 'reject' ? 'Rejected' : 'Under Review';
      await api.updateClaimStatus(claim.claim_id, newStatus);
      claim.status = newStatus;
    } catch (err) {
      console.error("Action failed:", err);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-bg/40 rounded-xl p-4 border border-border/40">
        <InfoCell label="Patient" value={claim.patient_name} />
        <InfoCell label="Age" value={claim.patient_age ? `${claim.patient_age} yrs` : '—'} />
        <InfoCell label="Gender" value={claim.patient_gender || '—'} />
        <InfoCell label="Location" value={claim.patient_city ? `${claim.patient_city}, ${claim.patient_state}` : '—'} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-bg/40 rounded-xl p-4 border border-border/40">
        <InfoCell label="Provider" value={claim.provider_name} />
        <InfoCell label="Type" value={claim.provider_type || '—'} />
        <InfoCell label="Specialty" value={claim.provider_specialty || '—'} />
        <InfoCell label="Provider ID" value={claim.provider_id ? `#${claim.provider_id}` : '—'} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-bg/40 rounded-xl p-4 border border-border/40">
        <InfoCell label="Amount" value={formatCurrency(claim.claim_amount)} highlight />
        <InfoCell label="ICD Code" value={claim.diagnosis_code || '—'} mono />
        <InfoCell label="CPT Code" value={claim.procedure_code || '—'} mono />
        <InfoCell label="Status">
          <StatusBadge status={claim.status} />
        </InfoCell>
        <InfoCell label="Claim Date" value={claim.claim_date ? new Date(claim.claim_date).toLocaleDateString() : '—'} />
        <InfoCell label="Service Date" value={claim.service_date ? new Date(claim.service_date).toLocaleDateString() : '—'} />
        <InfoCell label="Procedures" value={claim.number_of_procedures || '—'} />
        <InfoCell label="Late Submission" value={claim.claim_submitted_late ? 'Yes' : 'No'} />
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-border/40">
          <BrainCircuit size={14} className="text-primary" />
          <h3 className="text-xs font-black text-textPrimary uppercase tracking-widest">AI Fraud Analysis</h3>
        </div>
        <div className="bg-bg/50 rounded-xl p-4 border border-border/40">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black text-textPrimary">Fraud Probability</span>
            <span className={`text-lg font-black ${risk.color}`}>{((claim.fraud_score || 0) * 100).toFixed(1)}%</span>
          </div>
          <div className="w-full bg-bg rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${getRiskColorClass(claim.fraud_score)}`}
              style={{ width: `${((claim.fraud_score || 0) * 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${risk.bg} ${risk.color} ${risk.border}`}>
              {risk.label} Risk
            </span>
            <span className="text-[10px] text-textSecondary font-mono">
              Base: {((base_value || shap.base_value || 0) * 100).toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="text-xs text-textSecondary leading-relaxed bg-bg/30 rounded-lg p-3 border border-border/30">
          {shap.summary}
        </div>

        {shap.top_factors && shap.top_factors.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-black text-textSecondary uppercase tracking-widest">Feature Contributions</p>
            {shap.top_factors.map((factor, i) => (
              <div key={i} className="flex items-center gap-3 bg-bg/30 rounded-lg px-3 py-2 border border-border/30">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-textPrimary">{factor.feature}</span>
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                      factor.impact === 'high' ? 'bg-danger/10 text-danger' :
                      factor.impact === 'medium' ? 'bg-warning/10 text-warning' :
                      'bg-primary/10 text-primary'
                    }`}>
                      {factor.impact}
                    </span>
                  </div>
                  <p className="text-[10px] text-textSecondary mt-0.5">
                    {factor.direction === 'increases' ? '↑' : factor.direction === 'decreases' ? '↓' : '—'} {factor.value}
                  </p>
                </div>
                <div className="w-16">
                  <div className="w-full bg-bg/60 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        factor.impact === 'high' ? 'bg-danger' :
                        factor.impact === 'medium' ? 'bg-warning' : 'bg-primary'
                      }`}
                      style={{ width: `${(factor.weight * 100)}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-textSecondary font-mono block text-right mt-0.5">
                    {(factor.weight * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {shap_contributions && shap_contributions.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-black text-textSecondary uppercase tracking-widest">SHAP Feature Contributions</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {shap_contributions.slice(0, 10).map((item, i) => {
                const val = item.value || item.contribution || 0;
                const isPositive = val >= 0;
                return (
                  <div key={i} className="flex items-center gap-2 bg-bg/30 rounded-lg px-3 py-2 border border-border/30">
                    <span className="text-[10px] text-textPrimary font-medium flex-1 truncate">{item.feature || item.name}</span>
                    <div className="w-12 h-1.5 bg-bg/60 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isPositive ? 'bg-danger' : 'bg-success'}`}
                        style={{ width: `${Math.min(Math.abs(val) * 500, 100)}%` }}
                      />
                    </div>
                    <span className={`text-[10px] font-mono font-bold ${isPositive ? 'text-danger' : 'text-success'}`}>
                      {isPositive ? '+' : ''}{(val * 100).toFixed(1)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {patient_history && patient_history.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-border/40">
            <History size={14} className="text-primary" />
            <h3 className="text-xs font-black text-textPrimary uppercase tracking-widest">Patient Medical History</h3>
          </div>
          <div className="space-y-3">
            {patient_history.map((item, i) => (
              <div key={i} className="flex items-start gap-3 relative">
                {i < patient_history.length - 1 && (
                  <div className="absolute left-[7px] top-5 bottom-0 w-px bg-border/40" />
                )}
                <div className="w-3.5 h-3.5 rounded-full bg-primary/20 border-2 border-primary mt-0.5 shrink-0 z-10" />
                <div className="flex-1 bg-bg/30 rounded-lg px-3 py-2 border border-border/30">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-textPrimary">{item.diagnosis || item.service_name || 'Medical Event'}</span>
                    <span className="text-[10px] text-textSecondary font-mono">
                      {item.date || item.service_date ? new Date(item.date || item.service_date).toLocaleDateString() : '—'}
                    </span>
                  </div>
                  {item.provider_name && (
                    <p className="text-[10px] text-textSecondary mt-0.5">Provider: {item.provider_name}</p>
                  )}
                  {item.amount && (
                    <p className="text-[10px] text-textSecondary font-mono">Amount: {formatCurrency(item.amount)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {audit_log && audit_log.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-border/40">
            <Clock size={14} className="text-primary" />
            <h3 className="text-xs font-black text-textPrimary uppercase tracking-widest">Audit Log</h3>
          </div>
          <div className="relative pl-4">
            <div className="absolute left-[13px] top-0 bottom-0 w-px bg-primary/20" />
            {audit_log.map((entry, i) => {
              const isFirst = entry.action === 'Claim Submitted';
              const isScored = entry.action === 'AI Scoring';
              const isStatus = entry.action === 'Status Updated';
              let dotColor = 'bg-accent/30 border-accent';
              if (isFirst) dotColor = 'bg-primary/30 border-primary';
              else if (isScored) dotColor = 'bg-indigo-400/30 border-indigo-400';
              else if (isStatus) dotColor = 'bg-warning/30 border-warning';
              return (
                <div key={i} className="flex items-start gap-3 relative mb-4 last:mb-0">
                  <div className={`w-3.5 h-3.5 rounded-full border-2 mt-0.5 shrink-0 z-10 ${dotColor}`} />
                  <div className="flex-1 bg-bg/30 rounded-lg px-3 py-2 border border-border/30">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-textPrimary">{entry.action}</span>
                      <span className="text-[10px] text-textSecondary font-mono">
                        {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : '—'}
                      </span>
                    </div>
                    <p className="text-[10px] text-textSecondary mt-0.5">{entry.details}</p>
                    <p className="text-[9px] text-textSecondary/60 mt-0.5">by {entry.user}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-border/40">
          <ShieldCheck size={14} className="text-primary" />
          <h3 className="text-xs font-black text-textPrimary uppercase tracking-widest">Investigation Actions</h3>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            disabled={actionLoading === 'approve'}
            onClick={() => handleAction('approve')}
            className="enterprise-btn flex items-center gap-2 py-2.5 px-5 text-xs font-bold bg-success/10 text-success border border-success/20 hover:bg-success/20 transition-colors disabled:opacity-50"
          >
            <CheckCircle size={14} />
            {actionLoading === 'approve' ? 'Processing...' : 'Approve Claim'}
          </button>
          <button
            disabled={actionLoading === 'reject'}
            onClick={() => handleAction('reject')}
            className="enterprise-btn flex items-center gap-2 py-2.5 px-5 text-xs font-bold bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20 transition-colors disabled:opacity-50"
          >
            <XCircle size={14} />
            {actionLoading === 'reject' ? 'Processing...' : 'Reject Claim'}
          </button>
          <button
            disabled={actionLoading === 'audit'}
            onClick={() => handleAction('audit')}
            className="enterprise-btn flex items-center gap-2 py-2.5 px-5 text-xs font-bold bg-warning/10 text-warning border border-warning/20 hover:bg-warning/20 transition-colors disabled:opacity-50"
          >
            <AlertTriangle size={14} />
            {actionLoading === 'audit' ? 'Processing...' : 'Send to Audit'}
          </button>
        </div>
      </div>
    </div>
  );
}


function InfoCell({ label, value, children, highlight, mono }) {
  return (
    <div>
      <p className="text-[10px] text-textSecondary uppercase tracking-wider font-semibold mb-1">{label}</p>
      {children || (
        <p className={`text-sm font-bold ${
          highlight ? 'text-primary font-mono' :
          mono ? 'font-mono text-xs' :
          'text-textPrimary'
        }`}>
          {value || '—'}
        </p>
      )}
    </div>
  );
}
