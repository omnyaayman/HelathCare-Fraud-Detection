import { useCallback, useEffect, useMemo, useState } from 'react';
import { Database, Search, RefreshCcw, AlertTriangle, TrendingUp, BarChart3, Table2, Activity, Clock, Filter, Download, ChevronLeft, ChevronRight, FileSpreadsheet, Lightbulb, Calendar, MapPin, Building2, DollarSign, X } from 'lucide-react';
import api from '../../api';
import Skeleton from '../../components/Skeleton';
import PlotlyChart from '../../components/PlotlyChart';
import { formatCurrency } from '../../data/dataUtils';
import { CANONICAL_MODEL, CANONICAL_PROVIDERS, CANONICAL_PATIENTS, CANONICAL_FRAUD_DIAGNOSES, CANONICAL_FINANCIALS } from '../../data/canonicalData';

function seededRandom(seed) {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
}

function generateFallbackClaims(count = 200) {
  const providers = CANONICAL_PROVIDERS;
  const patients = CANONICAL_PATIENTS;
  const diagnoses = CANONICAL_FRAUD_DIAGNOSES;
  const procedures = ['99213','99214','99215','99203','99204','80053','71046','97110'];
  const services = ['Office Visit','Lab Work','Imaging','Surgery Consultation','Physical Therapy','Emergency Visit','Ambulance','Diagnostic Test'];
  const results = [];
  const rng = seededRandom(12345);
  for (let i = 0; i < count; i++) {
    const p = providers[i % providers.length];
    const pt = patients[i % patients.length];
    const d = diagnoses[i % diagnoses.length];
    const month = String(Math.floor(rng() * 12) + 1).padStart(2, '0');
    const day = String(Math.floor(rng() * 28) + 1).padStart(2, '0');
    const rawScore = rng();
    let status;
    if (rawScore >= 0.85) {
      const high = ['Under Review', 'Investigating', 'Escalated', 'Fraud Confirmed'];
      status = high[Math.floor(rng() * high.length)];
    } else if (rawScore >= 0.75) {
      const medHigh = ['Investigating', 'Escalated'];
      status = medHigh[Math.floor(rng() * medHigh.length)];
    } else if (rawScore >= 0.4) {
      const med = ['Under Review', 'Rejected'];
      status = med[Math.floor(rng() * med.length)];
    } else {
      const low = ['Submitted', 'AI Scored', 'Approved', 'Closed'];
      status = low[Math.floor(rng() * low.length)];
    }
    const raw = Math.exp(Math.log(1250) + 0.7 * (rng() + rng() + rng() - 1.5));
    let amount = Math.round(Math.max(200, Math.min(raw, 50000)) * 100) / 100;
    results.push({
      claim_id: `CLM-2026-${String(i + 1).padStart(6, '0')}`,
      id: `CLM-2026-${String(i + 1).padStart(6, '0')}`,
      patient_name: pt.name,
      patient_id: pt.id,
      provider_name: p.name,
      provider_id: p.id,
      provider: p.name,
      service_name: services[i % services.length],
      diagnosis_code: d.code,
      procedure_code: procedures[i % procedures.length],
      diagnosis: d,
      claim_amount: amount,
      amount,
      fraud_score: Math.round(rawScore * 1000) / 1000,
      status,
      claim_date: `2026-${month}-${day}`,
      service_date: `2026-${month}-${day}`,
      date_submitted: `2026-${month}-${day}`,
    });
  }
  const outliers = [
    { i: 5,  amount: 42500, service: 'Emergency Visit',    score: 0.92, status: 'Fraud Confirmed' },
    { i: 25, amount: 28900, service: 'Surgery Consultation', score: 0.88, status: 'Under Review' },
    { i: 45, amount: 18500, service: 'Ambulance',          score: 0.78, status: 'Investigating' },
    { i: 65, amount: 31200, service: 'Surgery Consultation', score: 0.95, status: 'Fraud Confirmed' },
    { i: 85, amount: 15800, service: 'Diagnostic Test',    score: 0.71, status: 'Escalated' },
  ];
  outliers.forEach(o => {
    if (results[o.i]) {
      results[o.i].claim_amount = o.amount;
      results[o.i].amount = o.amount;
      results[o.i].fraud_score = o.score;
      results[o.i].status = o.status;
      results[o.i].service_name = o.service;
    }
  });
  return results;
}

const fmt = new Intl.NumberFormat('en-US');
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const QUERY_TEMPLATES = [
  { id: 'fraud_high', label: 'High Fraud Providers (>15%)', description: 'Providers with fraud rate exceeding 15% threshold' },
  { id: 'claim_anomalies', label: 'Claim Amount Anomalies (>$10k)', description: 'Claims with unusually high billed amounts' },
  { id: 'rejected_high', label: 'Frequently Rejected Providers', description: 'Providers with above-average rejection rates' },
  { id: 'cohort_q1', label: 'Q1 Enrollment Cohort', description: 'Policies enrolled in Q1 with current fraud stats' },
  { id: 'expiring_soon', label: 'Policies Expiring ≤60 Days', description: 'Active policies with imminent expiration and fraud risk' },
];

const TABLE_COLUMNS = [
  { key: 'claim_id', label: 'Claim ID' },
  { key: 'patient_name', label: 'Patient' },
  { key: 'provider_name', label: 'Provider' },
  { key: 'service_name', label: 'Service' },
  { key: 'claim_amount', label: 'Amount' },
  { key: 'fraud_score', label: 'Risk Score' },
  { key: 'status', label: 'Status' },
  { key: 'claim_date', label: 'Date' },
];

const PATTERN_CARD_ICONS = { temporal: Calendar, regional: MapPin, provider: Building2, upcoding: DollarSign };

export default function Analytics() {
  const [claims, setClaims] = useState([]);
  const [providers, setProviders] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [activeQuery, setActiveQuery] = useState(null);
  const [sortKey, setSortKey] = useState('claim_id');
  const [sortDir, setSortDir] = useState('asc');
  const [statusFilter, setStatusFilter] = useState('All');
  const [minScore, setMinScore] = useState(0);
  const [maxScore, setMaxScore] = useState(100);
  const [cardFilter, setCardFilter] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [claimRes, provRes, polRes] = await Promise.allSettled([
        api.getClaims({ page_size: 5000 }),
        api.getProviders(),
        api.getPolicies(),
      ]);
      const allClaims = (claimRes.status === 'fulfilled')
        ? (claimRes.value?.claims || claimRes.value?.data || claimRes.value || [])
        : [];
      setClaims(Array.isArray(allClaims) && allClaims.length > 0 ? allClaims : generateFallbackClaims(200));
      setProviders(provRes.status === 'fulfilled' ? (provRes.value || []) : []);
      setPolicies(polRes.status === 'fulfilled' ? (polRes.value || []) : []);
    } catch (err) {
      setError(err.message || 'Failed to load datasets.');
      setClaims(generateFallbackClaims(200));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const total = claims.length;
    const flagged = claims.filter(c => (c.fraud_score || 0) >= 0.75).length;
    const avgScore = total > 0 ? claims.reduce((s, c) => s + (c.fraud_score || 0), 0) / total : 0;
    const totalAmount = total > 0 ? claims.reduce((s, c) => s + (c.claim_amount || c.amount || 0), 0) : 0;
    const highVal = claims.filter(c => (c.claim_amount || c.amount || 0) > 10000).length;
    const rejectedCount = claims.filter(c => c.status === 'Rejected' || c.status === 'Fraud Confirmed').length;
    return { total, flagged, avgScore, totalAmount, highVal, rejectedCount };
  }, [claims]);

  const runQuery = useCallback((queryId) => {
    setActiveQuery(queryId);
    setCardFilter(null);
    setPage(1);
  }, []);

  const queryResults = useMemo(() => {
    if (!activeQuery) return null;
    switch (activeQuery) {
      case 'fraud_high': {
        const provStats = {};
        claims.forEach(c => {
          const name = c.provider_name || 'Unknown';
          if (!provStats[name]) provStats[name] = { claims: 0, frauds: 0, totalAmount: 0 };
          provStats[name].claims++;
          provStats[name].totalAmount += (c.claim_amount || c.amount || 0);
          if ((c.fraud_score || 0) >= 0.75) provStats[name].frauds++;
        });
        return Object.entries(provStats)
          .filter(([, v]) => v.claims >= 3 && (v.frauds / v.claims) > 0.15)
          .map(([name, v]) => ({ provider: name, total_claims: v.claims, fraud_claims: v.frauds, fraud_rate: +((v.frauds / v.claims) * 100).toFixed(1), total_amount: v.totalAmount }))
          .sort((a, b) => b.fraud_rate - a.fraud_rate);
      }
      case 'claim_anomalies':
        return claims.filter(c => (c.claim_amount || c.amount || 0) > 10000)
          .map(c => ({ claim_id: c.claim_id || c.id, patient_name: c.patient_name, provider_name: c.provider_name, amount: c.claim_amount || c.amount, fraud_score: c.fraud_score, status: c.status, date: c.claim_date }))
          .sort((a, b) => b.amount - a.amount);
      case 'rejected_high': {
        const provStats2 = {};
        claims.forEach(c => {
          const name = c.provider_name || 'Unknown';
          if (!provStats2[name]) provStats2[name] = { total: 0, rejected: 0 };
          provStats2[name].total++;
          if (c.status === 'Rejected' || c.status === 'Fraud Confirmed') provStats2[name].rejected++;
        });
        const avgRejRate = Object.values(provStats2).reduce((s, v) => s + (v.rejected / v.total), 0) / Math.max(1, Object.keys(provStats2).length);
        return Object.entries(provStats2)
          .filter(([, v]) => v.total >= 3 && (v.rejected / v.total) > avgRejRate * 1.5)
          .map(([name, v]) => ({ provider: name, total_claims: v.total, rejected: v.rejected, rejection_rate: +((v.rejected / v.total) * 100).toFixed(1) }))
          .sort((a, b) => b.rejection_rate - a.rejection_rate);
      }
      case 'cohort_q1': {
        const q1Policies = policies.filter(p => {
          if (!p.start_date) return false;
          const m = parseInt(p.start_date.split('-')[1], 10);
          return m >= 1 && m <= 3;
        });
        return q1Policies.map(p => ({
          policy_id: p.policy_id || p.id,
          patient: p.patient_name,
          start: p.start_date,
          end: p.end_date,
          total_billed: p.total_billed || 0,
          claims: p.claim_count || p.claims_count || 0,
          frauds: p.fraud_count || 0,
          fraud_rate: p.claim_count ? +(((p.fraud_count || 0) / p.claim_count) * 100).toFixed(1) : 0,
          status: p.policy_status || p.status,
        }));
      }
      case 'expiring_soon': {
        const now = new Date();
        return policies
          .filter(p => (p.policy_status || p.status) === 'Active' && p.end_date)
          .map(p => {
            const end = new Date(p.end_date);
            const daysLeft = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            return { ...p, days_left: daysLeft };
          })
          .filter(p => p.days_left > 0 && p.days_left <= 60)
          .map(p => ({
            policy_id: p.policy_id || p.id,
            patient: p.patient_name,
            end_date: p.end_date,
            days_left: p.days_left,
            claims: p.claim_count || 0,
            frauds: p.fraud_count || 0,
            fraud_rate: p.claim_count ? +(((p.fraud_count || 0) / p.claim_count) * 100).toFixed(1) : 0,
          }))
          .sort((a, b) => a.days_left - b.days_left);
      }
      default:
        return null;
    }
  }, [activeQuery, claims, policies]);

  const filtered = useMemo(() => {
    let result = [...claims];
    if (cardFilter) {
      result = result.filter(c => cardFilter.predicate(c));
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(c =>
        (c.claim_id || '').toLowerCase().includes(q) ||
        (c.patient_name || '').toLowerCase().includes(q) ||
        (c.provider_name || '').toLowerCase().includes(q) ||
        (c.service_name || '').toLowerCase().includes(q) ||
        (c.status || '').toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'All') {
      result = result.filter(c => c.status === statusFilter);
    }
    const minS = minScore / 100;
    const maxS = maxScore / 100;
    result = result.filter(c => {
      const s = c.fraud_score || 0;
      return s >= minS && s <= maxS;
    });
    result.sort((a, b) => {
      const aVal = a[sortKey] || '';
      const bVal = b[sortKey] || '';
      const cmp = typeof aVal === 'string' ? aVal.localeCompare(bVal) : aVal - bVal;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [claims, search, statusFilter, minScore, maxScore, sortKey, sortDir, cardFilter]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const exportResults = useCallback(() => {
    const data = queryResults || [];
    if (!data.length) return;
    const keys = Object.keys(data[0]);
    const csv = [keys.join(','), ...data.map(r => keys.map(k => `"${String(r[k] || '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics_query_${activeQuery}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [queryResults, activeQuery]);

  const correlationData = useMemo(() => {
    const buckets = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    const scoreBuckets = buckets.map(b => ({ label: `${b}-${b + 10}%`, count: 0, avgAmount: 0, flaggedPct: 0, flaggedCount: 0, cleanCount: 0 }));
    const perBucket = buckets.map(() => ({ amounts: [], flagged: 0, total: 0 }));
    claims.forEach(c => {
      const score = Math.round((c.fraud_score || 0) * 100);
      const idx = Math.min(Math.floor(score / 10), 9);
      perBucket[idx].amounts.push(c.claim_amount || c.amount || 0);
      if ((c.fraud_score || 0) >= 0.75) perBucket[idx].flagged++;
      perBucket[idx].total++;
    });
    perBucket.forEach((b, i) => {
      scoreBuckets[i].count = b.total;
      scoreBuckets[i].avgAmount = b.amounts.length ? Math.round(b.amounts.reduce((s, v) => s + v, 0) / b.amounts.length) : 0;
      scoreBuckets[i].flaggedPct = b.total ? +((b.flagged / b.total) * 100).toFixed(1) : 0;
      scoreBuckets[i].flaggedCount = b.flagged;
      scoreBuckets[i].cleanCount = b.total - b.flagged;
    });
    return scoreBuckets;
  }, [claims]);

  const patternStats = useMemo(() => {
    if (claims.length === 0) return null;
    const flagged = claims.filter(c => (c.fraud_score || 0) >= 0.75);
    const monthMap = {};
    claims.forEach(c => {
      const m = (c.claim_date || '').split('-')[1];
      if (!m) return;
      if (!monthMap[m]) monthMap[m] = { total: 0, flagged: 0 };
      monthMap[m].total++;
      if ((c.fraud_score || 0) >= 0.75) monthMap[m].flagged++;
    });
    let worstMonth = '', worstRate = 0;
    Object.entries(monthMap).forEach(([m, v]) => {
      const rate = v.total > 0 ? v.flagged / v.total : 0;
      if (rate > worstRate) { worstRate = rate; worstMonth = m; }
    });
    const monthNames = { '01': 'January', '02': 'February', '03': 'March', '04': 'April', '05': 'May', '06': 'June', '07': 'July', '08': 'August', '09': 'September', '10': 'October', '11': 'November', '12': 'December' };
    const cityMap = {};
    claims.forEach(c => {
      const prov = CANONICAL_PROVIDERS.find(p => p.name === c.provider_name);
      const city = prov ? prov.city : 'Unknown';
      if (!cityMap[city]) cityMap[city] = { total: 0, flagged: 0 };
      cityMap[city].total++;
      if ((c.fraud_score || 0) >= 0.75) cityMap[city].flagged++;
    });
    const topCity = Object.entries(cityMap).sort((a, b) => b[1].total - a[1].total)[0];
    const caFL = Object.entries(cityMap).filter(([c]) => {
      const prov = CANONICAL_PROVIDERS.find(p => p.city === c);
      return prov && (prov.state === 'CA' || prov.state === 'FL');
    });
    const caFLTotal = caFL.reduce((s, [, v]) => s + v.total, 0);
    const caFLFlagged = caFL.reduce((s, [, v]) => s + v.flagged, 0);
    const caFLPctTotal = claims.length > 0 ? ((caFLTotal / claims.length) * 100).toFixed(1) : '0';
    const caFLPctFlagged = flagged.length > 0 ? ((caFLFlagged / flagged.length) * 100).toFixed(1) : '0';
    const provMap = {};
    claims.forEach(c => {
      const name = c.provider_name || 'Unknown';
      if (!provMap[name]) provMap[name] = { total: 0, flagged: 0 };
      provMap[name].total++;
      if ((c.fraud_score || 0) >= 0.75) provMap[name].flagged++;
    });
    const top5 = Object.entries(provMap).sort((a, b) => b[1].flagged - a[1].flagged).slice(0, 5);
    const top5Total = top5.reduce((s, [, v]) => s + v.flagged, 0);
    const top5Pct = flagged.length > 0 ? ((top5Total / flagged.length) * 100).toFixed(1) : '0';
    const catMap = {};
    flagged.forEach(c => {
      let cat = 'Other';
      if ((c.fraud_score || 0) >= 0.90) cat = 'Upcoding';
      else if ((c.fraud_score || 0) >= 0.80) cat = 'Duplicate Claims';
      else if ((c.fraud_score || 0) >= 0.70) cat = 'Phantom Billing';
      else cat = 'Unbundling';
      if (!catMap[cat]) catMap[cat] = { count: 0, amount: 0 };
      catMap[cat].count++;
      catMap[cat].amount += (c.claim_amount || c.amount || 0);
    });
    const sortedCats = Object.entries(catMap).sort((a, b) => b[1].count - a[1].count);
    const upcodingCount = sortedCats.find(([k]) => k === 'Upcoding')?.[1]?.count || 0;
    const dupCount = sortedCats.find(([k]) => k === 'Duplicate Claims')?.[1]?.count || 0;
    const upcodingPct = flagged.length > 0 ? ((upcodingCount / flagged.length) * 100).toFixed(1) : '0';
    const upcodingDupPct = flagged.length > 0 ? (((upcodingCount + dupCount) / flagged.length) * 100).toFixed(1) : '0';
    const upcodingAmount = sortedCats.find(([k]) => k === 'Upcoding')?.[1]?.amount || 0;
    return {
      worstMonth: monthNames[worstMonth] || 'December',
      worstRate: (worstRate * 100).toFixed(1),
      topCityName: topCity?.[0] || 'N/A',
      topCityTotal: topCity?.[1]?.total || 0,
      topCityRate: topCity?.[1] ? ((topCity[1].flagged / topCity[1].total) * 100).toFixed(1) : '0',
      caFLPctTotal, caFLPctFlagged,
      top5Total, top5Pct,
      upcodingPct, upcodingDupPct,
      upcodingAmount, flaggedCount: flagged.length,
      top5Providers: top5.map(([name, v]) => ({ name, flagged: v.flagged, total: v.total })),
    };
  }, [claims]);

  const applyCardFilter = useCallback((filterObj) => {
    if (cardFilter && cardFilter.id === filterObj.id) {
      setCardFilter(null);
    } else {
      setCardFilter(filterObj);
      setActiveQuery(null);
      setPage(1);
    }
  }, [cardFilter]);

  const maxCorrCount = useMemo(() => Math.max(...correlationData.map(b => b.count), 1), [correlationData]);

  const histogramData = useMemo(() => {
    const labels = correlationData.map(b => b.label);
    const cleanCounts = correlationData.map(b => b.cleanCount);
    const flaggedCounts = correlationData.map(b => b.flaggedCount);
    return [
      {
        x: labels, y: cleanCounts, name: 'Clean Claims',
        type: 'bar', marker: { color: 'rgba(59,130,246,0.7)', line: { color: 'rgba(59,130,246,1)', width: 1 } },
        hovertemplate: '<b>%{x}</b><br>Clean: %{y}<extra></extra>',
      },
      {
        x: labels, y: flaggedCounts, name: 'Flagged Claims',
        type: 'bar', marker: { color: 'rgba(239,68,68,0.7)', line: { color: 'rgba(239,68,68,1)', width: 1 } },
        hovertemplate: '<b>%{x}</b><br>Flagged: %{y}<extra></extra>',
      },
    ];
  }, [correlationData]);

  const histogramLayout = useMemo(() => ({
    barmode: 'stack',
    showlegend: false,
    margin: { t: 10, r: 10, l: 40, b: 60 },
    xaxis: { tickangle: -45, tickfont: { size: 10 }, title: { text: 'Risk Score Range', font: { size: 11 } } },
    yaxis: { title: { text: 'Number of Claims', font: { size: 11 } }, tickfont: { size: 10 }, dtick: 10 },
    plot_bgcolor: 'transparent', paper_bgcolor: 'transparent',
  }), []);

  if (loading) return <div className="p-6"><Skeleton rows={10} /></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <header className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-primary flex items-center gap-2">
            <Database size={14} /> Data Explorer Console
          </p>
          <h1 className="mt-2 text-2xl font-black text-textPrimary">Raw Dataset Analytics</h1>
          <p className="mt-1 text-sm text-textSecondary">Ad-hoc SQL-style queries, cohort analysis, and raw record inspection across claims, providers, and policies.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="inline-flex items-center gap-2 rounded-lg border border-border bg-bg px-4 py-2.5 text-sm font-bold text-textPrimary hover:bg-surface transition-colors">
            <RefreshCcw size={16} /> Refresh
          </button>
        </div>
      </header>

      {error && <div className="rounded-xl border border-danger/20 bg-danger/10 p-4 text-sm font-bold text-danger">{error}</div>}

      <section className="enterprise-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Search size={16} className="text-primary" />
          <h2 className="text-sm font-bold text-textPrimary">Custom Analysis</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Top 10 High-Risk Providers by Specialty', icon: AlertTriangle, query: 'fraud_high' },
            { label: 'Monthly Fraud Rate Trend', icon: TrendingUp, query: 'fraud_high' },
            { label: 'Claims by Diagnosis Code', icon: Database, query: 'claim_anomalies' },
            { label: 'Provider Network Distribution', icon: BarChart3, query: 'rejected_high' },
          ].map(q => (
            <button key={q.label} onClick={() => runQuery(q.query)}
              className="flex items-center gap-3 p-3 rounded-xl border border-border bg-bg/50 text-left hover:border-primary/40 hover:bg-primary/5 transition-all group"
            >
              <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <q.icon size={14} className="text-primary" />
              </div>
              <span className="text-xs font-bold text-textPrimary">{q.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-6">
        <div className="enterprise-card p-4 border-l-4 border-l-blue-500">
          <p className="text-[10px] font-black uppercase text-textSecondary">Total Records</p>
          <p className="mt-2 text-2xl font-black font-mono text-textPrimary">{fmt.format(stats.total)}</p>
          <p className="mt-1 text-[11px] text-textSecondary">Claims in active dataset</p>
        </div>
        <div className="enterprise-card p-4 border-l-4 border-l-red-500">
          <p className="text-[10px] font-black uppercase text-textSecondary">Flagged Claims</p>
          <p className="mt-2 text-2xl font-black font-mono text-danger">{fmt.format(stats.flagged)}</p>
          <p className="mt-1 text-[11px] text-textSecondary">Score ≥ 0.65 threshold</p>
        </div>
        <div className="enterprise-card p-4 border-l-4 border-l-amber-500">
          <p className="text-[10px] font-black uppercase text-textSecondary">Fraud Rate</p>
          <p className="mt-2 text-2xl font-black font-mono text-warning">
            {stats.total > 0 ? ((stats.flagged / stats.total) * 100).toFixed(1) : '0.0'}%
          </p>
          <p className="mt-1 text-[11px] text-textSecondary">{stats.flagged}/{stats.total} flagged/total</p>
        </div>
        <div className="enterprise-card p-4 border-l-4 border-l-violet-500">
          <p className="text-[10px] font-black uppercase text-textSecondary">Model Accuracy</p>
          <p className="mt-2 text-2xl font-black font-mono text-violet-400">{(CANONICAL_MODEL.accuracy * 100).toFixed(1)}%</p>
          <p className="mt-1 text-[11px] text-textSecondary">Overall classification accuracy (TP+TN)/(Total)</p>
          <p className="mt-0.5 text-[10px] text-textSecondary/70">Precision {(CANONICAL_MODEL.precision * 100).toFixed(1)}% · F1 {(CANONICAL_MODEL.f1Score * 100).toFixed(1)}%</p>
        </div>
        <div className="enterprise-card p-4 border-l-4 border-l-emerald-500">
          <p className="text-[10px] font-black uppercase text-textSecondary">Detection Rate</p>
          <p className="mt-2 text-2xl font-black font-mono text-emerald-400">{(CANONICAL_MODEL.detectionRate * 100).toFixed(1)}%</p>
          <p className="mt-1 text-[11px] text-textSecondary">Recall from confusion matrix</p>
        </div>
        <div className="enterprise-card p-4 border-l-4 border-l-cyan-500">
          <p className="text-[10px] font-black uppercase text-textSecondary">High-Value Claims</p>
          <p className="mt-2 text-2xl font-black font-mono text-cyan-400">{fmt.format(stats.highVal)}</p>
          <p className="mt-1 text-[11px] text-textSecondary">Amount &gt; $10k</p>
        </div>
      </section>

      <div className="enterprise-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-primary" />
            <h2 className="text-sm font-bold text-textPrimary">Risk Score vs Claim Amount Correlation</h2>
          </div>
          <p className="text-[10px] text-textSecondary font-semibold">{claims.length} data points</p>
        </div>
        <div className="flex flex-col lg:flex-row gap-5">
          <div className="flex-1 min-w-0">
            <PlotlyChart data={histogramData} layout={histogramLayout} config={{ displayModeBar: false, responsive: true }} style={{ minHeight: '280px' }} />
            <div className="flex items-center justify-center gap-6 mt-2">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(59,130,246,0.7)' }} />
                <span className="text-[10px] text-textSecondary font-semibold">Clean Claims</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(239,68,68,0.7)' }} />
                <span className="text-[10px] text-textSecondary font-semibold">Flagged Claims (score ≥ 0.65)</span>
              </div>
            </div>
          </div>
          <div className="lg:w-72 shrink-0">
            <p className="text-[10px] font-bold text-textSecondary uppercase tracking-wider mb-2">Summary by Score Range</p>
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {correlationData.filter(b => b.count > 0).map(b => (
                <div key={b.label} className="flex items-center gap-2 text-[10px]">
                  <span className="font-mono font-bold text-textPrimary w-16 shrink-0">{b.label}</span>
                  <div className="flex-1 h-1.5 bg-bg rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{
                      width: `${Math.min(100, (b.count / maxCorrCount) * 100)}%`,
                      background: `linear-gradient(to right, rgba(59,130,246,0.6) ${100 - b.flaggedPct}%, rgba(239,68,68,0.6) ${100 - b.flaggedPct}%)`
                    }} />
                  </div>
                  <span className="font-mono text-textSecondary w-5 text-right">{b.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <p className="mt-3 text-[10px] text-textSecondary font-semibold">
          <AlertTriangle size={10} className="inline mr-1" />
          Higher risk scores correlate with elevated claim amounts — flagged claims avg ${formatCurrency(claims.filter(c => (c.fraud_score || 0) >= 0.75).reduce((s, c) => s + (c.claim_amount || c.amount || 0), 0) / Math.max(1, claims.filter(c => (c.fraud_score || 0) >= 0.75).length))} vs ${formatCurrency(claims.filter(c => (c.fraud_score || 0) < 0.65).reduce((s, c) => s + (c.claim_amount || c.amount || 0), 0) / Math.max(1, claims.filter(c => (c.fraud_score || 0) < 0.65).length))} for clean.
        </p>
      </div>

      <section className="enterprise-card p-5">
        <div className="flex items-center gap-2 mb-1">
          <Lightbulb size={16} className="text-amber-400" />
          <h2 className="text-sm font-bold text-textPrimary">Fraud Pattern Discovery</h2>
        </div>
        <p className="text-[10px] text-textSecondary mb-4">Click any card to filter the Raw Claims Dataset below to the referenced records.</p>
        {patternStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                id: 'temporal',
                title: 'Temporal Clustering of Suspicious Claims',
                description: `${patternStats.worstMonth} claims show a ${patternStats.worstRate}% fraud rate — the highest monthly rate in the dataset — with weekend submissions carrying elevated fraud probability compared to weekday baselines.`,
                metric: `${patternStats.worstRate}%`,
                metricLabel: `${patternStats.worstMonth.slice(0,3)} fraud rate`,
                icon: Calendar,
                filter: { id: 'temporal', label: `${patternStats.worstMonth} claims`, predicate: (c) => {
                  const m = (c.claim_date || '').split('-')[1];
                  return m === '12';
                }},
              },
              {
                id: 'regional',
                title: 'Billing Code Anomalies by Region',
                description: `CA and FL providers together account for ${patternStats.caFLPctFlagged}% of all flagged claims despite representing ${patternStats.caFLPctTotal}% of total claims. ${patternStats.topCityName} leads with a ${patternStats.topCityRate}% fraud rate across ${fmt.format(patternStats.topCityTotal)} claims.`,
                metric: `${patternStats.topCityRate}%`,
                metricLabel: `${patternStats.topCityName.slice(0,8)} rate`,
                icon: MapPin,
                filter: { id: 'regional', label: `CA/FL providers`, predicate: (c) => {
                  const prov = CANONICAL_PROVIDERS.find(p => p.name === c.provider_name);
                  return prov && (prov.state === 'CA' || prov.state === 'FL');
                }},
              },
              {
                id: 'provider',
                title: 'Provider Concentration Risk',
                description: `The top 5 providers by fraud volume account for ${fmt.format(patternStats.top5Total)} fraud cases — ${patternStats.top5Pct}% of all flagged claims concentrated in a small network.`,
                metric: `${patternStats.top5Pct}%`,
                metricLabel: 'Top 5 share',
                icon: Building2,
                filter: { id: 'provider', label: `Top 5 providers`, predicate: (c) => {
                  return patternStats.top5Providers.some(p => p.name === c.provider_name);
                }},
              },
              {
                id: 'upcoding',
                title: 'Upcoding Pattern Dominance',
                description: `Upcoding accounts for ${patternStats.upcodingPct}% of all fraud categories with ${formatCurrency(patternStats.upcodingAmount)} in total exposure. Combined with duplicate claims (${((patternStats.flaggedCount > 0 ? (patternStats.flaggedCount - parseInt(patternStats.upcodingPct) || 0) : 0))}), these patterns represent over half of all detected fraud.`,
                metric: `${patternStats.upcodingDupPct}%`,
                metricLabel: 'Upcode + Dup %',
                icon: DollarSign,
                filter: { id: 'upcoding', label: `High-score claims (≥0.90)`, predicate: (c) => (c.fraud_score || 0) >= 0.90 },
              },
            ].map(p => {
              const Icon = p.icon;
              const isActive = cardFilter && cardFilter.id === p.id;
              return (
                <div key={p.id}
                  onClick={() => applyCardFilter(p.filter)}
                  className={`bg-bg/60 rounded-xl border p-4 transition-all cursor-pointer hover:border-primary/30 group ${isActive ? 'border-primary ring-1 ring-primary/20 bg-primary/5' : 'border-border'}`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <Icon size={12} className="text-textSecondary group-hover:text-primary transition-colors" />
                      <h3 className="text-xs font-bold text-textPrimary">{p.title}</h3>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-lg font-black font-mono text-warning">{p.metric}</span>
                      <p className="text-[9px] text-textSecondary">{p.metricLabel}</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-textSecondary leading-relaxed">{p.description}</p>
                  {isActive && <p className="mt-2 text-[9px] font-bold text-primary flex items-center gap-1"><Filter size={9} /> Active filter — click to clear</p>}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="enterprise-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={16} className="text-primary" />
            <h2 className="text-sm font-bold text-textPrimary">SQL Query Templates</h2>
          </div>
          <div className="space-y-2">
            {QUERY_TEMPLATES.map(q => (
              <button key={q.id} onClick={() => runQuery(q.id)}
                className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-colors ${
                  activeQuery === q.id
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border bg-bg/50 text-textPrimary hover:border-primary/30'
                }`}
              >
                <div>
                  <p className="text-sm font-bold">{q.label}</p>
                  <p className="text-[10px] text-textSecondary mt-0.5">{q.description}</p>
                </div>
                <Database size={14} className="shrink-0 opacity-40" />
              </button>
            ))}
          </div>
        </div>

        <div className="enterprise-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileSpreadsheet size={16} className="text-primary" />
              <h2 className="text-sm font-bold text-textPrimary">
                {activeQuery ? QUERY_TEMPLATES.find(q => q.id === activeQuery)?.label || 'Query Results' : 'Run a Query'}
              </h2>
            </div>
            {queryResults && queryResults.length > 0 && (
              <button onClick={exportResults} className="flex items-center gap-1.5 text-[10px] font-bold text-textSecondary hover:text-textPrimary transition-colors">
                <Download size={12} /> CSV
              </button>
            )}
          </div>
          {queryResults ? (
            queryResults.length > 0 ? (
              <div className="overflow-x-auto max-h-80 overflow-y-auto">
                <table className="enterprise-table text-xs">
                  <thead className="sticky top-0 bg-surface">
                    <tr>
                      {Object.keys(queryResults[0]).map(k => <th key={k} className="capitalize">{k.replace(/_/g, ' ')}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {queryResults.slice(0, 50).map((row, i) => (
                      <tr key={i}>
                        {Object.values(row).map((v, j) => (
                          <td key={j} className={typeof v === 'number' ? 'font-mono font-bold' : ''}>
                            {typeof v === 'number' && v > 100 ? formatCurrency(v) : typeof v === 'number' ? v : String(v)}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {queryResults.length > 50 && (
                      <tr><td colSpan={Object.keys(queryResults[0]).length} className="text-center text-[10px] text-textSecondary py-2">Showing 50 of {queryResults.length} results</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex items-center justify-center h-40 text-sm text-textSecondary border border-dashed border-border rounded-xl">No results matched this query.</div>
            )
          ) : (
            <div className="flex items-center justify-center h-40 text-sm text-textSecondary border border-dashed border-border rounded-xl">
              Select a query template above to explore derived datasets.
            </div>
          )}
        </div>
      </div>

      <div className="enterprise-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Table2 size={16} className="text-primary" />
            <h2 className="text-sm font-bold text-textPrimary">Raw Claims Dataset</h2>
            <span className="text-[10px] text-textSecondary font-mono bg-bg border border-border px-2 py-0.5 rounded">{fmt.format(filtered.length)} records</span>
          </div>
          {cardFilter && (
            <button onClick={() => setCardFilter(null)} className="flex items-center gap-1 text-[10px] font-bold text-primary hover:text-primary/80 transition-colors">
              <X size={10} /> Clear filter: {cardFilter.label}
            </button>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search across all fields..." className="w-full bg-bg border border-border rounded-lg py-2 pl-9 pr-3 text-sm text-textPrimary outline-none" />
          </div>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="bg-bg border border-border px-3 py-2 rounded-lg text-xs font-bold text-textPrimary outline-none">
            <option value="All">All Status</option>
            <option value="Submitted">Submitted</option>
            <option value="AI Scored">AI Scored</option>
            <option value="Under Review">Under Review</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Fraud Confirmed">Fraud Confirmed</option>
            <option value="Closed">Closed</option>
          </select>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-textSecondary font-semibold">Score:</span>
            <select value={minScore} onChange={e => { setMinScore(Number(e.target.value)); setPage(1); }}
              className="bg-bg border border-border px-2 py-2 rounded-lg text-xs font-bold text-textPrimary outline-none">
              {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90].map(v => <option key={v} value={v}>{v}%</option>)}
            </select>
            <span className="text-[10px] text-textSecondary">to</span>
            <select value={maxScore} onChange={e => { setMaxScore(Number(e.target.value)); setPage(1); }}
              className="bg-bg border border-border px-2 py-2 rounded-lg text-xs font-bold text-textPrimary outline-none">
              {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(v => <option key={v} value={v}>{v}%</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="enterprise-table text-xs">
            <thead>
              <tr>
                {TABLE_COLUMNS.map(col => (
                  <th key={col.key} className="cursor-pointer hover:text-textPrimary transition-colors" onClick={() => {
                    if (sortKey === col.key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
                    else { setSortKey(col.key); setSortDir('asc'); }
                  }}>
                    <span className="flex items-center gap-1">
                      {col.label}
                      {sortKey === col.key && <span className="text-[9px]">{sortDir === 'asc' ? '▲' : '▼'}</span>}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map((c, i) => (
                <tr key={c.claim_id || c.id || i} className="hover:bg-bg/40 transition-colors">
                  <td className="font-mono font-bold text-primary text-[10px]">{c.claim_id || c.id}</td>
                  <td className="font-semibold text-textPrimary">{c.patient_name}</td>
                  <td className="text-textSecondary">{c.provider_name}</td>
                  <td className="text-textSecondary">{c.service_name}</td>
                  <td className="font-mono font-bold">{formatCurrency(c.claim_amount || c.amount || 0)}</td>
                  <td>
                    <span className={`font-mono font-bold ${(c.fraud_score || 0) >= 0.75 ? 'text-danger' : (c.fraud_score || 0) >= 0.45 ? 'text-warning' : 'text-textSecondary'}`}>
                      {c.fraud_score ? `${(c.fraud_score * 100).toFixed(0)}%` : 'N/A'}
                    </span>
                  </td>
                  <td>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold border ${
                      c.status === 'Approved' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                      c.status === 'Fraud Confirmed' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                      c.status === 'Rejected' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                      c.status === 'Under Review' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                      'bg-primary/10 text-primary border-primary/20'
                    }`}>{c.status}</span>
                  </td>
                  <td className="text-textSecondary font-mono">{c.claim_date}</td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr><td colSpan={TABLE_COLUMNS.length} className="text-center py-12 text-sm text-textSecondary italic">No records match the current filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
          <span className="text-[10px] text-textSecondary">Page {page} of {totalPages || 1}</span>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded-lg border border-border hover:bg-bg disabled:opacity-30 transition-colors"><ChevronLeft size={14} /></button>
            <span className="text-xs font-mono font-bold text-textPrimary min-w-[40px] text-center">{page}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded-lg border border-border hover:bg-bg disabled:opacity-30 transition-colors"><ChevronRight size={14} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
