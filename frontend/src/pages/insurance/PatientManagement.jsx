import { useState, useEffect, useMemo } from 'react';
import { Search, Users, Download, Eye, AlertTriangle, ShieldCheck, TrendingUp, ChevronLeft, ChevronRight, Filter, Activity, Heart, MapPin, Calendar, DollarSign } from 'lucide-react';
import api from '../../api';
import Skeleton from '../../components/Skeleton';
import PlotlyChart from '../../components/PlotlyChart';
import { formatCurrency, formatPercent, formatNumber, getRiskLevel, getStatusColor } from '../../data/dataUtils';

export default function PatientManagement() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState('All');
  const [riskFilter, setRiskFilter] = useState('All');
  const [cityFilter, setCityFilter] = useState('All');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientClaims, setPatientClaims] = useState([]);
  const [claimsLoading, setClaimsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.getPatients();
        setPatients(res || []);
      } catch (err) {
        console.error('Failed to load patients', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!selectedPatient) {
      setPatientClaims([]);
      return;
    }
    const fetchClaims = async () => {
      setClaimsLoading(true);
      try {
        const res = await api.getClaims({ page_size: 500 });
        const allClaims = res?.data || res || [];
        const filtered = Array.isArray(allClaims)
          ? allClaims.filter(c => c.patient_id === selectedPatient.patient_id)
          : [];
        setPatientClaims(filtered.slice(0, 20));
      } catch (err) {
        console.error('Failed to load patient claims', err);
        setPatientClaims([]);
      } finally {
        setClaimsLoading(false);
      }
    };
    fetchClaims();
  }, [selectedPatient]);

  const cities = useMemo(() => {
    const set = new Set(patients.map(p => p.city).filter(Boolean));
    return ['All', ...Array.from(set).sort()];
  }, [patients]);

  const filtered = useMemo(() => {
    return patients.filter(p => {
      const matchesSearch =
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.state?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.patient_id?.toString().includes(searchTerm);
      const matchesGender = genderFilter === 'All' || p.gender === genderFilter;
      const isHighRisk = (p.fraud_count || 0) > 0;
      const matchesRisk =
        riskFilter === 'All' ||
        (riskFilter === 'High Risk' && isHighRisk) ||
        (riskFilter === 'Normal' && !isHighRisk);
      const matchesCity = cityFilter === 'All' || p.city === cityFilter;
      return matchesSearch && matchesGender && matchesRisk && matchesCity;
    });
  }, [patients, searchTerm, genderFilter, riskFilter, cityFilter]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const stats = useMemo(() => {
    const total = patients.length;
    const avgAge = total
      ? Math.round(patients.reduce((sum, p) => sum + (p.age || 0), 0) / total)
      : 0;
    const highRisk = patients.filter(p => (p.fraud_count || 0) > 0).length;
    const avgClaimCost = total
      ? patients.reduce((sum, p) => sum + (p.avg_claim_amount || 0), 0) / total
      : 0;
    const activeClaims = patients.filter(p => (p.claim_count || p.total_claims || 0) > 0).length;
    return { total, avgAge, highRisk, avgClaimCost, activeClaims };
  }, [patients]);

  const ageChartData = useMemo(() => {
    const ranges = { 'Under 30': 0, '30-49': 0, '50-69': 0, '70+': 0 };
    patients.forEach(p => {
      if (p.age < 30) ranges['Under 30'] += 1;
      else if (p.age < 50) ranges['30-49'] += 1;
      else if (p.age < 70) ranges['50-69'] += 1;
      else ranges['70+'] += 1;
    });
    return [
      {
        x: Object.keys(ranges),
        y: Object.values(ranges),
        type: 'bar',
        marker: {
          color: ['#818cf8', '#6366f1', '#4f46e5', '#4338ca'],
          line: { width: 0 }
        },
        hovertemplate: '%{x}<br>%{y} patients<extra></extra>'
      }
    ];
  }, [patients]);

  const genderChartData = useMemo(() => {
    const counts = { Male: 0, Female: 0, Other: 0 };
    patients.forEach(p => {
      const g = (p.gender || '').toLowerCase();
      if (g === 'male') counts['Male'] += 1;
      else if (g === 'female') counts['Female'] += 1;
      else counts['Other'] += 1;
    });
    return [
      {
        labels: Object.keys(counts),
        values: Object.values(counts),
        type: 'pie',
        hole: 0.45,
        marker: { colors: ['#6366f1', '#ec4899', '#a78bfa'] },
        textinfo: 'percent+label',
        textposition: 'inside',
        textfont: { size: 11, color: '#fff' },
        showlegend: true,
        hovertemplate: '%{label}<br>%{value} patients (%{percent})<extra></extra>'
      }
    ];
  }, [patients]);

  const claimsChartData = useMemo(() => {
    const dist = { '1': 0, '2-4': 0, '5-9': 0, '10+': 0 };
    patients.forEach(p => {
      const c = p.total_claims || p.claim_count || 0;
      if (c <= 1) dist['1'] += 1;
      else if (c <= 4) dist['2-4'] += 1;
      else if (c <= 9) dist['5-9'] += 1;
      else dist['10+'] += 1;
    });
    return [
      {
        x: Object.keys(dist),
        y: Object.values(dist),
        type: 'bar',
        marker: {
          color: ['#14b8a6', '#0d9488', '#0f766e', '#115e59'],
          line: { width: 0 }
        },
        hovertemplate: '%{x} claims<br>%{y} patients<extra></extra>'
      }
    ];
  }, [patients]);

  const riskDonutData = useMemo(() => {
    const high = stats.highRisk;
    const normal = stats.total - high;
    return [
      {
        labels: ['High Risk', 'Normal'],
        values: [high, normal],
        type: 'pie',
        hole: 0.6,
        marker: { colors: ['#ef4444', '#10b981'] },
        textinfo: 'percent',
        textposition: 'inside',
        textfont: { size: 12, color: '#fff' },
        showlegend: true,
        hovertemplate: '%{label}<br>%{value} patients (%{percent})<extra></extra>'
      }
    ];
  }, [stats]);

  const diagnosisTimelineData = useMemo(() => {
    if (!patientClaims.length) return [];
    const sorted = [...patientClaims].sort((a, b) => new Date(a.claim_date) - new Date(b.claim_date));
    return [
      {
        x: sorted.map(c => c.claim_date),
        y: sorted.map(c => c.claim_amount || 0),
        type: 'scatter',
        mode: 'lines+markers',
        marker: {
          color: sorted.map(c => c.is_fraudulent ? '#ef4444' : '#6366f1'),
          size: 8
        },
        line: { color: '#6366f1', width: 2 },
        hovertemplate: '%{x}<br>$%{y:,.0f}<extra></extra>'
      }
    ];
  }, [patientClaims]);

  const exportCSV = () => {
    const headers = [
      'Patient ID', 'Name', 'Age', 'Gender', 'City', 'State',
      'Total Claims', 'Avg Claim Amount', 'Fraud Count', 'Policy ID'
    ];
    const csvContent = [
      headers.join(','),
      ...filtered.map(p => [
        p.patient_id,
        `"${p.name || ''}"`,
        p.age || 0,
        p.gender || '',
        `"${p.city || ''}"`,
        `"${p.state || ''}"`,
        p.total_claims || 0,
        (p.avg_claim_amount || 0).toFixed(2),
        p.fraud_count || 0,
        p.policy_id || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'patient_management_export.csv');
    link.click();
    URL.revokeObjectURL(url);
  };

  const getPatientRiskScore = (p) => {
    const fraudCount = p.fraud_count || 0;
    const claimCount = p.total_claims || p.claim_count || 0;
    if (claimCount === 0) return 0;
    return Math.min(1, (fraudCount / claimCount) * 1.5);
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-64 skeleton-shimmer rounded-lg mb-2" />
            <div className="h-4 w-96 skeleton-shimmer rounded" />
          </div>
          <div className="h-10 w-32 skeleton-shimmer rounded-xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <Skeleton key={i} type="card" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
              <div className="h-4 w-32 skeleton-shimmer rounded mb-4" />
              <div className="h-56 skeleton-shimmer rounded-xl" />
            </div>
          ))}
        </div>
        <Skeleton rows={10} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-textPrimary flex items-center gap-3">
            <Users size={28} className="text-primary" />
            Patient Management
          </h1>
          <p className="mt-1 text-sm text-textSecondary">
            Comprehensive analytics and oversight for insurance policyholder profiles and clinical billing activity.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2">
            <Users size={14} className="text-textSecondary" />
            <span className="text-xs font-bold text-textPrimary font-mono">{formatNumber(stats.total)}</span>
            <span className="text-[10px] text-textSecondary uppercase font-semibold">patients</span>
          </div>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-bold text-textPrimary hover:bg-bg transition-colors"
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl">
            <Users size={22} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-textSecondary">Total Patients</p>
            <p className="text-2xl font-black text-textPrimary font-mono">{formatNumber(stats.total)}</p>
          </div>
        </div>
        <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
            <Heart size={22} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-textSecondary">Average Age</p>
            <p className="text-2xl font-black text-textPrimary font-mono">{stats.avgAge}<span className="text-sm font-bold text-textSecondary ml-1">yrs</span></p>
          </div>
        </div>
        <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm flex items-center gap-4 border-l-4 border-l-red-500">
          <div className="p-3 bg-red-500/10 text-red-500 rounded-xl">
            <AlertTriangle size={22} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-red-500">High Risk Patients</p>
            <p className="text-2xl font-black text-red-500 font-mono">{stats.highRisk}</p>
          </div>
        </div>
        <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
            <DollarSign size={22} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-textSecondary">Avg Claim Cost</p>
            <p className="text-2xl font-black text-textPrimary font-mono">{formatCurrency(stats.avgClaimCost)}</p>
          </div>
        </div>
        <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-cyan-500/10 text-cyan-500 rounded-xl">
            <Activity size={22} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-textSecondary">Active Claims</p>
            <p className="text-2xl font-black text-textPrimary font-mono">{formatNumber(stats.activeClaims)}</p>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-textPrimary mb-1">Age Distribution</h3>
          <p className="text-xs text-textSecondary mb-4">Breakdown of policyholders by age group</p>
          <div className="h-56 bg-surface p-2">
            <PlotlyChart
              data={ageChartData}
              layout={{
                margin: { t: 10, r: 10, l: 35, b: 35 },
                xaxis: { showgrid: false, title: '' },
                yaxis: { gridcolor: 'rgba(226,232,240,0.5)', title: 'Patients' },
                showlegend: false,
                bargap: 0.35
              }}
            />
          </div>
        </div>
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-textPrimary mb-1">Gender Distribution</h3>
          <p className="text-xs text-textSecondary mb-4">Patient demographics by gender</p>
          <div className="h-56 bg-surface p-2">
            <PlotlyChart
              data={genderChartData}
              layout={{
                margin: { t: 10, b: 10, l: 10, r: 10 },
                showlegend: true,
                legend: { orientation: 'h', y: -0.1, font: { size: 10 } }
              }}
            />
          </div>
        </div>
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-textPrimary mb-1">Claims Distribution</h3>
          <p className="text-xs text-textSecondary mb-4">Patients grouped by historical claim count</p>
          <div className="h-56 bg-surface p-2">
            <PlotlyChart
              data={claimsChartData}
              layout={{
                margin: { t: 10, r: 10, l: 35, b: 35 },
                xaxis: { showgrid: false, title: '' },
                yaxis: { gridcolor: 'rgba(226,232,240,0.5)', title: 'Patients' },
                showlegend: false,
                bargap: 0.35
              }}
            />
          </div>
        </div>
      </div>

      {/* Risk Categories Donut */}
      <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-textPrimary">Risk Categories</h3>
            <p className="text-xs text-textSecondary">Distribution of patient risk ratings</p>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-bold">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="text-textSecondary">{stats.highRisk} High Risk ({formatPercent(stats.total ? (stats.highRisk / stats.total) * 100 : 0)})</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-textSecondary">{stats.total - stats.highRisk} Normal ({formatPercent(stats.total ? ((stats.total - stats.highRisk) / stats.total) * 100 : 0)})</span>
            </span>
          </div>
        </div>
        <div className="flex justify-center">
          <div className="h-56 w-full max-w-md">
            <PlotlyChart
              data={riskDonutData}
              layout={{
                margin: { t: 10, b: 10, l: 10, r: 10 },
                height: 200,
                showlegend: true,
                legend: { orientation: 'h', y: -0.15, font: { size: 10 } }
              }}
            />
          </div>
        </div>
      </div>

      {/* Directory Table */}
      <div className="enterprise-card">
        <div className="flex items-center gap-3 border-b border-border p-4 flex-wrap">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm min-w-[240px]">
            <Search size={16} className="text-textSecondary" />
            <input
              type="text"
              placeholder="Search by ID, Name, City, or State..."
              className="flex-1 bg-transparent outline-none text-textPrimary placeholder:text-textSecondary/60 text-sm"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-textSecondary" />
          </div>
          <select
            value={genderFilter}
            onChange={(e) => { setGenderFilter(e.target.value); setPage(1); }}
            className="bg-bg border border-border rounded-xl px-3 py-2 text-xs font-bold text-textPrimary outline-none"
          >
            <option value="All">All Genders</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
          <select
            value={riskFilter}
            onChange={(e) => { setRiskFilter(e.target.value); setPage(1); }}
            className="bg-bg border border-border rounded-xl px-3 py-2 text-xs font-bold text-textPrimary outline-none"
          >
            <option value="All">All Risk</option>
            <option value="High Risk">High Risk</option>
            <option value="Normal">Normal</option>
          </select>
          <select
            value={cityFilter}
            onChange={(e) => { setCityFilter(e.target.value); setPage(1); }}
            className="bg-bg border border-border rounded-xl px-3 py-2 text-xs font-bold text-textPrimary outline-none"
          >
            {cities.map(c => (
              <option key={c} value={c}>{c === 'All' ? 'All Cities' : c}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="enterprise-table">
            <thead>
              <tr>
                <th>Patient ID</th>
                <th>Name</th>
                <th>Age</th>
                <th>Gender</th>
                <th>City, State</th>
                <th>Total Claims</th>
                <th>Avg Claim Amount</th>
                <th>Risk Level</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-textSecondary text-sm">
                    No patients found matching your filters.
                  </td>
                </tr>
              ) : (
                paginated.map((patient) => {
                  const riskScore = getPatientRiskScore(patient);
                  const risk = getRiskLevel(riskScore);
                  const avgClaim = patient.avg_claim_amount || (patient.total_claims ? 0 : 0);
                  return (
                    <tr key={patient.patient_id} className="hover:bg-bg/50 transition-colors">
                      <td className="font-mono text-xs font-bold text-textSecondary">#{patient.patient_id}</td>
                      <td className="font-semibold text-textPrimary">{patient.name}</td>
                      <td className="text-sm text-textSecondary">{patient.age} yrs</td>
                      <td className="text-sm text-textSecondary">{patient.gender}</td>
                      <td className="text-sm text-textSecondary">
                        <span className="flex items-center gap-1">
                          <MapPin size={12} className="text-textSecondary/60" />
                          {patient.city}, {patient.state}
                        </span>
                      </td>
                      <td className="text-sm font-bold text-textPrimary font-mono">
                        {patient.total_claims || patient.claim_count || 0}
                      </td>
                      <td className="text-sm font-mono text-textPrimary">
                        {formatCurrency(avgClaim)}
                      </td>
                      <td>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${risk.bg} ${risk.color} border ${risk.border}`}>
                          {(patient.fraud_count || 0) > 0 ? (
                            <AlertTriangle size={10} />
                          ) : (
                            <ShieldCheck size={10} />
                          )}
                          {risk.label}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => setSelectedPatient(patient)}
                          className="flex items-center gap-1.5 h-8 px-3 items-center justify-center rounded-lg border border-border bg-surface text-textSecondary hover:border-primary hover:text-primary transition-colors text-xs font-bold"
                        >
                          <Eye size={14} />
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="border-t border-border/60 px-5 py-3 flex items-center justify-between flex-wrap gap-3">
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
            </select>
            <span className="text-[10px] text-textSecondary font-mono">
              {filtered.length > 0 ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, filtered.length)}` : '0'} of {formatNumber(filtered.length)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="enterprise-btn-ghost p-2 disabled:opacity-30"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs font-mono text-textPrimary font-bold">{page} / {totalPages || 1}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="enterprise-btn-ghost p-2 disabled:opacity-30"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Patient Profile Modal */}
      {selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setSelectedPatient(null)}>
          <div
            className="enterprise-card max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="border-b border-border px-6 py-4 flex items-center justify-between sticky top-0 bg-surface z-10">
              <h3 className="text-lg font-black text-textPrimary flex items-center gap-2">
                <Activity size={18} className="text-primary" />
                Patient Profile
              </h3>
              <button
                onClick={() => setSelectedPatient(null)}
                className="text-textSecondary hover:text-textPrimary text-xl font-bold w-8 h-8 flex items-center justify-center rounded-lg hover:bg-bg transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Avatar & Identity */}
              <div className="flex items-start gap-5">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary text-white text-3xl font-black shadow-lg shadow-primary/20 shrink-0">
                  {selectedPatient.name?.charAt(0) || 'P'}
                </div>
                <div className="flex-1">
                  <h4 className="text-xl font-black text-textPrimary">{selectedPatient.name}</h4>
                  <p className="text-sm text-textSecondary font-mono mt-0.5">Patient ID: #{selectedPatient.patient_id}</p>
                  <div className="flex items-center gap-3 mt-2">
                    {(() => {
                      const riskScore = getPatientRiskScore(selectedPatient);
                      const risk = getRiskLevel(riskScore);
                      return (
                        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${risk.bg} ${risk.color} border ${risk.border}`}>
                          {(selectedPatient.fraud_count || 0) > 0 ? <AlertTriangle size={10} /> : <ShieldCheck size={10} />}
                          {risk.label} Risk
                        </span>
                      );
                    })()}
                    <span className="text-xs text-textSecondary flex items-center gap-1">
                      <MapPin size={12} />
                      {selectedPatient.city}, {selectedPatient.state}
                    </span>
                  </div>
                </div>
              </div>

              {/* Demographics Grid */}
              <div className="bg-bg rounded-xl p-4 border border-border/50">
                <h5 className="text-xs font-black uppercase text-textSecondary mb-3 flex items-center gap-2">
                  <Users size={14} />
                  Demographics
                </h5>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-textSecondary">Age</p>
                    <p className="font-bold text-textPrimary text-sm mt-0.5">{selectedPatient.age} years</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-textSecondary">Gender</p>
                    <p className="font-bold text-textPrimary text-sm mt-0.5">{selectedPatient.gender}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-textSecondary">City</p>
                    <p className="font-bold text-textPrimary text-sm mt-0.5">{selectedPatient.city}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-textSecondary">State</p>
                    <p className="font-bold text-textPrimary text-sm mt-0.5">{selectedPatient.state}</p>
                  </div>
                </div>
              </div>

              {/* Insurance Details */}
              <div className="bg-bg rounded-xl p-4 border border-border/50">
                <h5 className="text-xs font-black uppercase text-textSecondary mb-3 flex items-center gap-2">
                  <ShieldCheck size={14} />
                  Insurance Details
                </h5>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-textSecondary">Policy ID</p>
                    <p className="font-bold text-textPrimary text-sm font-mono mt-0.5">{selectedPatient.policy_id || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-textSecondary">Annual Deductible</p>
                    <p className="font-bold text-textPrimary text-sm mt-0.5">{formatCurrency(selectedPatient.annual_deductible)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-textSecondary">Copay Amount</p>
                    <p className="font-bold text-textPrimary text-sm mt-0.5">{formatCurrency(selectedPatient.copay_amount)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-textSecondary">Policy Start</p>
                    <p className="font-bold text-textPrimary text-sm mt-0.5 flex items-center gap-1">
                      <Calendar size={12} className="text-textSecondary/60" />
                      {selectedPatient.policy_start_date || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-textSecondary">Policy End</p>
                    <p className="font-bold text-textPrimary text-sm mt-0.5 flex items-center gap-1">
                      <Calendar size={12} className="text-textSecondary/60" />
                      {selectedPatient.policy_end_date || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-textSecondary">Policy Active</p>
                    <p className="font-bold text-sm mt-0.5">
                      {(() => {
                        const end = selectedPatient.policy_end_date;
                        if (!end) return <span className="text-textSecondary">Unknown</span>;
                        const isActive = new Date(end) >= new Date();
                        return isActive
                          ? <span className="text-success flex items-center gap-1"><ShieldCheck size={12} /> Active</span>
                          : <span className="text-danger flex items-center gap-1"><AlertTriangle size={12} /> Expired</span>;
                      })()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Claims Statistics */}
              <div className="bg-bg rounded-xl p-4 border border-border/50">
                <h5 className="text-xs font-black uppercase text-textSecondary mb-3 flex items-center gap-2">
                  <DollarSign size={14} />
                  Claims Statistics
                </h5>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-textSecondary">Total Claims</p>
                    <p className="font-black text-textPrimary text-lg font-mono mt-0.5">
                      {selectedPatient.total_claims || selectedPatient.claim_count || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-textSecondary">Avg Claim Amount</p>
                    <p className="font-black text-textPrimary text-lg font-mono mt-0.5">
                      {formatCurrency(selectedPatient.avg_claim_amount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-textSecondary">Fraud Count</p>
                    <p className={`font-black text-lg font-mono mt-0.5 ${(selectedPatient.fraud_count || 0) > 0 ? 'text-danger' : 'text-success'}`}>
                      {selectedPatient.fraud_count || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-textSecondary">Fraud Rate</p>
                    <p className={`font-black text-lg font-mono mt-0.5 ${(selectedPatient.fraud_count || 0) > 0 ? 'text-danger' : 'text-success'}`}>
                      {(() => {
                        const claims = selectedPatient.total_claims || selectedPatient.claim_count || 0;
                        const frauds = selectedPatient.fraud_count || 0;
                        return claims > 0 ? formatPercent((frauds / claims) * 100) : '0.0%';
                      })()}
                    </p>
                  </div>
                </div>

                {/* Risk Score Trend Indicator */}
                <div className="mt-4 p-3 rounded-lg bg-surface border border-border/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase font-bold text-textSecondary">Risk Score Trend</span>
                    {(() => {
                      const riskScore = getPatientRiskScore(selectedPatient);
                      const risk = getRiskLevel(riskScore);
                      return (
                        <span className={`flex items-center gap-1 text-xs font-bold ${risk.color}`}>
                          {riskScore > 0.5 ? <TrendingUp size={14} /> : <ShieldCheck size={14} />}
                          {formatPercent(riskScore * 100)}
                        </span>
                      );
                    })()}
                  </div>
                  <div className="w-full h-2 bg-bg rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, getPatientRiskScore(selectedPatient) * 100)}%`,
                        background: getPatientRiskScore(selectedPatient) > 0.65
                          ? 'linear-gradient(90deg, #f97316, #ef4444)'
                          : getPatientRiskScore(selectedPatient) > 0.35
                            ? 'linear-gradient(90deg, #eab308, #f97316)'
                            : 'linear-gradient(90deg, #10b981, #06b6d4)'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Recent Claims Table */}
              <div className="bg-bg rounded-xl p-4 border border-border/50">
                <h5 className="text-xs font-black uppercase text-textSecondary mb-3 flex items-center gap-2">
                  <Activity size={14} />
                  Recent Claims
                </h5>
                {claimsLoading ? (
                  <Skeleton rows={5} />
                ) : patientClaims.length === 0 ? (
                  <p className="text-xs text-textSecondary py-4 text-center">No claims found for this patient.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="enterprise-table">
                      <thead>
                        <tr>
                          <th>Claim ID</th>
                          <th>Date</th>
                          <th>Provider</th>
                          <th>Diagnosis</th>
                          <th>Procedure</th>
                          <th>Amount</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {patientClaims.map((claim) => (
                          <tr key={claim.claim_id}>
                            <td className="font-mono text-xs font-bold text-textSecondary">#{claim.claim_id}</td>
                            <td className="text-xs text-textSecondary">{claim.claim_date}</td>
                            <td className="text-xs text-textPrimary font-semibold">{claim.provider_name}</td>
                            <td className="font-mono text-xs text-textSecondary">{claim.diagnosis_code}</td>
                            <td className="font-mono text-xs text-textSecondary">{claim.procedure_code}</td>
                            <td className="font-mono text-xs font-bold text-textPrimary">{formatCurrency(claim.claim_amount)}</td>
                            <td>
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border ${getStatusColor(claim.status)}`}>
                                {claim.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Medical History Summary */}
              <div className="bg-bg rounded-xl p-4 border border-border/50">
                <h5 className="text-xs font-black uppercase text-textSecondary mb-3 flex items-center gap-2">
                  <Heart size={14} />
                  Medical History Summary
                </h5>
                {patientClaims.length === 0 ? (
                  <p className="text-xs text-textSecondary py-4 text-center">No medical history data available.</p>
                ) : (
                  <div className="space-y-3">
                    {(() => {
                      const diagCounts = {};
                      patientClaims.forEach(c => {
                        if (c.diagnosis_code) {
                          diagCounts[c.diagnosis_code] = (diagCounts[c.diagnosis_code] || 0) + 1;
                        }
                      });
                      const sorted = Object.entries(diagCounts).sort((a, b) => b[1] - a[1]);
                      return sorted.map(([code, count]) => (
                        <div key={code} className="flex items-center justify-between p-2 rounded-lg bg-surface border border-border/50">
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded">{code}</span>
                            <span className="text-xs text-textSecondary">
                              {count} claim{count > 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="w-24 h-1.5 bg-bg rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${(count / patientClaims.length) * 100}%` }}
                            />
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </div>

              {/* Diagnosis Timeline Chart */}
              {patientClaims.length > 1 && (
                <div className="bg-bg rounded-xl p-4 border border-border/50">
                  <h5 className="text-xs font-black uppercase text-textSecondary mb-3 flex items-center gap-2">
                    <TrendingUp size={14} />
                    Diagnosis Timeline
                  </h5>
                  <div className="h-56 bg-surface rounded-xl p-2">
                    <PlotlyChart
                      data={diagnosisTimelineData}
                      layout={{
                        margin: { t: 10, r: 15, l: 50, b: 40 },
                        xaxis: { showgrid: false, title: 'Claim Date' },
                        yaxis: { gridcolor: 'rgba(226,232,240,0.5)', title: 'Amount ($)' },
                        showlegend: false,
                        hovermode: 'closest'
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
