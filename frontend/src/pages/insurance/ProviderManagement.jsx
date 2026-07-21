import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Building2, Download, Eye, AlertTriangle, ShieldCheck, ChevronLeft,
  ChevronRight, TrendingUp, MapPin, Star, Activity, BarChart3, Users,
  Wifi, WifiOff, Flag, FileSearch, UserX, Info, DollarSign, Calendar,
  ArrowRight, Filter, X, Gavel, Globe, Clock, ShieldAlert, UserCheck
} from 'lucide-react';
import api from '../../api';
import Skeleton from '../../components/Skeleton';
import PlotlyChart from '../../components/PlotlyChart';
import { formatCurrency, formatPercent, formatNumber, getRiskLevel, isHighRisk, RISK_TIER_MAP } from '../../data/dataUtils';
import { CANONICAL_PROVIDERS, CANONICAL_SPECIALTY_DISTRIBUTION, CANONICAL_REFERENCE } from '../../data/canonicalData';

const MIN_CLAIMS_FOR_RATE = 5;

/* ─────────────────────────────────────────────
   RISK THRESHOLDS (aligned with Patient Management Tier Mapping)
   Patient Mgmt uses: Critical >= 0.90, High >= 0.70, Medium >= 0.40, Low >= 0.20, Minimal < 0.20
   For provider fraud rates, we map: High >= 20%, Medium >= 8%, Low < 8%
   The "High Risk" KPI counts providers with fraud_rate >= 20%
   ───────────────────────────────────────────── */
const HIGH_RISK_THRESHOLD = 20;  // % — guides the "High Risk" KPI count

/* ──── Provider workflow states ──── */
const PROVIDER_STATUS_FLOW = ['Active', 'Under Review', 'Suspended', 'Terminated'];

/* Providers whose fraud rate exceeds this are auto-marked "Under Review" on init */
const AUTO_REVIEW_THRESHOLD = 30;

/* Fraud Rate calculation notes for tooltip:
   - ProviderManagement: uses sum of provider-level fraud_claims / sum of total_claims = 34/200 = 17.0%
   - ExecutiveDashboard: uses CANONICAL_REFERENCE totalFraudClaims(15)/totalClaims(200) = 7.5%
   - Analytics page: uses AI fraud_score >= 0.65 threshold on runtime claim data
   - This page's metric reflects per-provider confirmed fraud totals from the canonical dataset
*/

function getFraudRateDisplay(provider) {
  const claims = provider.claims_count || provider.total_claims || 0;
  const frauds = provider.fraud_count || provider.fraud_claims || 0;
  if (claims < MIN_CLAIMS_FOR_RATE) return { rate: null, label: 'Insufficient Data', display: claims + ' claims' };
  const rate = (frauds / claims) * 100;
  return { rate, label: rate >= 20 ? 'High Risk' : rate >= 8 ? 'Medium' : 'Low Risk', display: rate.toFixed(1) + '%' };
}

/* ─────────────────────────────────────────────
   Specialty-based avg claim baseline map
   Used to generate realistic distinct avg_claim_amount per provider
   ───────────────────────────────────────────── */
const SPECIALTY_AVG_BASELINE = {
  'Multi-Specialty':  13000,
  'Primary Care':      9500,
  'Internal Medicine':11000,
  'Cardiology':       15500,
  'Family Medicine':   7500,
  'Emergency Medicine':14000,
  'Orthopedics':      12000,
  'Pediatrics':        5500,
  'Dermatology':      10500,
  'Radiology':        16000,
  'General Surgery':  22000,
  'Neurology':         7500,
};

/* Deterministic pseudo-random number generator (mulberry32) */
function mulberry32(seed) {
  let s = seed | 0;
  return function() {
    s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function generateDistinctAvgClaim(provider, seed) {
  const rng = mulberry32(seed);
  const base = SPECIALTY_AVG_BASELINE[provider.specialty] || 10000;
  /* +/- 15% variation */
  const factor = 0.85 + rng() * 0.30;
  return Math.round(base * factor);
}

/* ─────────────────────────────────────────────
   Contract dates: generate realistic dates per provider
   ───────────────────────────────────────────── */
function generateContractDate(provider, seed) {
  const rng = mulberry32(seed + 100);
  /* Contract start: 1-8 years ago */
  const yearsAgo = 1 + rng() * 7;
  const start = new Date();
  start.setFullYear(start.getFullYear() - yearsAgo);
  const startStr = start.toISOString().slice(0, 10);
  /* Last audit: 0-18 months ago */
  const monthsAgo = rng() * 18;
  const audit = new Date();
  audit.setMonth(audit.getMonth() - monthsAgo);
  const auditStr = audit.toISOString().slice(0, 10);
  return { contractStart: startStr, lastAudit: auditStr };
}

export default function ProviderManagement() {
  const navigate = useNavigate();
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('All');
  const [riskFilter, setRiskFilter] = useState('All');
  const [networkFilter, setNetworkFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [highlightedProviderId, setHighlightedProviderId] = useState(null);

  /* Date range filter */
  const [dateFrom, setDateFrom] = useState('2023-01-01');
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));

  /* Ref for scroll-to-table */
  const tableRef = useRef(null);

  const scrollToTable = useCallback(() => {
    if (tableRef.current) {
      tableRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  useEffect(() => {
    setProviders(CANONICAL_PROVIDERS.map((p, i) => {
      const seed = i + 1;
      const avgClaim = generateDistinctAvgClaim(p, seed);
      const das = generateContractDate(p, seed);
      /* approved/rejected derived from fraud rate logic */
      const fraudRate = p.total_claims > 0 ? (p.fraud_claims / p.total_claims) * 100 : 0;
      /* Approval Rate: inversely correlated with fraud rate */
      let baseApproval;
      if (fraudRate >= 30) {
        baseApproval = 30 + Math.random() * 18;  // 30-48% — "Under Review" zone
      } else if (fraudRate >= 20) {
        baseApproval = 45 + Math.random() * 15;  // 45-60%
      } else if (fraudRate >= 8) {
        baseApproval = 65 + Math.random() * 12;  // 65-77%
      } else if (fraudRate > 0) {
        baseApproval = 78 + Math.random() * 12;  // 78-90%
      } else {
        baseApproval = 88 + Math.random() * 10;  // 88-98%
      }
      const approvedCount = Math.round(p.total_claims * (baseApproval / 100) * (0.9 + Math.random() * 0.2));
      const rejectedCount = Math.max(0, p.total_claims - approvedCount - p.fraud_claims);
      /* Provider workflow status: extreme fraud triggers auto-review */
      let providerStatus = 'Active';
      if (fraudRate >= AUTO_REVIEW_THRESHOLD) providerStatus = 'Under Review';
      else if (fraudRate >= 20) providerStatus = 'Active'; // flagged but still active
      return {
        ...p,
        provider_id: p.id,
        claims_count: p.total_claims,
        fraud_count: p.fraud_claims,
        avg_claim_amount: avgClaim,
        approved_count: approvedCount,
        rejected_count: rejectedCount,
        provider_status: providerStatus,
        network_status: i % 5 === 0 ? 'Out-of-Network' : 'In-Network',
        contract_start: das.contractStart,
        last_audit: das.lastAudit,
      };
    }));
    setLoading(false);
  }, []);

  const processedProviders = useMemo(() => {
    return providers.map(p => {
      const display = getFraudRateDisplay(p);
      const claims = p.claims_count || p.total_claims || 0;
      const frauds = p.fraud_count || p.fraud_claims || 0;
      const approved = p.approved_count || 0;
      const approvalRate = claims > 0 ? (approved / claims) * 100 : 0;
      return {
        ...p, claims_count: claims, frauds_count: frauds,
        fraud_rate: display.rate, fraud_rate_display: display.display,
        fraud_rate_label: display.label, has_enough_data: display.rate !== null,
        approved_count: approved, approval_rate: approvalRate,
        network_status: p.network_status || 'In-Network',
        provider_status: p.provider_status || 'Active',
      };
    });
  }, [providers]);

  /* ─── Specialty averages for peer comparison ───
     Uses WEIGHTED average (total frauds / total claims per specialty)
     to match the Fraud Rate by Specialty chart methodology.
     This ensures Peer Comp and the chart tell the same story.        */
  const specialtyAverages = useMemo(() => {
    const map = {};
    processedProviders.forEach(p => {
      if (!p.specialty) return;
      if (!map[p.specialty]) map[p.specialty] = { totalClaims: 0, totalFrauds: 0 };
      map[p.specialty].totalClaims += p.claims_count;
      map[p.specialty].totalFrauds += p.frauds_count;
    });
    const result = {};
    Object.keys(map).forEach(k => {
      const d = map[k];
      result[k] = d.totalClaims >= MIN_CLAIMS_FOR_RATE ? (d.totalFrauds / d.totalClaims) * 100 : null;
    });
    return result;
  }, [processedProviders]);

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
      if (riskFilter === 'High') matchesRisk = p.has_enough_data && p.fraud_rate >= 20;
      else if (riskFilter === 'Medium') matchesRisk = p.has_enough_data && p.fraud_rate >= 8 && p.fraud_rate < 20;
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
    if (!total) return { totalProviders: 0, avgClaimsPerProvider: 0, overallFraudRate: 0, avgBilling: 0, highRisk: 0, inNetwork: 0, totalFraudExposure: 0, outOfNetworkFraudRate: 0, inNetworkFraudRate: 0 };
    const totalClaims = processedProviders.reduce((sum, p) => sum + p.claims_count, 0);
    const totalFrauds = processedProviders.reduce((sum, p) => sum + p.frauds_count, 0);
    const avgClaimsPerProvider = Math.round(totalClaims / total);
    const overallFraudRate = totalClaims > 0 ? (totalFrauds / totalClaims) * 100 : 0;
    const avgBilling = Math.round(processedProviders.reduce((sum, p) => sum + (p.avg_claim_amount || 0), 0) / total);
    /* High Risk = Fraud Rate >= 20% (mapped from Critical + High tiers) */
    const highRisk = processedProviders.filter(p => p.has_enough_data && p.fraud_rate >= HIGH_RISK_THRESHOLD).length;
    const inNetwork = processedProviders.filter(p => p.network_status === 'In-Network').length;
    /* Total Fraud Exposure = sum of (fraud_claims * avg_claim_amount) across all providers */
    const totalFraudExposure = processedProviders.reduce((sum, p) => sum + (p.frauds_count * (p.avg_claim_amount || 0)), 0);
    /* In-Network vs Out-of-Network fraud rate */
    const inNetProviders = processedProviders.filter(p => p.network_status === 'In-Network');
    const outNetProviders = processedProviders.filter(p => p.network_status === 'Out-of-Network');
    const inNetClaims = inNetProviders.reduce((s, p) => s + p.claims_count, 0);
    const inNetFrauds = inNetProviders.reduce((s, p) => s + p.frauds_count, 0);
    const outNetClaims = outNetProviders.reduce((s, p) => s + p.claims_count, 0);
    const outNetFrauds = outNetProviders.reduce((s, p) => s + p.frauds_count, 0);
    const inNetworkFraudRate = inNetClaims > 0 ? (inNetFrauds / inNetClaims) * 100 : 0;
    const outOfNetworkFraudRate = outNetClaims > 0 ? (outNetFrauds / outNetClaims) * 100 : 0;
    return { totalProviders: total, avgClaimsPerProvider, overallFraudRate, avgBilling, highRisk, inNetwork, totalFraudExposure, inNetworkFraudRate, outOfNetworkFraudRate };
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
      map[k].rate = map[k].claims >= MIN_CLAIMS_FOR_RATE ? (map[k].frauds / map[k].claims) * 100 : null;
    });
    return map;
  }, [processedProviders]);

  /* ─── Chart 1: Provider Risk Ranking (horizontal bar) ─── */
  const riskRankingData = useMemo(() => {
    const ranked = processedProviders.filter(p => p.has_enough_data && p.claims_count >= MIN_CLAIMS_FOR_RATE);
    const top10 = [...ranked].sort((a, b) => b.fraud_rate - a.fraud_rate).slice(0, 10);
    const names = top10.map(p => {
      const n = p.name || 'Provider #' + p.provider_id;
      return n.length > 28 ? n.slice(0, 26) + '..' : n;
    });
    const rates = top10.map(p => p.fraud_rate);
    const colors = rates.map(r => r >= 20 ? '#ef4444' : r >= 8 ? '#f59e0b' : '#22c55e');
    return [{
      y: [...names].reverse(), x: [...rates].reverse(), type: 'bar', orientation: 'h',
      marker: { color: [...colors].reverse(), line: { width: 0 } },
      text: rates.map(r => r.toFixed(1) + '%').reverse(),
      textposition: 'outside', textfont: { size: 10, color: '#94a3b8' },
      hovertemplate: '%{y}<br>Fraud Rate: %{x:.1f}%<extra></extra>',
      /* Store provider IDs for click handling */
      providerIds: top10.map(p => p.provider_id).reverse(),
    }];
  }, [processedProviders]);

  const riskRankingLayout = useMemo(() => {
    const ranked = processedProviders.filter(p => p.has_enough_data && p.claims_count >= MIN_CLAIMS_FOR_RATE);
    const top10 = [...ranked].sort((a, b) => b.fraud_rate - a.fraud_rate).slice(0, 10);
    const maxRate = Math.max(...(top10.length ? top10.map(p => p.fraud_rate) : [5]));
    const upperBound = Math.max(maxRate * 1.25, 30);
    const dtick = upperBound > 50 ? 10 : upperBound > 20 ? 5 : 2.5;
    return {
      margin: { t: 10, r: 80, l: 120, b: 30 },
      xaxis: { title: 'Fraud Rate (%)', showgrid: true, gridcolor: 'rgba(71, 85, 105, 0.3)', range: [0, upperBound], dtick },
      yaxis: { automargin: true, tickfont: { size: 10 }, autorange: 'reversed' },
      showlegend: false,
      barnorm: ''
    };
  }, [processedProviders]);

  /* ─── Chart 2: Claims Volume by Provider (risk-colored bars) ─── */
  const claimsVolumeData = useMemo(() => {
    const top10 = [...processedProviders].sort((a, b) => b.claims_count - a.claims_count).slice(0, 10);
    const names = top10.map(p => {
      const n = p.name || '#' + p.provider_id;
      return n.length > 20 ? n.slice(0, 18) + '..' : n;
    });
    const colors = top10.map(p => {
      if (!p.has_enough_data) return '#94a3b8';
      if (p.fraud_rate >= 20) return '#ef4444';
      if (p.fraud_rate >= 8) return '#f59e0b';
      return '#22c55e';
    });
    return [{
      x: names, y: top10.map(p => p.claims_count), type: 'bar',
      marker: { color: colors, cornerradius: 4 },
      text: top10.map(p => p.claims_count.toLocaleString()),
      textposition: 'outside', textfont: { size: 9, color: '#94a3b8' },
      hovertemplate: '%{x}<br>Claims: %{y:,}<extra></extra>'
    }];
  }, [processedProviders]);

  /* ─── Chart 3: Specialty Distribution (horizontal bar chart) ─── */
  const specialtyDistData = useMemo(() => {
    const specCounts = {};
    processedProviders.forEach(p => {
      if (!p.specialty) return;
      specCounts[p.specialty] = (specCounts[p.specialty] || 0) + 1;
    });
    const sorted = Object.entries(specCounts)
      .map(([spec, count]) => ({ spec, count }))
      .sort((a, b) => b.count - a.count);
    return [{
      y: sorted.map(e => e.spec).reverse(),
      x: sorted.map(e => e.count).reverse(),
      type: 'bar', orientation: 'h',
      marker: { color: '#6366f1', line: { width: 0 } },
      text: sorted.map(e => '\u00d7' + e.count).reverse(),
      textposition: 'outside', textfont: { size: 9, color: '#94a3b8' },
      hovertemplate: '%{y}<br>Providers: %{x}<extra></extra>'
    }];
  }, [processedProviders]);

  /* ─── Chart 4: Fraud Rate by Specialty ─── */
  const fraudBySpecialtyData = useMemo(() => {
    const map = {};
    CANONICAL_PROVIDERS.forEach(p => {
      if (!p.specialty) return;
      if (!map[p.specialty]) map[p.specialty] = { claims: 0, frauds: 0 };
      map[p.specialty].claims += p.total_claims;
      map[p.specialty].frauds += p.fraud_claims;
    });
    const entries = Object.entries(map)
      .map(([name, val]) => ({ name, claims: val.claims, frauds: val.frauds, rate: val.claims >= MIN_CLAIMS_FOR_RATE ? (val.frauds / val.claims) * 100 : null }))
      .sort((a, b) => {
        const ra = a.rate !== null ? a.rate : -1;
        const rb = b.rate !== null ? b.rate : -1;
        return rb - ra;
      });
    const rates = entries.map(e => e.rate !== null ? e.rate : 0);
    const colors = entries.map(e => {
      if (e.rate === null) return '#94a3b8'; /* gray for insufficient data */
      if (e.rate >= 20) return '#ef4444';
      if (e.rate >= 8) return '#f59e0b';
      return '#22c55e';
    });
    const text = entries.map(e => e.rate !== null ? e.rate.toFixed(1) + '%' : 'Insufficient Data');
    const textColors = entries.map(e => e.rate !== null ? '#94a3b8' : '#64748b');
    const textFonts = entries.map((e, i) => ({
      size: e.rate !== null ? 9 : 8,
      color: textColors[i],
    }));
    return [{
      x: entries.map(e => e.name), y: rates, type: 'bar',
      marker: { color: colors, cornerradius: 4 },
      text: text,
      textposition: 'outside',
      textfont: textFonts.map(f => ({ size: f.size, color: f.color })),
      hovertemplate: entries.map(e => {
        if (e.rate === null) return e.name + '<br>Insufficient Data (' + e.claims + ' claims, min ' + MIN_CLAIMS_FOR_RATE + ' required)<extra></extra>';
        return e.name + '<br>Fraud Rate: ' + e.rate.toFixed(1) + '%<br>Frauds: ' + e.frauds + ' / ' + e.claims + ' claims<extra></extra>';
      }),
    }];
  }, []);

  const riskTrendData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
    const topRisk = processedProviders.filter(p => p.has_enough_data).sort((a, b) => b.fraud_rate - a.fraud_rate).slice(0, 3);
    return topRisk.map((p, i) => {
      const baseRate = p.fraud_rate;
      const colors = ['#ef4444', '#f97316', '#eab308'];
      return {
        x: months,
        y: months.map((_, mi) => +(baseRate * (0.7 + (mi * 0.05) + (Math.sin(mi) * 2))).toFixed(1)),
        type: 'scatter', mode: 'lines+markers', name: p.name.length > 25 ? p.name.substring(0, 22) + '...' : p.name,
        line: { color: colors[i], width: 2, shape: 'spline' },
        marker: { size: 5 },
        hovertemplate: `${p.name}<br>%{x}: %{y:.1f}%<extra></extra>`
      };
    });
  }, [processedProviders]);

  const topProceduresData = useMemo(() => {
    const procedureMap = {};
    const procedureNames = {
      '99213': 'Office Visit (Lvl 3)', '99214': 'Office Visit (Lvl 4)', '99215': 'Office Visit (Lvl 5)',
      '99203': 'New Patient (Lvl 3)', '99204': 'New Patient (Lvl 4)', '99205': 'New Patient (Lvl 5)',
      '80053': 'Comprehensive Metabolic', '71046': 'Chest X-Ray', '97110': 'Therapeutic Exercise',
      '99291': 'Critical Care', '99285': 'ED Visit (Lvl 5)', '36415': 'Venipuncture',
    };
    CANONICAL_PROVIDERS.forEach(p => {
      const procs = p.top_procedures || [];
      procs.forEach(proc => {
        if (!proc) return;
        if (!procedureMap[proc]) procedureMap[proc] = { code: proc, name: procedureNames[proc] || proc, count: 0, fraudCount: 0 };
        procedureMap[proc].count += Math.max(1, Math.round((p.claims_count || 10) / procs.length));
        procedureMap[proc].fraudCount += Math.max(0, Math.round((p.fraud_count || 0) / procs.length));
      });
    });
    const entries = Object.values(procedureMap).sort((a, b) => b.count - a.count).slice(0, 10);
    if (entries.length === 0) {
      const defaults = [
        { code: '99214', name: 'Office Visit (Lvl 4)', count: 42, fraudCount: 8 },
        { code: '99213', name: 'Office Visit (Lvl 3)', count: 38, fraudCount: 3 },
        { code: '99215', name: 'Office Visit (Lvl 5)', count: 28, fraudCount: 12 },
        { code: '80053', name: 'Comprehensive Metabolic', count: 22, fraudCount: 2 },
        { code: '71046', name: 'Chest X-Ray', count: 18, fraudCount: 1 },
        { code: '99203', name: 'New Patient (Lvl 3)', count: 15, fraudCount: 2 },
        { code: '36415', name: 'Venipuncture', count: 14, fraudCount: 1 },
        { code: '97110', name: 'Therapeutic Exercise', count: 12, fraudCount: 0 },
        { code: '99285', name: 'ED Visit (Lvl 5)', count: 10, fraudCount: 3 },
        { code: '99291', name: 'Critical Care', count: 8, fraudCount: 2 },
      ];
      return [{ x: defaults.map(d => d.code), y: defaults.map(d => d.count), name: 'Total', type: 'bar', marker: { color: '#6366f1' }, hovertemplate: '%{x}<br>Claims: %{y}<extra></extra>' },
        { x: defaults.map(d => d.code), y: defaults.map(d => d.fraudCount), name: 'Fraud', type: 'bar', marker: { color: '#ef4444' }, hovertemplate: '%{x}<br>Fraud: %{y}<extra></extra>' }];
    }
    return [
      { x: entries.map(e => e.code), y: entries.map(e => e.count), name: 'Total', type: 'bar', marker: { color: '#6366f1' }, hovertemplate: '%{x}<br>Claims: %{y}<extra></extra>' },
      { x: entries.map(e => e.code), y: entries.map(e => e.fraudCount), name: 'Fraud', type: 'bar', marker: { color: '#ef4444' }, hovertemplate: '%{x}<br>Fraud: %{y}<extra></extra>' },
    ];
  }, [processedProviders]);

  /* ─── CSV Export ─── */
  const exportCSV = () => {
    const headers = ['Provider ID', 'Name', 'Type', 'Specialty', 'City', 'State', 'Network', 'Claims', 'Frauds', 'Fraud Rate', 'Avg Claim', 'Approval Rate', 'Contract Start', 'Last Audit', 'Fraud Exposure'];
    const rows = processedProviders.map(p => [
      p.provider_id, '"' + (p.name || '') + '"', p.type || '', p.specialty || '',
      '"' + (p.city || '') + '"', p.state || '', p.network_status,
      p.claims_count, p.frauds_count,
      p.has_enough_data ? p.fraud_rate.toFixed(1) : 'N/A',
      (p.avg_claim_amount || 0).toFixed(2), p.approval_rate.toFixed(1),
      p.contract_start || '', p.last_audit || '',
      (p.frauds_count * p.avg_claim_amount || 0).toFixed(2)
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
    /* Aligned with Patient Mgmt tier colors: red=high risk, amber=medium, emerald=low */
    if (provider.fraud_rate >= 20) return { label: 'High Risk', className: 'bg-red-500/15 text-red-400 border border-red-500/20' };
    if (provider.fraud_rate >= 8) return { label: 'Medium', className: 'bg-amber-500/15 text-amber-400 border border-amber-500/20' };
    return { label: 'Low Risk', className: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' };
  };

  /* ─── Chart click handler for Risk Ranking ─── */
  const handleRiskRankingClick = useCallback((point) => {
    /* PlotlyChart passes the raw point object via onPointClick */
    if (!point) return;
    const curveNumber = point.curveNumber;
    const pointNumber = point.pointNumber !== undefined ? point.pointNumber : point.pointIndex;
    const chartData = riskRankingData[curveNumber];
    if (chartData && chartData.providerIds && chartData.providerIds[pointNumber] !== undefined) {
      const provId = chartData.providerIds[pointNumber];
      const overallIdx = processedProviders.findIndex(p => p.provider_id === provId);
      if (overallIdx >= 0) {
        const targetPage = Math.floor(overallIdx / pageSize) + 1;
        setPage(targetPage);
        setHighlightedProviderId(provId);
        setTimeout(() => setHighlightedProviderId(null), 2500);
        setTimeout(scrollToTable, 100);
      }
    }
  }, [riskRankingData, processedProviders, pageSize, scrollToTable]);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton rows={2} />
        <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
          {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} type="card" />)}
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
      {/* ────────── HEADER ────────── */}
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
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-bold text-textPrimary hover:bg-bg transition-colors shadow-sm">
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      {/* ────────── DATE RANGE FILTER ────────── */}
      <div className="flex flex-wrap items-center gap-3 bg-surface p-3 border border-border rounded-xl shadow-sm">
        <Calendar size={14} className="text-textSecondary" />
        <span className="text-[10px] uppercase font-bold text-textSecondary">Date Range:</span>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          className="bg-bg border border-border rounded-lg px-2 py-1.5 text-xs text-textPrimary font-mono outline-none" />
        <span className="text-textSecondary text-xs">to</span>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          className="bg-bg border border-border rounded-lg px-2 py-1.5 text-xs text-textPrimary font-mono outline-none" />
      </div>

      {/* ────────── KPI HEADER ────────── */}
      <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
        <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm border-l-4 border-l-primary">
          <div className="flex items-center gap-2 mb-2"><Users size={14} className="text-primary" /><p className="text-[10px] uppercase font-bold text-textSecondary">Total Providers</p></div>
          <p className="text-2xl font-black text-textPrimary font-mono">{stats.totalProviders.toLocaleString()}</p>
        </div>
        <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm border-l-4 border-l-blue-500">
          <div className="flex items-center gap-2 mb-2"><BarChart3 size={14} className="text-blue-500" /><p className="text-[10px] uppercase font-bold text-textSecondary">Avg Claims per Provider</p></div>
          <p className="text-2xl font-black text-textPrimary font-mono">{stats.avgClaimsPerProvider.toLocaleString()}</p>
          <p className="mt-0.5 text-[9px] text-textSecondary">(count)</p>
        </div>
        <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm border-l-4 border-l-red-500">
          <div className="flex items-center gap-2 mb-2"><AlertTriangle size={14} className="text-red-500" /><p className="text-[10px] uppercase font-bold text-danger">Fraud Rate</p></div>
          <p className="text-2xl font-black text-danger font-mono">{stats.overallFraudRate.toFixed(1)}%</p>
        </div>
        <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm border-l-4 border-l-violet-500">
          <div className="flex items-center gap-2 mb-2"><TrendingUp size={14} className="text-violet-500" /><p className="text-[10px] uppercase font-bold text-textSecondary">Avg Billing</p></div>
          <p className="text-2xl font-black text-violet-400 font-mono">{formatCurrency(stats.avgBilling)}</p>
          <p className="mt-0.5 text-[9px] text-textSecondary">(dollar amount)</p>
        </div>
        <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm border-l-4 border-l-amber-500">
          <div className="flex items-center gap-2 mb-2"><ShieldCheck size={14} className="text-amber-500" /><p className="text-[10px] uppercase font-bold text-textSecondary">High Risk</p></div>
          <p className="text-2xl font-black text-amber-400 font-mono">{stats.highRisk}</p>
          <p className="mt-0.5 text-[9px] text-textSecondary">Fraud Rate &ge;{HIGH_RISK_THRESHOLD}%</p>
        </div>
        <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm border-l-4 border-l-red-600">
          <div className="flex items-center gap-2 mb-2"><DollarSign size={14} className="text-red-500" /><p className="text-[10px] uppercase font-bold text-textSecondary">Fraud Exposure</p></div>
          <p className="text-2xl font-black text-red-400 font-mono">{formatCurrency(stats.totalFraudExposure)}</p>
          <p className="mt-0.5 text-[9px] text-textSecondary">estimated fraudulent billing</p>
        </div>
        <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm border-l-4 border-l-emerald-500">
          <div className="flex items-center gap-2 mb-2"><Wifi size={14} className="text-emerald-500" /><p className="text-[10px] uppercase font-bold text-textSecondary">In-Network</p></div>
          <p className="text-2xl font-black text-emerald-400 font-mono">{stats.inNetwork}</p>
          <p className="mt-1 text-[11px] text-textSecondary">of {stats.totalProviders}</p>
        </div>
      </div>

      {/* ────────── IN-NETWORK vs OUT-OF-NETWORK FRAUD RATE COMPARISON ────────── */}
      <div className="bg-surface border border-border rounded-2xl p-4 shadow-sm flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-textSecondary" />
          <span className="text-[10px] uppercase font-bold text-textSecondary">Fraud Rate by Network</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
            <span className="text-xs text-textSecondary">In-Network:</span>
            <span className="text-sm font-bold font-mono text-emerald-400">{stats.inNetworkFraudRate.toFixed(1)}%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-orange-500"></div>
            <span className="text-xs text-textSecondary">Out-of-Network:</span>
            <span className="text-sm font-bold font-mono text-orange-400">{stats.outOfNetworkFraudRate.toFixed(1)}%</span>
          </div>
          <div className="text-[10px] text-textSecondary border-l border-border pl-3">
            Out-of-Network providers constitute {processedProviders.filter(p => p.network_status === 'Out-of-Network').length} of {stats.totalProviders} providers
            but account for {stats.outOfNetworkFraudRate > stats.inNetworkFraudRate ? 'disproportionate' : 'proportionate'} fraud activity.
          </div>
        </div>
        <button onClick={() => setNetworkFilter('Out-of-Network')} className="ml-auto text-[10px] font-bold text-primary hover:underline flex items-center gap-1">
          View Out-of-Network <ArrowRight size={10} />
        </button>
      </div>

      {/* ────────── FILTERS ────────── */}
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
          <option value="High">High Risk (&ge;20%)</option>
          <option value="Medium">Medium (8-20%)</option>
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

      {/* ────────── TOP ROW CHARTS ────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Provider Risk Ranking */}
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1"><Activity size={16} className="text-red-500" /><h3 className="text-sm font-bold text-textPrimary">Provider Risk Ranking</h3></div>
          <p className="text-xs text-textSecondary mb-4">Top 10 providers by fraud rate (min {MIN_CLAIMS_FOR_RATE} claims) &mdash; click bar to locate in table</p>
          <div className="h-64">
            <PlotlyChart
              data={riskRankingData}
              layout={riskRankingLayout}
              onPointClick={handleRiskRankingClick}
            />
          </div>
        </div>
        {/* Claims Volume by Provider */}
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1"><BarChart3 size={16} className="text-blue-500" /><h3 className="text-sm font-bold text-textPrimary">Claims Volume by Provider</h3></div>
          <p className="text-xs text-textSecondary mb-4">Top 10 providers by total submitted claims &mdash; color-coded by risk level</p>
          <div className="h-64">
            <PlotlyChart data={claimsVolumeData} layout={{
              margin: { t: 10, r: 20, l: 10, b: 60 },
              xaxis: { showgrid: false, tickangle: -30, tickfont: { size: 9 } },
              yaxis: { title: 'Claims', gridcolor: 'rgba(71, 85, 105, 0.3)', rangemode: 'tozero' },
              showlegend: false
            }} />
          </div>
        </div>
      </div>

      {/* ────────── BOTTOM ROW CHARTS ────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Specialty Distribution (horizontal bar) */}
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1"><Star size={16} className="text-violet-500" /><h3 className="text-sm font-bold text-textPrimary">Specialty Distribution</h3></div>
          <p className="text-xs text-textSecondary mb-4">Provider count by clinical specialty</p>
          <div className="h-64">
            <PlotlyChart data={specialtyDistData} layout={{
              margin: { t: 10, r: 60, l: 120, b: 30 },
              xaxis: { title: 'Providers', showgrid: true, gridcolor: 'rgba(71, 85, 105, 0.3)', rangemode: 'tozero', dtick: 1 },
              yaxis: { automargin: true, tickfont: { size: 9 }, autorange: 'reversed' },
              showlegend: false
            }} />
          </div>
        </div>
        {/* Fraud Rate by Specialty */}
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1"><AlertTriangle size={16} className="text-amber-500" /><h3 className="text-sm font-bold text-textPrimary">Fraud Rate by Specialty</h3></div>
          <p className="text-xs text-textSecondary mb-4">Aggregated fraud rate per specialty (min {MIN_CLAIMS_FOR_RATE} claims) &mdash; gray bars = insufficient data</p>
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

      {/* ────────── RISK TREND + TOP PROCEDURES ────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1"><TrendingUp size={16} className="text-red-500" /><h3 className="text-sm font-bold text-textPrimary">Risk Trend (Top 3 Providers)</h3></div>
          <p className="text-xs text-textSecondary mb-4">Monthly fraud rate trajectory for highest-risk providers</p>
          <div className="h-64">
            <PlotlyChart
              data={riskTrendData.length > 0 ? riskTrendData : [{ x: ['Jan','Feb','Mar','Apr','May','Jun','Jul'], y: [0,0,0,0,0,0,0], type: 'scatter', mode: 'lines', name: 'No data' }]}
              layout={{
                margin: { t: 10, r: 20, l: 40, b: 35 },
                xaxis: { showgrid: false },
                yaxis: { title: 'Fraud Rate (%)', gridcolor: 'rgba(71,85,105,0.3)', ticksuffix: '%' },
                showlegend: true, legend: { orientation: 'h', y: -0.2, font: { size: 9 } }
              }}
            />
          </div>
        </div>
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1"><BarChart3 size={16} className="text-indigo-500" /><h3 className="text-sm font-bold text-textPrimary">Top Procedures by Claims Volume</h3></div>
          <p className="text-xs text-textSecondary mb-4">Most frequently billed CPT codes across all providers</p>
          <div className="h-64">
            <PlotlyChart
              data={topProceduresData}
              layout={{
                margin: { t: 10, r: 20, l: 40, b: 50 },
                xaxis: { showgrid: false, tickangle: -30, tickfont: { size: 9 } },
                yaxis: { title: 'Claims', gridcolor: 'rgba(71,85,105,0.3)' },
                barmode: 'stack',
                showlegend: true, legend: { orientation: 'h', y: -0.25, font: { size: 9 } }
              }}
            />
          </div>
        </div>
      </div>

      {/* ────────── PROVIDER RISK RANKING TABLE ────────── */}
      <div className="bg-surface border border-border rounded-2xl shadow-sm overflow-hidden" ref={tableRef}>
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2"><Building2 size={16} className="text-primary" />Provider Risk Ranking</h3>
            <p className="text-xs text-textSecondary mt-0.5">{filtered.length} providers matching filters</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-textSecondary">Fraud Rate Tiers: </span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] bg-red-500/10 text-red-400 border border-red-500/20">High &ge;20%</span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20">Med 8-20%</span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Low &lt;8%</span>
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
                <th>Contract Start</th>
                <th>Last Audit</th>
                <th title="% difference vs. specialty average fraud rate">Peer Comp.<Info size={11} className="inline ml-0.5 text-textSecondary opacity-50" /></th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((provider, idx) => {
                const riskBadge = getRiskBadge(provider);
                const rank = (page - 1) * pageSize + idx + 1;
                const specAvg = specialtyAverages[provider.specialty];
                const peerDiff = (provider.has_enough_data && specAvg !== null && specAvg !== undefined) ? provider.fraud_rate - specAvg : null;
                const fraudExposure = provider.frauds_count * (provider.avg_claim_amount || 0);
                /* Approval Rate styling */
                const approvalRateNormalized = provider.approval_rate;
                const approvalBarColor = approvalRateNormalized < 50 ? 'bg-red-500' : approvalRateNormalized < 65 ? 'bg-amber-500' : 'bg-emerald-500';
                const showUnderReview = approvalRateNormalized < 50 && provider.fraud_rate >= 15;
                return (
                  <tr key={provider.provider_id} className={'hover:bg-bg/50 transition-colors ' + (highlightedProviderId === provider.provider_id ? 'row-glow-red animate-pulse' : '')} id={'provider-row-' + provider.provider_id}>
                    <td className="text-xs font-mono font-bold text-textSecondary">{rank}</td>
                    <td className="font-mono text-xs font-bold text-textSecondary">#{provider.provider_id}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-textPrimary text-sm">{provider.name}</span>
                        {provider.frauds_count > 0 && provider.has_enough_data && provider.fraud_rate >= 20 && (
                          <span className="inline-flex items-center px-1 py-0.5 rounded text-[8px] font-bold bg-red-500/20 text-red-400 animate-pulse">FLAGGED</span>
                        )}
                      </div>
                    </td>
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
                            <div className={'h-full rounded-full ' + (provider.fraud_rate >= 20 ? 'bg-red-500' : provider.fraud_rate >= 8 ? 'bg-amber-500' : 'bg-emerald-500')}
                              style={{ width: Math.min((provider.fraud_rate / 30) * 100, 100) + '%' }} />
                          </div>
                          <span className={'text-xs font-black font-mono px-1.5 py-0.5 rounded ' + riskBadge.className}>
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
                          <div className={'h-full rounded-full ' + approvalBarColor} style={{ width: Math.min(approvalRateNormalized, 100) + '%' }} />
                        </div>
                        <span className={'text-xs font-mono ' + (approvalRateNormalized < 50 ? 'text-red-400 font-bold' : 'text-textSecondary')}>
                          {approvalRateNormalized.toFixed(1)}%
                        </span>
                        {showUnderReview && (
                          <span className="text-[8px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded whitespace-nowrap" title="Approval Rate flagged due to high fraud rate">Under Review</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ' + (
                        provider.network_status === 'In-Network'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                      )}>
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
                    <td className="text-xs font-mono text-textSecondary">{provider.contract_start || '—'}</td>
                    <td className="text-xs font-mono text-textSecondary">{provider.last_audit || '—'}</td>
                    <td>
                      {peerDiff !== null ? (
                        <span className={'inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded ' + (
                          peerDiff > 5 ? 'bg-red-500/10 text-red-400' : peerDiff < -5 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-500/10 text-slate-400'
                        )}>
                          {peerDiff > 5 ? '▲' : peerDiff < -5 ? '▼' : '◆'}
                          {peerDiff > 0 ? '+' : ''}{peerDiff.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">N/A</span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setSelectedProvider(provider)}
                          className="flex items-center gap-1 h-7 px-2 rounded-lg border border-border bg-surface text-textSecondary hover:border-primary hover:text-primary transition-colors text-[10px] font-bold">
                          <Eye size={12} /> Profile
                        </button>
                        <div className="relative group">
                          <button className="flex items-center gap-1 h-7 px-2 rounded-lg border border-border bg-surface text-textSecondary hover:border-amber-500 hover:text-amber-400 transition-colors text-[10px] font-bold">
                            <Flag size={12} />
                          </button>
                          <div className="absolute right-0 top-full mt-1 w-48 bg-surface border border-border rounded-xl shadow-xl z-50 hidden group-hover:block py-1">
                            <button className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-textPrimary hover:bg-bg transition-colors"
                              onClick={() => { setSelectedProvider(provider); alert('Provider ' + provider.provider_id + ' flagged for investigation.'); }}>
                              <Flag size={12} className="text-amber-500" /> Flag for Investigation
                            </button>
                            <button className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-textPrimary hover:bg-bg transition-colors"
                              onClick={() => { setSelectedProvider(provider); alert('Audit requested for ' + provider.provider_id); }}>
                              <FileSearch size={12} className="text-blue-500" /> Request Audit
                            </button>
                            <button className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-red-400 hover:bg-bg transition-colors"
                              onClick={() => { setSelectedProvider(provider); alert('Provider ' + provider.provider_id + ' suspended from network.'); }}>
                              <UserX size={12} className="text-red-400" /> Suspend from Network
                            </button>
                            <hr className="border-border my-1" />
                            <button className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-textPrimary hover:bg-bg transition-colors"
                              onClick={() => navigate('/insurance/patients?provider=' + provider.provider_id)}>
                              <Users size={12} className="text-primary" /> View Patients
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {paginated.length === 0 && (
                <tr><td colSpan={16} className="text-center py-12 text-textSecondary text-sm">No providers found matching your search criteria.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ────────── PAGINATION ────────── */}
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
              {filtered.length > 0 ? ((page - 1) * pageSize + 1) + '-' + Math.min(page * pageSize, filtered.length) + ' of ' + filtered.length : '0 results'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="enterprise-btn-ghost p-2 disabled:opacity-30 rounded-lg hover:bg-bg transition-colors"><ChevronLeft size={14} /></button>
            <span className="text-xs font-mono text-textPrimary font-bold min-w-[60px] text-center">Page {page} of {totalPages || 1}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="enterprise-btn-ghost p-2 disabled:opacity-30 rounded-lg hover:bg-bg transition-colors"><ChevronRight size={14} /></button>
          </div>
        </div>
      </div>

      {/* ────────── PROVIDER PROFILE MODAL ────────── */}
      {selectedProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setSelectedProvider(null)}>
          <div className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-black text-textPrimary flex items-center gap-2"><Building2 size={18} className="text-primary" /> Provider Profile</h3>
              <button onClick={() => setSelectedProvider(null)} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-bg text-textSecondary hover:text-textPrimary transition-colors text-sm font-bold">✕</button>
            </div>
            <div className="space-y-4">
              <div className="bg-bg border border-border/50 rounded-xl p-4">
                <p className="font-black text-textPrimary text-base">{selectedProvider.name}</p>
                <p className="text-xs text-textSecondary mt-1">{selectedProvider.type || 'N/A'} &bull; {selectedProvider.specialty || 'N/A'}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-bg border border-border/50 rounded-xl p-3">
                  <p className="text-[10px] uppercase font-bold text-textSecondary">Total Claims</p>
                  <p className="text-lg font-black text-textPrimary font-mono">{formatNumber(selectedProvider.claims_count)}</p>
                </div>
                <div className="bg-bg border border-border/50 rounded-xl p-3">
                  <p className="text-[10px] uppercase font-bold text-textSecondary">Fraud Claims</p>
                  <p className="text-lg font-black text-red-400 font-mono">{selectedProvider.frauds_count}</p>
                </div>
                <div className="bg-bg border border-border/50 rounded-xl p-3">
                  <p className="text-[10px] uppercase font-bold text-textSecondary">Fraud Rate</p>
                  <p className={'text-lg font-black font-mono ' + (selectedProvider.has_enough_data ? (selectedProvider.fraud_rate >= 20 ? 'text-red-400' : selectedProvider.fraud_rate >= 8 ? 'text-amber-400' : 'text-emerald-400') : 'text-slate-400')}>
                    {selectedProvider.fraud_rate_display}
                  </p>
                </div>
                <div className="bg-bg border border-border/50 rounded-xl p-3">
                  <p className="text-[10px] uppercase font-bold text-textSecondary">Network</p>
                  <p className="text-sm font-bold text-textPrimary flex items-center gap-1">
                    {selectedProvider.network_status === 'In-Network' ? <Wifi size={12} className="text-emerald-400" /> : <WifiOff size={12} className="text-orange-400" />}
                    {selectedProvider.network_status}
                  </p>
                </div>
              </div>
              <div className="bg-bg border border-border/50 rounded-xl p-3">
                <p className="text-[10px] uppercase font-bold text-textSecondary mb-1">Location</p>
                <p className="text-sm font-semibold text-textPrimary flex items-center gap-1"><MapPin size={12} className="text-textSecondary" />{selectedProvider.city || 'N/A'}, {selectedProvider.state || ''}</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setSelectedProvider(null); navigate('/insurance/providers/' + selectedProvider.provider_id); }} className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2.5 text-sm font-bold text-primary hover:bg-primary/20 transition-colors">
                  <Eye size={16} /> Full Profile
                </button>
                <button onClick={() => setSelectedProvider(null)} className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-textSecondary hover:bg-bg transition-colors">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
