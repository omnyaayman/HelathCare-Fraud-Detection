import { useState, useEffect, useCallback } from "react";
import {
  Bell, AlertTriangle, CheckCircle, Info, ShieldAlert, Mail,
  Search, Filter, Archive, X, Clock, Send, Eye, Activity,
  ChevronRight, ExternalLink, FileText, User, Building2, DollarSign
} from "lucide-react";
import api from '../api';
import Skeleton from '../components/Skeleton';
import { formatCurrency } from '../data/dataUtils';
import { CANONICAL_NOTIFICATIONS } from '../data/canonicalData';

const SEVERITY_CONFIG = {
  critical: { bg: "border-red-500 bg-red-50 dark:bg-red-900/20 dark:border-red-500/50", icon: AlertTriangle, color: "text-red-600 dark:text-red-400", badge: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300" },
  high: { bg: "border-orange-500 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-500/50", icon: AlertTriangle, color: "text-orange-600 dark:text-orange-400", badge: "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300" },
  medium: { bg: "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-500/50", icon: Info, color: "text-yellow-600 dark:text-yellow-400", badge: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300" },
  low: { bg: "border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500/50", icon: Info, color: "text-blue-600 dark:text-blue-400", badge: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300" },
  info: { bg: "border-slate-500 bg-slate-50 dark:bg-slate-800/50 dark:border-slate-600/50", icon: Bell, color: "text-slate-600 dark:text-slate-400", badge: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300" },
};

const DELIVERY_BADGE = {
  sent: { label: "Sent", color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300" },
  failed: { label: "Failed", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
  queued: { label: "Queued", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
};

const CHANNEL_ICONS = { email: Mail, dashboard: Bell, system: Activity };
const CHANNEL_LABELS = { email: "Email", dashboard: "Dashboard", system: "System" };

const categoryFilters = [
  { id: "all", label: "All", icon: Bell },
  { id: "unread", label: "Unread", icon: Eye },
  { id: "critical", label: "Critical", icon: AlertTriangle },
  { id: "fraud", label: "Fraud", icon: ShieldAlert },
  { id: "system", label: "System", icon: Info },
  { id: "policy", label: "Policy", icon: CheckCircle },
];

const formatTime = (ts) => {
  if (!ts) return "—";
  try {
    const d = new Date(ts);
    return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return ts; }
};

const getChannels = (channelStr) => {
  if (!channelStr) return ["dashboard"];
  return channelStr.split(",").map(c => c.trim()).filter(Boolean);
};

export default function NotificationCenter() {
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
      setNotifications(Array.isArray(res) && res.length > 0 ? res : CANONICAL_NOTIFICATIONS);
    } catch {
      setNotifications(CANONICAL_NOTIFICATIONS);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const openDetail = async (n) => {
    setDetailLoading(true);
    setSelected(n);
    try {
      const detail = await api.getNotificationDetail(n.id);
      setSelected(detail);
    } catch { setSelected(n); }
    setDetailLoading(false);
    if (!n.read) {
      try { await api.markNotificationRead(n.id); fetchNotifications(); } catch {}
    }
  };

  const closeDetail = () => setSelected(null);

  const filtered = notifications.filter(n => {
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
    return (n.title || "").toLowerCase().includes(q) || (n.message || "").toLowerCase().includes(q) || (n.description || "").toLowerCase().includes(q);
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) return <Skeleton rows={8} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Notification Center</h1>
          <p className="text-sm text-textSecondary">Manage all alerts, fraud warnings, and system notifications</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { notifications.filter(n => !n.read).forEach(n => api.markNotificationRead(n.id).catch(()=>{})); fetchNotifications(); }}
            className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-textPrimary hover:bg-surfaceHover">
            <CheckCircle size={16} /> Mark All Read
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-64 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-textSecondary" />
            <input type="text" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-surface border border-border text-textPrimary placeholder-textSecondary text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div className="bg-surface rounded-2xl border border-border/80 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-xs font-semibold text-textSecondary uppercase tracking-wider">Filter</h3>
            </div>
            <div className="divide-y divide-border">
              {categoryFilters.map(cat => {
                const Icon = cat.icon;
                const count = cat.id === "all" ? notifications.length : cat.id === "unread" ? unreadCount : cat.id === "critical" ? notifications.filter(n => n.severity === "critical" || n.severity === "high").length : cat.id === "fraud" ? notifications.filter(n => n.type === "fraud_alert" || n.type === "fraud").length : cat.id === "system" ? notifications.filter(n => n.type === "system_alert" || n.type === "model_alert" || n.type === "system").length : cat.id === "policy" ? notifications.filter(n => n.type === "policy_alert" || n.type === "policy").length : notifications.filter(n => n.type === cat.id).length;
                return (
                  <button key={cat.id} onClick={() => setFilter(cat.id)}
                    className={`flex items-center justify-between w-full px-4 py-3 text-sm hover:bg-surfaceHover transition-colors ${filter === cat.id ? "bg-primary/10 text-primary" : "text-textSecondary"}`}>
                    <div className="flex items-center gap-3">
                      <Icon size={16} className={filter === cat.id ? "text-primary" : "text-textSecondary"} />
                      <span>{cat.label}</span>
                    </div>
                    <span className="text-xs text-textSecondary font-mono">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main list */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-textSecondary">{filtered.length} notification{filtered.length !== 1 ? "s" : ""}</p>
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-surface rounded-2xl border border-border/80">
              <Bell className="h-12 w-12 text-textSecondary mb-4" />
              <h3 className="text-lg font-medium text-white">No notifications</h3>
              <p className="text-sm text-textSecondary">You're all caught up!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(n => {
                const sev = SEVERITY_CONFIG[n.severity] || SEVERITY_CONFIG.info;
                const Icon = sev.icon;
                const channels = getChannels(n.channel);
                const ds = DELIVERY_BADGE[n.delivery_status] || DELIVERY_BADGE.pending;
                return (
                  <div key={n.id} onClick={() => openDetail(n)}
                    className={`bg-surface rounded-xl border-l-4 p-4 shadow-sm hover:shadow-md transition-all cursor-pointer ${sev.bg} ${!n.read ? "ring-1 ring-primary/30" : ""}`}>
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-full bg-surface shadow-sm ${sev.color}`}><Icon size={20} /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className={`text-sm ${!n.read ? "font-bold" : "font-semibold"} text-white`}>{n.title}</h4>
                              {!n.read && <span className="w-2 h-2 rounded-full bg-primary"></span>}
                              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${sev.badge}`}>{(n.severity || "info").toUpperCase()}</span>
                            </div>
                            <p className="text-xs text-textSecondary mt-1 line-clamp-1">{n.message || n.description}</p>
                          </div>
                          <ChevronRight size={16} className="text-textSecondary shrink-0 mt-1" />
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px]">
                          <span className="text-textSecondary">{formatTime(n.created_at)}</span>
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${ds.color}`}>{ds.label}</span>
                          {channels.map(ch => {
                            const ChIcon = CHANNEL_ICONS[ch] || Bell;
                            return <span key={ch} className="flex items-center gap-1 text-textSecondary"><ChIcon size={11} />{CHANNEL_LABELS[ch] || ch}</span>;
                          })}
                        </div>
                      </div>
                    </div>
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
          <div className="absolute inset-0 bg-black/40" onClick={closeDetail} />
          <div className="relative w-full max-w-lg bg-surface border-l border-border shadow-2xl overflow-y-auto animate-slide-in">
            <div className="sticky top-0 bg-surface border-b border-border px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-bold text-white">Notification Details</h2>
              <button onClick={closeDetail} className="p-2 hover:bg-surfaceHover rounded-lg text-textSecondary"><X size={18} /></button>
            </div>

            {detailLoading ? (
              <div className="p-6 space-y-4"><Skeleton rows={6} /></div>
            ) : (
              <div className="p-6 space-y-6">
                {/* Severity + Status badges */}
                <div className="flex flex-wrap gap-2">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${(SEVERITY_CONFIG[selected.severity] || SEVERITY_CONFIG.info).badge}`}>{(selected.severity || "INFO").toUpperCase()}</span>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${(DELIVERY_BADGE[selected.delivery_status] || DELIVERY_BADGE.pending).color}`}>{selected.delivery_status || "Pending"}</span>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">{selected.type || "system"}</span>
                </div>

                {/* Title */}
                <div>
                  <h3 className="text-xl font-bold text-white">{selected.title}</h3>
                  <p className="text-sm text-textSecondary mt-1">{selected.message}</p>
                </div>

                {/* Description */}
                {selected.description && (
                  <div className="bg-surfaceHover rounded-xl p-4">
                    <p className="text-sm text-textPrimary">{selected.description}</p>
                  </div>
                )}

                {/* Claim / Provider / Patient info */}
                {selected.claim && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-surfaceHover rounded-xl p-3">
                      <div className="flex items-center gap-2 text-xs text-textSecondary mb-1"><FileText size={12} /> Claim ID</div>
                      <p className="text-sm font-semibold text-white">#{selected.claim.Claim_ID}</p>
                    </div>
                    <div className="bg-surfaceHover rounded-xl p-3">
                      <div className="flex items-center gap-2 text-xs text-textSecondary mb-1"><DollarSign size={12} /> Amount</div>
                      <p className="text-sm font-semibold text-white">{formatCurrency(selected.claim.Claim_Amount || 0)}</p>
                    </div>
                    <div className="bg-surfaceHover rounded-xl p-3">
                      <div className="flex items-center gap-2 text-xs text-textSecondary mb-1"><User size={12} /> Patient</div>
                      <p className="text-sm font-semibold text-white">{selected.claim.patient_name || "N/A"}</p>
                    </div>
                    <div className="bg-surfaceHover rounded-xl p-3">
                      <div className="flex items-center gap-2 text-xs text-textSecondary mb-1"><Building2 size={12} /> Provider</div>
                      <p className="text-sm font-semibold text-white">{selected.claim.provider_name || "N/A"}</p>
                    </div>
                  </div>
                )}

                {/* Channels */}
                <div>
                  <h4 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-2">Delivery Channels</h4>
                  <div className="flex flex-wrap gap-2">
                    {getChannels(selected.channel).map(ch => {
                      const ChIcon = CHANNEL_ICONS[ch] || Bell;
                      return (
                        <span key={ch} className="flex items-center gap-1.5 text-xs bg-surfaceHover text-textPrimary px-3 py-1.5 rounded-full">
                          <ChIcon size={12} className="text-primary" />
                          {CHANNEL_LABELS[ch] || ch}
                          {ch === "email" && selected.delivery_status === "sent" && <CheckCircle size={11} className="text-green-500" />}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Recipients */}
                <div>
                  <h4 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-2">Recipients</h4>
                  <div className="bg-surfaceHover rounded-xl p-3">
                    {(selected.recipient || "Fraud Investigation Team, Compliance Officer, Risk Manager").split(",").map((r, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-textPrimary py-1"><Mail size={12} className="text-primary" />{r.trim()}</div>
                    ))}
                  </div>
                </div>

                {/* Recommended Action */}
                {selected.recommended_action && (
                  <div>
                    <h4 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-2">Recommended Action</h4>
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
                      <p className="text-sm text-textPrimary">{selected.recommended_action}</p>
                    </div>
                  </div>
                )}

                {/* Timeline */}
                <div>
                  <h4 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-2">Timeline</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 text-xs">
                      <Clock size={12} className="text-textSecondary" />
                      <span className="text-textSecondary w-24">Created</span>
                      <span className="text-textPrimary">{formatTime(selected.created_at)}</span>
                    </div>
                    {selected.sent_at && <div className="flex items-center gap-3 text-xs">
                      <Send size={12} className="text-green-500" />
                      <span className="text-textSecondary w-24">Sent</span>
                      <span className="text-textPrimary">{formatTime(selected.sent_at)}</span>
                    </div>}
                    {selected.read_at && <div className="flex items-center gap-3 text-xs">
                      <Eye size={12} className="text-primary" />
                      <span className="text-textSecondary w-24">Read</span>
                      <span className="text-textPrimary">{formatTime(selected.read_at)}</span>
                    </div>}
                    {!selected.read_at && <div className="flex items-center gap-3 text-xs">
                      <Eye size={12} className="text-textSecondary" />
                      <span className="text-textSecondary w-24">Read</span>
                      <span className="text-textSecondary">Not yet read</span>
                    </div>}
                  </div>
                </div>

                {/* Related Investigation */}
                {selected.claim_id && (
                  <a href={`/insurance/claims/${selected.claim_id}`}
                    className="flex items-center justify-between bg-primary/5 hover:bg-primary/10 border border-primary/20 rounded-xl p-3 transition-colors">
                    <span className="flex items-center gap-2 text-sm text-primary font-medium"><ExternalLink size={14} /> View Investigation</span>
                    <ChevronRight size={14} className="text-primary" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
