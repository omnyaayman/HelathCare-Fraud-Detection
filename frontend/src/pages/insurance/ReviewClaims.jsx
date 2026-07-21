import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Search, Filter, Download, ArrowUpDown, ArrowUp, ArrowDown, FileText, AlertTriangle,
  Clock, User, Building2, DollarSign, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  CheckCircle, XCircle, Eye, Columns, BrainCircuit, X, ShieldCheck, History,
  Square, CheckSquare, Send, MoreHorizontal, ExternalLink, Flag, Stethoscope,
  Ban, RotateCcw, Bookmark, BookmarkCheck,
} from "lucide-react";
import api from "../../api";
import Skeleton from "../../components/Skeleton";
import Modal from "../../components/Modal";
import { formatCurrency, getRiskLevel, getStatusColor, buildSHAPExplanation } from "../../data/dataUtils";
import { CANONICAL_PROVIDERS, CANONICAL_PATIENTS, CANONICAL_FRAUD_DIAGNOSES, CANONICAL_INVESTIGATORS } from "../../data/canonicalData";

const SYSTEM_NOW = new Date("2026-07-20T14:00:00");
const MODEL_VERSION = "v3.2.1";

const RISK_THRESHOLD_MEDIUM = 0.40;
const RISK_THRESHOLD_HIGH = 0.70;
const RISK_THRESHOLD_CRITICAL = 0.90;

const INVESTIGATORS = [...CANONICAL_INVESTIGATORS];

const SERVICE_TYPES = [
  { name: "Office Visit", cpt: ["99213", "99214", "99215", "99203", "99204"], amountRange: [150, 500], specialtyMatch: ["Primary Care", "Internal Medicine", "Family Medicine", "Multi-Specialty"] },
  { name: "Lab Work", cpt: ["80053", "80054", "82947", "84443", "85025"], amountRange: [200, 800], specialtyMatch: ["Internal Medicine", "Multi-Specialty", "Family Medicine"] },
  { name: "Imaging", cpt: ["71046", "72148", "70553", "73721", "76856"], amountRange: [500, 3000], specialtyMatch: ["Radiology", "Multi-Specialty", "Orthopedics", "Cardiology"] },
  { name: "Physical Therapy", cpt: ["97110", "97140", "97530", "97112", "97760"], amountRange: [100, 400], specialtyMatch: ["Orthopedics", "Family Medicine", "Multi-Specialty"] },
  { name: "Emergency Visit", cpt: ["99281", "99282", "99283", "99284", "99285"], amountRange: [800, 5000], specialtyMatch: ["Emergency Medicine", "Multi-Specialty"] },
  { name: "Surgery Consultation", cpt: ["10120", "27447", "29881", "43239", "49505"], amountRange: [1000, 5000], specialtyMatch: ["General Surgery", "Orthopedics", "Cardiology"] },
  { name: "Cardiology consult", cpt: ["93306", "93000", "93303", "93015", "93307"], amountRange: [600, 2500], specialtyMatch: ["Cardiology", "Multi-Specialty"] },
  { name: "Neurology consult", cpt: ["95910", "95913", "99245", "95816", "95819"], amountRange: [500, 2000], specialtyMatch: ["Neurology", "Multi-Specialty"] },
];

const REJECTION_REASONS = [
  "Documentation incomplete", "Policy exclusion — non-covered service",
  "Duplicate submission detected", "Timely filing limit exceeded",
  "Authorization not obtained", "Patient eligibility expired",
  "Diagnosis code mismatch", "Medical necessity not demonstrated",
];

const INSURANCE_PLANS = ["Aetna", "Blue Cross Blue Shield", "Cigna", "UnitedHealthcare", "Kaiser Permanente", "Humana", "Medicare", "Medicaid"];

const EXTRA_PATIENTS = [
  "Sarah Johnson", "Michael Chen", "Jessica Williams", "David Kim", "Ashley Brown",
  "Christopher Davis", "Amanda Wilson", "Matthew Anderson", "Jennifer Thomas", "Daniel Martinez",
  "Stephanie Garcia", "Andrew Robinson", "Nicole Clark", "Joshua Rodriguez", "Megan Lewis",
  "Ryan Lee", "Laura Walker", "Kevin Hall", "Sarah Allen", "Justin Young",
  "Samantha King", "Brandon Wright", "Rachel Scott", "Jason Green", "Elizabeth Adams",
  "Tyler Baker", "Kayla Nelson", "Aaron Carter", "Melissa Mitchell", "Patrick Roberts",
  "Rebecca Turner", "Gregory Phillips", "Lauren Campbell", "Jeffrey Parker", "Michelle Evans",
  "Benjamin Edwards", "Heather Collins", "Timothy Stewart", "Angela Sanchez", "Russell Morris",
  "Brenda Rogers", "Jeremy Reed", "Cynthia Cook", "Travis Morgan", "Deborah Bell",
  "Nathan Murphy", "Diane Bailey", "Derek Rivera", "Frances Cooper", "Sean Richardson",
  "Marie Cox", "Dustin Howard", "Janice Ward", "Erik Torres", "Gloria Peterson",
  "Victor Gray", "Teresa Ramirez", "Philip James", "Ann Watson", "Craig Brooks",
  "Katherine Kelly", "Douglas Sanders", "Ruby Price", "Carl Bennett", "Alice Wood",
  "Bruce Barnes", "Judy Ross", "Vincent Henderson", "Doris Coleman", "Roy Jenkins",
  "Fred Perry", "Jean Powell", "Eugene Long", "Diana Patterson", "Arthur Hughes",
];

const CLAIMS_DATA = (() => {
  let seed = 42;
  const rand = () => { seed = (seed * 16807 + 0) % 2147483647; return (seed - 1) / 2147483646; };
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const randInt = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
  const randDate = (startDays, endDays) => {
    const d = new Date(SYSTEM_NOW);
    d.setDate(d.getDate() - randInt(startDays, endDays));
    d.setHours(randInt(6, 20), randInt(0, 59), 0, 0);
    return d.toISOString();
  };

  const providers = CANONICAL_PROVIDERS;
  const diagnoses = CANONICAL_FRAUD_DIAGNOSES;
  const allPatientNames = [...CANONICAL_PATIENTS.map(p => p.name), ...EXTRA_PATIENTS];

  const patientPool = allPatientNames.slice(0, 100).map((name, i) => ({
    id: `PAT-${String(i + 1).padStart(3, "0")}`,
    name,
    age: randInt(22, 85),
    gender: pick(["M", "F"]),
    city: pick(["New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Denver", "Miami", "Boston", "Atlanta", "San Francisco", "Dallas", "Seattle", "Portland", "Nashville", "Phoenix"]),
    state: pick(["NY", "CA", "IL", "TX", "AZ", "CO", "FL", "MA", "GA", "CA", "TX", "WA", "OR", "TN", "AZ"]),
    insurancePlan: pick(INSURANCE_PLANS),
  }));

  const claims = [];
  for (let i = 0; i < 200; i++) {
    const patient = patientPool[i % patientPool.length];
    const provider = providers[i % providers.length];
    const serviceType = pick(SERVICE_TYPES);
    const diagnosis = pick(diagnoses);
    const cptCode = pick(serviceType.cpt);
    const amount = randInt(serviceType.amountRange[0], serviceType.amountRange[1]);
    const claimDate = randDate(10, 100);
    const claimDateObj = new Date(claimDate);
    const serviceDate = new Date(claimDateObj);
    serviceDate.setDate(serviceDate.getDate() - randInt(0, 3));
    const daysAgo = Math.floor((SYSTEM_NOW - claimDateObj) / 86400000);

    let fraudScore;
    const roll = rand();
    if (roll < 0.075) fraudScore = randInt(85, 99) / 100;
    else if (roll < 0.275) fraudScore = randInt(65, 84) / 100;
    else if (roll < 0.675) fraudScore = randInt(25, 64) / 100;
    else fraudScore = randInt(5, 24) / 100;

    let status, investigator = null, rejectionReason = null, decisionBy = null, decisionAt = null;

    if (daysAgo > 60) {
      if (fraudScore >= RISK_THRESHOLD_HIGH) {
        status = pick(["Rejected", "Fraud Confirmed", "Closed"]);
        investigator = pick(INVESTIGATORS);
        if (status === "Rejected") { rejectionReason = pick(REJECTION_REASONS); decisionBy = pick(INVESTIGATORS.slice(0, 4)); }
        else { decisionBy = pick(INVESTIGATORS.slice(0, 4)); }
      } else if (fraudScore >= RISK_THRESHOLD_MEDIUM) {
        status = pick(["Approved", "Rejected", "Closed"]);
        if (status === "Rejected") { rejectionReason = pick(REJECTION_REASONS); decisionBy = pick(["AI Model " + MODEL_VERSION, ...INVESTIGATORS.slice(0, 3)]); }
        else { decisionBy = pick(["AI Model " + MODEL_VERSION, "Auto-Adjudication"]); }
      } else {
        status = pick(["Approved", "Closed", "Approved", "Closed", "Approved"]);
        decisionBy = pick(["AI Model " + MODEL_VERSION, "Auto-Adjudication"]);
      }
    } else if (daysAgo > 30) {
      if (fraudScore >= RISK_THRESHOLD_HIGH) {
        status = pick(["Under Review", "Escalated", "Under Review"]);
        investigator = pick(INVESTIGATORS);
        decisionBy = "AI Model " + MODEL_VERSION;
      } else if (fraudScore >= RISK_THRESHOLD_MEDIUM) {
        status = pick(["Under Review", "AI Scored", "Submitted", "Under Review"]);
        if (status === "Under Review") investigator = pick(INVESTIGATORS);
        decisionBy = "AI Model " + MODEL_VERSION;
      } else {
        status = pick(["Approved", "AI Scored", "Submitted", "Closed"]);
        decisionBy = pick(["AI Model " + MODEL_VERSION, "Auto-Adjudication"]);
      }
    } else {
      if (fraudScore >= RISK_THRESHOLD_HIGH) {
        status = pick(["Under Review", "Escalated"]);
        investigator = pick(INVESTIGATORS);
        decisionBy = "AI Model " + MODEL_VERSION;
      } else if (fraudScore >= RISK_THRESHOLD_MEDIUM) {
        status = pick(["AI Scored", "Under Review", "Submitted"]);
        if (status === "Under Review") investigator = pick(INVESTIGATORS);
        decisionBy = "AI Model " + MODEL_VERSION;
      } else {
        status = pick(["Submitted", "AI Scored", "Submitted", "AI Scored"]);
        decisionBy = status === "AI Scored" ? "AI Model " + MODEL_VERSION : null;
      }
    }

    if ((status === "Under Review" || status === "Escalated") && !investigator) {
      investigator = pick(INVESTIGATORS);
    }

    const submittedDate = new Date(claimDateObj);
    submittedDate.setDate(submittedDate.getDate() - randInt(0, 2));

    const auditTrail = [
      { action: "Claim Submitted", actor: patient.name, time: submittedDate.toISOString(), detail: `Claim submitted for ${serviceType.name}` },
    ];
    if (status !== "Submitted") {
      auditTrail.push({ action: "AI Risk Assessment", actor: `AI Engine ${MODEL_VERSION}`, time: new Date(submittedDate.getTime() + 3600000).toISOString(), detail: `Risk score: ${(fraudScore * 100).toFixed(1)}% — ${fraudScore >= RISK_THRESHOLD_CRITICAL ? "Critical" : fraudScore >= RISK_THRESHOLD_HIGH ? "High" : "Normal"} risk` });
    }
    if (status === "Under Review" || status === "Escalated") {
      auditTrail.push({ action: "Assigned for Review", actor: investigator, time: new Date(submittedDate.getTime() + 7200000).toISOString(), detail: "Claim assigned for manual review" });
    }
    if (["Approved", "Rejected", "Closed", "Fraud Confirmed"].includes(status)) {
      auditTrail.push({ action: `Claim ${status}`, actor: decisionBy || "System", time: new Date(claimDateObj.getTime() + 86400000).toISOString(), detail: rejectionReason || `Claim ${status.toLowerCase()} by ${decisionBy || "system"}` });
    }

    claims.push({
      claim_id: `CLM-2026-${String(200001 + i).padStart(6, "0")}`,
      patient_name: patient.name,
      patient_id: patient.id,
      patient_age: patient.age,
      patient_gender: patient.gender,
      patient_city: patient.city,
      patient_state: patient.state,
      provider_name: provider.name,
      provider_id: provider.id,
      provider_type: provider.type,
      provider_specialty: provider.specialty,
      provider_city: provider.city,
      provider_state: provider.state,
      service_name: serviceType.name,
      procedure_code: cptCode,
      diagnosis_code: diagnosis.code,
      diagnosis_desc: diagnosis.description,
      claim_amount: amount,
      fraud_score: fraudScore,
      status,
      investigator,
      rejection_reason: rejectionReason,
      decision_by: decisionBy,
      decision_at: decisionBy ? new Date(claimDateObj.getTime() + 86400000).toISOString() : null,
      claim_date: claimDateObj.toISOString().split("T")[0],
      service_date: serviceDate.toISOString().split("T")[0],
      submitted_date: submittedDate.toISOString().split("T")[0],
      insurance_plan: patient.insurancePlan,
      policy_number: `POL-2026-${String(100000 + i).padStart(6, "0")}`,
      number_of_previous_claims_patient: randInt(0, 12),
      number_of_procedures: randInt(1, 4),
      provider_patient_distance_miles: randInt(1, 350),
      claim_submitted_late: rand() > 0.88,
      auditTrail,
    });
  }
  return claims;
})();

const STATUS_OPTIONS = ["All", "Submitted", "AI Scored", "Under Review", "Escalated", "Approved", "Rejected", "Fraud Confirmed", "Closed"];
const STATUS_ORDER = { "Submitted": 0, "AI Scored": 1, "Under Review": 2, "Escalated": 3, "Approved": 4, "Rejected": 5, "Fraud Confirmed": 6, "Closed": 7 };

const ALL_COLUMNS = [
  { key: "claim_id", label: "Claim ID", icon: FileText, sortable: true },
  { key: "patient_name", label: "Patient", icon: User, sortable: true },
  { key: "provider_name", label: "Provider", icon: Building2, sortable: true },
  { key: "service_name", label: "Service", icon: Stethoscope, sortable: true },
  { key: "diagnosis_code", label: "Diagnosis", icon: FileText, sortable: true },
  { key: "claim_amount", label: "Amount", icon: DollarSign, sortable: true, align: "right" },
  { key: "fraud_score", label: "Risk Score", icon: AlertTriangle, sortable: true },
  { key: "status", label: "Status", icon: CheckCircle, sortable: true },
  { key: "investigator", label: "Investigator", icon: User, sortable: false },
  { key: "claim_date", label: "Date", icon: Clock, sortable: true },
  { key: "actions", label: "Actions", icon: Eye, sortable: false },
];

const SAVED_VIEWS = [
  { id: "my-assigned", label: "My Assigned", icon: User, filter: (c, me) => c.investigator === me },
  { id: "high-risk", label: "High Risk Only", icon: AlertTriangle, filter: (c) => c.fraud_score >= RISK_THRESHOLD_HIGH },
  { id: "rejected-week", label: "Rejected This Week", icon: XCircle, filter: (c) => c.status === "Rejected" && (SYSTEM_NOW - new Date(c.claim_date)) / 86400000 <= 7 },
  { id: "needs-review", label: "Needs Review", icon: Eye, filter: (c) => c.status === "Submitted" || c.status === "AI Scored" },
  { id: "escalated", label: "Escalated", icon: Flag, filter: (c) => c.status === "Escalated" },
];

function RiskBar({ score, compact }) {
  const pct = ((score || 0) * 100).toFixed(0);
  const color = score >= 0.90 ? "bg-red-500" : score >= 0.70 ? "bg-orange-500" : score >= 0.40 ? "bg-amber-400" : "bg-blue-500";
  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="flex-1 max-w-[50px] bg-bg/60 rounded-full h-1.5 overflow-hidden">
          <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
        </div>
        <span className="text-[10px] font-mono font-bold text-textSecondary">{pct}%</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 max-w-[70px] bg-bg/60 rounded-full h-1.5 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-mono font-bold text-textSecondary">{pct}%</span>
    </div>
  );
}

function StatusPill({ status }) {
  const colors = {
    "Submitted": "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    "AI Scored": "bg-purple-500/10 text-purple-400 border-purple-500/20",
    "Under Review": "bg-amber-400/10 text-amber-400 border-amber-400/20",
    "Escalated": "bg-red-500/10 text-red-400 border-red-500/20",
    "Approved": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    "Rejected": "bg-red-500/10 text-red-400 border-red-500/20",
    "Fraud Confirmed": "bg-red-600/10 text-red-500 border-red-600/20",
    "Closed": "bg-slate-500/10 text-slate-400 border-slate-500/20",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${colors[status] || "bg-bg/10 text-textSecondary border-border"}`}>
      {status}
    </span>
  );
}

function ExportIcon({ size = 14 }) {
  return <Download size={size} />;
}

export default function ReviewClaims() {
  const [claims] = useState(CLAIMS_DATA);
  const [loading] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [providerFilter, setProviderFilter] = useState("All");
  const [investigatorFilter, setInvestigatorFilter] = useState("All");
  const [minScore, setMinScore] = useState("");
  const [maxScore, setMaxScore] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortField, setSortField] = useState("claim_date");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [visibleColumns, setVisibleColumns] = useState(ALL_COLUMNS.map(c => c.key));
  const [showColumnPanel, setShowColumnPanel] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [activeSavedView, setActiveSavedView] = useState(null);

  const [selectedClaim, setSelectedClaim] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approveTarget, setApproveTarget] = useState(null);

  const uniqueProviders = useMemo(() => [...new Set(claims.map(c => c.provider_name))].sort(), [claims]);
  const uniqueInvestigators = useMemo(() => [...new Set(claims.map(c => c.investigator).filter(Boolean))].sort(), [claims]);

  const hasActiveFilters = search || statusFilter !== "All" || providerFilter !== "All" || investigatorFilter !== "All" || minScore || maxScore || dateFrom || dateTo || activeSavedView;

  const clearFilters = useCallback(() => {
    setSearch(""); setStatusFilter("All"); setProviderFilter("All"); setInvestigatorFilter("All");
    setMinScore(""); setMaxScore(""); setDateFrom(""); setDateTo(""); setActiveSavedView(null);
    setPage(1);
  }, []);

  const filteredClaims = useMemo(() => {
    let result = [...claims];
    if (activeSavedView) {
      const sv = SAVED_VIEWS.find(v => v.id === activeSavedView);
      if (sv) result = result.filter(c => sv.filter(c, INVESTIGATORS[0]));
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        c.claim_id.toLowerCase().includes(q) || c.patient_name.toLowerCase().includes(q) ||
        c.provider_name.toLowerCase().includes(q) || (c.diagnosis_code || "").toLowerCase().includes(q) ||
        (c.diagnosis_desc || "").toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "All") result = result.filter(c => c.status === statusFilter);
    if (providerFilter !== "All") result = result.filter(c => c.provider_name === providerFilter);
    if (investigatorFilter !== "All") result = result.filter(c => c.investigator === investigatorFilter);
    if (minScore) { const m = parseFloat(minScore); if (!isNaN(m)) result = result.filter(c => (c.fraud_score || 0) >= m / 100); }
    if (maxScore) { const m = parseFloat(maxScore); if (!isNaN(m)) result = result.filter(c => (c.fraud_score || 0) <= m / 100); }
    if (dateFrom) result = result.filter(c => c.claim_date >= dateFrom);
    if (dateTo) result = result.filter(c => c.claim_date <= dateTo);

    result.sort((a, b) => {
      let aVal = a[sortField] ?? "", bVal = b[sortField] ?? "";
      if (sortField === "fraud_score" || sortField === "claim_amount") { aVal = Number(aVal) || 0; bVal = Number(bVal) || 0; }
      else { aVal = String(aVal).toLowerCase(); bVal = String(bVal).toLowerCase(); }
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return result;
  }, [claims, search, statusFilter, providerFilter, investigatorFilter, minScore, maxScore, dateFrom, dateTo, sortField, sortDir, activeSavedView]);

  const kpis = useMemo(() => {
    const total = filteredClaims.length;
    const totalValue = filteredClaims.reduce((s, c) => s + (c.claim_amount || 0), 0);
    const avgRisk = total > 0 ? filteredClaims.reduce((s, c) => s + (c.fraud_score || 0), 0) / total : 0;
    const highCritPct = total > 0 ? +((filteredClaims.filter(c => c.fraud_score >= RISK_THRESHOLD_HIGH).length / total) * 100).toFixed(1) : 0;
    const statusCounts = {};
    filteredClaims.forEach(c => { statusCounts[c.status] = (statusCounts[c.status] || 0) + 1; });
    return { total, totalValue, avgRisk, highCritPct, statusCounts };
  }, [filteredClaims]);

  const totalPages = Math.max(1, Math.ceil(filteredClaims.length / pageSize));
  const safePage = Math.min(page, totalPages);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages, page]);

  const paginatedClaims = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredClaims.slice(start, start + pageSize);
  }, [filteredClaims, safePage, pageSize]);

  const handleSort = useCallback((field) => {
    if (!ALL_COLUMNS.find(c => c.key === field)?.sortable) return;
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
    setPage(1);
  }, [sortField]);

  const toggleSelect = useCallback((id) => {
    setSelectedIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds(prev => {
      if (prev.size === paginatedClaims.length) return new Set();
      return new Set(paginatedClaims.map(c => c.claim_id));
    });
  }, [paginatedClaims]);

  const exportCSV = useCallback(() => {
    const toExport = selectedIds.size > 0 ? filteredClaims.filter(c => selectedIds.has(c.claim_id)) : filteredClaims;
    const headers = ["Claim ID", "Patient", "Provider", "Service", "Diagnosis", "Diagnosis Desc", "Amount", "Risk Score", "Risk Level", "Status", "Investigator", "Rejection Reason", "Decision By", "Date", "Insurance Plan"];
    const rows = toExport.map(c => {
      const risk = getRiskLevel(c.fraud_score);
      return [c.claim_id, c.patient_name, c.provider_name, c.service_name, c.diagnosis_code, c.diagnosis_desc, c.claim_amount, `${(c.fraud_score * 100).toFixed(0)}%`, risk.label, c.status, c.investigator || "", c.rejection_reason || "", c.decision_by || "", c.claim_date, c.insurance_plan];
    });
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v || "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `claims_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredClaims, selectedIds]);

  const toggleColumn = useCallback((key) => {
    setVisibleColumns(cols => cols.includes(key) ? cols.filter(k => k !== key) : [...cols, key]);
  }, []);

  const openDetail = useCallback((claim) => { setSelectedClaim(claim); setShowDetail(true); }, []);

  const handleQuickApprove = useCallback((claim) => { setApproveTarget(claim); setShowApproveModal(true); }, []);

  const confirmApprove = useCallback(() => {
    if (!approveTarget) return;
    setShowApproveModal(false);
    setApproveTarget(null);
  }, [approveTarget]);

  const handleQuickReject = useCallback((claim) => { setRejectTarget(claim); setRejectReason(""); setShowRejectModal(true); }, []);

  const confirmReject = useCallback(() => {
    if (!rejectTarget || !rejectReason) return;
    setShowRejectModal(false);
    setRejectTarget(null);
    setRejectReason("");
  }, [rejectTarget, rejectReason]);

  const handleEscalate = useCallback((claim) => {}, []);

  const renderSortIcon = (field) => {
    if (sortField !== field) return <ArrowUpDown size={10} className="text-textSecondary/30" />;
    return sortDir === "asc" ? <ArrowUp size={10} className="text-primary" /> : <ArrowDown size={10} className="text-primary" />;
  };

  const colVisible = (key) => visibleColumns.includes(key);

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center justify-between"><div><Skeleton rows={1} className="w-48" /><Skeleton rows={1} className="w-32 mt-2" /></div></div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">{[...Array(5)].map((_, i) => <Skeleton key={i} type="card" />)}</div>
        <div className="bg-surface rounded-2xl border border-border/80 p-4"><Skeleton rows={1} className="h-10" /></div>
        <div className="bg-surface rounded-2xl border border-border/80 shadow-sm overflow-hidden">
          {[...Array(10)].map((_, i) => (<div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-border/30"><Skeleton rows={1} className="w-20" /><Skeleton rows={1} className="w-32" /><Skeleton rows={1} className="w-28" /></div>))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-textPrimary tracking-tight">All Claims</h1>
          <p className="text-sm text-textSecondary font-medium">{claims.length} total claims in system of record</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button onClick={() => setShowColumnPanel(!showColumnPanel)} className="enterprise-btn-ghost py-2 px-3 text-xs flex items-center gap-1.5">
              <Columns size={14} /> Columns
            </button>
            {showColumnPanel && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowColumnPanel(false)} />
                <div className="absolute right-0 top-full mt-2 z-50 w-56 bg-surface border border-border/80 rounded-xl shadow-xl p-3">
                  <p className="text-[10px] font-black text-textSecondary uppercase tracking-widest mb-2">Toggle Columns</p>
                  {ALL_COLUMNS.filter(c => c.key !== "actions").map(col => (
                    <label key={col.key} className="flex items-center gap-2 py-1.5 cursor-pointer hover:bg-bg/30 rounded-lg px-2 -mx-2 transition-colors">
                      <input type="checkbox" checked={visibleColumns.includes(col.key)} onChange={() => toggleColumn(col.key)} className="rounded border-border accent-primary w-3.5 h-3.5" />
                      <col.icon size={12} className="text-textSecondary" />
                      <span className="text-xs text-textPrimary font-medium">{col.label}</span>
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>
          <button onClick={exportCSV} className="enterprise-btn-ghost py-2 px-4 text-xs flex items-center gap-1.5">
            <Download size={14} /> {selectedIds.size > 0 ? `Export ${selectedIds.size} Selected` : `Export ${filteredClaims.length} Filtered`}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-surface rounded-xl border border-border/80 p-3">
          <div className="flex items-center gap-1.5 mb-1"><FileText size={12} className="text-indigo-400" /><span className="text-[9px] font-bold text-textSecondary uppercase tracking-wider">Total Claims</span></div>
          <p className="text-lg font-black text-textPrimary">{kpis.total}</p>
        </div>
        <div className="bg-surface rounded-xl border border-border/80 p-3">
          <div className="flex items-center gap-1.5 mb-1"><DollarSign size={12} className="text-emerald-400" /><span className="text-[9px] font-bold text-textSecondary uppercase tracking-wider">Total Value</span></div>
          <p className="text-lg font-black text-textPrimary">{formatCurrency(kpis.totalValue)}</p>
        </div>
        <div className="bg-surface rounded-xl border border-border/80 p-3">
          <div className="flex items-center gap-1.5 mb-1"><AlertTriangle size={12} className="text-amber-400" /><span className="text-[9px] font-bold text-textSecondary uppercase tracking-wider">Avg Risk Score</span></div>
          <p className="text-lg font-black text-textPrimary">{(kpis.avgRisk * 100).toFixed(1)}%</p>
        </div>
        <div className="bg-surface rounded-xl border border-border/80 p-3">
          <div className="flex items-center gap-1.5 mb-1"><ShieldCheck size={12} className="text-red-400" /><span className="text-[9px] font-bold text-textSecondary uppercase tracking-wider">High/Critical Risk</span></div>
          <p className="text-lg font-black text-red-400">{kpis.highCritPct}%</p>
        </div>
        <div className="bg-surface rounded-xl border border-border/80 p-3 col-span-2 sm:col-span-3 lg:col-span-1">
          <div className="flex items-center gap-1.5 mb-1"><CheckCircle size={12} className="text-purple-400" /><span className="text-[9px] font-bold text-textSecondary uppercase tracking-wider">By Status</span></div>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {Object.entries(kpis.statusCounts).sort((a, b) => b[1] - a[1]).map(([status, count]) => (
              <span key={status} className="text-[9px] font-bold text-textSecondary bg-bg/40 px-1.5 py-0.5 rounded">{status}: {count}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-surface rounded-2xl border border-border/80 p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {SAVED_VIEWS.map(sv => (
            <button key={sv.id} onClick={() => { setActiveSavedView(activeSavedView === sv.id ? null : sv.id); setPage(1); }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                activeSavedView === sv.id ? "bg-primary/10 text-primary border-primary/20 ring-1 ring-primary/20" : "bg-bg/40 text-textSecondary border-border/50 hover:bg-surface-hover"
              }`}>
              {activeSavedView === sv.id ? <BookmarkCheck size={11} /> : <sv.icon size={11} />}
              {sv.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
            <input type="text" placeholder="Search claim ID, patient, provider, diagnosis..."
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="enterprise-input pl-8 w-full text-xs" />
          </div>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="enterprise-select text-xs">
            {STATUS_OPTIONS.map(s => <option key={s}>{s === "All" ? "All Status" : s}</option>)}
          </select>
          <select value={providerFilter} onChange={e => { setProviderFilter(e.target.value); setPage(1); }} className="enterprise-select text-xs">
            <option value="All">All Providers</option>
            {uniqueProviders.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={investigatorFilter} onChange={e => { setInvestigatorFilter(e.target.value); setPage(1); }} className="enterprise-select text-xs">
            <option value="All">All Investigators</option>
            {uniqueInvestigators.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
          <div className="flex items-center gap-1.5">
            <input type="number" placeholder="Min %" min={0} max={100} value={minScore} onChange={e => { setMinScore(e.target.value); setPage(1); }} className="enterprise-input text-xs w-20" />
            <span className="text-textSecondary text-[10px]">—</span>
            <input type="number" placeholder="Max %" min={0} max={100} value={maxScore} onChange={e => { setMaxScore(e.target.value); setPage(1); }} className="enterprise-input text-xs w-20" />
          </div>
          <div className="flex items-center gap-1.5">
            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} className="enterprise-input text-xs" />
            <span className="text-textSecondary text-[10px]">—</span>
            <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} className="enterprise-input text-xs" />
          </div>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="enterprise-btn-ghost py-2 px-3 text-[10px] font-bold flex items-center gap-1 text-red-400 hover:bg-red-500/10">
              <X size={12} /> Clear All
            </button>
          )}
        </div>
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40">
          <span className="text-[10px] text-textSecondary font-mono">
            Showing {Math.min((safePage - 1) * pageSize + 1, filteredClaims.length)}–{Math.min(safePage * pageSize, filteredClaims.length)} of {filteredClaims.length} claims
            {selectedIds.size > 0 && <span className="text-primary font-bold ml-2">({selectedIds.size} selected)</span>}
          </span>
          {hasActiveFilters && <span className="text-[10px] text-primary font-semibold">Filters active</span>}
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex flex-wrap items-center gap-3 animate-in fade-in">
          <span className="text-xs font-bold text-primary">{selectedIds.size} claim{selectedIds.size !== 1 ? "s" : ""} selected</span>
          <div className="h-4 w-px bg-primary/20" />
          <button onClick={() => setSelectedIds(new Set())} className="enterprise-btn-ghost py-1.5 px-3 text-xs flex items-center gap-1">
            <X size={12} /> Clear
          </button>
        </div>
      )}

      <div className="bg-surface rounded-2xl border border-border/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="enterprise-table w-full text-sm text-left">
            <thead>
              <tr className="bg-bg/50 border-b border-border text-[10px] font-black text-textSecondary uppercase tracking-widest">
                <th className="px-3 py-3 w-10">
                  <button onClick={toggleSelectAll} className="flex items-center justify-center">
                    {selectedIds.size === paginatedClaims.length && paginatedClaims.length > 0
                      ? <CheckSquare size={14} className="text-primary" />
                      : <Square size={14} className="text-textSecondary/40" />}
                  </button>
                </th>
                {colVisible("claim_id") && (
                  <th className="px-4 py-3.5 cursor-pointer hover:text-primary whitespace-nowrap" onClick={() => handleSort("claim_id")}>
                    <span className="flex items-center gap-1">Claim ID {renderSortIcon("claim_id")}</span>
                  </th>
                )}
                {colVisible("patient_name") && (
                  <th className="px-4 py-3.5 cursor-pointer hover:text-primary whitespace-nowrap" onClick={() => handleSort("patient_name")}>
                    <span className="flex items-center gap-1">Patient {renderSortIcon("patient_name")}</span>
                  </th>
                )}
                {colVisible("provider_name") && (
                  <th className="px-4 py-3.5 cursor-pointer hover:text-primary whitespace-nowrap" onClick={() => handleSort("provider_name")}>
                    <span className="flex items-center gap-1">Provider {renderSortIcon("provider_name")}</span>
                  </th>
                )}
                {colVisible("service_name") && (
                  <th className="px-4 py-3.5 cursor-pointer hover:text-primary whitespace-nowrap" onClick={() => handleSort("service_name")}>
                    <span className="flex items-center gap-1">Service {renderSortIcon("service_name")}</span>
                  </th>
                )}
                {colVisible("diagnosis_code") && (
                  <th className="px-4 py-3.5 cursor-pointer hover:text-primary whitespace-nowrap" onClick={() => handleSort("diagnosis_code")}>
                    <span className="flex items-center gap-1">Diagnosis {renderSortIcon("diagnosis_code")}</span>
                  </th>
                )}
                {colVisible("claim_amount") && (
                  <th className="px-4 py-3.5 cursor-pointer hover:text-primary text-right whitespace-nowrap" onClick={() => handleSort("claim_amount")}>
                    <span className="flex items-center justify-end gap-1">Amount {renderSortIcon("claim_amount")}</span>
                  </th>
                )}
                {colVisible("fraud_score") && (
                  <th className="px-4 py-3.5 cursor-pointer hover:text-primary whitespace-nowrap" onClick={() => handleSort("fraud_score")}>
                    <span className="flex items-center gap-1">Risk {renderSortIcon("fraud_score")}</span>
                  </th>
                )}
                {colVisible("status") && (
                  <th className="px-4 py-3.5 cursor-pointer hover:text-primary whitespace-nowrap" onClick={() => handleSort("status")}>
                    <span className="flex items-center gap-1">Status {renderSortIcon("status")}</span>
                  </th>
                )}
                {colVisible("investigator") && (
                  <th className="px-4 py-3.5 whitespace-nowrap">Investigator</th>
                )}
                {colVisible("claim_date") && (
                  <th className="px-4 py-3.5 cursor-pointer hover:text-primary whitespace-nowrap" onClick={() => handleSort("claim_date")}>
                    <span className="flex items-center gap-1">Date {renderSortIcon("claim_date")}</span>
                  </th>
                )}
                {colVisible("actions") && (
                  <th className="px-4 py-3.5 whitespace-nowrap">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {paginatedClaims.map((c) => {
                const canAct = c.status === "Submitted" || c.status === "AI Scored";
                return (
                  <tr key={c.claim_id} className="hover:bg-bg/30 transition-colors group">
                    <td className="px-3 py-4">
                      <button onClick={() => toggleSelect(c.claim_id)} className="flex items-center justify-center">
                        {selectedIds.has(c.claim_id)
                          ? <CheckSquare size={14} className="text-primary" />
                          : <Square size={14} className="text-textSecondary/30 group-hover:text-textSecondary/60" />}
                      </button>
                    </td>
                    {colVisible("claim_id") && (
                      <td className="px-4 py-4 font-mono text-xs font-bold text-primary cursor-pointer hover:underline" onClick={() => openDetail(c)}>
                        {c.claim_id}
                      </td>
                    )}
                    {colVisible("patient_name") && (
                      <td className="px-4 py-4">
                        <span className="font-semibold text-textPrimary text-sm block max-w-[140px] truncate">{c.patient_name}</span>
                        <span className="text-[10px] text-textSecondary">{c.patient_city}, {c.patient_state}</span>
                      </td>
                    )}
                    {colVisible("provider_name") && (
                      <td className="px-4 py-4 text-textSecondary text-xs max-w-[150px] truncate">{c.provider_name}</td>
                    )}
                    {colVisible("service_name") && (
                      <td className="px-4 py-4 text-textSecondary text-xs max-w-[120px] truncate">{c.service_name}</td>
                    )}
                    {colVisible("diagnosis_code") && (
                      <td className="px-4 py-4">
                        <span className="font-mono text-xs text-textPrimary block">{c.diagnosis_code}</span>
                        <span className="text-[9px] text-textSecondary block max-w-[120px] truncate">{c.diagnosis_desc}</span>
                      </td>
                    )}
                    {colVisible("claim_amount") && (
                      <td className="px-4 py-4 font-mono text-sm font-bold text-textPrimary text-right">{formatCurrency(c.claim_amount)}</td>
                    )}
                    {colVisible("fraud_score") && (
                      <td className="px-4 py-4"><RiskBar score={c.fraud_score} /></td>
                    )}
                    {colVisible("status") && (
                      <td className="px-4 py-4">
                        <StatusPill status={c.status} />
                        {c.rejection_reason && <span className="block text-[9px] text-red-400 mt-0.5 max-w-[130px] truncate" title={c.rejection_reason}>{c.rejection_reason}</span>}
                      </td>
                    )}
                    {colVisible("investigator") && (
                      <td className="px-4 py-4 text-[11px] max-w-[130px] truncate">
                        {c.investigator ? (
                          <span className="text-textPrimary font-medium">{c.investigator}</span>
                        ) : (
                          <span className="text-textSecondary/30 italic">Unassigned</span>
                        )}
                      </td>
                    )}
                    {colVisible("claim_date") && (
                      <td className="px-4 py-4 text-[11px] text-textSecondary font-mono whitespace-nowrap">
                        {c.claim_date ? new Date(c.claim_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                      </td>
                    )}
                    {colVisible("actions") && (
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openDetail(c)} className="p-1.5 rounded-lg hover:bg-bg/60 text-textSecondary hover:text-primary transition-colors" title="View Details">
                            <Eye size={13} />
                          </button>
                          {canAct && (
                            <>
                              <button onClick={() => handleQuickApprove(c)} className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-textSecondary hover:text-emerald-400 transition-colors" title="Quick Approve">
                                <CheckCircle size={13} />
                              </button>
                              <button onClick={() => handleQuickReject(c)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-textSecondary hover:text-red-400 transition-colors" title="Reject">
                                <XCircle size={13} />
                              </button>
                            </>
                          )}
                          {c.status === "Under Review" && (
                            <button onClick={() => handleEscalate(c)} className="p-1.5 rounded-lg hover:bg-amber-400/10 text-textSecondary hover:text-amber-400 transition-colors" title="Escalate">
                              <Flag size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
              {paginatedClaims.length === 0 && (
                <tr>
                  <td colSpan={ALL_COLUMNS.filter(c => colVisible(c.key)).length + 1} className="px-5 py-16 text-center">
                    <AlertTriangle size={32} className="mx-auto text-textSecondary/30 mb-3" />
                    <p className="text-sm text-textSecondary font-semibold">No claims match your filters</p>
                    <p className="text-xs text-textSecondary/60 mt-1">Try adjusting your search or filter criteria</p>
                    {hasActiveFilters && <button onClick={clearFilters} className="mt-3 text-xs text-primary font-bold hover:underline">Clear all filters</button>}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-border/60 px-5 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-textSecondary font-semibold">Rows:</span>
            <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="bg-bg border border-border rounded-lg px-2 py-1 text-[10px] font-bold text-textPrimary outline-none">
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          <div className="flex items-center gap-1">
            <button disabled={safePage <= 1} onClick={() => setPage(1)} className="enterprise-btn-ghost p-1.5 disabled:opacity-30"><ChevronsLeft size={14} /></button>
            <button disabled={safePage <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="enterprise-btn-ghost p-1.5 disabled:opacity-30"><ChevronLeft size={14} /></button>
            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 7) pageNum = i + 1;
              else if (safePage <= 4) pageNum = i + 1;
              else if (safePage >= totalPages - 3) pageNum = totalPages - 6 + i;
              else pageNum = safePage - 3 + i;
              return (
                <button key={pageNum} onClick={() => setPage(pageNum)}
                  className={`w-7 h-7 rounded-lg text-[10px] font-bold transition-all ${
                    pageNum === safePage ? "bg-primary text-white" : "bg-bg/40 text-textSecondary hover:bg-surface-hover border border-border/50"
                  }`}>{pageNum}</button>
              );
            })}
            <button disabled={safePage >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="enterprise-btn-ghost p-1.5 disabled:opacity-30"><ChevronRight size={14} /></button>
            <button disabled={safePage >= totalPages} onClick={() => setPage(totalPages)} className="enterprise-btn-ghost p-1.5 disabled:opacity-30"><ChevronsRight size={14} /></button>
          </div>
          <span className="text-[10px] text-textSecondary font-mono">
            Page {safePage} of {totalPages}
          </span>
        </div>
      </div>

      <Modal open={showDetail} onClose={() => { setShowDetail(false); setSelectedClaim(null); }} title="Claim Detail" wide>
        {selectedClaim && <ClaimDetailContent claim={selectedClaim} onClose={() => { setShowDetail(false); setSelectedClaim(null); }} />}
      </Modal>

      <Modal open={showApproveModal} onClose={() => { setShowApproveModal(false); setApproveTarget(null); }} title="Approve Claim">
        {approveTarget && (
          <div className="space-y-4">
            <div className="bg-bg/40 rounded-xl border border-border/40 p-3">
              <p className="text-xs font-bold text-textPrimary">{approveTarget.claim_id}</p>
              <p className="text-[10px] text-textSecondary mt-1">{approveTarget.patient_name} — {formatCurrency(approveTarget.claim_amount)}</p>
            </div>
            <p className="text-xs text-textSecondary">Are you sure you want to approve this claim? This action will be recorded in the audit trail.</p>
            <div className="flex gap-3">
              <button onClick={() => { setShowApproveModal(false); setApproveTarget(null); }} className="enterprise-btn-ghost flex-1 py-2.5 text-xs">Cancel</button>
              <button onClick={confirmApprove} className="enterprise-btn flex-1 py-2.5 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 flex items-center justify-center gap-1.5">
                <CheckCircle size={14} /> Confirm Approve
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={showRejectModal} onClose={() => { setShowRejectModal(false); setRejectTarget(null); }} title="Reject Claim">
        {rejectTarget && (
          <div className="space-y-4">
            <div className="bg-bg/40 rounded-xl border border-border/40 p-3">
              <p className="text-xs font-bold text-textPrimary">{rejectTarget.claim_id}</p>
              <p className="text-[10px] text-textSecondary mt-1">{rejectTarget.patient_name} — {formatCurrency(rejectTarget.claim_amount)}</p>
            </div>
            <div>
              <label className="text-xs font-bold text-textPrimary block mb-2">Rejection Reason (required)</label>
              <div className="space-y-1.5">
                {REJECTION_REASONS.map(reason => (
                  <button key={reason} onClick={() => setRejectReason(reason)}
                    className={`w-full text-left px-3 py-2 rounded-lg border text-[11px] font-medium transition-all ${
                      rejectReason === reason ? "bg-red-500/10 text-red-400 border-red-500/30 ring-1 ring-red-500/20" : "bg-bg/40 text-textSecondary border-border/50 hover:bg-surface-hover"
                    }`}>{reason}</button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowRejectModal(false); setRejectTarget(null); }} className="enterprise-btn-ghost flex-1 py-2.5 text-xs">Cancel</button>
              <button onClick={confirmReject} disabled={!rejectReason}
                className="enterprise-btn flex-1 py-2.5 text-xs bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 flex items-center justify-center gap-1.5 disabled:opacity-40">
                <XCircle size={14} /> Confirm Reject
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}


function ClaimDetailContent({ claim, onClose }) {
  const risk = getRiskLevel(claim.fraud_score);
  const shap = buildSHAPExplanation(claim);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill status={claim.status} />
        <span className="text-[10px] font-mono text-textSecondary">{claim.claim_id}</span>
        {claim.rejection_reason && (
          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-red-500/10 text-red-400 border border-red-500/20" title={claim.rejection_reason}>
            Rejection: {claim.rejection_reason}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-bg/40 rounded-xl p-4 border border-border/40">
        <div><span className="text-textSecondary block mb-0.5">Patient</span><span className="font-bold text-textPrimary">{claim.patient_name}</span><span className="block text-[10px] text-textSecondary">{claim.patient_age}y {claim.patient_gender} — {claim.patient_city}, {claim.patient_state}</span></div>
        <div><span className="text-textSecondary block mb-0.5">Provider</span><span className="font-bold text-textPrimary">{claim.provider_name}</span><span className="block text-[10px] text-textSecondary">{claim.provider_specialty}</span></div>
        <div><span className="text-textSecondary block mb-0.5">Amount</span><span className="font-mono font-bold text-primary">{formatCurrency(claim.claim_amount)}</span></div>
        <div><span className="text-textSecondary block mb-0.5">Insurance</span><span className="font-bold text-textPrimary">{claim.insurance_plan}</span><span className="block text-[10px] font-mono text-textSecondary">{claim.policy_number}</span></div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-bg/40 rounded-xl p-4 border border-border/40">
        <div><span className="text-textSecondary block mb-0.5">Diagnosis</span><span className="font-mono font-bold text-textPrimary">{claim.diagnosis_code}</span><span className="block text-[10px] text-textSecondary">{claim.diagnosis_desc}</span></div>
        <div><span className="text-textSecondary block mb-0.5">Service</span><span className="font-bold text-textPrimary">{claim.service_name}</span><span className="block text-[10px] font-mono text-textSecondary">CPT: {claim.procedure_code}</span></div>
        <div><span className="text-textSecondary block mb-0.5">Claim Date</span><span className="font-bold text-textPrimary">{claim.claim_date}</span></div>
        <div><span className="text-textSecondary block mb-0.5">Service Date</span><span className="font-bold text-textPrimary">{claim.service_date}</span></div>
      </div>

      <div className="bg-bg/40 rounded-xl border border-border/40 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-textPrimary flex items-center gap-1.5"><BrainCircuit size={13} className="text-accent" /> AI Risk Assessment</span>
          <span className={`text-sm font-black ${risk.color}`}>{(claim.fraud_score * 100).toFixed(1)}%</span>
        </div>
        <div className="w-full bg-bg rounded-full h-2.5 overflow-hidden mb-2">
          <div className={`h-full rounded-full transition-all ${claim.fraud_score >= 0.90 ? "bg-red-500" : claim.fraud_score >= 0.70 ? "bg-orange-500" : claim.fraud_score >= 0.40 ? "bg-amber-400" : "bg-blue-500"}`}
            style={{ width: `${claim.fraud_score * 100}%` }} />
        </div>
        <div className="flex items-center justify-between">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${risk.bg} ${risk.color} ${risk.border}`}>{risk.label} Risk</span>
          <span className="text-[10px] text-textSecondary">Model: {MODEL_VERSION} • {claim.decision_by || "Pending"}</span>
        </div>
      </div>

      {shap.top_factors && shap.top_factors.length > 0 && (
        <div>
          <h4 className="text-[10px] font-black text-textSecondary uppercase tracking-widest mb-2">AI Contributing Factors</h4>
          <div className="space-y-1.5">
            {shap.top_factors.map((f, i) => (
              <div key={i} className="flex items-center gap-3 bg-bg/30 rounded-lg px-3 py-2 border border-border/30">
                <div className="flex-1">
                  <span className="text-[11px] font-bold text-textPrimary">{f.feature}</span>
                  <span className={`ml-1.5 text-[9px] font-black px-1.5 py-0.5 rounded-full ${f.impact === "high" ? "bg-red-500/10 text-red-400" : f.impact === "medium" ? "bg-amber-400/10 text-amber-400" : "bg-blue-500/10 text-blue-400"}`}>{f.impact}</span>
                </div>
                <div className="w-14 text-right">
                  <div className="w-full bg-bg/60 rounded-full h-1.5 overflow-hidden">
                    <div className={`h-full rounded-full ${f.impact === "high" ? "bg-red-500" : f.impact === "medium" ? "bg-amber-400" : "bg-blue-500"}`} style={{ width: `${(f.weight * 100)}%` }} />
                  </div>
                  <span className="text-[9px] text-textSecondary font-mono">{(f.weight * 100).toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h4 className="text-[10px] font-black text-textSecondary uppercase tracking-widest mb-2 flex items-center gap-1.5"><History size={12} /> Audit Trail</h4>
        <div className="space-y-0 relative ml-2">
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border/40" />
          {claim.auditTrail.map((event, i) => (
            <div key={i} className="relative flex items-start gap-3 pb-3 last:pb-0">
              <div className={`relative z-10 w-[15px] h-[15px] rounded-full border-2 shrink-0 mt-0.5 ${i === claim.auditTrail.length - 1 ? "border-primary bg-primary/20" : "border-border bg-surface"}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-textPrimary">{event.action}</span>
                  <span className="text-[9px] text-textSecondary font-mono">{new Date(event.time).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <p className="text-[10px] text-textSecondary mt-0.5">{event.detail}</p>
                <p className="text-[9px] text-textSecondary/50 mt-0.5">by {event.actor}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
