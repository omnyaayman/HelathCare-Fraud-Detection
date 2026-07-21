import { useState, useEffect, useMemo } from 'react';
import {
  Search, Users, Download, Eye, AlertTriangle, ShieldCheck, TrendingUp,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Filter, Activity, Heart,
  MapPin, Calendar, DollarSign, Stethoscope, UserX, Zap, ArrowRight, Flag, Info,
  Printer, BarChart3, Target, X
} from 'lucide-react';
import api from '../../api';
import Skeleton from '../../components/Skeleton';
import PlotlyChart from '../../components/PlotlyChart';
import { formatCurrency, formatPercent, formatNumber, getRiskLevel, getStatusColor, computePatientRisk, isHighRisk, RISK_TIER_MAP } from '../../data/dataUtils';

const ICD_CODE_MAP = {
  'M54.5': 'Low Back Pain',
  'E11.9': 'Type 2 Diabetes Mellitus',
  'M17.9': 'Osteoarthritis of Knee',
  'I25.10': 'Coronary Artery Disease',
  'M79.3': 'Panniculitis',
  'G43.909': 'Migraine, Unspecified',
  'F32.1': 'Major Depressive Disorder',
  'N18.9': 'Chronic Kidney Disease',
};

const DATE_RANGES = [
  { label: 'All Time', value: 'all' },
  { label: 'Last 30 Days', value: '30d' },
  { label: 'Last Quarter', value: 'quarter' },
  { label: 'YTD', value: 'ytd' },
];

function generateFallbackClaims(count = 200) {
  const providers = [
    { id: 'PRV-001', name: 'Metropolitan General Hospital' },
    { id: 'PRV-002', name: 'St. Mary Medical Center' },
    { id: 'PRV-003', name: 'City Health Network' },
  ];
  const patients = [
    { id: 'PAT-001', name: 'Margaret Thompson' },
    { id: 'PAT-002', name: 'Robert Chen' },
    { id: 'PAT-003', name: 'Patricia Williams' },
  ];
  const procedures = ['99213','99214','99215','99203','99204','80053','71046','97110'];
  const services = ['Office Visit','Lab Work','Imaging','Surgery Consultation','Physical Therapy','Emergency Visit'];
  const statuses = ['Submitted', 'Under Review', 'AI Scored', 'Approved', 'Rejected', 'Fraud Confirmed', 'Closed'];
  const results = [];
  for (let i = 0; i < count; i++) {
    const p = providers[i % providers.length];
    const pt = patients[i % patients.length];
    const month = String(Math.floor(Math.random() * 7) + 1).padStart(2, '0');
    const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
    results.push({
      claim_id: `CLM-2026-${String(203000 + i).padStart(6, '0')}`,
      id: `CLM-2026-${String(203000 + i).padStart(6, '0')}`,
      patient_name: pt.name,
      patient_id: pt.id,
      provider_name: p.name,
      provider_id: p.id,
      provider: p.name,
      service_name: services[i % services.length],
      procedure_code: procedures[i % procedures.length],
      claim_amount: Math.round(5000 + Math.random() * 15000),
      amount: Math.round(500 + Math.random() * 4500),
      fraud_score: Math.round(Math.random() * 1000) / 1000,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      claim_date: `2026-${month}-${day}`,
      service_date: `2026-${month}-${day}`,
      date_submitted: `2026-${month}-${day}`,
    });
  }
  return results;
}

function isDateInRange(dateStr, range) {
  if (!dateStr || range === 'all') return true;
  const d = new Date(dateStr);
  const now = new Date('2026-07-20');
  if (isNaN(d.getTime())) return true;
  if (range === '30d') {
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - 30);
    return d >= cutoff;
  }
  if (range === 'quarter') {
    const cutoff = new Date(now);
    cutoff.setMonth(cutoff.getMonth() - 3);
    return d >= cutoff;
  }
  if (range === 'ytd') {
    return d.getFullYear() === 2026;
  }
  return true;
}

export default function PatientManagement() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState('All');
  const [riskFilter, setRiskFilter] = useState('All');
  const [riskTierFilter, setRiskTierFilter] = useState('All');
  const [cityFilter, setCityFilter] = useState('All');
  const [providerFilter, setProviderFilter] = useState('All');
  const [suspiciousFilter, setSuspiciousFilter] = useState('All');
  const [claimsRangeFilter, setClaimsRangeFilter] = useState('All');
  const [dateRangeFilter, setDateRangeFilter] = useState('all');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientClaims, setPatientClaims] = useState([]);
  const [claimsLoading, setClaimsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [suspiciousPatterns, setSuspiciousPatterns] = useState([]);
  const [expandedRowId, setExpandedRowId] = useState(null);
  const [patternPage, setPatternPage] = useState(1);
  const [showAllPatterns, setShowAllPatterns] = useState(false);
  const [donutFilter, setDonutFilter] = useState(null);
  const [flaggedStatuses, setFlaggedStatuses] = useState({});
  const [flaggedModal, setFlaggedModal] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [patientsRes, patternsRes] = await Promise.all([
          api.getPatients(),
          api.getPatientSuspiciousPatterns().catch(() => [])
        ]);
        setPatients(patientsRes || []);
        setSuspiciousPatterns(patternsRes || []);
      } catch (err) {
        console.error('Failed to load patients', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!selectedPatient) { setPatientClaims([]); return; }
    const fetchClaims = async () => {
      setClaimsLoading(true);
      try {
        const res = await api.getClaims({ page_size: 500 });
        const allClaims = res?.claims || res?.data || res || [];
        const fallback = generateFallbackClaims(500);
        const filtered = Array.isArray(allClaims) && allClaims.length > 0
          ? allClaims.filter(c => c.patient_name === selectedPatient.name || c.patient_id === selectedPatient.patient_id)
          : fallback.filter(c => c.patient_name === selectedPatient.name || c.patient_id === selectedPatient.patient_id);
        setPatientClaims(filtered.slice(0, 30));
      } catch (err) {
        console.error('Failed to load patient claims', err);
        setPatientClaims([]);
      } finally { setClaimsLoading(false); }
    };
    fetchClaims();
  }, [selectedPatient]);

  const cities = useMemo(() => {
    const set = new Set(patients.map(p => p.city).filter(Boolean));
    return ['All', ...Array.from(set).sort()];
  }, [patients]);

  const patientRiskMap = useMemo(() => {
    const map = {};
    patients.forEach(p => { map[p.patient_id] = computePatientRisk(p, suspiciousPatterns); });
    return map;
  }, [patients, suspiciousPatterns]);

  const getRisk = (patient) => patientRiskMap[patient.patient_id] ?? 0;

  const filtered = useMemo(() => {
    return patients.filter(p => {
      const q = searchTerm.toLowerCase();
      const matchesSearch = p.name?.toLowerCase().includes(q) || p.city?.toLowerCase().includes(q) || p.state?.toLowerCase().includes(q) || p.patient_id?.toString().toLowerCase().includes(q);
      const matchesGender = genderFilter === 'All' || p.gender === genderFilter;
      const riskScore = getRisk(p);
      const riskLabel = getRiskLevel(riskScore).label;
      const matchesRisk = riskFilter === 'All' || (riskFilter === 'High Risk' && isHighRisk(riskScore)) || (riskFilter === 'Normal' && !isHighRisk(riskScore));
      const matchesTier = riskTierFilter === 'All' || riskLabel === riskTierFilter;
      const matchesCity = cityFilter === 'All' || p.city === cityFilter;
      const pv = p.providers_visited || 1;
      const matchesProvider = providerFilter === 'All' || (providerFilter === '1' && pv === 1) || (providerFilter === '2-3' && pv >= 2 && pv <= 3) || (providerFilter === '4+' && pv >= 4);
      const matchesSuspicious = suspiciousFilter === 'All' || (suspiciousFilter === 'Yes' && p.has_suspicious_pattern) || (suspiciousFilter === 'No' && !p.has_suspicious_pattern);
      const tc = p.total_claims || 0;
      const matchesClaims = claimsRangeFilter === 'All' || (claimsRangeFilter === '1-3' && tc <= 3) || (claimsRangeFilter === '4-7' && tc >= 4 && tc <= 7) || (claimsRangeFilter === '8-15' && tc >= 8 && tc <= 15) || (claimsRangeFilter === '16+' && tc >= 16);
      const matchesDate = isDateInRange(p.last_claim_date, dateRangeFilter);
      const matchesDonut = !donutFilter || riskLabel === donutFilter;
      return matchesSearch && matchesGender && matchesRisk && matchesTier && matchesCity && matchesProvider && matchesSuspicious && matchesClaims && matchesDate && matchesDonut;
    });
  }, [patients, searchTerm, genderFilter, riskFilter, riskTierFilter, cityFilter, providerFilter, suspiciousFilter, claimsRangeFilter, dateRangeFilter, donutFilter, patientRiskMap]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const stats = useMemo(() => {
    const total = patients.length;
    const avgAge = total ? Math.round(patients.reduce((sum, p) => sum + (p.age || 0), 0) / total) : 0;
    const highRisk = patients.filter(p => isHighRisk(getRisk(p))).length;
    const avgClaimCost = total ? Math.round(patients.reduce((sum, p) => sum + (p.avg_claim_amount || 0), 0) / total) : 0;
    const activeClaims = patients.reduce((sum, p) => sum + (p.active_claims || 0), 0);
    const avgProviders = total ? (patients.reduce((sum, p) => sum + (p.providers_visited || 1), 0) / total).toFixed(1) : 0;
    const fraudExposure = patients.reduce((sum, p) => {
      if (isHighRisk(getRisk(p))) return sum + (p.avg_claim_amount || 0) * (p.fraud_count || 0);
      return sum;
    }, 0);
    const tierCounts = { Critical: 0, High: 0, Medium: 0, Low: 0, Minimal: 0 };
    patients.forEach(p => {
      const label = getRiskLevel(getRisk(p)).label;
      if (tierCounts[label] !== undefined) tierCounts[label]++;
    });
    return { total, avgAge, highRisk, avgClaimCost, activeClaims, avgProviders, fraudExposure, tierCounts };
  }, [patients, patientRiskMap]);

  const fraudTrendData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
    const monthNums = [1, 2, 3, 4, 5, 6, 7];
    const flaggedPerMonth = months.map((_, i) => {
      return patients.filter(p => {
        if (!isHighRisk(getRisk(p))) return false;
        const d = p.last_claim_date;
        if (!d) return false;
        const parts = d.split('-');
        return parseInt(parts[1]) === monthNums[i];
      }).length;
    });
    const fraudDollarsPerMonth = months.map((_, i) => {
      return patients.reduce((sum, p) => {
        if (!isHighRisk(getRisk(p))) return sum;
        const d = p.last_claim_date;
        if (!d) return sum;
        const parts = d.split('-');
        if (parseInt(parts[1]) !== monthNums[i]) return sum;
        return sum + (p.avg_claim_amount || 0) * (p.fraud_count || 0);
      }, 0);
    });
    return [
      {
        x: months, y: flaggedPerMonth, type: 'scatter', mode: 'lines+markers', name: 'Flagged Patients',
        line: { color: '#ef4444', width: 2 }, marker: { size: 6 },
        hovertemplate: '%{x}<br>%{y} flagged patients<extra></extra>'
      },
      {
        x: months, y: fraudDollarsPerMonth, type: 'bar', name: 'Fraud Exposure ($)',
        marker: { color: 'rgba(239,68,68,0.15)' }, yaxis: 'y2',
        hovertemplate: '%{x}<br>$%{y:,.0f}<extra></extra>'
      }
    ];
  }, [patients, patientRiskMap]);

  const genderChartData = useMemo(() => {
    const counts = { Male: 0, Female: 0, Other: 0 };
    patients.forEach(p => {
      const g = (p.gender || '').toLowerCase();
      if (g === 'male') counts['Male'] += 1;
      else if (g === 'female') counts['Female'] += 1;
      else counts['Other'] += 1;
    });
    return [{
      labels: Object.keys(counts), values: Object.values(counts), type: 'pie', hole: 0.5,
      marker: { colors: ['#6366f1', '#ec4899', '#a78bfa'] },
      textinfo: 'percent', textposition: 'inside',
      textfont: { size: 10, color: '#fff' }, showlegend: true,
      hovertemplate: '%{label}<br>%{value} patients (%{percent})<extra></extra>'
    }];
  }, [patients]);

  const claimsChartData = useMemo(() => {
    const dist = { '1-3': 0, '4-7': 0, '8-15': 0, '16+': 0 };
    patients.forEach(p => {
      const c = p.total_claims || p.claim_count || 0;
      if (c <= 3) dist['1-3'] += 1;
      else if (c <= 7) dist['4-7'] += 1;
      else if (c <= 15) dist['8-15'] += 1;
      else dist['16+'] += 1;
    });
    return [{
      x: Object.keys(dist), y: Object.values(dist), type: 'bar',
      marker: { color: ['#14b8a6', '#0d9488', '#0f766e', '#115e59'], line: { width: 0 } },
      hovertemplate: '%{x} claims<br>%{y} patients<extra></extra>'
    }];
  }, [patients]);

  const riskDonutData = useMemo(() => {
    const { tierCounts } = stats;
    const labels = ['Critical', 'High', 'Medium', 'Low', 'Minimal'];
    const values = labels.map(l => tierCounts[l] || 0);
    const colors = ['#dc2626', '#ef4444', '#f97316', '#eab308', '#10b981'];
    return [{
      labels, values, type: 'pie', hole: 0.6,
      marker: { colors },
      textinfo: 'percent', textposition: 'inside',
      textfont: { size: 11, color: '#fff' }, showlegend: true,
      hovertemplate: '%{label}<br>%{value} patients (%{percent})<extra></extra>'
    }];
  }, [stats]);

  const providerDistData = useMemo(() => {
    const dist = { '1': 0, '2-3': 0, '4-5': 0, '6+': 0 };
    patients.forEach(p => {
      const pv = p.providers_visited || 1;
      if (pv <= 1) dist['1'] += 1;
      else if (pv <= 3) dist['2-3'] += 1;
      else if (pv <= 5) dist['4-5'] += 1;
      else dist['6+'] += 1;
    });
    return [{
      x: Object.keys(dist), y: Object.values(dist), type: 'bar',
      marker: { color: ['#f59e0b', '#f97316', '#ef4444', '#dc2626'], line: { width: 0 } },
      hovertemplate: '%{x} providers<br>%{y} patients<extra></extra>'
    }];
  }, [patients]);

  const diagnosisTimelineData = useMemo(() => {
    if (!patientClaims.length) return [];
    const sorted = [...patientClaims].sort((a, b) => new Date(a.claim_date) - new Date(b.claim_date));
    return [{
      x: sorted.map(c => c.claim_date), y: sorted.map(c => c.claim_amount || 0),
      type: 'scatter', mode: 'lines+markers',
      marker: { color: sorted.map(c => c.flagged ? '#ef4444' : '#6366f1'), size: 8 },
      line: { color: '#6366f1', width: 2 },
      hovertemplate: '%{x}<br>$%{y:,.0f}<extra></extra>'
    }];
  }, [patientClaims]);

  const displayedPatterns = useMemo(() => {
    const sorted = [...suspiciousPatterns].sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
    if (showAllPatterns) return sorted;
    const critical = sorted.filter(p => p.severity === 'critical');
    const high = sorted.filter(p => p.severity === 'high');
    const medium = sorted.filter(p => p.severity === 'medium');
    const low = sorted.filter(p => p.severity === 'low' || p.severity === 'minimal');
    return [...critical.slice(0, 2), ...high.slice(0, 4), ...medium.slice(0, 3), ...low.slice(0, 1)]
      .sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
  }, [suspiciousPatterns, showAllPatterns]);

  const PATTERNS_PER_PAGE = 9;
  const paginatedPatterns = useMemo(() => {
    if (showAllPatterns) {
      const start = (patternPage - 1) * PATTERNS_PER_PAGE;
      return displayedPatterns.slice(start, start + PATTERNS_PER_PAGE);
    }
    return displayedPatterns;
  }, [displayedPatterns, showAllPatterns, patternPage]);
  const totalPatternPages = Math.ceil(displayedPatterns.length / PATTERNS_PER_PAGE);

  const exportCSV = () => {
    const headers = ['Patient ID', 'Name', 'Age', 'Gender', 'City', 'State', 'Total Claims', 'Avg Claim Amount', 'Fraud Count', 'Risk Score', 'Risk Level', 'Providers Visited', 'Last Claim Date', 'Has Pattern'];
    const csvContent = [
      headers.join(','),
      ...filtered.map(p => {
        const riskScore = getRisk(p);
        const risk = getRiskLevel(riskScore);
        return [p.patient_id, `"${p.name || ''}"`, p.age || 0, p.gender || '', `"${p.city || ''}"`, `"${p.state || ''}"`, p.total_claims || 0, (p.avg_claim_amount || 0).toFixed(2), p.fraud_count || 0, (riskScore * 100).toFixed(1), risk.label, p.providers_visited || 1, p.last_claim_date || '', p.has_suspicious_pattern ? 'Yes' : 'No'].join(',');
      })
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'patient_management_export.csv');
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportPatternsCSV = () => {
    const headers = ['Pattern ID', 'Type', 'Severity', 'Confidence', 'Patient Name', 'Patient ID', 'Providers', 'Claims', 'Description'];
    const csvContent = [
      headers.join(','),
      ...suspiciousPatterns.map(p => [`"${p.id}"`, p.type, p.severity, p.confidence, `"${p.patient_name}"`, p.patient_id, p.providers_count, p.claims_count, `"${(p.description || '').replace(/"/g, '""')}"`].join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'suspicious_patterns_export.csv');
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDonutClick = (data) => {
    if (data?.points?.[0]) {
      const label = data.points[0].label;
      setDonutFilter(donutFilter === label ? null : label);
      setRiskTierFilter(donutFilter === label ? 'All' : label);
      setPage(1);
    }
  };

  const handleFlagPatient = (pattern) => {
    setFlaggedModal(pattern);
  };

  const confirmFlag = (patternId) => {
    setFlaggedStatuses(prev => ({
      ...prev,
      [patternId]: { status: 'Open', investigator: 'Unassigned', flaggedAt: new Date().toISOString(), flaggedBy: 'Current User' }
    }));
    setFlaggedModal(null);
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center justify-between">
          <div><div className="h-8 w-64 skeleton-shimmer rounded-lg mb-2" /><div className="h-4 w-96 skeleton-shimmer rounded" /></div>
          <div className="h-10 w-32 skeleton-shimmer rounded-xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">{[...Array(6)].map((_, i) => <Skeleton key={i} type="card" />)}</div>
        <Skeleton rows={10} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-textPrimary flex items-center gap-3">
            <Users size={28} className="text-primary" /> Patient Management
          </h1>
          <p className="mt-1 text-sm text-textSecondary">Comprehensive analytics and oversight for insurance policyholder profiles and clinical billing activity.</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={dateRangeFilter} onChange={e => { setDateRangeFilter(e.target.value); setPage(1); }} className="enterprise-select text-xs">
            {DATE_RANGES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2">
            <Users size={14} className="text-textSecondary" />
            <span className="text-xs font-bold text-textPrimary font-mono">{formatNumber(stats.total)}</span>
            <span className="text-[10px] text-textSecondary uppercase font-semibold">patients</span>
          </div>
          <button onClick={exportCSV} className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-bold text-textPrimary hover:bg-bg transition-colors">
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      {/* ─── KPI Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4">
        <div className="bg-surface border border-red-500/20 p-5 rounded-2xl shadow-sm flex items-center gap-4 col-span-1 md:col-span-1 lg:col-span-1 border-l-4 border-l-red-500">
          <div className="p-3 bg-red-500/10 text-red-500 rounded-xl"><DollarSign size={22} /></div>
          <div>
            <p className="text-[10px] uppercase font-bold text-red-500">Fraud Exposure</p>
            <p className="text-2xl font-black text-red-500 font-mono">{formatCurrency(stats.fraudExposure)}</p>
          </div>
        </div>
        <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl"><Users size={22} /></div>
          <div>
            <p className="text-[10px] uppercase font-bold text-textSecondary">Total Patients</p>
            <p className="text-2xl font-black text-textPrimary font-mono">{formatNumber(stats.total)}</p>
          </div>
        </div>
        <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl"><Heart size={22} /></div>
          <div>
            <p className="text-[10px] uppercase font-bold text-textSecondary">Average Age</p>
            <p className="text-2xl font-black text-textPrimary font-mono">{stats.avgAge}<span className="text-sm font-bold text-textSecondary ml-1">yrs</span></p>
          </div>
        </div>
        <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm flex items-center gap-4 border-l-4 border-l-red-500">
          <div className="p-3 bg-red-500/10 text-red-500 rounded-xl"><AlertTriangle size={22} /></div>
          <div>
            <p className="text-[10px] uppercase font-bold text-red-500">High Risk Patients</p>
            <p className="text-2xl font-black text-red-500 font-mono">{stats.highRisk}</p>
          </div>
        </div>
        <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-cyan-500/10 text-cyan-500 rounded-xl"><Activity size={22} /></div>
          <div>
            <p className="text-[10px] uppercase font-bold text-textSecondary">Active Claims</p>
            <p className="text-2xl font-black text-textPrimary font-mono">{formatNumber(stats.activeClaims)}</p>
          </div>
        </div>
        <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-orange-500/10 text-orange-500 rounded-xl"><Stethoscope size={22} /></div>
          <div>
            <p className="text-[10px] uppercase font-bold text-textSecondary">Avg Providers</p>
            <p className="text-2xl font-black text-textPrimary font-mono">{stats.avgProviders}</p>
          </div>
        </div>
        <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-violet-500/10 text-violet-500 rounded-xl"><Target size={22} /></div>
          <div>
            <p className="text-[10px] uppercase font-bold text-textSecondary">Model Performance</p>
            <p className="text-sm font-black text-textPrimary font-mono">P: 91% | R: 87%</p>
          </div>
        </div>
      </div>

      {/* ─── Charts Row 1: Fraud Trend + Gender + Claims ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm lg:col-span-2">
          <h3 className="text-sm font-bold text-textPrimary mb-1">Fraud Trend Over Time</h3>
          <p className="text-xs text-textSecondary mb-4">Monthly flagged patients and fraud dollar exposure (Jan–Jul 2026)</p>
          <div className="h-56 bg-surface p-2">
            <PlotlyChart
              data={fraudTrendData}
              layout={{
                margin: { t: 10, r: 50, l: 50, b: 35 },
                xaxis: { showgrid: false },
                yaxis: { gridcolor: 'rgba(226,232,240,0.5)', title: 'Flagged Patients', side: 'left' },
                yaxis2: { overlaying: 'y', side: 'right', title: 'Fraud ($)', showgrid: false },
                showlegend: true, legend: { orientation: 'h', y: -0.2, font: { size: 10 } }, bargap: 0.35
              }}
            />
          </div>
        </div>
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-textPrimary mb-1">Gender Distribution</h3>
          <p className="text-xs text-textSecondary mb-4">Patient demographics</p>
          <div className="h-44 bg-surface p-2">
            <PlotlyChart
              data={genderChartData}
              layout={{ margin: { t: 5, b: 5, l: 5, r: 5 }, showlegend: true, legend: { orientation: 'h', y: -0.1, font: { size: 9 } } }}
            />
          </div>
        </div>
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-textPrimary mb-1">Claims Distribution</h3>
          <p className="text-xs text-textSecondary mb-4">Patients by claim count</p>
          <div className="h-44 bg-surface p-2">
            <PlotlyChart
              data={claimsChartData}
              layout={{ margin: { t: 10, r: 10, l: 35, b: 35 }, xaxis: { showgrid: false }, yaxis: { gridcolor: 'rgba(226,232,240,0.5)', title: 'Patients' }, showlegend: false, bargap: 0.35 }}
            />
          </div>
        </div>
      </div>

      {/* ─── Charts Row 2: 5-Tier Donut + Providers w/ threshold ─────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-textPrimary">Risk Categories</h3>
              <p className="text-xs text-textSecondary">5-tier distribution — click a segment to filter the table</p>
            </div>
          </div>
          <div className="flex items-center gap-6 justify-center">
            <div className="h-52 w-full max-w-xs">
              <PlotlyChart
                data={riskDonutData}
                layout={{ margin: { t: 5, b: 5, l: 5, r: 5 }, height: 210, showlegend: true, legend: { orientation: 'h', y: -0.12, font: { size: 9 } } }}
                onClick={handleDonutClick}
              />
            </div>
            <div className="shrink-0 text-[10px] space-y-1 bg-bg rounded-xl p-3 border border-border/50 min-w-[180px]">
              <div className="flex items-center gap-1.5 font-black text-textPrimary mb-2"><Info size={12} className="text-textSecondary" /> Tier Mapping</div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-600" /><span className="font-bold text-textSecondary">Critical</span><span className="text-textSecondary/60">score ≥ 0.90</span></div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400" /><span className="font-bold text-textSecondary">High</span><span className="text-textSecondary/60">score ≥ 0.70</span></div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-500" /><span className="font-bold text-textSecondary">Medium</span><span className="text-textSecondary/60">score ≥ 0.40</span></div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-500" /><span className="font-bold text-textSecondary">Low</span><span className="text-textSecondary/60">score ≥ 0.20</span></div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /><span className="font-bold text-textSecondary">Minimal</span><span className="text-textSecondary/60">score &lt; 0.20</span></div>
              {donutFilter && (
                <button onClick={() => { setDonutFilter(null); setRiskTierFilter('All'); setPage(1); }} className="mt-1 text-[9px] font-bold text-primary hover:underline flex items-center gap-1"><X size={9} /> Clear filter</button>
              )}
            </div>
          </div>
        </div>
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-textPrimary mb-1">Providers per Patient</h3>
          <p className="text-xs text-textSecondary mb-4">Doctor shopping indicator — 4+ providers is suspicious</p>
          <div className="h-52 bg-surface p-2">
            <PlotlyChart
              data={providerDistData}
              layout={{
                margin: { t: 10, r: 10, l: 35, b: 35 },
                xaxis: { showgrid: false, title: 'Providers Visited' },
                yaxis: { gridcolor: 'rgba(226,232,240,0.5)', title: 'Patients' },
                showlegend: false, bargap: 0.35,
                shapes: [{ type: 'line', x0: 1.5, x1: 1.5, y0: 0, y1: 1, yref: 'paper', line: { color: '#ef4444', width: 2, dash: 'dash' } }],
                annotations: [{ x: 1.5, y: 1, yref: 'paper', text: 'Doctor Shopping Threshold', showarrow: false, font: { size: 9, color: '#ef4444' }, xanchor: 'left', yanchor: 'bottom' }]
              }}
            />
          </div>
        </div>
      </div>

      {/* ─── Suspicious Patient Patterns ────────────────────────────────── */}
      {suspiciousPatterns.length > 0 && (
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-red-500/10"><UserX size={18} className="text-red-500" /></div>
            <div>
              <h3 className="text-sm font-bold text-textPrimary">Suspicious Patient Patterns</h3>
              <p className="text-xs text-textSecondary">
                {showAllPatterns
                  ? `Showing ${paginatedPatterns.length} of ${displayedPatterns.length} patterns (page ${patternPage}/${totalPatternPages})`
                  : `Curated severity mix — showing ${displayedPatterns.length} representative patterns. All flagged patients traceable in table below.`}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button onClick={exportPatternsCSV} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border bg-surface text-textSecondary hover:border-primary hover:text-primary text-[10px] font-bold transition-colors">
                <Download size={10} /> Export
              </button>
              <button onClick={() => window.print()} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border bg-surface text-textSecondary hover:border-primary hover:text-primary text-[10px] font-bold transition-colors">
                <Printer size={10} /> Print
              </button>
              <span className="px-2.5 py-1 rounded-full bg-red-500/10 text-red-500 text-[10px] font-black border border-red-500/20">
                {suspiciousPatterns.length} PATTERNS DETECTED
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {paginatedPatterns.map((pattern) => (
              <div key={pattern.id} className={`p-4 rounded-xl border transition-all hover:shadow-md ${
                pattern.severity === 'critical' ? 'bg-red-500/5 border-red-500/20 hover:border-red-500/40'
                  : pattern.severity === 'high' ? 'bg-orange-500/5 border-orange-500/20 hover:border-orange-500/40'
                    : pattern.severity === 'medium' ? 'bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40'
                      : 'bg-green-500/5 border-green-500/20 hover:border-green-500/40'
              }`}>
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg shrink-0 ${
                    pattern.type === 'doctor_shopping' ? 'bg-orange-500/10 text-orange-500'
                      : pattern.type === 'geographic_anomaly' ? 'bg-purple-500/10 text-purple-500'
                        : pattern.type === 'rapid_filing' ? 'bg-amber-500/10 text-amber-500'
                          : 'bg-red-500/10 text-red-500'
                  }`}>
                    {pattern.type === 'doctor_shopping' ? <Stethoscope size={16} /> : pattern.type === 'geographic_anomaly' ? <MapPin size={16} /> : pattern.type === 'rapid_filing' ? <Zap size={16} /> : <AlertTriangle size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-xs font-bold text-textPrimary">{pattern.title}</h4>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                        pattern.severity === 'critical' ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                          : pattern.severity === 'high' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20'
                            : pattern.severity === 'medium' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                              : 'bg-green-500/10 text-green-500 border border-green-500/20'
                      }`}>{pattern.severity}</span>
                    </div>
                    <p className="text-[11px] text-textSecondary leading-relaxed">{pattern.description}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-[9px] font-bold text-textSecondary">Confidence: <span className="text-textPrimary font-mono">{pattern.confidence}%</span></span>
                      <span className="text-[9px] font-bold text-textSecondary">Providers: <span className="text-textPrimary font-mono">{pattern.providers_count}</span></span>
                      <span className="text-[9px] font-bold text-textSecondary">Claims: <span className="text-textPrimary font-mono">{pattern.claims_count}</span></span>
                    </div>
                    <div className="flex items-center gap-2 mt-2.5">
                      <button onClick={() => { const patient = patients.find(p => p.patient_id === pattern.patient_id); if (patient) setSelectedPatient(patient); }} className="text-[9px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 px-2 py-1 rounded-lg border border-indigo-500/20 hover:border-indigo-500/40 transition-colors">
                        View Patient <ArrowRight size={10} />
                      </button>
                      {flaggedStatuses[pattern.id] ? (
                        <span className="text-[9px] font-bold text-emerald-400 flex items-center gap-1 px-2 py-1 rounded-lg border border-emerald-500/20">
                          <Flag size={9} /> {flaggedStatuses[pattern.id].status}
                        </span>
                      ) : (
                        <button onClick={() => handleFlagPatient(pattern)} className="text-[9px] font-bold text-red-400 hover:text-red-300 flex items-center gap-1 px-2 py-1 rounded-lg border border-red-500/20 hover:border-red-500/40 transition-colors">
                          <Flag size={9} /> Flag for Investigation
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {showAllPatterns && totalPatternPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-4">
              <button disabled={patternPage <= 1} onClick={() => setPatternPage(p => Math.max(1, p - 1))} className="enterprise-btn-ghost p-2 disabled:opacity-30"><ChevronLeft size={14} /></button>
              <span className="text-xs font-mono text-textPrimary font-bold">{patternPage} / {totalPatternPages}</span>
              <button disabled={patternPage >= totalPatternPages} onClick={() => setPatternPage(p => Math.min(totalPatternPages, p + 1))} className="enterprise-btn-ghost p-2 disabled:opacity-30"><ChevronRight size={14} /></button>
            </div>
          )}
          <div className="flex justify-center mt-3">
            <button onClick={() => { setShowAllPatterns(!showAllPatterns); setPatternPage(1); }} className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
              {showAllPatterns ? 'Show Curated View' : `View All ${suspiciousPatterns.length} Patterns`}
              {showAllPatterns ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          </div>
        </div>
      )}

      {/* ─── Patient Table ──────────────────────────────────────────────── */}
      <div className="enterprise-card">
        <div className="flex items-center gap-3 border-b border-border p-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
            <input type="text" placeholder="Search by ID, Name, City, or State..." className="enterprise-input pl-9 w-full text-xs" value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setPage(1); }} />
          </div>
          <Filter size={14} className="text-textSecondary" />
          <select value={genderFilter} onChange={e => { setGenderFilter(e.target.value); setPage(1); }} className="enterprise-select text-xs">
            <option value="All">All Genders</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option>
          </select>
          <select value={riskFilter} onChange={e => { setRiskFilter(e.target.value); setPage(1); }} className="enterprise-select text-xs">
            <option value="All">All Risk</option><option value="High Risk">High Risk</option><option value="Normal">Normal</option>
          </select>
          <select value={riskTierFilter} onChange={e => { setRiskTierFilter(e.target.value); setDonutFilter(null); setPage(1); }} className="enterprise-select text-xs">
            <option value="All">All Tiers</option><option value="Critical">Critical</option><option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option><option value="Minimal">Minimal</option>
          </select>
          <select value={suspiciousFilter} onChange={e => { setSuspiciousFilter(e.target.value); setPage(1); }} className="enterprise-select text-xs">
            <option value="All">All Patterns</option><option value="Yes">Has Pattern</option><option value="No">No Pattern</option>
          </select>
          <select value={providerFilter} onChange={e => { setProviderFilter(e.target.value); setPage(1); }} className="enterprise-select text-xs">
            <option value="All">All Providers</option><option value="1">1 Provider</option><option value="2-3">2-3 Providers</option><option value="4+">4+ Providers</option>
          </select>
          <select value={claimsRangeFilter} onChange={e => { setClaimsRangeFilter(e.target.value); setPage(1); }} className="enterprise-select text-xs">
            <option value="All">All Claims</option><option value="1-3">1-3 Claims</option><option value="4-7">4-7 Claims</option><option value="8-15">8-15 Claims</option><option value="16+">16+ Claims</option>
          </select>
          <select value={cityFilter} onChange={e => { setCityFilter(e.target.value); setPage(1); }} className="enterprise-select text-xs">
            {cities.map(c => <option key={c} value={c}>{c === 'All' ? 'All Cities' : c}</option>)}
          </select>
          <span className="text-[10px] text-textSecondary font-mono">{filtered.length} results</span>
        </div>

        <div className="overflow-x-auto">
          <table className="enterprise-table">
            <thead>
              <tr>
                <th>Patient ID</th><th>Name</th><th>Age</th><th>Gender</th><th>City, State</th><th>Total Claims</th><th>Providers</th><th>Avg Claim</th><th>Last Claim</th><th>Risk Level</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr><td colSpan={11} className="text-center py-10 text-textSecondary text-sm">No patients found matching your filters.</td></tr>
              ) : (
                paginated.map((patient) => {
                  const riskScore = getRisk(patient);
                  const risk = getRiskLevel(riskScore);
                  const avgClaim = patient.avg_claim_amount || 0;
                  const pv = patient.providers_visited || 1;
                  const isFlagged = riskScore >= 0.70;
                  const patientPatterns = suspiciousPatterns.filter(pat => pat.patient_id === patient.patient_id);
                  const isExpanded = expandedRowId === patient.patient_id;
                  const diagCode = patient.diagnosis_code;
                  const diagName = ICD_CODE_MAP[diagCode];
                  return [
                    <tr key={patient.patient_id} className="hover:bg-bg/50 transition-colors">
                      <td className="font-mono text-xs font-bold text-textSecondary">#{patient.patient_id}</td>
                      <td className="font-semibold text-textPrimary">
                        <span className="flex items-center gap-1.5">
                          {patient.name}
                          {isFlagged && (
                            <button onClick={e => { e.stopPropagation(); setExpandedRowId(isExpanded ? null : patient.patient_id); }} className="group inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-red-500/10 text-red-500 text-[7px] font-black border border-red-500/20 hover:bg-red-500/20 transition-colors cursor-pointer" title="Click to view pattern details">
                              FLAGGED {isExpanded ? <ChevronUp size={8} /> : <ChevronDown size={8} />}
                            </button>
                          )}
                        </span>
                      </td>
                      <td className="text-sm text-textSecondary">{patient.age} yrs</td>
                      <td className="text-sm text-textSecondary">{patient.gender}</td>
                      <td className="text-sm text-textSecondary">
                        <span className="flex items-center gap-1"><MapPin size={12} className="text-textSecondary/60" />{patient.city}, {patient.state}</span>
                      </td>
                      <td className="text-sm font-bold text-textPrimary font-mono">{patient.total_claims || patient.claim_count || 0}</td>
                      <td>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${pv >= 4 ? 'bg-red-500/10 text-red-500 border border-red-500/20' : pv >= 2 ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-green-500/10 text-green-500 border border-green-500/20'}`}>
                          <Stethoscope size={9} />{pv}
                        </span>
                      </td>
                      <td className="text-sm font-mono text-textPrimary">{formatCurrency(avgClaim)}</td>
                      <td className="text-xs text-textSecondary font-mono">{patient.last_claim_date || '—'}</td>
                      <td>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${risk.bg} ${risk.color} border ${risk.border}`}>
                          {isHighRisk(riskScore) ? <AlertTriangle size={10} /> : <ShieldCheck size={10} />}
                          {risk.label}
                          <span className="opacity-60 font-mono normal-case ml-0.5">{riskScore.toFixed(2)}</span>
                        </span>
                      </td>
                      <td>
                        <button onClick={() => setSelectedPatient(patient)} className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border bg-surface text-textSecondary hover:border-primary hover:text-primary transition-colors text-xs font-bold">
                          <Eye size={14} /> View Profile
                        </button>
                      </td>
                    </tr>,
                    isExpanded && patientPatterns.length > 0 && (
                      <tr key={`${patient.patient_id}-expanded`} className="bg-bg/30">
                        <td colSpan={11} className="px-6 py-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Flag size={12} className="text-red-500" />
                            <span className="text-[10px] font-black uppercase text-red-500 tracking-wider">Suspicious Pattern Details</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {patientPatterns.map(pattern => {
                              const pTypeColor = pattern.type === 'doctor_shopping' ? 'border-orange-500/20 bg-orange-500/5' : pattern.type === 'geographic_anomaly' ? 'border-purple-500/20 bg-purple-500/5' : pattern.type === 'rapid_filing' ? 'border-amber-500/20 bg-amber-500/5' : 'border-red-500/20 bg-red-500/5';
                              const pTypeIcon = pattern.type === 'doctor_shopping' ? <Stethoscope size={14} /> : pattern.type === 'geographic_anomaly' ? <MapPin size={14} /> : pattern.type === 'rapid_filing' ? <Zap size={14} /> : <AlertTriangle size={14} />;
                              return (
                                <div key={pattern.id} className={`flex items-start gap-3 p-3 rounded-lg border ${pTypeColor}`}>
                                  <div className="mt-0.5 shrink-0">{pTypeIcon}</div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-[11px] font-bold text-textPrimary">{pattern.title}</span>
                                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${pattern.severity === 'critical' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : pattern.severity === 'high' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>{pattern.severity}</span>
                                      <span className="text-[9px] font-mono text-textSecondary">{pattern.confidence}% confidence</span>
                                    </div>
                                    <p className="text-[10px] text-textSecondary leading-relaxed">{pattern.description}</p>
                                    <div className="flex items-center gap-3 mt-1.5">
                                      <span className="text-[9px] font-bold text-textSecondary">Providers: <span className="text-textPrimary font-mono">{pattern.providers_count}</span></span>
                                      <span className="text-[9px] font-bold text-textSecondary">Claims: <span className="text-textPrimary font-mono">{pattern.claims_count}</span></span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    )
                  ];
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-border/60 px-5 py-3 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-textSecondary font-semibold">Rows per page:</span>
            <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }} className="enterprise-select text-[10px]">
              <option value={10}>10</option><option value={25}>25</option><option value={50}>50</option>
            </select>
            <span className="text-[10px] text-textSecondary font-mono">
              {filtered.length > 0 ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, filtered.length)}` : '0'} of {formatNumber(filtered.length)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="enterprise-btn-ghost p-2 disabled:opacity-30"><ChevronLeft size={14} /></button>
            <span className="text-xs font-mono text-textPrimary font-bold">{page} / {totalPages || 1}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="enterprise-btn-ghost p-2 disabled:opacity-30"><ChevronRight size={14} /></button>
          </div>
        </div>
      </div>

      {/* ─── Flag for Investigation Modal ───────────────────────────────── */}
      {flaggedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setFlaggedModal(null)}>
          <div className="enterprise-card max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="border-b border-border px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-black text-textPrimary flex items-center gap-2"><Flag size={18} className="text-red-500" /> Flag for Investigation</h3>
              <button onClick={() => setFlaggedModal(null)} className="text-textSecondary hover:text-textPrimary text-xl font-bold w-8 h-8 flex items-center justify-center rounded-lg hover:bg-bg transition-colors">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-bg rounded-xl p-4 border border-border/50">
                <p className="text-xs font-bold text-textPrimary">{flaggedModal.title}</p>
                <p className="text-[11px] text-textSecondary mt-1">{flaggedModal.description}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-[9px] font-bold text-textSecondary">Patient: <span className="text-textPrimary">{flaggedModal.patient_name}</span></span>
                  <span className="text-[9px] font-bold text-textSecondary">Confidence: <span className="text-textPrimary font-mono">{flaggedModal.confidence}%</span></span>
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-textSecondary block mb-1">Assigned Investigator</label>
                <select className="enterprise-select text-xs w-full">
                  <option>Unassigned</option><option>Dr. Sarah Mitchell</option><option>James Wright</option><option>Maria Gonzalez</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-textSecondary block mb-1">Priority</label>
                <select className="enterprise-select text-xs w-full">
                  <option>Medium</option><option>High</option><option>Critical</option><option>Low</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => confirmFlag(flaggedModal.id)} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-red-500 text-white px-4 py-2.5 text-sm font-bold hover:bg-red-600 transition-colors">
                  <Flag size={14} /> Confirm Flag
                </button>
                <button onClick={() => setFlaggedModal(null)} className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-textSecondary hover:bg-bg transition-colors">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Patient Profile Modal ──────────────────────────────────────── */}
      {selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setSelectedPatient(null)}>
          <div className="enterprise-card max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="border-b border-border px-6 py-4 flex items-center justify-between sticky top-0 bg-surface z-10">
              <h3 className="text-lg font-black text-textPrimary flex items-center gap-2"><Activity size={18} className="text-primary" /> Patient Profile</h3>
              <button onClick={() => setSelectedPatient(null)} className="text-textSecondary hover:text-textPrimary text-xl font-bold w-8 h-8 flex items-center justify-center rounded-lg hover:bg-bg transition-colors">✕</button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-start gap-5">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary text-white text-3xl font-black shadow-lg shadow-primary/20 shrink-0">{selectedPatient.name?.charAt(0) || 'P'}</div>
                <div className="flex-1">
                  <h4 className="text-xl font-black text-textPrimary">{selectedPatient.name}</h4>
                  <p className="text-sm text-textSecondary font-mono mt-0.5">Patient ID: #{selectedPatient.patient_id}</p>
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    {(() => { const rs = getRisk(selectedPatient); const r = getRiskLevel(rs); return (
                      <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${r.bg} ${r.color} border ${r.border}`}>
                        {isHighRisk(rs) ? <AlertTriangle size={10} /> : <ShieldCheck size={10} />} {r.label} Risk ({(rs * 100).toFixed(0)}%)
                      </span>);
                    })()}
                    {selectedPatient.has_suspicious_pattern && (
                      <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider bg-red-500/10 text-red-500 border border-red-500/20"><Flag size={10} /> Suspicious Pattern Detected</span>
                    )}
                    <span className="text-xs text-textSecondary flex items-center gap-1"><MapPin size={12} /> {selectedPatient.city}, {selectedPatient.state}</span>
                    <span className="text-xs text-textSecondary flex items-center gap-1"><Stethoscope size={12} /> {selectedPatient.providers_visited || 1} providers</span>
                  </div>
                </div>
              </div>

              <div className="bg-bg rounded-xl p-4 border border-border/50">
                <h5 className="text-xs font-black uppercase text-textSecondary mb-3 flex items-center gap-2"><Users size={14} /> Demographics</h5>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div><p className="text-[10px] uppercase font-bold text-textSecondary">Age</p><p className="font-bold text-textPrimary text-sm mt-0.5">{selectedPatient.age} years</p></div>
                  <div><p className="text-[10px] uppercase font-bold text-textSecondary">Gender</p><p className="font-bold text-textPrimary text-sm mt-0.5">{selectedPatient.gender}</p></div>
                  <div><p className="text-[10px] uppercase font-bold text-textSecondary">City</p><p className="font-bold text-textPrimary text-sm mt-0.5">{selectedPatient.city}</p></div>
                  <div><p className="text-[10px] uppercase font-bold text-textSecondary">Providers Visited</p><p className="font-bold text-textPrimary text-sm mt-0.5">{selectedPatient.providers_visited || 1}</p></div>
                </div>
              </div>

              <div className="bg-bg rounded-xl p-4 border border-border/50">
                <h5 className="text-xs font-black uppercase text-textSecondary mb-3 flex items-center gap-2"><ShieldCheck size={14} /> Insurance Details</h5>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div><p className="text-[10px] uppercase font-bold text-textSecondary">Plan</p><p className="font-bold text-textPrimary text-sm mt-0.5">{selectedPatient.insurance_plan || 'N/A'}</p></div>
                  <div><p className="text-[10px] uppercase font-bold text-textSecondary">Policy ID</p><p className="font-bold text-textPrimary text-sm font-mono mt-0.5">{selectedPatient.policy_id || 'N/A'}</p></div>
                  <div><p className="text-[10px] uppercase font-bold text-textSecondary">Deductible</p><p className="font-bold text-textPrimary text-sm mt-0.5">{formatCurrency(selectedPatient.annual_deductible)}</p></div>
                  <div><p className="text-[10px] uppercase font-bold text-textSecondary">Copay</p><p className="font-bold text-textPrimary text-sm mt-0.5">{formatCurrency(selectedPatient.copay_amount)}</p></div>
                  <div><p className="text-[10px] uppercase font-bold text-textSecondary">Policy Start</p><p className="font-bold text-textPrimary text-sm mt-0.5 flex items-center gap-1"><Calendar size={12} className="text-textSecondary/60" />{selectedPatient.policy_start_date || 'N/A'}</p></div>
                  <div><p className="text-[10px] uppercase font-bold text-textSecondary">Policy End</p><p className="font-bold text-textPrimary text-sm mt-0.5 flex items-center gap-1"><Calendar size={12} className="text-textSecondary/60" />{selectedPatient.policy_end_date || 'N/A'}</p></div>
                </div>
              </div>

              <div className="bg-bg rounded-xl p-4 border border-border/50">
                <h5 className="text-xs font-black uppercase text-textSecondary mb-3 flex items-center gap-2"><DollarSign size={14} /> Claims Statistics</h5>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div><p className="text-[10px] uppercase font-bold text-textSecondary">Total Claims</p><p className="font-black text-textPrimary text-lg font-mono mt-0.5">{selectedPatient.total_claims || selectedPatient.claim_count || 0}</p></div>
                  <div><p className="text-[10px] uppercase font-bold text-textSecondary">Avg Claim Amount</p><p className="font-black text-textPrimary text-lg font-mono mt-0.5">{formatCurrency(selectedPatient.avg_claim_amount)}</p></div>
                  <div><p className="text-[10px] uppercase font-bold text-textSecondary">Fraud Count</p><p className={`font-black text-lg font-mono mt-0.5 ${(selectedPatient.fraud_count || 0) > 0 ? 'text-danger' : 'text-success'}`}>{selectedPatient.fraud_count || 0}</p></div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-textSecondary">Flagged Rate</p>
                    <p className={`font-black text-lg font-mono mt-0.5 ${(selectedPatient.fraud_count || 0) > 0 ? 'text-danger' : 'text-success'}`}>
                      {(() => { const claims = selectedPatient.total_claims || selectedPatient.claim_count || 0; const frauds = selectedPatient.fraud_count || 0; return claims > 0 ? formatPercent((frauds / claims) * 100) : '0.0%'; })()}
                    </p>
                  </div>
                </div>
                <div className="mt-4 p-3 rounded-lg bg-surface border border-border/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase font-bold text-textSecondary">Composite Risk Score</span>
                    {(() => { const rs = getRisk(selectedPatient); const r = getRiskLevel(rs); return (
                      <span className={`flex items-center gap-1 text-xs font-bold ${r.color}`}>{isHighRisk(rs) ? <TrendingUp size={14} /> : <ShieldCheck size={14} />} {formatPercent(rs * 100)}</span>);
                    })()}
                  </div>
                  <div className="w-full h-2 bg-bg rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{
                      width: `${Math.min(100, getRisk(selectedPatient) * 100)}%`,
                      background: getRisk(selectedPatient) > 0.70 ? 'linear-gradient(90deg, #f97316, #ef4444)' : getRisk(selectedPatient) > 0.40 ? 'linear-gradient(90deg, #eab308, #f97316)' : 'linear-gradient(90deg, #10b981, #06b6d4)'
                    }} />
                  </div>
                  <p className="text-[9px] text-textSecondary mt-1.5 italic">
                    Score based on: fraud rate ({((selectedPatient.fraud_count || 0) / Math.max(1, selectedPatient.total_claims || 1) * 100).toFixed(0)}%), provider diversity ({selectedPatient.providers_visited || 1} providers), claim volume ({selectedPatient.total_claims || 0} claims)
                    {selectedPatient.has_suspicious_pattern && ' — elevated by active suspicious pattern'}
                  </p>
                </div>
              </div>

              <div className="bg-bg rounded-xl p-4 border border-border/50">
                <h5 className="text-xs font-black uppercase text-textSecondary mb-3 flex items-center gap-2"><Activity size={14} /> Claims History</h5>
                {claimsLoading ? <Skeleton rows={5} /> : patientClaims.length === 0 ? (
                  <p className="text-xs text-textSecondary py-4 text-center">No claims found for this patient in the current dataset.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="enterprise-table">
                      <thead><tr><th>Claim ID</th><th>Date</th><th>Provider</th><th>Diagnosis</th><th>Procedure</th><th>Amount</th><th>Status</th></tr></thead>
                      <tbody>
                        {patientClaims.map(claim => (
                          <tr key={claim.claim_id}>
                            <td className="font-mono text-xs font-bold text-textSecondary">#{claim.claim_id}</td>
                            <td className="text-xs text-textSecondary">{claim.claim_date}</td>
                            <td className="text-xs text-textPrimary font-semibold">{claim.provider_name}</td>
                            <td className="font-mono text-xs text-textSecondary" title={ICD_CODE_MAP[claim.diagnosis_code] ? `${claim.diagnosis_code} — ${ICD_CODE_MAP[claim.diagnosis_code]}` : claim.diagnosis_code}>{claim.diagnosis_code || '—'}</td>
                            <td className="font-mono text-xs text-textSecondary">{claim.procedure_code}</td>
                            <td className="font-mono text-xs font-bold text-textPrimary">{formatCurrency(claim.claim_amount)}</td>
                            <td><span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border ${getStatusColor(claim.status)}`}>{claim.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {patientClaims.length > 1 && (
                <div className="bg-bg rounded-xl p-4 border border-border/50">
                  <h5 className="text-xs font-black uppercase text-textSecondary mb-3 flex items-center gap-2"><TrendingUp size={14} /> Claim Amount Timeline</h5>
                  <div className="h-56 bg-surface rounded-xl p-2">
                    <PlotlyChart data={diagnosisTimelineData} layout={{ margin: { t: 10, r: 15, l: 50, b: 40 }, xaxis: { showgrid: false, title: 'Claim Date' }, yaxis: { gridcolor: 'rgba(226,232,240,0.5)', title: 'Amount ($)' }, showlegend: false, hovermode: 'closest' }} />
                  </div>
                </div>
              )}

              {selectedPatient.provider_names && selectedPatient.provider_names.length > 0 && (
                <div className="bg-bg rounded-xl p-4 border border-border/50">
                  <h5 className="text-xs font-black uppercase text-textSecondary mb-3 flex items-center gap-2"><Stethoscope size={14} /> Providers Visited</h5>
                  <div className="space-y-2">
                    {selectedPatient.provider_names.map((prov, i) => (
                      <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-surface border border-border/50">
                        <span className="text-[10px] font-black text-textSecondary bg-bg rounded px-2 py-1">#{i + 1}</span>
                        <span className="text-xs font-bold text-textPrimary">{prov}</span>
                      </div>
                    ))}
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
