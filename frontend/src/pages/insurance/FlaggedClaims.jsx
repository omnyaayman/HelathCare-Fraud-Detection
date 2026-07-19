import { useState, useEffect, useMemo } from "react";
import {
  Search, Filter, AlertTriangle, ShieldCheck, X, ArrowUpRight, DollarSign,
  User, Building2, FileText, BrainCircuit, Clock, ThumbsUp, ThumbsDown, Send,
  Download, ChevronDown, Activity, Eye, Zap, MapPin, CheckSquare, Square, Trash2
} from "lucide-react";
import api from "../../api";
import Modal from "../../components/Modal";
import Skeleton from "../../components/Skeleton";
import {
  formatCurrency, getRiskLevel, buildSHAPExplanation, getStatusColor,
  getInvestigatorForScore
} from "../../data/dataUtils";

const INVESTIGATORS = [
  "Dr. Sarah Mitchell", "James Rodriguez, CFE", "Dr. Emily Chen",
  "Mark Thompson, CPA", "Lisa Park, CPC", "Dr. Robert Kim",
  "Angela Davis, AHFI", "Dr. Michael O'Brien"
];

const WORKFLOW_STATES = ["Submitted", "Under Review", "Investigating", "Escalated", "Resolved"];

function computeSubScores(claim) {
  const duplicateBilling = (claim.number_of_previous_claims_patient || 0) > 3
    ? Math.min(((claim.number_of_previous_claims_patient - 3) / 12) * 0.5 + 0.5, 1) : 0;
  const providerAnomaly = (claim.provider_patient_distance_miles || 0) > 200
    ? Math.min(((claim.provider_patient_distance_miles - 200) / 400) * 0.5 + 0.5, 1) : 0;
  const diagnosisBase = (claim.diagnosis_code || "").charAt(0);
  const procedureBase = (claim.procedure_code || "").charAt(0);
  const codingAnomaly = (diagnosisBase && procedureBase && diagnosisBase !== procedureBase)
    ? 0.7 + Math.random() * 0.2 : 0.1;
  const amount = claim.claim_amount || 0;
  const outlierDetection = amount > 8000 ? Math.min((amount / 8000 - 1) * 0.3 + 0.6, 1) : amount > 4000 ? 0.35 : 0.1;
  return { duplicateBilling, providerAnomaly, codingAnomaly, outlierDetection };
}

function getInvestigationPriority(score) {
  if (score >= 0.9) return { label: "P1 - Immediate", color: "text-red-400 bg-red-500/10 border-red-500/20" };
  if (score >= 0.75) return { label: "P2 - Urgent", color: "text-orange-400 bg-orange-500/10 border-orange-500/20" };
  if (score >= 0.6) return { label: "P3 - Standard", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" };
  return { label: "P4 - Review", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" };
}

function getRecommendedAction(score, subScores) {
  if (score >= 0.85) {
    if (subScores.duplicateBilling > 0.6) return "Escalate to compliance team. Initiate duplicate billing investigation and request full documentation audit.";
    if (subScores.providerAnomaly > 0.6) return "Immediate provider audit required. Geographic anomaly suggests potential phantom billing. Freeze claim payments.";
    return "Critical fraud risk detected. Escalate to senior investigator. Place payment hold and request emergency review.";
  }
  if (score >= 0.65) {
    if (subScores.codingAnomaly > 0.5) return "Refer for coding review. Diagnosis-procedure mismatch requires specialist validation before claim processing.";
    if (subScores.outlierDetection > 0.5) return "Flagged as financial outlier. Route to audit queue for amount verification against standard fee schedules.";
    return "High-risk claim requires investigation. Schedule review within 48 hours and gather supporting documentation.";
  }
  return "Standard review recommended. Monitor for patterns and cross-reference with patient and provider history.";
}

function exportToCSV(claims) {
  const headers = ["Claim ID", "Patient", "Provider", "Amount", "Fraud Score", "Severity", "Diagnosis", "Procedure", "Date", "Status", "Priority", "Investigator"];
  const rows = claims.map(c => [
    c.claim_id, c.patient_name, c.provider_name, c.claim_amount,
    (c.fraud_score || 0).toFixed(4),
    getRiskLevel(c.fraud_score || 0).label,
    c.diagnosis_code, c.procedure_code, c.service_date, c.status,
    getInvestigationPriority(c.fraud_score || 0).label,
    c._assignedInvestigator || "Unassigned"
  ]);
  const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${v ?? ""}"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `flagged_claims_export_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function ScoreBar({ label, score, color }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] text-textSecondary w-28 shrink-0">{label}</span>
      <div className="flex-1 bg-bg/60 rounded-full h-1.5 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(score * 100, 100)}%` }} />
      </div>
      <span className="text-[10px] font-mono font-bold text-textPrimary w-10 text-right">
        {(score * 100).toFixed(0)}%
      </span>
    </div>
  );
}

export default function FlaggedClaims() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRisk, setFilterRisk] = useState("All");
  const [assignedFilter, setAssignedFilter] = useState("All");
  const [sortBy, setSortBy] = useState("risk_desc");
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [claimDetail, setClaimDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [investigatorMap, setInvestigatorMap] = useState({});
  const [investigationNotes, setInvestigationNotes] = useState("");
  const [workflowStatus, setWorkflowStatus] = useState({});
  const [updateLoading, setUpdateLoading] = useState(false);
  const [selectedClaims, setSelectedClaims] = useState(new Set());
  const [bulkInvestigator, setBulkInvestigator] = useState("");

  useEffect(() => {
    const fetchClaims = async () => {
      try {
        const res = await api.getClaims({ page_size: 500 });
        const data = Array.isArray(res) ? res : (res.data || res?.results || []);
        setClaims(data.filter(c => (c.fraud_score || 0) >= 0.5));
      } catch (err) {
        console.error("Failed to fetch claims:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchClaims();
  }, []);

  const filtered = useMemo(() => {
    let result = [...claims];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        c.claim_id?.toString().includes(q) ||
        c.patient_name?.toLowerCase().includes(q) ||
        c.provider_name?.toLowerCase().includes(q)
      );
    }
    if (filterRisk === "Critical") result = result.filter(c => (c.fraud_score || 0) >= 0.85);
    else if (filterRisk === "High") result = result.filter(c => (c.fraud_score || 0) >= 0.65 && (c.fraud_score || 0) < 0.85);
    else if (filterRisk === "Elevated") result = result.filter(c => (c.fraud_score || 0) >= 0.5 && (c.fraud_score || 0) < 0.65);

    if (assignedFilter === "Assigned") result = result.filter(c => investigatorMap[c.claim_id]);
    else if (assignedFilter === "Unassigned") result = result.filter(c => !investigatorMap[c.claim_id]);

    if (sortBy === "risk_desc") result.sort((a, b) => (b.fraud_score || 0) - (a.fraud_score || 0));
    else if (sortBy === "amount_desc") result.sort((a, b) => (b.claim_amount || 0) - (a.claim_amount || 0));
    else if (sortBy === "date_desc") result.sort((a, b) => new Date(b.service_date || 0) - new Date(a.service_date || 0));

    return result;
  }, [claims, search, filterRisk, assignedFilter, sortBy, investigatorMap]);

  const stats = useMemo(() => {
    const flagged = claims;
    const critical = flagged.filter(c => (c.fraud_score || 0) >= 0.85);
    const high = flagged.filter(c => (c.fraud_score || 0) >= 0.65 && (c.fraud_score || 0) < 0.85);
    const elevated = flagged.filter(c => (c.fraud_score || 0) >= 0.5 && (c.fraud_score || 0) < 0.65);
    const exposure = flagged.reduce((sum, c) => sum + (c.claim_amount || 0), 0);
    return {
      total: flagged.length,
      critical: critical.length,
      high: high.length,
      elevated: elevated.length,
      exposure
    };
  }, [claims]);

  const openInvestigation = async (claim) => {
    setSelectedClaim(claim);
    setShowModal(true);
    setClaimDetail(null);
    setDetailLoading(true);
    setInvestigationNotes("");
    try {
      const res = await api.getClaim(claim.claim_id);
      setClaimDetail(res);
    } catch (err) {
      console.error("Failed to fetch claim detail:", err);
      setClaimDetail({ claim });
    } finally {
      setDetailLoading(false);
    }
  };

  const assignInvestigator = (claimId, investigator) => {
    setInvestigatorMap(prev => ({ ...prev, [claimId]: investigator }));
  };

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
      if (prev.size === filtered.length) return new Set();
      return new Set(filtered.map(c => c.claim_id));
    });
  };

  const bulkAssign = () => {
    if (!bulkInvestigator) return;
    const updates = {};
    selectedClaims.forEach(id => { updates[id] = bulkInvestigator; });
    setInvestigatorMap(prev => ({ ...prev, ...updates }));
    setSelectedClaims(new Set());
    setBulkInvestigator("");
  };

  const handleStatusUpdate = async (claimId, newStatus) => {
    setUpdateLoading(true);
    try {
      await api.updateClaimStatus(claimId, newStatus);
      setClaims(prev => prev.map(c => c.claim_id === claimId ? { ...c, status: newStatus } : c));
      setWorkflowStatus(prev => ({ ...prev, [claimId]: newStatus }));
      if (selectedClaim?.claim_id === claimId) {
        setSelectedClaim(prev => prev ? { ...prev, status: newStatus } : prev);
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setUpdateLoading(false);
    }
  };

  const startInvestigation = () => {
    if (selectedClaim) handleStatusUpdate(selectedClaim.claim_id, "Investigating");
  };

  const escalateToCompliance = () => {
    if (selectedClaim) handleStatusUpdate(selectedClaim.claim_id, "Fraud Confirmed");
  };

  const dismissAlert = () => {
    if (selectedClaim) handleStatusUpdate(selectedClaim.claim_id, "Closed");
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="w-48" />
          <Skeleton className="w-24" />
        </div>
        <div className="flex gap-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} type="card" className="flex-1" />)}
        </div>
        {[...Array(6)].map((_, i) => <Skeleton key={i} type="card" />)}
      </div>
    );
  }

  const detail = claimDetail?.claim || selectedClaim || {};
  const shapData = claimDetail?.shap_contributions
    ? { top_factors: claimDetail.shap_contributions, base_value: claimDetail.base_value || 0.15, prediction: detail.fraud_score || 0 }
    : buildSHAPExplanation(detail);
  const subScores = computeSubScores(detail);
  const priority = getInvestigationPriority(detail.fraud_score || 0);
  const recommendedAction = getRecommendedAction(detail.fraud_score || 0, subScores);
  const currentWorkflow = workflowStatus[detail.claim_id] || detail.status || "Submitted";
  const workflowIndex = WORKFLOW_STATES.indexOf(currentWorkflow);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-textPrimary flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-500/10">
              <AlertTriangle size={22} className="text-red-500" />
            </div>
            Flagged Claims
          </h1>
          <p className="text-sm text-textSecondary font-medium mt-1">
            <span className="font-bold text-textPrimary">{stats.total}</span> suspicious claims detected
          </p>
        </div>
        <button
          onClick={() => exportToCSV(selectedClaims.size > 0 ? filtered.filter(c => selectedClaims.has(c.claim_id)) : filtered)}
          className="enterprise-btn-ghost py-2 px-4 text-xs flex items-center gap-2 border border-border/60"
        >
          <Download size={14} /> {selectedClaims.size > 0 ? `Export Selected (${selectedClaims.size})` : "Export CSV"}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-surface rounded-xl border border-border/80 p-4">
          <p className="text-[9px] font-black uppercase tracking-widest text-textSecondary mb-1">Total Flagged</p>
          <p className="text-xl font-black text-textPrimary">{stats.total}</p>
        </div>
        <div className="bg-surface rounded-xl border border-red-500/20 p-4">
          <p className="text-[9px] font-black uppercase tracking-widest text-red-400 mb-1">Critical (85%+)</p>
          <p className="text-xl font-black text-red-500">{stats.critical}</p>
        </div>
        <div className="bg-surface rounded-xl border border-orange-500/20 p-4">
          <p className="text-[9px] font-black uppercase tracking-widest text-orange-400 mb-1">High (65-85%)</p>
          <p className="text-xl font-black text-orange-500">{stats.high}</p>
        </div>
        <div className="bg-surface rounded-xl border border-amber-500/20 p-4">
          <p className="text-[9px] font-black uppercase tracking-widest text-amber-400 mb-1">Elevated (50-65%)</p>
          <p className="text-xl font-black text-amber-500">{stats.elevated}</p>
        </div>
        <div className="bg-surface rounded-xl border border-danger/20 p-4">
          <p className="text-[9px] font-black uppercase tracking-widest text-danger mb-1">Financial Exposure</p>
          <p className="text-xl font-black text-danger">
            {stats.exposure >= 1000000
              ? `$${(stats.exposure / 1000000).toFixed(1)}M`
              : stats.exposure >= 1000
                ? `$${(stats.exposure / 1000).toFixed(0)}K`
                : formatCurrency(stats.exposure)}
          </p>
        </div>
      </div>

      <div className="bg-surface rounded-2xl border border-border/80 p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
            <input
              type="text"
              placeholder="Search by claim ID, patient, or provider..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="enterprise-input pl-9 w-full text-xs"
            />
          </div>
          <div className="relative">
            <Filter size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary pointer-events-none" />
            <select
              value={filterRisk}
              onChange={e => setFilterRisk(e.target.value)}
              className="enterprise-select text-xs pl-8 pr-8"
            >
              <option value="All">All Severity Levels</option>
              <option value="Critical">Critical (85%+)</option>
              <option value="High">High (65-85%)</option>
              <option value="Elevated">Elevated (50-65%)</option>
            </select>
          </div>
          <select
            value={assignedFilter}
            onChange={e => setAssignedFilter(e.target.value)}
            className="enterprise-select text-xs"
          >
            <option value="All">All Assignments</option>
            <option value="Assigned">Assigned</option>
            <option value="Unassigned">Unassigned</option>
          </select>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="enterprise-select text-xs"
          >
            <option value="risk_desc">Risk Score (Highest)</option>
            <option value="amount_desc">Amount (Highest)</option>
            <option value="date_desc">Date (Newest)</option>
          </select>
          <span className="text-[10px] text-textSecondary font-mono">{filtered.length} results</span>
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((c, idx) => {
          const risk = getRiskLevel(c.fraud_score || 0);
          const sub = computeSubScores(c);
          const assignedInv = investigatorMap[c.claim_id] || null;
          const dupScore = sub.duplicateBilling;
          const provScore = sub.providerAnomaly;
          const codeScore = sub.codingAnomaly;
          const outScore = sub.outlierDetection;
          const isSelected = selectedClaims.has(c.claim_id);

          return (
            <div
              key={c.claim_id}
              className={`group bg-surface rounded-2xl border p-5 transition-all duration-200 animate-fade-in-up ${
                isSelected ? 'border-indigo-500/40 bg-indigo-500/5' : 'border-border/80 hover:border-danger/30 hover:shadow-[0_4px_20px_rgb(239_68_68_/_0.06)]'
              }`}
              style={{ animationDelay: `${idx * 40}ms` }}
            >
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center gap-2 pt-1">
                  <button
                    onClick={() => toggleClaimSelection(c.claim_id)}
                    className="text-textSecondary hover:text-indigo-400 transition-colors"
                  >
                    {isSelected ? <CheckSquare size={16} className="text-indigo-400" /> : <Square size={16} />}
                  </button>
                  <div className={`p-2.5 rounded-xl ${(c.fraud_score || 0) >= 0.85 ? 'bg-red-500/10 text-red-500' : (c.fraud_score || 0) >= 0.65 ? 'bg-orange-500/10 text-orange-500' : 'bg-amber-500/10 text-amber-500'}`}>
                    <AlertTriangle size={18} />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-bold text-textPrimary text-sm">Claim #{c.claim_id}</h3>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${risk.bg} ${risk.color} ${risk.border}`}>
                        {risk.label}
                      </span>
                      {(c.claim_submitted_late || (c.service_date && c.claim_date && new Date(c.claim_date) > new Date(c.service_date).getTime() + 30 * 86400000)) && (
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1">
                          <Clock size={8} /> Late
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-bold text-textPrimary">{formatCurrency(c.claim_amount)}</span>
                      <span className="text-xs font-bold font-mono" style={{ color: (c.fraud_score || 0) >= 0.85 ? '#ef4444' : (c.fraud_score || 0) >= 0.65 ? '#f97316' : '#f59e0b' }}>
                        {((c.fraud_score || 0) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[10px] text-textSecondary">
                    <span className="flex items-center gap-1"><User size={10} /> {c.patient_name || 'Unknown Patient'}</span>
                    <span className="flex items-center gap-1"><Building2 size={10} /> {c.provider_name || 'Unknown Provider'}</span>
                    <span className="flex items-center gap-1"><FileText size={10} /> {c.service_name || c.diagnosis_code || 'N/A'}</span>
                    {c.number_of_procedures > 1 && (
                      <span className="flex items-center gap-1"><Zap size={10} /> {c.number_of_procedures} procedures</span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 mt-3">
                    {dupScore > 0.3 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                        <Activity size={9} /> Duplicate: {(dupScore * 100).toFixed(0)}%
                      </span>
                    )}
                    {provScore > 0.3 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20">
                        <MapPin size={9} /> Provider Anomaly: {(provScore * 100).toFixed(0)}%
                      </span>
                    )}
                    {codeScore > 0.4 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        <FileText size={9} /> Coding: {(codeScore * 100).toFixed(0)}%
                      </span>
                    )}
                    {outScore > 0.3 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <DollarSign size={9} /> Outlier: {(outScore * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>

                  <div className="mt-3 p-2.5 rounded-lg bg-bg/40 border border-border/40">
                    <p className="text-[10px] text-textSecondary leading-relaxed">
                      <span className="font-bold text-textPrimary">Recommended:</span> {getRecommendedAction(c.fraud_score || 0, sub)}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-3 pt-3 border-t border-border/40">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-[9px] font-bold text-textSecondary uppercase tracking-wider">Severity:</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${risk.bg} ${risk.color} ${risk.border}`}>
                        {risk.label}
                      </span>
                      <span className="text-[9px] font-bold text-textSecondary uppercase tracking-wider">Priority:</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${getInvestigationPriority(c.fraud_score || 0).color}`}>
                        {getInvestigationPriority(c.fraud_score || 0).label}
                      </span>
                      <span className="text-[9px] font-bold text-textSecondary uppercase tracking-wider">Status:</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${getStatusColor(c.status || 'Submitted')}`}>
                        {c.status || "Submitted"}
                      </span>
                      {assignedInv && (
                        <>
                          <span className="text-[9px] font-bold text-textSecondary uppercase tracking-wider">Investigator:</span>
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                            <User size={8} /> {assignedInv}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <select
                          value={investigatorMap[c.claim_id] || ""}
                          onChange={e => assignInvestigator(c.claim_id, e.target.value)}
                          className="enterprise-select text-[10px] py-1.5 pl-2 pr-6 min-w-[160px]"
                        >
                          <option value="">Assign Investigator</option>
                          {INVESTIGATORS.map(inv => (
                            <option key={inv} value={inv}>{inv}</option>
                          ))}
                        </select>
                        <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-textSecondary pointer-events-none" />
                      </div>
                      <button
                        onClick={() => openInvestigation(c)}
                        className="enterprise-btn-primary py-1.5 px-3 text-[10px] flex items-center gap-1"
                      >
                        <Eye size={11} /> Investigate
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-16 text-textSecondary">
            <ShieldCheck size={40} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm font-semibold">No flagged claims match your criteria</p>
            <p className="text-xs mt-1 text-textSecondary/60">Try adjusting your search or filters</p>
          </div>
        )}
      </div>

      {selectedClaims.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-surface border border-indigo-500/30 rounded-2xl shadow-2xl p-4 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <span className="text-sm font-bold text-textPrimary">{selectedClaims.size} selected</span>
          <div className="h-6 w-px bg-border/60" />
          <div className="relative">
            <select
              value={bulkInvestigator}
              onChange={e => setBulkInvestigator(e.target.value)}
              className="enterprise-select text-xs py-1.5 pl-2 pr-8 min-w-[180px]"
            >
              <option value="">Choose investigator...</option>
              {INVESTIGATORS.map(inv => (
                <option key={inv} value={inv}>{inv}</option>
              ))}
            </select>
            <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-textSecondary pointer-events-none" />
          </div>
          <button
            onClick={bulkAssign}
            disabled={!bulkInvestigator}
            className={`enterprise-btn-primary py-1.5 px-4 text-xs flex items-center gap-1 ${!bulkInvestigator ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            <Send size={12} /> Assign
          </button>
          <button
            onClick={() => setSelectedClaims(new Set())}
            className="enterprise-btn-ghost py-1.5 px-3 text-xs flex items-center gap-1 border border-border/60"
          >
            <X size={12} /> Clear
          </button>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={`Investigation: Claim #${detail.claim_id}`} wide>
        {detailLoading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} type="card" />)}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-bg/40 rounded-xl p-4 border border-border/60">
                <p className="text-[9px] font-black uppercase tracking-widest text-textSecondary mb-2 flex items-center gap-1.5">
                  <User size={12} /> Patient Profile
                </p>
                <p className="text-sm font-bold text-textPrimary">{detail.patient_name || 'N/A'}</p>
                <p className="text-[10px] text-textSecondary mt-0.5">Patient ID: {detail.patient_id || 'N/A'}</p>
                {detail.patient_dob && (
                  <p className="text-[10px] text-textSecondary">DOB: {detail.patient_dob}</p>
                )}
                {detail.number_of_previous_claims_patient !== undefined && (
                  <p className="text-[10px] text-textSecondary">
                    Prior Claims: <span className="font-bold text-textPrimary">{detail.number_of_previous_claims_patient}</span>
                  </p>
                )}
              </div>
              <div className="bg-bg/40 rounded-xl p-4 border border-border/60">
                <p className="text-[9px] font-black uppercase tracking-widest text-textSecondary mb-2 flex items-center gap-1.5">
                  <Building2 size={12} /> Provider Profile
                </p>
                <p className="text-sm font-bold text-textPrimary">{detail.provider_name || 'N/A'}</p>
                <p className="text-[10px] text-textSecondary mt-0.5">Provider ID: {detail.provider_id || 'N/A'}</p>
                {detail.provider_specialty && (
                  <p className="text-[10px] text-textSecondary">Specialty: {detail.provider_specialty}</p>
                )}
                {detail.provider_patient_distance_miles !== undefined && (
                  <p className="text-[10px] text-textSecondary flex items-center gap-1">
                    <MapPin size={9} />
                    Distance: <span className={`font-bold ${detail.provider_patient_distance_miles > 200 ? 'text-red-400' : 'text-textPrimary'}`}>
                      {detail.provider_patient_distance_miles} mi
                    </span>
                  </p>
                )}
              </div>
            </div>

            <div className="bg-bg/40 rounded-xl p-4 border border-border/60">
              <p className="text-[9px] font-black uppercase tracking-widest text-textSecondary mb-3 flex items-center gap-1.5">
                <FileText size={12} /> Claim Details
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-[10px] text-textSecondary block mb-0.5">Amount</span>
                  <span className="font-mono font-bold text-textPrimary text-sm">{formatCurrency(detail.claim_amount)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-textSecondary block mb-0.5">Diagnosis</span>
                  <span className="font-mono font-bold text-textPrimary">{detail.diagnosis_code || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-textSecondary block mb-0.5">Procedure</span>
                  <span className="font-mono font-bold text-textPrimary">{detail.procedure_code || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-textSecondary block mb-0.5">Service Date</span>
                  <span className="font-bold text-textPrimary">{detail.service_date || detail.claim_date || 'N/A'}</span>
                </div>
              </div>
              {detail.service_name && (
                <div className="mt-2 text-xs">
                  <span className="text-[10px] text-textSecondary">Service: </span>
                  <span className="font-bold text-textPrimary">{detail.service_name}</span>
                </div>
              )}
            </div>

            <div className="bg-bg/40 rounded-xl p-4 border border-border/60">
              <p className="text-[9px] font-black uppercase tracking-widest text-textSecondary mb-3 flex items-center gap-1.5">
                <BrainCircuit size={12} /> AI Model Analysis
              </p>
              <div className="mb-4">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-textSecondary">Risk Score</span>
                  <span className={`font-bold ${(detail.fraud_score || 0) >= 0.85 ? 'text-red-500' : (detail.fraud_score || 0) >= 0.65 ? 'text-orange-500' : 'text-amber-500'}`}>
                    {((detail.fraud_score || 0) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="bg-bg/60 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${(detail.fraud_score || 0) >= 0.85 ? 'bg-gradient-to-r from-red-600 to-red-400' : (detail.fraud_score || 0) >= 0.65 ? 'bg-gradient-to-r from-orange-600 to-orange-400' : 'bg-gradient-to-r from-amber-600 to-amber-400'}`}
                    style={{ width: `${Math.min((detail.fraud_score || 0) * 100, 100)}%` }}
                  />
                </div>
              </div>

              <p className="text-[9px] font-black uppercase tracking-widest text-textSecondary mb-2">Risk Score Breakdown</p>
              <div className="space-y-2">
                <ScoreBar label="Overall Risk" score={detail.fraud_score || 0}
                  color={(detail.fraud_score || 0) >= 0.85 ? 'bg-red-500' : (detail.fraud_score || 0) >= 0.65 ? 'bg-orange-500' : 'bg-amber-500'} />
                <ScoreBar label="Duplicate Billing" score={subScores.duplicateBilling} color="bg-red-400" />
                <ScoreBar label="Provider Anomaly" score={subScores.providerAnomaly} color="bg-orange-400" />
                <ScoreBar label="Coding Anomaly" score={subScores.codingAnomaly} color="bg-purple-400" />
                <ScoreBar label="Outlier Detection" score={subScores.outlierDetection} color="bg-amber-400" />
              </div>
            </div>

            {shapData && shapData.top_factors && shapData.top_factors.length > 0 && (
              <div className="bg-bg/40 rounded-xl p-4 border border-border/60">
                <p className="text-[9px] font-black uppercase tracking-widest text-textSecondary mb-3 flex items-center gap-1.5">
                  <BrainCircuit size={12} /> SHAP Explanation
                </p>
                <p className="text-[10px] text-textSecondary leading-relaxed mb-3 italic">
                  {shapData.summary || `Model prediction of ${((shapData.prediction || 0) * 100).toFixed(1)}% with base value ${(shapData.base_value || 0).toFixed(3)}`}
                </p>
                <div className="space-y-2">
                  {shapData.top_factors.map((factor, i) => (
                    <div key={i} className="flex items-center gap-3 bg-bg/40 rounded-lg p-2.5 border border-border/40">
                      <div className={`w-1.5 h-8 rounded-full shrink-0 ${
                        factor.impact === 'high' ? 'bg-red-500' : factor.impact === 'medium' ? 'bg-orange-400' : 'bg-amber-400'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold text-textPrimary truncate">{factor.feature}</span>
                          <span className="text-[10px] font-mono text-textSecondary shrink-0">{factor.value}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[9px] font-bold ${
                            factor.direction === 'increases' ? 'text-red-400' : factor.direction === 'decreases' ? 'text-green-400' : 'text-textSecondary'
                          }`}>
                            {factor.direction === 'increases' ? '▲ Increases' : factor.direction === 'decreases' ? '▼ Decreases' : '— Neutral'}
                          </span>
                          <div className="flex-1 bg-bg/60 rounded-full h-1 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${factor.impact === 'high' ? 'bg-red-500' : factor.impact === 'medium' ? 'bg-orange-400' : 'bg-amber-400'}`}
                              style={{ width: `${Math.min((factor.weight || 0.1) * 100 * 3, 100)}%` }}
                            />
                          </div>
                          <span className="text-[9px] font-mono text-textSecondary">
                            w={((factor.weight || 0) * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-bg/40 rounded-xl p-4 border border-border/60">
              <p className="text-[9px] font-black uppercase tracking-widest text-textSecondary mb-2 flex items-center gap-1.5">
                <Eye size={12} /> Recommended Action
              </p>
              <p className="text-xs text-textPrimary leading-relaxed">{recommendedAction}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${priority.color}`}>
                  {priority.label}
                </span>
              </div>
            </div>

            <div className="bg-bg/40 rounded-xl p-4 border border-border/60">
              <p className="text-[9px] font-black uppercase tracking-widest text-textSecondary mb-3 flex items-center gap-1.5">
                <Clock size={12} /> Workflow Status
              </p>
              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                {WORKFLOW_STATES.map((state, i) => {
                  const isActive = i === workflowIndex;
                  const isComplete = i < workflowIndex;
                  return (
                    <div key={state} className="flex items-center">
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-colors ${
                        isActive ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' :
                        isComplete ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                        'bg-bg/40 text-textSecondary/50 border border-border/40'
                      }`}>
                        {isComplete && <ShieldCheck size={10} />}
                        {isActive && <Activity size={10} className="animate-pulse" />}
                        {state}
                      </div>
                      {i < WORKFLOW_STATES.length - 1 && (
                        <ArrowUpRight size={12} className={`mx-1 shrink-0 ${isComplete ? 'text-green-400' : 'text-textSecondary/30'}`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-bg/40 rounded-xl p-4 border border-border/60">
              <p className="text-[9px] font-black uppercase tracking-widest text-textSecondary mb-2 flex items-center gap-1.5">
                <FileText size={12} /> Investigation Notes
              </p>
              <textarea
                value={investigationNotes}
                onChange={e => setInvestigationNotes(e.target.value)}
                placeholder="Add investigation notes, observations, or follow-up items..."
                className="enterprise-input w-full min-h-[80px] text-xs resize-y"
                rows={3}
              />
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t border-border/60">
              <button
                onClick={startInvestigation}
                disabled={updateLoading}
                className="enterprise-btn-primary flex-1 py-2.5 text-xs flex items-center justify-center gap-2 min-w-[130px]"
              >
                <Eye size={14} /> Start Investigation
              </button>
              <button
                onClick={() => {
                  if (selectedClaim) {
                    const inv = investigatorMap[selectedClaim.claim_id] || getInvestigatorForScore(selectedClaim.fraud_score);
                    assignInvestigator(selectedClaim.claim_id, inv);
                  }
                }}
                className="enterprise-btn-ghost flex-1 py-2.5 text-xs flex items-center justify-center gap-2 border border-border/60 min-w-[130px]"
              >
                <Send size={14} /> Assign to Team
              </button>
              <button
                onClick={escalateToCompliance}
                disabled={updateLoading}
                className="enterprise-btn-danger flex-1 py-2.5 text-xs flex items-center justify-center gap-2 min-w-[130px]"
              >
                <AlertTriangle size={14} /> Escalate to Compliance
              </button>
              <button
                onClick={dismissAlert}
                disabled={updateLoading}
                className="enterprise-btn-ghost flex-1 py-2.5 text-xs flex items-center justify-center gap-2 border border-border/60 min-w-[130px]"
              >
                <ThumbsDown size={14} /> Dismiss Alert
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
