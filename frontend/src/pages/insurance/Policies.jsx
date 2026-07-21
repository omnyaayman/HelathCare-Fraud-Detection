import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Download, ShieldCheck, AlertCircle, FileText, Activity,
  Eye, Filter, ChevronLeft, ChevronRight, Clock, Calendar,
  DollarSign, AlertTriangle, TrendingUp, Users, RefreshCw, ArrowUpDown,
  Info, CheckCircle, XCircle, PieChart, BarChart2, ExternalLink, Settings2
} from 'lucide-react';
import api from '../../api';
import PlotlyChart from '../../components/PlotlyChart';
import Skeleton from '../../components/Skeleton';
import { formatCurrency, formatCompactCurrency, formatPercent, formatNumber, getRiskLevel } from '../../data/dataUtils';
import { CANONICAL_REFERENCE, CANONICAL_POLICY_BREAKDOWN, CANONICAL_PROVIDERS, CANONICAL_PATIENTS, CANONICAL_MONTHLY_TRENDS } from '../../data/canonicalData';

const MAX_EXPECTED_CLAIMS = 40;
const MIN_CLAIMS_FOR_FRAUD_RATE = 5;

const COVERAGE_PROFILES = [
  { tier: 'Platinum', policyType: 'Individual', premiumRange: [7000, 12000], dedRange: [250, 750] },
  { tier: 'Gold', policyType: 'Corporate', premiumRange: [5000, 8000], dedRange: [1000, 2500] },
  { tier: 'Silver', policyType: 'Standard', premiumRange: [3000, 5500], dedRange: [2500, 5000] },
  { tier: 'Bronze', policyType: 'Family', premiumRange: [1500, 3000], dedRange: [5000, 8000] },
];

const RISK_TIER_THRESHOLDS = [
  { label: 'Critical', fraudMin: 25, scoreMin: 0.90, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  { label: 'High', fraudMin: 15, scoreMin: 0.70, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  { label: 'Medium', fraudMin: 5, scoreMin: 0.40, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  { label: 'Low', fraudMin: 1, scoreMin: 0.20, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  { label: 'Minimal', fraudMin: 0, scoreMin: 0, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
];

const getCoverageClassColor = (coverageClass) => {
  if (coverageClass === 'Platinum') return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
  if (coverageClass === 'Gold') return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
  if (coverageClass === 'Silver') return 'bg-slate-400/10 text-slate-300 border-slate-400/20';
  return 'bg-amber-700/10 text-amber-500 border-amber-700/20';
};

const getPolicyTypeColor = (policyType) => {
  if (policyType === 'Individual') return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
  if (policyType === 'Corporate') return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
  if (policyType === 'Standard') return 'bg-teal-500/10 text-teal-400 border-teal-500/20';
  return 'bg-pink-500/10 text-pink-400 border-pink-500/20';
};

const getPremium = (p) => {
  return p.annual_premium || p.premium || 0;
};

const getFraudRateDisplay = (p) => {
  const claims = p.claim_count || 0;
  const frauds = p.fraud_count || 0;
  if (claims < MIN_CLAIMS_FOR_FRAUD_RATE) return { rate: null, label: 'Insufficient Data', display: `${frauds}/${claims} claims` };
  const rate = (frauds / claims) * 100;
  return { rate, label: rate >= 15 ? 'High' : rate >= 5 ? 'Medium' : 'Low', display: `${rate.toFixed(1)}%` };
};

const getRenewalStatus = (p) => {
  if (p.policy_status === 'Expired') return 'Lapsed';
  if (p.policy_status === 'Pending') return 'Pending Activation';
  if (!p.policy_end_date) return 'Current';
  const endDate = new Date(p.policy_end_date);
  const now = new Date();
  const diffMs = endDate.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays <= 0) return 'Lapsed';
  if (diffDays <= 60) return 'Renewal Due';
  return 'Current';
};

const RENEWAL_STATUS_DESCRIPTIONS = {
  'Current': 'Active contract, well within coverage term',
  'Renewal Due': 'Active contract expiring within 60 days — renewal decision required',
  'Lapsed': 'Contract has expired — renewal decision pending',
  'Pending Activation': 'Contract approved, awaiting effective date',
};

const getRenewalColor = (status) => {
  if (status === 'Renewal Due') return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  if (status === 'Current') return 'bg-green-500/10 text-green-400 border-green-500/20';
  if (status === 'Lapsed') return 'bg-red-500/10 text-red-400 border-red-500/20';
  if (status === 'Pending Activation') return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
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

const RENEWAL_RISK_LABELS = ['Low', 'Medium', 'High', 'Critical'];
const getRenewalRisk = (p) => {
  if (p.policy_status !== 'Active' || !p.policy_end_date) return null;
  const endDate = new Date(p.policy_end_date);
  const now = new Date();
  const diffDays = (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays <= 0) return null;
  const fraudRate = p.fraud_rate || 0;
  const utilization = p.coverage_utilization || 0;
  let riskScore = 0;
  if (fraudRate >= 15) riskScore += 40;
  else if (fraudRate >= 5) riskScore += 20;
  riskScore += Math.min(utilization, 100) * 0.35;
  if (diffDays <= 60) riskScore += 20;
  else if (diffDays <= 120) riskScore += 10;
  const score = Math.min(100, Math.round(riskScore));
  const level = RENEWAL_RISK_LABELS[score >= 70 ? 3 : score >= 45 ? 2 : score >= 20 ? 1 : 0];
  return { score, level, daysLeft: Math.round(diffDays) };
};

const RENEWAL_RISK_COLORS = { Low: 'bg-green-500/10 text-green-400 border-green-500/20', Medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20', High: 'bg-orange-500/10 text-orange-400 border-orange-500/20', Critical: 'bg-red-500/10 text-red-400 border-red-500/20' };
const RENEWAL_RISK_BG = { Low: 'bg-green-500', Medium: 'bg-amber-500', High: 'bg-orange-500', Critical: 'bg-red-500' };

function generateFallbackPolicies() {
  const patientNames = CANONICAL_PATIENTS.map(p => p.name).concat(['Sarah Johnson','John Smith','Emily Davis','Christopher Lee','Amanda Taylor','Kevin White','Jessica Martin','Thomas Harris','Nicole Clark','Daniel Lewis']);
  const statusPool = Array(CANONICAL_POLICY_BREAKDOWN.active).fill('Active')
    .concat(Array(CANONICAL_POLICY_BREAKDOWN.expired).fill('Expired'))
    .concat(Array(CANONICAL_POLICY_BREAKDOWN.pending).fill('Pending'));
  for (let s = statusPool.length - 1; s > 0; s--) {
    const j = Math.floor(Math.random() * (s + 1));
    [statusPool[s], statusPool[j]] = [statusPool[j], statusPool[s]];
  }
  const providerNames = CANONICAL_PROVIDERS.map(p => p.name);
  const investigators = ['Sarah Mitchell, CFE','James Rodriguez, CFE','Emily Chen, CFE','Mark Thompson, CFE','Lisa Park, CFE'];
  const results = [];
  for (let i = 0; i < 80; i++) {
    const pat = patientNames[i % patientNames.length];
    const profile = COVERAGE_PROFILES[i % COVERAGE_PROFILES.length];
    const status = statusPool[i];

    let startDate, endDate;
    const startDay = Math.floor(Math.random() * 28) + 1;
    if (status === 'Expired') {
      const sM = Math.floor(Math.random() * 5) + 1;
      const dur = Math.floor(Math.random() * 4) + 2;
      const eM = Math.min(6, sM + dur);
      startDate = `2026-${String(sM).padStart(2,'0')}-${String(startDay).padStart(2,'0')}`;
      endDate = `2026-${String(eM).padStart(2,'0')}-${String(Math.min(startDay, 28)).padStart(2,'0')}`;
    } else if (status === 'Pending') {
      const sM = Math.floor(Math.random() * 5) + 8;
      const totalM = sM + 11;
      const eY = totalM > 12 ? 2027 : 2026;
      const eM = totalM > 12 ? totalM - 12 : totalM;
      startDate = `2026-${String(sM).padStart(2,'0')}-${String(startDay).padStart(2,'0')}`;
      endDate = `${eY}-${String(eM).padStart(2,'0')}-${String(Math.min(startDay, 28)).padStart(2,'0')}`;
    } else {
      const sM = Math.floor(Math.random() * 6) + 1;
      const totalM = sM + 12 + Math.floor(Math.random() * 6);
      const eY = totalM > 12 ? 2027 : 2026;
      const eM = totalM > 12 ? totalM - 12 : totalM;
      startDate = `2026-${String(sM).padStart(2,'0')}-${String(startDay).padStart(2,'0')}`;
      endDate = `${eY}-${String(eM).padStart(2,'0')}-${String(Math.min(startDay, 28)).padStart(2,'0')}`;
    }

    const deductible = profile.dedRange[0] + Math.floor(Math.random() * (profile.dedRange[1] - profile.dedRange[0]));
    const annualPremium = profile.premiumRange[0] + Math.floor(Math.random() * (profile.premiumRange[1] - profile.premiumRange[0]));
    const maxCoverage = Math.round(deductible * (15 + Math.random() * 15));
    const claimCount = Math.min(40, Math.max(3, Math.round(8 + Math.random() * 15)));
    const totalBilled = claimCount * (600 + Math.floor(Math.random() * 1200));
    const fraudRand = Math.random();
    let fraudCount;
    if (fraudRand < 0.50) fraudCount = 0;
    else if (fraudRand < 0.75) fraudCount = 1;
    else if (fraudRand < 0.88) fraudCount = 2;
    else if (fraudRand < 0.95) fraudCount = 3;
    else fraudCount = Math.floor(Math.random() * 2) + 4;
    fraudCount = Math.min(claimCount, fraudCount);
    if (claimCount >= 5) fraudCount = Math.min(fraudCount, Math.max(1, Math.floor(claimCount * 0.18)));

    const reviewedBy = (status === 'Expired' || (status === 'Active' && fraudCount > 2))
      ? investigators[Math.floor(Math.random() * investigators.length)]
      : null;
    results.push({
      id: `POL-${String(1000 + i).padStart(4,'0')}`,
      policy_id: `POL-${String(1000 + i).padStart(4,'0')}`,
      policy_number: `POL-2026-${String(10000 + i).padStart(6,'0')}`,
      patient_name: pat,
      patient_id: `PAT-${String(100 + i).padStart(4,'0')}`,
      plan_type: profile.policyType,
      coverage_class: profile.tier,
      provider: providerNames[i % providerNames.length],
      policy_start_date: startDate,
      policy_end_date: endDate,
      start_date: startDate,
      end_date: endDate,
      premium: annualPremium,
      annual_premium: annualPremium,
      annual_deductible: deductible,
      deductible,
      copay_amount: Math.round(deductible * 0.05),
      max_coverage: maxCoverage,
      status,
      policy_status: status,
      claim_count: claimCount,
      total_billed: totalBilled,
      fraud_count: fraudCount,
      fraud_claims: fraudCount,
      risk_score: Math.round((fraudCount / Math.max(1, claimCount)) * 50 + Math.random() * 20),
      last_reviewed_by: reviewedBy,
      last_reviewed_date: reviewedBy ? `2026-${String(Math.floor(Math.random() * 6) + 1).padStart(2,'0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2,'0')}` : null,
      last_reviewed_action: reviewedBy ? (status === 'Expired' ? 'Non-Renewal Recommended' : 'Risk Assessment Completed') : null,
    });
  }
  return results;
}

export default function Policies() {
  const navigate = useNavigate();
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [riskFilter, setRiskFilter] = useState('All');
  const [coverageFilter, setCoverageFilter] = useState('All');
  const [sortBy, setSortBy] = useState('policy_id');
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [claimsForSelected, setClaimsForSelected] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showRiskLegend, setShowRiskLegend] = useState(false);
  const [renewalActions, setRenewalActions] = useState({});

  const fetchPolicies = useCallback(async () => {
    setLoading(true);
    try {
      let res;
      try {
        res = await api.getPolicies();
      } catch (_) { /* fallback */ }
      setPolicies(res && res.length > 0 ? res : generateFallbackPolicies());
    } catch (err) {
      console.error('Failed to load policies', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  useEffect(() => {
    if (!selectedPolicy) { setClaimsForSelected([]); return; }
    const fetchClaims = async () => {
      try {
        let allClaims = [];
        try {
          const res = await api.getClaims({ page_size: 500 });
          allClaims = res?.claims || res?.data || res || [];
        } catch (_) { /* fallback */ }
        const filtered = Array.isArray(allClaims) ? allClaims.filter(c => c.patient_name === selectedPolicy.patient_name) : [];
        setClaimsForSelected(filtered);
      } catch (err) {
        setClaimsForSelected([]);
      }
    };
    fetchClaims();
  }, [selectedPolicy]);

  const processedPolicies = useMemo(() => {
    return policies.map((p) => {
      const fraudDisplay = getFraudRateDisplay(p);
      const premium = getPremium(p);
      const avgClaim = (p.claim_count || 0) > 0 ? (p.total_billed || 0) / p.claim_count : 0;
      const fraudExposureScore = (p.fraud_count || 0) * avgClaim;
      const coverageUtil = Math.min(100, ((p.claim_count || 0) / MAX_EXPECTED_CLAIMS) * 100);
      const daysRemaining = getDaysRemaining(p.policy_end_date);
      const renewalStatus = getRenewalStatus(p);
      const riskScore = fraudDisplay.rate !== null ? getRiskScore(fraudDisplay.rate) : 0.02;
      const riskLevel = getRiskLevel(riskScore);
      const renewalRisk = getRenewalRisk({ ...p, fraud_rate: fraudDisplay.rate, coverage_utilization: coverageUtil });
      const coverageClass = p.coverage_class || 'Silver';
      const policyType = p.plan_type || COVERAGE_PROFILES.find(cp => cp.tier === coverageClass)?.policyType || 'Standard';

      return {
        ...p,
        policy_type: policyType,
        coverage_class: coverageClass,
        annual_premium: premium,
        fraud_rate: fraudDisplay.rate,
        fraud_rate_display: fraudDisplay.display,
        fraud_rate_label: fraudDisplay.label,
        has_enough_data: fraudDisplay.rate !== null,
        fraud_exposure_score: fraudExposureScore,
        coverage_utilization: coverageUtil,
        days_remaining: daysRemaining,
        renewal_status: renewalStatus,
        risk_score: riskScore,
        risk_level: riskLevel,
        renewal_risk: renewalRisk,
        last_reviewed_by: p.last_reviewed_by || null,
        last_reviewed_date: p.last_reviewed_date || null,
        last_reviewed_action: p.last_reviewed_action || (p.last_reviewed_by ? 'Risk Assessment Completed' : null),
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
        (p.coverage_class || '').toLowerCase().includes(term) ||
        (p.patient_id || '').toLowerCase().includes(term);

      const matchStatus =
        statusFilter === 'All' ||
        (statusFilter === 'Active' && p.policy_status === 'Active') ||
        (statusFilter === 'Expired' && p.policy_status === 'Expired') ||
        (statusFilter === 'Pending' && p.policy_status === 'Pending');

      const matchCoverage = coverageFilter === 'All' || p.coverage_class === coverageFilter;

      let matchRisk = true;
      if (riskFilter === 'Critical') matchRisk = p.has_enough_data && (p.fraud_rate || 0) >= 25;
      else if (riskFilter === 'High') matchRisk = p.has_enough_data && (p.fraud_rate || 0) >= 15 && (p.fraud_rate || 0) < 25;
      else if (riskFilter === 'Medium') matchRisk = p.has_enough_data && (p.fraud_rate || 0) >= 5 && (p.fraud_rate || 0) < 15;
      else if (riskFilter === 'Low') matchRisk = p.has_enough_data && (p.fraud_rate || 0) > 0 && (p.fraud_rate || 0) < 5;
      else if (riskFilter === 'Minimal') matchRisk = !p.has_enough_data || (p.fraud_rate || 0) === 0;

      return matchSearch && matchStatus && matchCoverage && matchRisk;
    });

    result.sort((a, b) => {
      switch (sortBy) {
        case 'policy_id': return (a.policy_id || '').localeCompare(b.policy_id || '');
        case 'premium': return (b.annual_premium || 0) - (a.annual_premium || 0);
        case 'claims': return (b.claim_count || 0) - (a.claim_count || 0);
        case 'fraud_rate': return ((b.fraud_rate || 0) - (a.fraud_rate || 0));
        case 'end_date': return new Date(a.policy_end_date || 0) - new Date(b.policy_end_date || 0);
        case 'renewal_risk': return ((b.renewal_risk?.score || 0) - (a.renewal_risk?.score || 0));
        default: return 0;
      }
    });

    return result;
  }, [processedPolicies, searchTerm, statusFilter, riskFilter, coverageFilter, sortBy]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter, riskFilter, coverageFilter, sortBy, pageSize]);

  const activePolicies = policies.filter((p) => p.policy_status === 'Active');
  const expiredPolicies = policies.filter((p) => p.policy_status === 'Expired');
  const pendingPolicies = policies.filter((p) => p.policy_status === 'Pending');
  const totalActive = activePolicies.length;
  const totalExpired = expiredPolicies.length;
  const totalPending = pendingPolicies.length;
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

  const policiesWithFraudData = processedPolicies.filter(p => p.has_enough_data);
  const avgFraudRate = policiesWithFraudData.length > 0
    ? policiesWithFraudData.reduce((sum, p) => sum + (p.fraud_rate || 0), 0) / policiesWithFraudData.length
    : 0;

  const policiesUpForRenewal = processedPolicies.filter(p => p.policy_status === 'Active' && p.renewal_risk !== null);
  const highRenewalRisk = policiesUpForRenewal.filter(p => p.renewal_risk.level === 'High' || p.renewal_risk.level === 'Critical');

  const atRiskByClass = useMemo(() => {
    const counts = { Platinum: 0, Gold: 0, Silver: 0, Bronze: 0 };
    highRenewalRisk.forEach(p => { if (counts[p.coverage_class] !== undefined) counts[p.coverage_class]++; });
    return counts;
  }, [highRenewalRisk]);

  const trendData = useMemo(() => {
    return CANONICAL_MONTHLY_TRENDS.map(t => ({
      month: t.month,
      premiumPool: Math.round(t.amount * 0.35),
      fraudExposure: Math.round(t.fraud_claims * 12500 * 0.8),
    }));
  }, []);

  const handleRenewalDecision = useCallback((policyId, decision) => {
    setRenewalActions(prev => ({ ...prev, [policyId]: decision }));
    const policy = processedPolicies.find(p => p.policy_id === policyId);
    const actionLabel = decision === 'approve' ? 'Approved for Renewal' : decision === 'deny' ? 'Non-Renewal Approved' : 'Premium Adjustment Scheduled';
    alert(`Policy ${policyId} (${policy?.patient_name}):\n\nAction: ${actionLabel}\nRisk Level: ${policy?.renewal_risk?.level} (${policy?.renewal_risk?.score}%)\nFraud Rate: ${policy?.has_enough_data ? policy.fraud_rate_display : 'Insufficient Data'}\n\nThis decision has been logged in the audit trail.`);
  }, [processedPolicies]);

  const exportCSV = useCallback(() => {
    const headers = [
      'Policy ID', 'Patient Name', 'Patient ID', 'Plan Type', 'Coverage Class',
      'Annual Premium', 'Annual Deductible', 'Copay', 'Claim Count', 'Total Billed',
      'Fraud Rate %', 'Fraud Exposure Score', 'Risk Level', 'Start Date', 'End Date',
      'Days Remaining', 'Contract Phase', 'Renewal Risk', 'Coverage Utilization %', 'Status', 'Last Reviewed By', 'Last Reviewed Action'
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
      p.has_enough_data ? (p.fraud_rate || 0).toFixed(2) : 'N/A',
      p.fraud_exposure_score.toFixed(2),
      p.risk_level.label,
      p.policy_start_date || '',
      p.policy_end_date || '',
      p.days_remaining ?? '',
      p.renewal_status,
      p.renewal_risk ? `${p.renewal_risk.level} (${p.renewal_risk.score})` : 'N/A',
      p.coverage_utilization.toFixed(1),
      p.policy_status,
      p.last_reviewed_by || '',
      p.last_reviewed_action || ''
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
      labels: ['Active', 'Expired', 'Pending'],
      values: [totalActive, totalExpired, totalPending],
      type: 'pie',
      hole: 0.65,
      marker: { colors: ['#22c55e', '#ef4444', '#f59e0b'] },
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
      text: `${policies.length}`,
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
      marker: { color: '#6366f1', line: { width: 0 } },
      hovertemplate: '%{x}<br>Premium: $%{y:,.0f}<extra></extra>'
    },
    {
      x: top10Policies.map((p) => p.policy_id),
      y: top10Policies.map((p) => p.annual_deductible || 0),
      type: 'bar',
      name: 'Deductible',
      marker: { color: '#f97316', line: { width: 0 } },
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
      gridcolor: 'rgba(226,232,240,0.05)',
      categoryorder: 'array',
      categoryarray: top10Policies.map((p) => p.policy_id)
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
      text: processedPolicies.map((p) => `${p.policy_id}<br>${p.patient_name || 'N/A'}<br>Claims: ${p.claim_count || 0}<br>Billed: $${(p.total_billed || 0).toLocaleString()}<br>Fraud: ${p.has_enough_data ? (p.fraud_rate || 0).toFixed(1) + '%' : 'Insufficient'}`),
      mode: 'markers',
      type: 'scatter',
      name: 'Policies',
      marker: {
        size: processedPolicies.map((p) => Math.max(8, Math.min(30, (p.total_billed || 0) / 5000))),
        color: processedPolicies.map((p) => p.has_enough_data ? (p.fraud_rate || 0) : 0),
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

  const trendChartData = [
    {
      x: trendData.map(t => t.month),
      y: trendData.map(t => t.premiumPool),
      type: 'scatter',
      mode: 'lines+markers',
      name: 'Premium Pool',
      line: { color: '#6366f1', width: 2 },
      marker: { size: 5, color: '#6366f1' },
      hovertemplate: '%{x}<br>Premium: $%{y:,.0f}<extra></extra>',
      yaxis: 'y'
    },
    {
      x: trendData.map(t => t.month),
      y: trendData.map(t => t.fraudExposure),
      type: 'scatter',
      mode: 'lines+markers',
      name: 'Fraud Exposure',
      line: { color: '#ef4444', width: 2, dash: 'dot' },
      marker: { size: 5, color: '#ef4444' },
      hovertemplate: '%{x}<br>Fraud Exposure: $%{y:,.0f}<extra></extra>',
      yaxis: 'y2'
    }
  ];
  const trendChartLayout = {
    margin: { t: 15, r: 10, l: 55, b: 40 },
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    xaxis: { tickfont: { color: '#94a3b8', size: 9 }, tickangle: -35 },
    yaxis: {
      title: { text: 'Premium ($)', font: { color: '#6366f1', size: 10 } },
      tickfont: { color: '#6366f1', size: 9 },
      gridcolor: 'rgba(226,232,240,0.06)',
      tickprefix: '$'
    },
    yaxis2: {
      title: { text: 'Fraud ($)', font: { color: '#ef4444', size: 10 } },
      tickfont: { color: '#ef4444', size: 9 },
      overlaying: 'y',
      side: 'right',
      gridcolor: 'transparent',
      tickprefix: '$'
    },
    legend: { orientation: 'h', y: -0.35, font: { color: '#94a3b8', size: 10 } },
    height: 240
  };

  const atRiskClassData = [
    {
      x: Object.keys(atRiskByClass).filter(k => atRiskByClass[k] > 0),
      y: Object.keys(atRiskByClass).filter(k => atRiskByClass[k] > 0).map(k => atRiskByClass[k]),
      type: 'bar',
      marker: {
        color: Object.keys(atRiskByClass).filter(k => atRiskByClass[k] > 0).map(k => {
          if (k === 'Platinum') return '#a855f7';
          if (k === 'Gold') return '#eab308';
          if (k === 'Silver') return '#94a3b8';
          return '#d97706';
        }),
        line: { width: 0 }
      },
      text: Object.keys(atRiskByClass).filter(k => atRiskByClass[k] > 0).map(k => `${atRiskByClass[k]}`),
      textposition: 'outside',
      textfont: { color: '#e2e8f0', size: 12, family: 'monospace' },
      hovertemplate: '%{x}: %{y} at-risk policies<extra></extra>'
    }
  ];
  const atRiskClassLayout = {
    margin: { t: 10, r: 10, l: 30, b: 30 },
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    xaxis: { tickfont: { color: '#94a3b8', size: 10, family: 'monospace' } },
    yaxis: { tickfont: { color: '#94a3b8', size: 9 }, gridcolor: 'rgba(226,232,240,0.06)', dtick: 1 },
    height: 160,
    showlegend: false
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-5">
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
            <p className="text-[10px] uppercase font-bold text-green-500 tracking-wider">Active</p>
            <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center">
              <ShieldCheck size={15} className="text-green-500" />
            </div>
          </div>
          <p className="text-3xl font-black text-green-500 font-mono">{formatNumber(totalActive)}</p>
          <p className="mt-1 text-[11px] text-textSecondary">Currently active</p>
        </div>

        <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm group hover:border-red-500/30 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] uppercase font-bold text-red-500 tracking-wider">Expired</p>
            <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center">
              <AlertCircle size={15} className="text-red-500" />
            </div>
          </div>
          <p className="text-3xl font-black text-red-500 font-mono">{formatNumber(totalExpired)}</p>
          <p className="mt-1 text-[11px] text-textSecondary">Lapsed contracts</p>
        </div>

        <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm group hover:border-amber-500/30 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">Pending</p>
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Clock size={15} className="text-amber-400" />
            </div>
          </div>
          <p className="text-3xl font-black text-amber-400 font-mono">{formatNumber(totalPending)}</p>
          <p className="mt-1 text-[11px] text-textSecondary">Awaiting activation</p>
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

        <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm group hover:border-red-500/30 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] uppercase font-bold text-red-400 tracking-wider">Avg Fraud Rate</p>
            <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center">
              <AlertTriangle size={15} className="text-red-400" />
            </div>
          </div>
          <p className="text-3xl font-black text-red-400 font-mono">{formatPercent(avgFraudRate)}</p>
          <p className="mt-1 text-[11px] text-textSecondary">{policiesWithFraudData.length} policies rated</p>
        </div>

        <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm group hover:border-orange-500/30 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] uppercase font-bold text-orange-400 tracking-wider">Fraud Exposure</p>
            <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <TrendingUp size={15} className="text-orange-400" />
            </div>
          </div>
          <p className="text-3xl font-black text-orange-400 font-mono">{formatCompactCurrency(fraudExposure)}</p>
          <p className="mt-1 text-[11px] text-textSecondary">Weighted fraud amount</p>
        </div>
      </div>

      {/* Charts Row 1: Donut + Premium vs Deductible */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Activity size={15} className="text-primary" />
            <h3 className="text-sm font-bold text-textPrimary">Coverage Status</h3>
          </div>
          <p className="text-xs text-textSecondary mb-3">Policy status distribution across all {policies.length} contracts</p>
          <PlotlyChart data={coverageDonutData} layout={coverageDonutLayout} />
        </div>

        <div className="lg:col-span-2 bg-surface border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={15} className="text-primary" />
            <h3 className="text-sm font-bold text-textPrimary">Premium vs Deductible</h3>
          </div>
          <p className="text-xs text-textSecondary mb-3">Top 10 policies by annual premium — tier-based cost structure</p>
          <PlotlyChart data={premiumBarData} layout={premiumBarLayout} />
        </div>
      </div>

      {/* Charts Row 2: Trend + Renewal Risk + Scatter */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <BarChart2 size={15} className="text-primary" />
            <h3 className="text-sm font-bold text-textPrimary">Monthly Trend</h3>
          </div>
          <p className="text-xs text-textSecondary mb-3">Premium pool and fraud exposure evolution</p>
          <PlotlyChart data={trendChartData} layout={trendChartLayout} />
        </div>

        <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <RefreshCw size={15} className="text-primary" />
            <h3 className="text-sm font-bold text-textPrimary">Policy Renewal Risk</h3>
          </div>
          <p className="text-xs text-textSecondary mb-4">Fraud-linked renewal risk for underwriting decisions</p>
          {policiesUpForRenewal.length > 0 ? (
            <div className="space-y-3">
              <div className="bg-bg rounded-xl p-4 border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-black font-mono text-textPrimary">{highRenewalRisk.length}</p>
                    <p className="text-[10px] uppercase font-bold text-textSecondary">At-Risk Policies</p>
                  </div>
                  <div className="text-right">
                    {Object.entries(atRiskByClass).filter(([,v]) => v > 0).length > 0 && (
                      <div className="flex flex-wrap gap-1 justify-end">
                        {Object.entries(atRiskByClass).filter(([,v]) => v > 0).map(([cls, cnt]) => (
                          <span key={cls} className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-black border ${getCoverageClassColor(cls)}`}>
                            {cls}: {cnt}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {highRenewalRisk.length > 0 && (
                  <div className="h-28">
                    <PlotlyChart data={atRiskClassData} layout={atRiskClassLayout} />
                  </div>
                )}
              </div>
              <div className="max-h-44 overflow-y-auto space-y-2 pr-1">
                {policiesUpForRenewal.sort((a, b) => (b.renewal_risk?.score || 0) - (a.renewal_risk?.score || 0)).slice(0, 8).map(p => {
                  const r = p.renewal_risk;
                  const action = renewalActions[p.policy_id];
                  return (
                    <div key={p.policy_id} className="bg-bg/50 rounded-xl px-4 py-2.5 border border-border/50 hover:border-border transition-colors space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="font-mono text-xs font-bold text-primary shrink-0">{p.policy_id}</span>
                          <button
                            onClick={() => navigate('/insurance/patients')}
                            className="text-xs text-textPrimary hover:text-primary hover:underline truncate transition-colors"
                            title={`View ${p.patient_name}'s patient profile`}
                          >
                            {p.patient_name}
                          </button>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="w-20 h-1.5 bg-border rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${RENEWAL_RISK_BG[r.level]}`} style={{ width: `${r.score}%` }} />
                          </div>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${RENEWAL_RISK_COLORS[r.level]}`}>
                            {r.level} {r.score}%
                          </span>
                          <span className="text-[10px] font-mono text-textSecondary">{r.daysLeft}d</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pl-[76px]">
                        {action ? (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            action === 'approve' ? 'bg-green-500/10 text-green-400' :
                            action === 'deny' ? 'bg-red-500/10 text-red-400' :
                            'bg-amber-500/10 text-amber-400'
                          }`}>
                            {action === 'approve' ? '✓ Renewed' : action === 'deny' ? '✕ Non-Renewed' : '↻ Adjusted'}
                          </span>
                        ) : (
                          <>
                            <button
                              onClick={() => handleRenewalDecision(p.policy_id, 'approve')}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors text-[10px] font-bold"
                              title="Approve renewal"
                            >
                              <CheckCircle size={11} /> Approve
                            </button>
                            <button
                              onClick={() => handleRenewalDecision(p.policy_id, 'deny')}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors text-[10px] font-bold"
                              title="Deny renewal"
                            >
                              <XCircle size={11} /> Deny
                            </button>
                            <button
                              onClick={() => handleRenewalDecision(p.policy_id, 'adjust')}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors text-[10px] font-bold"
                              title="Adjust premium"
                            >
                              <Settings2 size={11} /> Adjust
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-textSecondary text-sm">No policies up for renewal</div>
          )}
        </div>

        <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign size={15} className="text-primary" />
            <h3 className="text-sm font-bold text-textPrimary">Claim Utilization</h3>
          </div>
          <p className="text-xs text-textSecondary mb-3">Claims count vs total billed per policy (color = fraud rate)</p>
          <PlotlyChart data={scatterData} layout={scatterLayout} />
        </div>
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

        {/* Risk Level Legend */}
        <div className="mb-4 bg-bg/50 rounded-xl border border-border p-3">
          <button
            onClick={() => setShowRiskLegend(!showRiskLegend)}
            className="flex items-center gap-2 text-xs font-bold text-textSecondary hover:text-textPrimary transition-colors w-full"
          >
            <Info size={13} />
            <span>Risk Level Thresholds</span>
            <span className="text-[10px] ml-auto text-textSecondary">{showRiskLegend ? 'Hide' : 'Show'}</span>
          </button>
          {showRiskLegend && (
            <div className="mt-3 grid grid-cols-5 gap-2">
              {RISK_TIER_THRESHOLDS.map(tier => (
                <div key={tier.label} className={`rounded-lg p-2 border ${tier.bg} ${tier.border}`}>
                  <p className={`text-[10px] font-black uppercase ${tier.color}`}>{tier.label}</p>
                  <p className="text-[9px] text-textSecondary mt-0.5">
                    {tier.label === 'Minimal' ? '0% fraud' :
                     tier.label === 'Low' ? '1–4% fraud' :
                     `${tier.fraudMin}+% fraud`}
                  </p>
                  <p className="text-[9px] text-textSecondary">Score ≥ {tier.scoreMin}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
            <input
              type="text"
              placeholder="Search by Policy ID, Patient Name, Type, or Class..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-bg border border-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-textPrimary placeholder-textSecondary/60 focus:border-primary outline-none transition-colors"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-bg border border-border px-4 py-2.5 rounded-xl text-sm font-bold text-textPrimary outline-none w-full lg:w-36 cursor-pointer"
          >
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Expired">Expired</option>
            <option value="Pending">Pending</option>
          </select>
          <select
            value={coverageFilter}
            onChange={(e) => setCoverageFilter(e.target.value)}
            className="bg-bg border border-border px-4 py-2.5 rounded-xl text-sm font-bold text-textPrimary outline-none w-full lg:w-40 cursor-pointer"
          >
            <option value="All">All Classes</option>
            <option value="Platinum">Platinum</option>
            <option value="Gold">Gold</option>
            <option value="Silver">Silver</option>
            <option value="Bronze">Bronze</option>
          </select>
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="bg-bg border border-border px-4 py-2.5 rounded-xl text-sm font-bold text-textPrimary outline-none w-full lg:w-44 cursor-pointer"
          >
            <option value="All">All Risk Levels</option>
            <option value="Critical">Critical (&ge;25%)</option>
            <option value="High">High (15–24%)</option>
            <option value="Medium">Medium (5–14%)</option>
            <option value="Low">Low (1–4%)</option>
            <option value="Minimal">Minimal (0%)</option>
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
            <option value="renewal_risk">Sort by Renewal Risk</option>
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
                <th>Plan Type</th>
                <th>Coverage Class</th>
                <th>Annual Premium</th>
                <th>Utilization</th>
                <th>Claims</th>
                <th>Total Billed</th>
                <th>Fraud Rate</th>
                <th>Fraud Exposure</th>
                <th>Risk Level</th>
                <th>Effective</th>
                <th>Expiration</th>
                <th>Contract Phase</th>
                <th>Last Reviewed</th>
                <th>Status</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((policy) => {
                const r = policy.renewal_risk;
                return (
                  <tr key={policy.policy_id} className="hover:bg-bg/40 transition-colors">
                    <td>
                      <button
                        onClick={() => navigate(`/insurance/policies/${policy.policy_id}`)}
                        className="font-mono text-xs font-black text-primary hover:underline text-left"
                      >
                        {policy.policy_id}
                      </button>
                    </td>
                    <td>
                      <button
                        onClick={() => navigate('/insurance/patients')}
                        className="font-bold text-textPrimary text-sm hover:text-primary hover:underline text-left transition-colors"
                        title={`View ${policy.patient_name}'s patient profile and claim history`}
                      >
                        {policy.patient_name || policy.patient_id}
                      </button>
                    </td>
                    <td>
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase border ${getPolicyTypeColor(policy.policy_type)}`}>
                        {policy.policy_type}
                      </span>
                    </td>
                    <td>
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase border ${getCoverageClassColor(policy.coverage_class)}`}>
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
                      {policy.has_enough_data ? (
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          (policy.fraud_rate || 0) >= 25 ? 'bg-red-500/10 text-red-500' :
                          (policy.fraud_rate || 0) >= 15 ? 'bg-orange-500/10 text-orange-500' :
                          (policy.fraud_rate || 0) >= 5 ? 'bg-amber-500/10 text-amber-500' :
                          (policy.fraud_rate || 0) > 0 ? 'bg-blue-500/10 text-blue-500' :
                          'bg-emerald-500/10 text-emerald-500'
                        }`}>
                          {policy.fraud_rate_display}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-500/10 px-2 py-0.5 rounded border border-slate-500/20">
                          {policy.fraud_rate_display}
                        </span>
                      )}
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
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${policy.risk_level.bg} ${policy.risk_level.color} border ${policy.risk_level.border}`}>
                        {policy.risk_level.label}
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
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase border ${getRenewalColor(policy.renewal_status)}`}
                        title={RENEWAL_STATUS_DESCRIPTIONS[policy.renewal_status]}>
                        {policy.renewal_status === 'Renewal Due' ? '⚠ Renewal Due' : policy.renewal_status}
                      </span>
                    </td>
                    <td>
                      {policy.last_reviewed_by ? (
                        <div className="text-[10px]" title={policy.last_reviewed_action || 'Risk Assessment Completed'}>
                          <span className="font-bold text-textPrimary">{policy.last_reviewed_by.split(',')[0]}</span>
                          <span className="block text-textSecondary text-[9px]">{policy.last_reviewed_action || 'Risk Assessment'}</span>
                          {policy.last_reviewed_date && (
                            <span className="block text-textSecondary font-mono text-[9px]">{policy.last_reviewed_date}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-textSecondary italic">Not reviewed</span>
                      )}
                    </td>
                    <td>
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${
                        policy.policy_status === 'Expired'
                          ? 'bg-red-500/10 text-red-500'
                          : policy.policy_status === 'Pending'
                          ? 'bg-amber-500/10 text-amber-500'
                          : 'bg-green-500/10 text-green-500'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          policy.policy_status === 'Expired' ? 'bg-red-500' :
                          policy.policy_status === 'Pending' ? 'bg-amber-500' : 'bg-green-500'
                        }`} />
                        {policy.policy_status}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => navigate(`/insurance/policies/${policy.policy_id}`)}
                          className="p-1.5 rounded-lg hover:bg-primary/10 text-textSecondary hover:text-primary transition-colors"
                          title="View Policy Details"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => navigate('/insurance/patients')}
                          className="p-1.5 rounded-lg hover:bg-indigo-500/10 text-textSecondary hover:text-indigo-400 transition-colors"
                          title="View Patient Profile & Claims"
                        >
                          <ExternalLink size={14} />
                        </button>
                        <button
                          onClick={() => alert(`Escalated: Policy ${policy.policy_id} (${policy.patient_name}) flagged for underwriting review.\n\nRisk Level: ${policy.risk_level.label}\nFraud Rate: ${policy.has_enough_data ? policy.fraud_rate_display : 'Insufficient Data'}\nStatus: ${policy.policy_status}\nContract Phase: ${policy.renewal_status}`)}
                          className="p-1.5 rounded-lg hover:bg-amber-500/10 text-textSecondary hover:text-amber-400 transition-colors"
                          title="Flag for Underwriting Review"
                        >
                          <AlertTriangle size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan="17" className="px-6 py-12 text-center text-sm text-textSecondary italic">
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
            className="bg-surface border border-border rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-border px-6 py-4 flex items-center justify-between sticky top-0 bg-surface rounded-t-2xl z-10">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-black text-textPrimary">Policy {selectedPolicy.policy_id}</h3>
                {selectedPolicy.renewal_risk && (
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${RENEWAL_RISK_COLORS[selectedPolicy.renewal_risk.level]}`}>
                    Renewal Risk: {selectedPolicy.renewal_risk.level}
                  </span>
                )}
              </div>
              <button
                onClick={() => setSelectedPolicy(null)}
                className="text-textSecondary hover:text-textPrimary text-xl leading-none p-1 hover:bg-bg rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20">
                  <FileText size={28} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h4 className="text-xl font-black text-primary font-mono">{selectedPolicy.policy_id}</h4>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${
                      selectedPolicy.policy_status === 'Expired'
                        ? 'bg-red-500/10 text-red-500' :
                      selectedPolicy.policy_status === 'Pending'
                        ? 'bg-amber-500/10 text-amber-500' :
                        'bg-green-500/10 text-green-500'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${
                        selectedPolicy.policy_status === 'Expired' ? 'bg-red-500' :
                        selectedPolicy.policy_status === 'Pending' ? 'bg-amber-500' : 'bg-green-500'
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

              <div>
                <h5 className="text-xs font-black uppercase text-textSecondary tracking-wider mb-3 flex items-center gap-2">
                  <ShieldCheck size={14} className="text-primary" />
                  Coverage Details
                </h5>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-bg/50 rounded-xl p-4 border border-border">
                  <div>
                    <p className="text-[10px] font-black uppercase text-textSecondary">Plan Type</p>
                    <p className="mt-1">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase border ${getPolicyTypeColor(selectedPolicy.policy_type)}`}>
                        {selectedPolicy.policy_type}
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-textSecondary">Coverage Class</p>
                    <p className="mt-1">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase border ${getCoverageClassColor(selectedPolicy.coverage_class)}`}>
                        {selectedPolicy.coverage_class}
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-textSecondary">Annual Premium</p>
                    <p className="font-bold text-primary font-mono text-sm mt-1">{formatCurrency(selectedPolicy.annual_premium)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-textSecondary">Max Coverage</p>
                    <p className="font-bold text-textPrimary font-mono text-sm mt-1">{formatCurrency(selectedPolicy.max_coverage)}</p>
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
                  <div>
                    <p className="text-[10px] font-black uppercase text-textSecondary">Provider</p>
                    <p className="font-semibold text-textPrimary text-sm mt-1 truncate">{selectedPolicy.provider || 'N/A'}</p>
                  </div>
                </div>
              </div>

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
                      {selectedPolicy.has_enough_data ? (
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          (selectedPolicy.fraud_rate || 0) >= 25 ? 'bg-red-500/10 text-red-500' :
                          (selectedPolicy.fraud_rate || 0) >= 15 ? 'bg-orange-500/10 text-orange-500' :
                          (selectedPolicy.fraud_rate || 0) >= 5 ? 'bg-amber-500/10 text-amber-500' :
                          (selectedPolicy.fraud_rate || 0) > 0 ? 'bg-blue-500/10 text-blue-500' :
                          'bg-emerald-500/10 text-emerald-500'
                        }`}>
                          {selectedPolicy.fraud_rate_display}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-500/10 px-2 py-0.5 rounded border border-slate-500/20">
                          {selectedPolicy.fraud_rate_display}
                        </span>
                      )}
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

              {selectedPolicy.renewal_risk && (
                <div>
                  <h5 className="text-xs font-black uppercase text-textSecondary tracking-wider mb-3 flex items-center gap-2">
                    <RefreshCw size={14} className="text-primary" />
                    Renewal Risk Assessment
                  </h5>
                  <div className="bg-bg/50 rounded-xl p-4 border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-textSecondary">Renewal Risk Score</span>
                      <span className={`text-xs font-black ${RENEWAL_RISK_COLORS[selectedPolicy.renewal_risk.level].split(' ')[1] || 'text-textSecondary'}`}>
                        {selectedPolicy.renewal_risk.score}% — {selectedPolicy.renewal_risk.level}
                      </span>
                    </div>
                    <div className="w-full h-3 bg-border rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          selectedPolicy.renewal_risk.score >= 70 ? 'bg-gradient-to-r from-red-500 to-red-600' :
                          selectedPolicy.renewal_risk.score >= 45 ? 'bg-gradient-to-r from-orange-500 to-amber-500' :
                          selectedPolicy.renewal_risk.score >= 20 ? 'bg-gradient-to-r from-amber-500 to-yellow-500' :
                          'bg-gradient-to-r from-green-500 to-green-400'
                        }`}
                        style={{ width: `${selectedPolicy.renewal_risk.score}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[9px] text-green-500 font-bold">Low</span>
                      <span className="text-[9px] text-amber-500 font-bold">Medium</span>
                      <span className="text-[9px] text-orange-500 font-bold">High</span>
                      <span className="text-[9px] text-red-500 font-bold">Critical</span>
                    </div>
                    <p className="text-[11px] text-textSecondary mt-3">
                      {selectedPolicy.renewal_risk.daysLeft} days until policy end.
                      {selectedPolicy.has_enough_data && selectedPolicy.fraud_rate > 5 && ' Elevated fraud rate increases non-renewal probability.'}
                      {selectedPolicy.coverage_utilization > 80 && ' High coverage utilization may require premium adjustment.'}
                    </p>
                  </div>
                </div>
              )}

              {claimsForSelected.length > 0 && (
                <div>
                  <h5 className="text-xs font-black uppercase text-textSecondary tracking-wider mb-3 flex items-center gap-2">
                    <Clock size={14} className="text-primary" />
                    Associated Claims ({claimsForSelected.length})
                  </h5>
                  <div className="bg-bg/50 rounded-xl border border-border overflow-hidden">
                    <table className="enterprise-table">
                      <thead>
                        <tr><th>Claim ID</th><th>Date</th><th>Service</th><th>Amount</th><th>Status</th></tr>
                      </thead>
                      <tbody>
                        {claimsForSelected.slice(0, 10).map(claim => (
                          <tr key={claim.claim_id || claim.id}>
                            <td className="font-mono text-xs font-bold text-textSecondary">#{claim.claim_id || claim.id}</td>
                            <td className="text-xs text-textSecondary">{claim.claim_date}</td>
                            <td className="text-xs text-textSecondary">{claim.service_name || 'N/A'}</td>
                            <td className="font-mono text-xs font-bold text-textPrimary">{formatCurrency(claim.claim_amount || claim.amount)}</td>
                            <td><span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border ${claim.status ? 'bg-primary/10 text-primary border-primary/20' : ''}`}>{claim.status || 'N/A'}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div>
                <h5 className="text-xs font-black uppercase text-textSecondary tracking-wider mb-3 flex items-center gap-2">
                  <ShieldCheck size={14} className="text-primary" />
                  Risk Assessment
                </h5>
                <div className="bg-bg/50 rounded-xl p-4 border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-textSecondary">Fraud Risk Score</span>
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

              <div>
                <h5 className="text-xs font-black uppercase text-textSecondary tracking-wider mb-3 flex items-center gap-2">
                  <Clock size={14} className="text-primary" />
                  Audit Trail
                </h5>
                <div className="bg-bg/50 rounded-xl p-4 border border-border space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs font-bold text-textPrimary">Policy Created</p>
                      <p className="text-[10px] text-textSecondary">Policy {selectedPolicy.policy_id} issued on {selectedPolicy.policy_start_date ? new Date(selectedPolicy.policy_start_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}</p>
                    </div>
                    <span className="text-[9px] font-mono text-textSecondary">System</span>
                  </div>
                  {selectedPolicy.last_reviewed_by && (
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs font-bold text-textPrimary">{selectedPolicy.last_reviewed_action || 'Underwriting Review'}</p>
                        <p className="text-[10px] text-textSecondary">Reviewed by {selectedPolicy.last_reviewed_by} — Risk Level assessed as {selectedPolicy.risk_level.label}</p>
                      </div>
                      <span className="text-[9px] font-mono text-textSecondary">{selectedPolicy.last_reviewed_date || 'N/A'}</span>
                    </div>
                  )}
                  {selectedPolicy.policy_status === 'Expired' && (
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs font-bold text-textPrimary">Policy Lapsed</p>
                        <p className="text-[10px] text-textSecondary">Coverage ended on {selectedPolicy.policy_end_date ? new Date(selectedPolicy.policy_end_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}</p>
                      </div>
                      <span className="text-[9px] font-mono text-textSecondary">System</span>
                    </div>
                  )}
                  {selectedPolicy.renewal_status === 'Renewal Due' && (
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs font-bold text-textPrimary">Renewal Due</p>
                        <p className="text-[10px] text-textSecondary">Policy expires in {selectedPolicy.days_remaining} days — renewal decision required</p>
                      </div>
                      <span className="text-[9px] font-mono text-textSecondary">System</span>
                    </div>
                  )}
                  {renewalActions[selectedPolicy.policy_id] && (
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full shrink-0 ${
                        renewalActions[selectedPolicy.policy_id] === 'approve' ? 'bg-green-500' :
                        renewalActions[selectedPolicy.policy_id] === 'deny' ? 'bg-red-500' : 'bg-amber-500'
                      }`} />
                      <div className="flex-1">
                        <p className="text-xs font-bold text-textPrimary">
                          {renewalActions[selectedPolicy.policy_id] === 'approve' ? 'Renewal Approved' :
                           renewalActions[selectedPolicy.policy_id] === 'deny' ? 'Non-Renewal Approved' : 'Premium Adjustment Scheduled'}
                        </p>
                        <p className="text-[10px] text-textSecondary">
                          {renewalActions[selectedPolicy.policy_id] === 'approve' ? 'Policy renewed for next coverage period' :
                           renewalActions[selectedPolicy.policy_id] === 'deny' ? 'Coverage will not be renewed at expiration' : 'Premium adjusted based on risk assessment'}
                        </p>
                      </div>
                      <span className="text-[9px] font-mono text-textSecondary">You</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-border px-6 py-4 flex items-center justify-end gap-3 sticky bottom-0 bg-surface rounded-b-2xl">
              <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-bg text-sm font-bold text-textPrimary hover:bg-surface transition-colors">
                <FileText size={15} />
                Generate Report
              </button>
              <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-sm font-bold text-amber-400 hover:bg-amber-500/20 transition-colors">
                <AlertTriangle size={15} />
                Escalate to Underwriting
              </button>
              {selectedPolicy.policy_status === 'Active' && (
                <button
                  onClick={() => {
                    if (selectedPolicy.renewal_status === 'Renewal Due') {
                      handleRenewalDecision(selectedPolicy.policy_id, 'approve');
                      setSelectedPolicy(null);
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-green-500/30 bg-green-500/10 text-sm font-bold text-green-400 hover:bg-green-500/20 transition-colors"
                >
                  <CheckCircle size={15} />
                  Renew Policy
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
