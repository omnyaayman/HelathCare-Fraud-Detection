import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell, AlertTriangle, CheckCircle, Info, ShieldAlert, Mail,
  Search, Filter, Archive, X, Clock, Send, Eye, Activity,
  ChevronRight, ExternalLink, FileText, User, Building2, DollarSign,
  Trash2, RotateCcw, ArrowUpRight
} from "lucide-react";
import api from '../api';
import Skeleton from '../components/Skeleton';
import { formatCurrency, formatNumber, formatCompactCurrency } from '../data/dataUtils';
import {
  CANONICAL_PROVIDERS, CANONICAL_PATIENTS, CANONICAL_MODEL,
  CANONICAL_FUNNEL, CANONICAL_FINANCIALS, CANONICAL_FRAUD_CATEGORIES
} from '../data/canonicalData';

const SEVERITY_CONFIG = {
  critical: { bg: "border-l-red-500 bg-[#0f172a] border-l-4", icon: AlertTriangle, color: "text-red-400", badge: "bg-red-500/15 text-red-400 border border-red-500/30" },
  high: { bg: "border-l-orange-500 bg-[#0f172a] border-l-4", icon: AlertTriangle, color: "text-orange-400", badge: "bg-orange-500/15 text-orange-400 border border-orange-500/30" },
  medium: { bg: "border-l-amber-500 bg-[#0f172a] border-l-4", icon: Info, color: "text-amber-400", badge: "bg-amber-500/15 text-amber-400 border border-amber-500/30" },
  low: { bg: "border-l-blue-500 bg-[#0f172a] border-l-4", icon: Info, color: "text-blue-400", badge: "bg-blue-500/15 text-blue-400 border border-blue-500/30" },
  info: { bg: "border-l-slate-500 bg-[#0f172a] border-l-4", icon: Bell, color: "text-slate-400", badge: "bg-slate-500/15 text-slate-400 border border-slate-500/30" },
};

const categoryFilters = [
  { id: "all", label: "All", icon: Bell },
  { id: "unread", label: "Unread", icon: Eye },
  { id: "critical", label: "Critical", icon: AlertTriangle },
  { id: "fraud", label: "Fraud", icon: ShieldAlert },
  { id: "system", label: "System", icon: Activity },
  { id: "policy", label: "Policy", icon: FileText },
];

const timeAgo = (ts) => {
  if (!ts) return "—";
  const diff = Date.now() - new Date(ts).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "Just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const formatTime = (ts) => {
  if (!ts) return "—";
  try {
    const d = new Date(ts);
    return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return ts; }
};

let _cachedNotifications = null;
function generateNotifications() {
  if (_cachedNotifications) return _cachedNotifications;
  const now = Date.now();
  const h = (n) => new Date(now - n * 3600000).toISOString();
  const m = (n) => new Date(now - n * 60000).toISOString();
  const providers = CANONICAL_PROVIDERS;
  const patients = CANONICAL_PATIENTS;
  const cats = CANONICAL_FRAUD_CATEGORIES;

  const list = [
    // ── Fraud Alerts (15) ──
    { id: 1, type: "fraud_alert", title: "High-Risk Claim: $2,450 — Metropolitan General Hospital", message: `Claim CLM-2026-000127 from ${providers[0].name} flagged at 94.2% fraud probability. Patient: ${patients[0].name}. Amount: $2,450.00`, severity: "critical", read: false, created_at: m(3), claim_id: "CLM-2026-000127" },
    { id: 2, type: "fraud_alert", title: "Duplicate Claims Surge — St. Mary Medical", message: `12 duplicate claims detected from ${providers[1].name} in the past 48 hours. Total potential fraud exposure: $15,680. Services billed across 8 different patients.`, severity: "critical", read: false, created_at: m(18), claim_id: "CLM-2026-000201" },
    { id: 3, type: "fraud_alert", title: "Upcoding Pattern — Pacific Wellness Group", message: `Code M54.5 (Low Back Pain) billed at $12,400 vs $450 avg. ${providers[3].name} shows systematic upcoding across 23 claims. Estimated overpayment: $8,750.`, severity: "critical", read: false, created_at: h(2), claim_id: "CLM-2026-000089" },
    { id: 4, type: "fraud_alert", title: "Phantom Billing — Summit Healthcare", message: `3 claims from ${providers[4].name} on July 4th weekend when facility was closed. Services billed: office visits & imaging. Total: $4,200.`, severity: "critical", read: false, created_at: h(3), claim_id: "CLM-2026-000056" },
    { id: 5, type: "fraud_alert", title: `Flagged: ${providers[9].name} — 9 Fraud Claims`, message: `Dr. Joseph Gonzalez (Orthopedics) at ${providers[9].name} identified with 9 confirmed fraud claims (8.9% fraud rate). Referral for SIU investigation recommended.`, severity: "high", read: false, created_at: h(4) },
    { id: 6, type: "fraud_alert", title: "Geographic Anomaly — Lakeside Medical", message: `${providers[5].name}: 15 claims from patients residing >250 miles from clinic. No referral documentation on file. Potential shell billing network.`, severity: "high", read: true, created_at: h(5), claim_id: "CLM-2026-000312" },
    { id: 7, type: "fraud_alert", title: "Unbundling Detected — City Health Network", message: `${providers[2].name} billed 99213 and 99214 separately for same visit across 47 encounters. Bundle violation rate: 78% vs 12% peer avg.`, severity: "high", read: true, created_at: h(7), claim_id: "CLM-2026-000178" },
    { id: 8, type: "fraud_alert", title: "Identity Fraud Ring Suspected", message: "SSN reused across 4 patient member IDs within 60-day window. Shared address (1423 Elm St) and phone (555-0199) detected. Possible fraud ring.", severity: "critical", read: true, created_at: h(9) },
    { id: 9, type: "fraud_alert", title: "Modifier -25 Overuse — Northeast Health", message: `${providers[7].name} applied modifier -25 to 78% of E/M claims vs 12% peer avg. Systematic overbilling pattern identified over 6-month period.`, severity: "medium", read: false, created_at: h(11), claim_id: "CLM-2026-000445" },
    { id: 10, type: "fraud_alert", title: `Rapid Billing Surge — New Provider Alert`, message: `Provider enrolled 14 days ago submitted 212 claims totaling $450K. Average new provider submits <15 claims in first month. Immediate review flagged.`, severity: "critical", read: false, created_at: h(13) },
    { id: 11, type: "fraud_alert", title: "Excessive Imaging — Valley Regional", message: `${providers[6].name} ordered MRI/CT scans at 3.2x the recommended frequency for 18 patients. Total unnecessary spend estimated at $34,200.`, severity: "medium", read: true, created_at: h(15), claim_id: "CLM-2026-000567" },
    { id: 12, type: "fraud_alert", title: "Prescription Anomaly — Controlled Substances", message: "Schedule II opioid prescribed at 2.5x max recommended dosage. Patient seen by 6 different providers in 30 days for same complaint. Doctor shopping indicator.", severity: "high", read: true, created_at: h(18) },
    { id: 13, type: "fraud_alert", title: "Kickback Scheme — Reference Lab Pattern", message: `${providers[8].name} referred 92% of lab work to a single reference lab at 40% above market rate. Pattern suggests illegal kickback arrangement.`, severity: "high", read: false, created_at: h(20) },
    { id: 14, type: "fraud_alert", title: `New Fraud Hotspot — ${patients[3].city}, ${patients[3].state}`, message: `${patients[3].city} fraud claims up 34% QoQ. ${patients[3].name} (age ${patients[3].age}) identified with ${patients[3].total_claims} claims, ${patients[3].flagged_claims} flagged. Regional task force recommended.`, severity: "medium", read: false, created_at: h(22) },
    { id: 15, type: "fraud_alert", title: "Claim Amount Outlier — Premier Care Network", message: `${providers[8].name} submitted claim CLM-2026-000890 for $47,500 — 38x the average for procedure 99215. No supporting documentation.`, severity: "high", read: true, created_at: h(23), claim_id: "CLM-2026-000890" },

    // ── System Alerts (8) ──
    { id: 16, type: "system_alert", title: "Model Retrained Successfully", message: `Model ${CANONICAL_MODEL.version} training completed. Accuracy: ${(CANONICAL_MODEL.accuracy * 100).toFixed(1)}%, F1: ${CANONICAL_MODEL.f1Score}, AUC: ${CANONICAL_MODEL.rocAuc}. Training size: ${formatNumber(CANONICAL_MODEL.trainingSize)} records.`, severity: "info", read: false, created_at: h(1) },
    { id: 17, type: "system_alert", title: "Database Performance Warning", message: "Query response time increased by 35% in the last hour. Average latency: 245ms. Connection pool at 47/200. Index optimization recommended.", severity: "warning", read: false, created_at: h(4) },
    { id: 18, type: "system_alert", title: `Storage at 82.7% Capacity`, message: "Disk usage: 847GB/1000GB. Current growth rate suggests critical threshold (95%) in 18 days. Archive old claims or expand storage.", severity: "warning", read: true, created_at: h(6) },
    { id: 19, type: "system_alert", title: "GPU Temperature Normalized", message: "GPU temperature steady at 72°C. Utilization: 67%. Memory: 14.2GB/24GB. All compute nodes operational.", severity: "info", read: true, created_at: h(8) },
    { id: 20, type: "system_alert", title: "Daily Backup Completed", message: "Full system backup completed successfully. Size: 284GB. Duration: 47min. Encrypted backup stored to remote vault.", severity: "info", read: false, created_at: h(10) },
    { id: 21, type: "system_alert", title: "API Gateway — 99.97% Uptime", message: "API server health check passed. Avg response: 145ms. Requests/min: 1,247. All 12 microservices operational.", severity: "info", read: true, created_at: h(14) },
    { id: 22, type: "system_alert", title: "Security Scan Completed — Clean", message: "Automated vulnerability scan of all 24 nodes completed. 0 critical, 2 low-severity findings patched. Next scan scheduled in 24h.", severity: "low", read: false, created_at: h(17) },
    { id: 23, type: "system_alert", title: "Queue Processing — Normal", message: `Queue depth: 23 items. Processed: 45,230/h. Failed (24h): 3 — all auto-retried. Worker pool healthy.`, severity: "info", read: true, created_at: h(21) },

    // ── Policy Alerts (7) ──
    { id: 24, type: "policy_alert", title: `Policy Expiring — ${patients[0].name}`, message: `Policy XAI000674929 for ${patients[0].name} (age ${patients[0].age}) expires in 7 days. Current deductible: $1,500. Renewal premium: $485/mo.`, severity: "warning", read: false, created_at: h(1) },
    { id: 25, type: "policy_alert", title: `High-Risk Policy — ${patients[2].name}`, message: `Policy for ${patients[2].name} shows claims 3.2x above plan average. ${patients[2].flagged_claims} of ${patients[2].total_claims} claims flagged. Risk score: 67.8. Review recommended.`, severity: "warning", read: false, created_at: h(5) },
    { id: 26, type: "policy_alert", title: "Premium Adjustment — Multiple Policies", message: "Quarterly premium review: 23 policies adjusted. Average increase: 4.2%. Affected members notified via email. Effective next billing cycle.", severity: "info", read: true, created_at: h(8) },
    { id: 27, type: "policy_alert", title: `Coverage Update — ${patients[4].name}`, message: `Policy POL-2026-002876 for ${patients[4].name} max coverage limit increased from $500K to $750K. Deductible unchanged at $2,200.`, severity: "info", read: false, created_at: h(12) },
    { id: 28, type: "policy_alert", title: "Policy Suspension Risk — Non-Payment", message: "7 policies flagged for premium non-payment (60+ days overdue). Total at-risk premium: $8,450. Grace period expires in 5 days.", severity: "warning", read: true, created_at: h(16) },
    { id: 29, type: "policy_alert", title: "Fraud Risk Escalation — Policy Review", message: `Policy POL-2026-003102: ${patients[3].name} fraud_score increased to 67.5. ${patients[3].flagged_claims} of ${patients[3].total_claims} claims flagged for ${patients[3].city}, ${patients[3].state}.`, severity: "high", read: false, created_at: h(19) },
    { id: 30, type: "policy_alert", title: "Auto-Renewal Complete — Batch #2847", message: "1,892 policies auto-renewed for 2026 cycle. Total annual premium value: $14.2M. Renewal rate: 94.3%. 112 policies pending manual review.", severity: "info", read: true, created_at: h(24) },

    // ── Model Alerts (5) ──
    { id: 31, type: "model_alert", title: "Model Performance — F1 Score Update", message: `Current F1: ${CANONICAL_MODEL.f1Score}. Precision: ${(CANONICAL_MODEL.precision * 100).toFixed(1)}%. Recall: ${(CANONICAL_MODEL.recall * 100).toFixed(1)}%. All metrics within acceptable thresholds.`, severity: "info", read: false, created_at: h(2) },
    { id: 32, type: "model_alert", title: "Data Drift Detected — 4.2%", message: `Feature distribution drift of 4.2% measured against training baseline v4.2. Top drifted features: Claim Amount Deviation (+2.1%), Provider Fraud History (+1.8%). No retraining needed yet.`, severity: "low", read: false, created_at: h(6) },
    { id: 33, type: "model_alert", title: "Feature Importance Updated", message: "Top 3 features: Claim Amount Deviation (23.4%), Provider Fraud History (18.9%), Duplicate Procedure Flag (15.6%). Feature set stable — no degradation detected.", severity: "info", read: true, created_at: h(11) },
    { id: 34, type: "model_alert", title: "Model Scheduled — Auto-Retrain", message: `Next automatic retraining scheduled in 7 days. Dataset v4.2 (${formatNumber(CANONICAL_MODEL.trainingSize)} records) queued. Expected duration: ~4.5 hours.`, severity: "info", read: true, created_at: h(16) },
    { id: 35, type: "model_alert", title: "Validation Accuracy — 93.8%", message: `Holdout validation set (10,800 samples) accuracy: ${(CANONICAL_MODEL.validationAccuracy * 100).toFixed(1)}%. Confusion matrix: TN=${CANONICAL_MODEL.confusionMatrix.tn}, FP=${CANONICAL_MODEL.confusionMatrix.fp}, FN=${CANONICAL_MODEL.confusionMatrix.fn}, TP=${CANONICAL_MODEL.confusionMatrix.tp}.`, severity: "info", read: true, created_at: h(22) },
  ];

  _cachedNotifications = list;
  return list;
}

export default function NotificationCenter() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getNotifications();
      setNotifications(Array.isArray(res) && res.length > 0 ? res : generateNotifications());
    } catch {
      setNotifications(generateNotifications());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    notifications.filter(n => !n.read).forEach(n => api.markNotificationRead(n.id).catch(() => {}));
  }, [notifications]);

  const deleteNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (selected && selected.id === id) setSelected(null);
  }, [selected]);

  const archiveNotification = useCallback((id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, archived: true } : n));
    if (selected && selected.id === id) setSelected(null);
  }, [selected]);

  const openDetail = async (n) => {
    setDetailLoading(true);
    setSelected(n);
    if (!n.read) {
      setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, read: true } : item));
      try { await api.markNotificationRead(n.id); } catch {}
    }
    try {
      const detail = await api.getNotificationDetail(n.id);
      setSelected(detail);
    } catch { setSelected(n); }
    setDetailLoading(false);
  };

  const closeDetail = () => setSelected(null);

  const filtered = notifications.filter(n => !n.archived).filter(n => {
    if (filter === "unread") return !n.read;
    if (filter === "critical") return n.severity === "critical" || n.severity === "high";
    if (filter === "fraud") return n.type === "fraud_alert" || n.type === "fraud";
    if (filter === "system") return n.type === "system_alert" || n.type === "model_alert" || n.type === "system";
    if (filter === "policy") return n.type === "policy_alert" || n.type === "policy";
    if (filter !== "all") return n.type === filter;
    return true;
  }).filter(n => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (n.title || "").toLowerCase().includes(q) || (n.message || "").toLowerCase().includes(q);
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) return (
    <div className="space-y-4">
      <div className="h-20 skeleton-shimmer rounded-2xl" />
      <div className="flex gap-6">
        <div className="w-64 space-y-3"><Skeleton rows={6} /></div>
        <div className="flex-1 space-y-3"><Skeleton rows={8} /></div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Toast-like distinction banner */}
      <div className="rounded-2xl border border-[#1e293b]/80 bg-[#0f172a]/80 p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-[#4f46e5]/10 border border-[#4f46e5]/20 shrink-0">
            <Bell size={18} className="text-[#818cf8]" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-[#f8fafc]">Notification Center — General Operations</p>
            <p className="text-xs text-[#94a3b8] mt-1">
              All system, model, policy and fraud notifications. For <span className="font-semibold text-[#f87171]">critical fraud alerts</span> requiring immediate investigator action, visit the{" "}
              <button onClick={() => navigate('/insurance/alerts')} className="inline-flex items-center gap-1 font-semibold text-[#818cf8] hover:text-[#6366f1] transition-colors">
                Alert Center <ArrowUpRight size={12} />
              </button>
              .
            </p>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-[#f8fafc] tracking-tight">Notification Center</h1>
            <span className="px-2.5 py-1 rounded-full bg-[#4f46e5]/10 border border-[#4f46e5]/30 text-xs font-bold text-[#818cf8]">
              Unread: {unreadCount}
            </span>
          </div>
          <p className="text-sm text-[#94a3b8] mt-1">System, model, policy & fraud updates — {notifications.length} total</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setLoading(true); fetchNotifications(); }}
            className="inline-flex items-center gap-2 rounded-xl border border-[#1e293b] bg-[#0f172a]/80 px-4 py-2 text-sm font-medium text-[#94a3b8] hover:border-[#4f46e5]/50 hover:text-[#818cf8] transition-all">
            <RotateCcw size={14} /> Refresh
          </button>
          <button onClick={markAllRead}
            className="inline-flex items-center gap-2 rounded-xl border border-[#4f46e5]/30 bg-[#4f46e5]/10 px-4 py-2 text-sm font-medium text-[#818cf8] hover:bg-[#4f46e5]/20 transition-all">
            <CheckCircle size={14} /> Mark All Read
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-64 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94a3b8]" />
            <input type="text" placeholder="Search notifications..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0f172a] border border-[#1e293b] text-[#f8fafc] placeholder-[#94a3b8]/60 text-sm focus:outline-none focus:border-[#4f46e5]/60 transition-colors" />
          </div>
          <div className="bg-[#0f172a]/80 rounded-2xl border border-[#1e293b]/80 overflow-hidden">
            <div className="px-4 py-3 border-b border-[#1e293b]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#94a3b8]">Filter</h3>
            </div>
            <div className="divide-y divide-[#1e293b]/60">
              {categoryFilters.map(cat => {
                const Icon = cat.icon;
                const count = cat.id === "all" ? notifications.filter(n => !n.archived).length
                  : cat.id === "unread" ? unreadCount
                  : cat.id === "critical" ? notifications.filter(n => !n.archived && (n.severity === "critical" || n.severity === "high")).length
                  : cat.id === "fraud" ? notifications.filter(n => !n.archived && (n.type === "fraud_alert" || n.type === "fraud")).length
                  : cat.id === "system" ? notifications.filter(n => !n.archived && (n.type === "system_alert" || n.type === "model_alert" || n.type === "system")).length
                  : cat.id === "policy" ? notifications.filter(n => !n.archived && (n.type === "policy_alert" || n.type === "policy")).length
                  : notifications.filter(n => !n.archived && n.type === cat.id).length;
                return (
                  <button key={cat.id} onClick={() => setFilter(cat.id)}
                    className={`flex items-center justify-between w-full px-4 py-3 text-sm hover:bg-[#1e293b]/50 transition-colors ${filter === cat.id ? "bg-[#4f46e5]/10 text-[#818cf8]" : "text-[#94a3b8]"}`}>
                    <div className="flex items-center gap-3">
                      <Icon size={16} className={filter === cat.id ? "text-[#818cf8]" : "text-[#64748b]"} />
                      <span className={filter === cat.id ? "font-semibold" : ""}>{cat.label}</span>
                    </div>
                    <span className="text-xs text-[#64748b] font-mono">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main list */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#94a3b8]">{filtered.length} notification{filtered.length !== 1 ? "s" : ""}</p>
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-[#0f172a]/80 rounded-2xl border border-[#1e293b]/80">
              <Bell className="h-12 w-12 text-[#64748b] mb-4" />
              <h3 className="text-lg font-bold text-[#f8fafc]">No notifications</h3>
              <p className="text-sm text-[#94a3b8]">You're all caught up!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(n => {
                const sev = SEVERITY_CONFIG[n.severity] || SEVERITY_CONFIG.info;
                const Icon = sev.icon;
                return (
                  <div key={n.id}
                    className={`group relative ${sev.bg} rounded-xl border border-[#1e293b]/80 shadow-sm hover:border-[#4f46e5]/40 hover:shadow-md transition-all cursor-pointer ${!n.read ? "ring-1 ring-[#4f46e5]/30" : ""}`}>
                    <div className="flex items-start gap-4 p-4" onClick={() => openDetail(n)}>
                      <div className={`p-3 rounded-full bg-[#0b0f19] border border-[#1e293b] shadow-sm ${sev.color}`}>
                        <Icon size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className={`text-sm ${!n.read ? "font-bold" : "font-semibold"} text-[#f8fafc]`}>{n.title}</h4>
                              {!n.read && <span className="w-2 h-2 rounded-full bg-[#4f46e5] shrink-0"></span>}
                              {n.status === 'historical' && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400 border border-purple-500/30">HISTORICAL</span>}
                              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${sev.badge}`}>{(n.severity || "info").toUpperCase()}</span>
                            </div>
                            <p className="text-xs text-[#94a3b8] mt-1 line-clamp-1">{n.message}</p>
                          </div>
                          <ChevronRight size={16} className="text-[#64748b] shrink-0 mt-1" />
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px]">
                          <span className="flex items-center gap-1 text-[#64748b]" title={formatTime(n.created_at)}>
                            <Clock size={11} /> {timeAgo(n.created_at)}
                          </span>
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#1e293b] text-[#94a3b8] border border-[#1e293b]/80`}>
                            {(n.type || "info").replace("_alert", "").replace("_", " ").toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                    {/* Delete button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                      className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-[#1e293b] hover:bg-red-500/20 border border-[#1e293b] hover:border-red-500/30 text-[#64748b] hover:text-red-400 transition-all"
                      title="Delete notification"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Detail Drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeDetail} />
          <div className="relative w-full max-w-lg bg-[#0f172a] border-l border-[#1e293b] shadow-2xl overflow-y-auto">
            <div className="sticky top-0 bg-[#0f172a] border-b border-[#1e293b] px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-bold text-[#f8fafc]">Notification Details</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => { deleteNotification(selected.id); }}
                  className="p-2 hover:bg-red-500/10 rounded-lg text-[#64748b] hover:text-red-400 transition-colors">
                  <Trash2 size={16} />
                </button>
                <button onClick={closeDetail}
                  className="p-2 hover:bg-[#1e293b] rounded-lg text-[#64748b] hover:text-[#f8fafc] transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            {detailLoading ? (
              <div className="p-6 space-y-4"><Skeleton rows={6} /></div>
            ) : (
              <div className="p-6 space-y-6">
                  <div className="flex flex-wrap gap-2">
                  {selected.status === 'historical' && <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30">HISTORICAL</span>}
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${(SEVERITY_CONFIG[selected.severity] || SEVERITY_CONFIG.info).badge}`}>{(selected.severity || "INFO").toUpperCase()}</span>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#1e293b] text-[#94a3b8] border border-[#1e293b]/80">{(selected.type || "system").replace("_alert", "").replace("_", " ").toUpperCase()}</span>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-[#f8fafc]">{selected.title}</h3>
                  <p className="text-sm text-[#94a3b8] mt-1">{selected.message}</p>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#94a3b8] mb-2">Timeline</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-xs">
                      <Clock size={12} className="text-[#64748b]" />
                      <span className="text-[#64748b] w-20">Created</span>
                      <span className="text-[#f8fafc]">{timeAgo(selected.created_at)}</span>
                      <span className="text-[#64748b] text-[10px]">({formatTime(selected.created_at)})</span>
                    </div>
                    {!selected.read && (
                      <div className="flex items-center gap-3 text-xs">
                        <Eye size={12} className="text-[#64748b]" />
                        <span className="text-[#64748b] w-20">Read</span>
                        <span className="text-[#64748b]">Not yet read</span>
                      </div>
                    )}
                  </div>
                </div>

                {selected.claim_id && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#94a3b8] mb-2">Related Claim</h4>
                    <div className="bg-[#0b0f19] rounded-xl border border-[#1e293b] p-3">
                      <div className="flex items-center gap-2 text-xs text-[#64748b]"><FileText size={12} /> Claim ID</div>
                      <p className="text-sm font-semibold text-[#818cf8] font-mono">{selected.claim_id}</p>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button onClick={() => { archiveNotification(selected.id); }}
                    className="flex-1 rounded-xl border border-[#1e293b] bg-[#0b0f19] py-2.5 text-sm font-medium text-[#94a3b8] hover:border-[#4f46e5]/50 hover:text-[#818cf8] transition-all flex items-center justify-center gap-2">
                    <Archive size={14} /> Archive
                  </button>
                  <button onClick={() => { deleteNotification(selected.id); }}
                    className="flex-1 rounded-xl border border-red-500/30 bg-red-500/10 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/20 transition-all flex items-center justify-center gap-2">
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
