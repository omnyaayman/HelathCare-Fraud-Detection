import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Bell, AlertTriangle, ShieldAlert, Clock, User, Tag, Filter,
  Search, Check, X, ArrowUpRight, Activity, ShieldCheck, Flag,
  RefreshCw, FileText, MessageSquare, History,
} from "lucide-react";
import Modal from "../../components/Modal";
import api from "../../api";
import {
  formatCurrency, getRiskLevel, getStatusColor,
  getInvestigatorForScore, generateAlertTimeline, ALERT_TEMPLATES,
} from "../../data/dataUtils";

const SEVERITY_CONFIG = {
  Critical: { color: "bg-red-500/10 text-red-500 border-red-500/20", dot: "bg-red-500", icon: AlertTriangle, score: 4, barColor: "bg-red-500" },
  High: { color: "bg-orange-500/10 text-orange-500 border-orange-500/20", dot: "bg-orange-500", icon: ShieldAlert, score: 3, barColor: "bg-orange-500" },
  Medium: { color: "bg-warning/10 text-warning border-warning/20", dot: "bg-warning", icon: Activity, score: 2, barColor: "bg-amber-400" },
  Low: { color: "bg-blue-500/10 text-blue-500 border-blue-500/20", dot: "bg-blue-500", icon: Bell, score: 1, barColor: "bg-blue-500" },
};

const SEVERITY_ORDER = ["Critical", "High", "Medium", "Low"];
const STATUS_OPTIONS = ["All", "Pending", "Investigating", "Resolved"];

const FALLBACK_ALERTS = [
  { id: "ALT-001", ...ALERT_TEMPLATES[0], severity: "Critical", status: "Pending", time: "2 min ago", assigned: "Unassigned", riskScore: 94, claimId: "CLM-48911", notes: [], history: [] },
  { id: "ALT-002", ...ALERT_TEMPLATES[1], severity: "High", status: "Pending", time: "15 min ago", assigned: "Unassigned", riskScore: 82, claimId: "CLM-48890", notes: [], history: [] },
  { id: "ALT-003", ...ALERT_TEMPLATES[2], severity: "Critical", status: "Investigating", time: "32 min ago", assigned: "Dr. Sarah Mitchell", riskScore: 97, claimId: "CLM-49102", notes: [], history: [] },
  { id: "ALT-004", ...ALERT_TEMPLATES[3], severity: "Medium", status: "Resolved", time: "1h ago", assigned: "James Rodriguez, CFE", riskScore: 58, claimId: "CLM-47650", notes: [], history: [] },
  { id: "ALT-005", ...ALERT_TEMPLATES[4], severity: "High", status: "Investigating", time: "1h ago", assigned: "Dr. Emily Chen", riskScore: 86, claimId: "CLM-48200", notes: [], history: [] },
  { id: "ALT-006", ...ALERT_TEMPLATES[5], severity: "Medium", status: "Pending", time: "2h ago", assigned: "Unassigned", riskScore: 61, claimId: "CLM-47310", notes: [], history: [] },
  { id: "ALT-007", ...ALERT_TEMPLATES[6], severity: "Low", status: "Resolved", time: "3h ago", assigned: "Mark Thompson, CPA", riskScore: 35, claimId: "CLM-46900", notes: [], history: [] },
  { id: "ALT-008", ...ALERT_TEMPLATES[7], severity: "Critical", status: "Pending", time: "4h ago", assigned: "Unassigned", riskScore: 98, claimId: "CLM-49300", notes: [], history: [] },
  { id: "ALT-009", ...ALERT_TEMPLATES[8], severity: "High", status: "Pending", time: "5h ago", assigned: "Unassigned", riskScore: 79, claimId: "CLM-46750", notes: [], history: [] },
  { id: "ALT-010", ...ALERT_TEMPLATES[9], severity: "Medium", status: "Investigating", time: "6h ago", assigned: "Lisa Park, CPC", riskScore: 55, claimId: "CLM-47100", notes: [], history: [] },
  { id: "ALT-011", severity: "Critical", status: "Pending", title: "Phantom Billing Ring Detected", description: "AI clustering identified coordinated phantom billing across 3 providers in the Miami network. 42 claims submitted for services never rendered.", time: "7h ago", assigned: "Dr. Robert Kim", riskScore: 96, claimId: "CLM-49450", category: "Phantom Billing", notes: [], history: [] },
  { id: "ALT-012", severity: "High", status: "Investigating", title: "Upcoding Cluster — E/M Level 5", description: "18 providers billing E/M level 5 at >3x the expected rate. Statistical anomaly detected in evaluation & management coding patterns.", time: "8h ago", assigned: "Angela Davis, AHFI", riskScore: 81, claimId: "CLM-49200", category: "Upcoding", notes: [], history: [] },
  { id: "ALT-013", severity: "Medium", status: "Pending", title: "Unbundling Pattern — Orthopedic Claims", description: "Systematic unbundling of orthopedic procedure codes detected. Separate billing of components that should be bundled under a single code.", time: "10h ago", assigned: "Unassigned", riskScore: 64, claimId: "CLM-48600", category: "Unbundling", notes: [], history: [] },
  { id: "ALT-014", severity: "Low", status: "Resolved", title: "Geographic Anomaly — Out-of-Network Referrals", description: "Provider referring patients to out-of-network facilities at 2.5x the expected rate. Referral pattern analysis suggests potential kickback arrangement.", time: "12h ago", assigned: "Dr. Michael O'Brien", riskScore: 42, claimId: "CLM-48100", category: "Kickback Risk", notes: [], history: [] },
];

const INVESTIGATORS = [
  "Dr. Sarah Mitchell", "James Rodriguez, CFE", "Dr. Emily Chen",
  "Mark Thompson, CPA", "Lisa Park, CPC", "Dr. Robert Kim",
  "Angela Davis, AHFI", "Dr. Michael O'Brien",
];

function buildAlertFromClaim(claim, idx) {
  const score = Math.round((claim.fraud_score || 0.5) * 100);
  const risk = getRiskLevel(claim.fraud_score);
  const severity = risk.label === "Minimal" ? "Low" : risk.label;
  return {
    id: `ALT-CLM-${claim.claim_id}`,
    title: `Fraud Risk Alert — ${claim.patient_name || "Unknown Patient"}`,
    severity,
    status: "Pending",
    time: claim.claim_date || "Unknown",
    assigned: "Unassigned",
    category: claim.diagnosis_code ? `Dx: ${claim.diagnosis_code}` : "General",
    description: `AI model flagged claim ${claim.claim_id} submitted by ${claim.provider_name || "Unknown Provider"} with a fraud score of ${score}%. Diagnosis: ${claim.diagnosis_code || "N/A"}, Procedure: ${claim.procedure_code || "N/A"}, Amount: ${formatCurrency(claim.claim_amount)}.`,
    riskScore: score,
    claimId: claim.claim_id,
    claimData: claim,
    notes: [],
    history: [],
  };
}

function buildAlertFromNotification(n, idx) {
  const sevMap = { fraud: "Critical", warning: "High", error: "High", success: "Low", info: "Low" };
  return {
    id: `ALT-NOT-${idx + 1}`,
    title: n.title || "Notification Alert",
    severity: sevMap[n.type] || "Medium",
    status: idx % 3 === 0 ? "Pending" : idx % 3 === 1 ? "Investigating" : "Resolved",
    time: n.created_at ? new Date(n.created_at).toLocaleString() : "Just now",
    assigned: getInvestigatorForScore(idx / 10),
    category: "System",
    description: n.message || "No description available.",
    riskScore: sevMap[n.type] === "Critical" ? 92 : sevMap[n.type] === "High" ? 75 : 45,
    claimId: null,
    notes: [],
    history: [],
  };
}

export default function AlertCenter() {
  const [alerts, setAlerts] = useState(FALLBACK_ALERTS);
  const [lastScan, setLastScan] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const [filterSeverity, setFilterSeverity] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedAlert, setSelectedAlert] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  const [investigationNote, setInvestigationNote] = useState("");
  const [actionLog, setActionLog] = useState([]);

  const fetchData = useCallback(async () => {
    setRefreshing(true);
    try {
      const [notifRes, claimsRes] = await Promise.allSettled([
        api.generateNotifications(),
        api.getClaims({ page_size: 200 }),
      ]);

      const merged = [];
      let idx = 0;

      if (claimsRes.status === "fulfilled" && claimsRes.value?.data) {
        const highRisk = claimsRes.value.data
          .filter((c) => (c.fraud_score || 0) >= 0.4)
          .sort((a, b) => (b.fraud_score || 0) - (a.fraud_score || 0))
          .slice(0, 10);
        highRisk.forEach((c) => {
          merged.push(buildAlertFromClaim(c, idx++));
        });
      }

      if (notifRes.status === "fulfilled" && notifRes.value?.data) {
        notifRes.value.data.slice(0, 6).forEach((n) => {
          merged.push(buildAlertFromNotification(n, idx++));
        });
      }

      if (merged.length === 0) {
        merged.push(...FALLBACK_ALERTS);
      }

      setAlerts(merged);
      setLastScan(new Date());
    } catch {
      setAlerts(FALLBACK_ALERTS);
      setLastScan(new Date());
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const severityCounts = useMemo(() => {
    const counts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    alerts.forEach((a) => {
      if (a.status !== "Resolved" && counts[a.severity] !== undefined) {
        counts[a.severity]++;
      }
    });
    return counts;
  }, [alerts]);

  const activeCount = useMemo(
    () => alerts.filter((a) => a.status !== "Resolved").length,
    [alerts]
  );

  const filteredAlerts = useMemo(() => {
    return alerts
      .filter((a) => {
        if (filterSeverity !== "All" && a.severity !== filterSeverity) return false;
        if (filterStatus !== "All" && a.status !== filterStatus) return false;
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          return (
            a.title.toLowerCase().includes(q) ||
            a.id.toLowerCase().includes(q) ||
            a.assigned.toLowerCase().includes(q) ||
            a.description.toLowerCase().includes(q) ||
            (a.claimId && a.claimId.toLowerCase().includes(q)) ||
            a.category.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => (SEVERITY_CONFIG[a.severity]?.score || 0) - (SEVERITY_CONFIG[b.severity]?.score || 0) > 0 ? -1 : 1);
  }, [alerts, filterSeverity, filterStatus, searchQuery]);

  const handleResolve = useCallback((id) => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status: "Resolved" } : a
      )
    );
    setActionLog((prev) => [
      { action: "Alert Resolved", target: id, time: new Date().toISOString() },
      ...prev,
    ]);
  }, []);

  const handleStartInvestigate = useCallback((id) => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === id && a.status === "Pending" ? { ...a, status: "Investigating" } : a
      )
    );
    setActionLog((prev) => [
      { action: "Investigation Started", target: id, time: new Date().toISOString() },
      ...prev,
    ]);
  }, []);

  const handleOpenDetail = useCallback((alert) => {
    setSelectedAlert(alert);
    setShowDetail(true);
    setInvestigationNote("");
  }, []);

  const handleAssignInvestigator = useCallback((alertId, investigator) => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === alertId ? { ...a, assigned: investigator } : a
      )
    );
    setSelectedAlert((prev) =>
      prev && prev.id === alertId ? { ...prev, assigned: investigator } : prev
    );
    setActionLog((prev) => [
      { action: `Assigned to ${investigator}`, target: alertId, time: new Date().toISOString() },
      ...prev,
    ]);
  }, []);

  const handleStatusChange = useCallback((alertId, newStatus) => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === alertId ? { ...a, status: newStatus } : a
      )
    );
    setSelectedAlert((prev) =>
      prev && prev.id === alertId ? { ...prev, status: newStatus } : prev
    );
    setActionLog((prev) => [
      { action: `Status changed to ${newStatus}`, target: alertId, time: new Date().toISOString() },
      ...prev,
    ]);
  }, []);

  const handleSubmitNote = useCallback(() => {
    if (!investigationNote.trim() || !selectedAlert) return;
    const note = {
      text: investigationNote.trim(),
      author: selectedAlert.assigned || "Current User",
      time: new Date().toISOString(),
    };
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === selectedAlert.id ? { ...a, notes: [...(a.notes || []), note] } : a
      )
    );
    setSelectedAlert((prev) =>
      prev ? { ...prev, notes: [...(prev.notes || []), note] } : prev
    );
    setInvestigationNote("");
    setActionLog((prev) => [
      { action: "Note added", target: selectedAlert.id, time: new Date().toISOString() },
      ...prev,
    ]);
  }, [investigationNote, selectedAlert]);

  const selectedTimeline = useMemo(() => {
    if (!selectedAlert) return [];
    return generateAlertTimeline(selectedAlert);
  }, [selectedAlert]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertTriangle size={22} className="text-red-500" />
            </div>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-textPrimary tracking-tight">Alert Center</h1>
            <p className="text-sm text-textSecondary font-medium">
              {activeCount} active alert{activeCount !== 1 ? "s" : ""} requiring attention
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-bold text-green-500 uppercase tracking-wider">Live</span>
          </div>
          {lastScan && (
            <span className="text-[10px] text-textSecondary font-medium flex items-center gap-1">
              <Clock size={10} /> Last scan: {lastScan.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchData}
            disabled={refreshing}
            className="enterprise-btn-ghost py-2 px-3 text-xs flex items-center gap-1.5"
          >
            <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      <div className="bg-surface rounded-2xl border border-border/80 p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          {SEVERITY_ORDER.map((sev) => {
            const cfg = SEVERITY_CONFIG[sev];
            const Icon = cfg.icon;
            return (
              <button
                key={sev}
                onClick={() => setFilterSeverity(filterSeverity === sev ? "All" : sev)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all duration-150 ${
                  filterSeverity === sev
                    ? `${cfg.color} ring-1 ring-current/20`
                    : "bg-bg/40 text-textSecondary border-border/50 hover:bg-surface-hover"
                }`}
              >
                <Icon size={14} />
                <span>{sev}</span>
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                  filterSeverity === sev ? "bg-white/10" : "bg-border/30"
                }`}>
                  {severityCounts[sev]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-surface rounded-2xl border border-border/80 p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
            <input
              type="text"
              placeholder="Search alerts by title, ID, claim, investigator..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="enterprise-input pl-9 w-full"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-textSecondary" />
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="enterprise-select text-xs"
            >
              <option>All Severity</option>
              {SEVERITY_ORDER.map((s) => <option key={s}>{s}</option>)}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="enterprise-select text-xs"
            >
              {STATUS_OPTIONS.map((s) => <option key={s}>{s === "All" ? "All Status" : s}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {filteredAlerts.map((alert, idx) => {
          const sev = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.Medium;
          const SevIcon = sev.icon;
          return (
            <div
              key={alert.id}
              className="bg-surface rounded-2xl border border-border/80 p-5 hover:border-primary/30 hover:shadow-[0_4px_20px_rgb(0_0_0_/_0.06)] transition-all duration-200 animate-fade-in-up"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div className="flex items-start gap-4">
                <div className={`p-2.5 rounded-xl shrink-0 ${sev.color}`}>
                  <SevIcon size={18} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-bold text-textPrimary text-sm">{alert.title}</h3>
                      <p className="text-xs text-textSecondary mt-1 leading-relaxed line-clamp-2">
                        {alert.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${sev.color}`}>
                        {alert.severity}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${getStatusColor(alert.status)}`}>
                        {alert.status}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-semibold text-textSecondary">Risk Score</span>
                      <span className={`text-[10px] font-black ${
                        alert.riskScore >= 85 ? "text-red-500" :
                        alert.riskScore >= 65 ? "text-orange-500" :
                        alert.riskScore >= 45 ? "text-amber-400" : "text-blue-500"
                      }`}>{alert.riskScore}/100</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-border/30 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${sev.barColor}`}
                        style={{ width: `${Math.min(alert.riskScore, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 mt-3 text-[10px] font-semibold text-textSecondary">
                    <span className="flex items-center gap-1"><Clock size={10} /> {alert.time}</span>
                    <span className="flex items-center gap-1"><User size={10} /> {alert.assigned}</span>
                    <span className="flex items-center gap-1"><Tag size={10} /> {alert.category}</span>
                    {alert.claimId && (
                      <span className="flex items-center gap-1 font-mono text-primary"><FileText size={10} /> {alert.claimId}</span>
                    )}
                    <span className="flex items-center gap-1 font-mono text-textSecondary opacity-60">{alert.id}</span>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleOpenDetail(alert)}
                    className="enterprise-btn-primary py-2 px-3 text-xs flex items-center gap-1"
                  >
                    <ArrowUpRight size={12} /> Investigate
                  </button>
                  {alert.status !== "Resolved" && (
                    <button
                      onClick={() => handleResolve(alert.id)}
                      className="enterprise-btn-ghost py-2 px-3 text-xs flex items-center gap-1"
                    >
                      <Check size={12} /> Resolve
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filteredAlerts.length === 0 && (
          <div className="text-center py-16 text-textSecondary">
            <ShieldCheck size={40} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm font-semibold">No alerts match your filters</p>
            <p className="text-xs text-textSecondary/60 mt-1">Try adjusting your search or filter criteria</p>
          </div>
        )}
      </div>

      <Modal open={showDetail} onClose={() => setShowDetail(false)} title="Investigation Detail" wide>
        {selectedAlert && <DetailContent
          alert={selectedAlert}
          timeline={selectedTimeline}
          actionLog={actionLog}
          onResolve={handleResolve}
          onStatusChange={handleStatusChange}
          onAssign={handleAssignInvestigator}
          note={investigationNote}
          setNote={setInvestigationNote}
          onSubmitNote={handleSubmitNote}
          onRefresh={() => setSelectedAlert((prev) => {
            if (!prev) return prev;
            const updated = alerts.find((a) => a.id === prev.id);
            return updated || prev;
          })}
        />}
      </Modal>
    </div>
  );
}

function DetailContent({ alert, timeline, actionLog, onResolve, onStatusChange, onAssign, note, setNote, onSubmitNote }) {
  const sev = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.Medium;
  const SevIcon = sev.icon;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className={`px-3 py-1 rounded text-[10px] font-black uppercase tracking-wider border ${sev.color}`}>
          <SevIcon size={10} className="inline mr-1" />{alert.severity}
        </span>
        <span className={`px-3 py-1 rounded text-[10px] font-black uppercase tracking-wider border ${getStatusColor(alert.status)}`}>
          {alert.status}
        </span>
        {alert.category && (
          <span className="px-3 py-1 rounded text-[10px] font-black uppercase tracking-wider border bg-bg/40 text-textSecondary border-border/50">
            {alert.category}
          </span>
        )}
        <span className="ml-auto text-[10px] font-mono text-textSecondary">{alert.id}</span>
      </div>

      <div>
        <h3 className="text-base font-bold text-textPrimary mb-2">{alert.title}</h3>
        <p className="text-sm text-textSecondary leading-relaxed">{alert.description}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs border-t border-border/60 pt-4">
        <div>
          <span className="text-textSecondary block mb-1">Alert ID</span>
          <span className="font-mono font-bold text-textPrimary">{alert.id}</span>
        </div>
        <div>
          <span className="text-textSecondary block mb-1">Category</span>
          <span className="font-bold text-textPrimary">{alert.category}</span>
        </div>
        <div>
          <span className="text-textSecondary block mb-1">Generated</span>
          <span className="font-bold text-textPrimary">{alert.time}</span>
        </div>
        <div>
          <span className="text-textSecondary block mb-1">Related Claim</span>
          <span className="font-mono font-bold text-primary">{alert.claimId || "N/A"}</span>
        </div>
      </div>

      <div className="bg-bg/40 rounded-xl border border-border/60 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-textPrimary flex items-center gap-1.5">
            <Activity size={14} /> Risk Score
          </span>
          <span className={`text-sm font-black ${
            alert.riskScore >= 85 ? "text-red-500" :
            alert.riskScore >= 65 ? "text-orange-500" :
            alert.riskScore >= 45 ? "text-amber-400" : "text-blue-500"
          }`}>{alert.riskScore}/100</span>
        </div>
        <div className="w-full h-3 rounded-full bg-border/30 overflow-hidden mb-2">
          <div
            className={`h-full rounded-full transition-all duration-700 ${sev.barColor}`}
            style={{ width: `${Math.min(alert.riskScore, 100)}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] text-textSecondary">
          <span>Minimal</span>
          <span>Low</span>
          <span>Medium</span>
          <span>High</span>
          <span>Critical</span>
        </div>
      </div>

      <div>
        <h4 className="text-xs font-bold text-textPrimary mb-3 flex items-center gap-1.5">
          <User size={14} /> Assigned Investigator
        </h4>
        <select
          value={alert.assigned}
          onChange={(e) => onAssign(alert.id, e.target.value)}
          className="enterprise-select text-xs w-full sm:w-auto"
        >
          <option value="Unassigned">Unassigned</option>
          {INVESTIGATORS.map((inv) => (
            <option key={inv} value={inv}>{inv}</option>
          ))}
        </select>
      </div>

      {alert.claimData && (
        <div className="bg-bg/40 rounded-xl border border-border/60 p-4">
          <h4 className="text-xs font-bold text-textPrimary mb-3 flex items-center gap-1.5">
            <FileText size={14} /> Related Claim Details
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-textSecondary block mb-0.5">Claim ID</span>
              <span className="font-mono font-bold text-textPrimary">{alert.claimData.claim_id}</span>
            </div>
            <div>
              <span className="text-textSecondary block mb-0.5">Patient</span>
              <span className="font-bold text-textPrimary">{alert.claimData.patient_name}</span>
            </div>
            <div>
              <span className="text-textSecondary block mb-0.5">Provider</span>
              <span className="font-bold text-textPrimary">{alert.claimData.provider_name}</span>
            </div>
            <div>
              <span className="text-textSecondary block mb-0.5">Amount</span>
              <span className="font-bold text-textPrimary">{formatCurrency(alert.claimData.claim_amount)}</span>
            </div>
            <div>
              <span className="text-textSecondary block mb-0.5">Diagnosis</span>
              <span className="font-mono font-bold text-textPrimary">{alert.claimData.diagnosis_code || "N/A"}</span>
            </div>
            <div>
              <span className="text-textSecondary block mb-0.5">Procedure</span>
              <span className="font-mono font-bold text-textPrimary">{alert.claimData.procedure_code || "N/A"}</span>
            </div>
          </div>
        </div>
      )}

      <div>
        <h4 className="text-xs font-bold text-textPrimary mb-3 flex items-center gap-1.5">
          <History size={14} /> Investigation Timeline
        </h4>
        <div className="space-y-0 relative ml-2">
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border/60" />
          {timeline.map((event, i) => (
            <div key={i} className="relative flex items-start gap-3 pb-4 last:pb-0">
              <div className={`relative z-10 w-[15px] h-[15px] rounded-full border-2 shrink-0 mt-0.5 ${
                i === 0 ? "border-primary bg-primary/20" : "border-border bg-surface"
              }`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-textPrimary">{event.action}</span>
                  <span className="text-[9px] text-textSecondary font-mono">
                    {event.time ? new Date(event.time).toLocaleTimeString() : ""}
                  </span>
                </div>
                <p className="text-[11px] text-textSecondary mt-0.5">{event.detail}</p>
                <p className="text-[10px] text-textSecondary/60 mt-0.5">by {event.actor}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-xs font-bold text-textPrimary mb-3 flex items-center gap-1.5">
          <MessageSquare size={14} /> Investigation Notes
        </h4>
        <div className="space-y-2 mb-3">
          {(alert.notes || []).length === 0 ? (
            <p className="text-[11px] text-textSecondary/60 italic">No notes yet.</p>
          ) : (
            alert.notes.map((n, i) => (
              <div key={i} className="bg-bg/40 rounded-lg border border-border/40 p-3">
                <p className="text-xs text-textPrimary leading-relaxed">{n.text}</p>
                <div className="flex items-center gap-2 mt-1.5 text-[9px] text-textSecondary">
                  <User size={9} /> {n.author}
                  <Clock size={9} /> {new Date(n.time).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="flex gap-2">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add investigation notes..."
            rows={3}
            className="enterprise-input flex-1 resize-none text-xs"
          />
        </div>
        <button
          onClick={onSubmitNote}
          disabled={!note.trim()}
          className="enterprise-btn-primary py-2 px-4 text-xs mt-2 flex items-center gap-1.5 disabled:opacity-40"
        >
          <MessageSquare size={12} /> Submit Note
        </button>
      </div>

      {actionLog.length > 0 && (
        <div>
          <h4 className="text-xs font-bold text-textPrimary mb-3 flex items-center gap-1.5">
            <Flag size={14} /> Action History
          </h4>
          <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar">
            {actionLog.slice(0, 20).map((entry, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px] text-textSecondary py-1 border-b border-border/30 last:border-0">
                <span className="font-semibold text-textPrimary">{entry.action}</span>
                <span className="font-mono text-textSecondary/60">{entry.target}</span>
                <span className="ml-auto font-mono text-textSecondary/60">
                  {new Date(entry.time).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-2 border-t border-border/60">
        <button
          onClick={() => {
            if (alert.status !== "Investigating" && alert.status !== "Resolved") {
              onStatusChange(alert.id, "Investigating");
            }
          }}
          className="enterprise-btn-primary flex-1 py-3 text-sm flex items-center justify-center gap-1.5"
          disabled={alert.status === "Investigating" || alert.status === "Resolved"}
        >
          <ArrowUpRight size={14} /> {alert.status === "Investigating" ? "Investigating..." : "Start Investigation"}
        </button>
        {alert.status !== "Resolved" && (
          <button
            onClick={() => onResolve(alert.id)}
            className="enterprise-btn-ghost flex-1 py-3 text-sm flex items-center justify-center gap-1.5"
          >
            <Check size={14} /> Mark Resolved
          </button>
        )}
      </div>
    </div>
  );
}
