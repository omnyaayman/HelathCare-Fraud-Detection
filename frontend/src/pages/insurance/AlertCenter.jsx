import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell, AlertTriangle, ShieldAlert, Clock, User, Tag, Filter,
  Search, Check, X, ArrowUpRight, Activity, ShieldCheck, Flag, RefreshCw
} from "lucide-react";
import Modal from "../../components/Modal";
import api from "../../api";

const SEVERITY_CONFIG = {
  Critical: { color: 'bg-red-500/10 text-red-500 border-red-500/20', icon: AlertTriangle, score: 4 },
  High: { color: 'bg-orange-500/10 text-orange-500 border-orange-500/20', icon: ShieldAlert, score: 3 },
  Medium: { color: 'bg-warning/10 text-warning border-warning/20', icon: Activity, score: 2 },
  Low: { color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: Bell, score: 1 },
};

const STATUS_OPTIONS = ['All', 'Resolved', 'Pending', 'Investigating'];

const alertTemplates = [
  { severity: 'Critical', category: 'Upcoding', title: 'Suspicious Upcoding Pattern Detected', desc: 'Provider billing level 5 visits at 4x the peer average. Over 30 patients affected in the last 7 days.' },
  { severity: 'High', category: 'Duplicate', title: 'Duplicate Claim Cross-Reference Match', desc: 'Claim #48911 matches #48890 with identical dates, codes, and amounts. Possible duplicate submission.' },
  { severity: 'Critical', category: 'Anomaly', title: 'Geographic Distance Anomaly', desc: 'Patient residence 340 miles from provider location. No referral documentation on file.' },
  { severity: 'Medium', category: 'Coding', title: 'Unbundling Code Violation', desc: 'Separate billing for procedure codes 99214 and 99215 on same date. Unbundling rule violation confirmed.' },
  { severity: 'High', category: 'Identity', title: 'Identity Matching Alert', desc: 'Patient SSN used across 3 different member IDs in 30 days. Potential identity fraud ring.' },
  { severity: 'Medium', category: 'Billing', title: 'Non-Covered Service Billing', desc: 'Cosmetic procedure billed as medically necessary. Pre-authorization denied but claim still processed.' },
  { severity: 'Low', category: 'Pharmacy', title: 'Prescription Anomaly Detected', desc: 'Schedule II narcotic prescribed at 3x recommended dosage. Reviewed and corrected.' },
  { severity: 'Critical', category: 'Provider', title: 'New Provider Rapid Billing Surge', desc: 'Provider enrolled 8 days ago billing $450K across 212 claims. Credential verification flagged.' },
];

const statuses = ['Pending', 'Investigating', 'Resolved'];
const assignees = ['Dr. Jane Doe', 'Mark Rivera', 'Sarah Chen', 'Dr. James Lee', 'Dr. Emily Park', 'Unassigned'];

export default function AlertCenter() {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [alerts, setAlerts] = useState([
    { id: 'ALT-001', title: alertTemplates[0].title, severity: alertTemplates[0].severity, status: 'Pending', time: '2 min ago', assigned: 'Dr. Jane Doe', category: alertTemplates[0].category, description: alertTemplates[0].desc },
    { id: 'ALT-002', title: alertTemplates[1].title, severity: alertTemplates[1].severity, status: 'Pending', time: '15 min ago', assigned: 'Unassigned', category: alertTemplates[1].category, description: alertTemplates[1].desc },
    { id: 'ALT-003', title: alertTemplates[2].title, severity: alertTemplates[2].severity, status: 'Investigating', time: '32 min ago', assigned: 'Mark Rivera', category: alertTemplates[2].category, description: alertTemplates[2].desc },
    { id: 'ALT-004', title: alertTemplates[3].title, severity: alertTemplates[3].severity, status: 'Resolved', time: '1h ago', assigned: 'Sarah Chen', category: alertTemplates[3].category, description: alertTemplates[3].desc },
    { id: 'ALT-005', title: alertTemplates[4].title, severity: alertTemplates[4].severity, status: 'Investigating', time: '1h ago', assigned: 'Dr. James Lee', category: alertTemplates[4].category, description: alertTemplates[4].desc },
    { id: 'ALT-006', title: alertTemplates[5].title, severity: alertTemplates[5].severity, status: 'Pending', time: '2h ago', assigned: 'Unassigned', category: alertTemplates[5].category, description: alertTemplates[5].desc },
    { id: 'ALT-007', title: alertTemplates[6].title, severity: alertTemplates[6].severity, status: 'Resolved', time: '3h ago', assigned: 'Dr. Emily Park', category: alertTemplates[6].category, description: alertTemplates[6].desc },
    { id: 'ALT-008', title: alertTemplates[7].title, severity: alertTemplates[7].severity, status: 'Pending', time: '4h ago', assigned: 'Unassigned', category: alertTemplates[7].category, description: alertTemplates[7].desc },
  ]);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.generateNotifications();
      if (res?.data) {
        setNotifications(res.data);
        // Generate alerts from notifications
        const newAlerts = res.data
          .filter(n => n.type === 'fraud')
          .slice(0, 8)
          .map((n, i) => ({
            id: `NOT-${i + 1}`,
            title: n.title,
            severity: n.type === 'fraud' ? 'Critical' : n.type === 'success' ? 'Low' : 'Medium',
            status: statuses[i % 3],
            time: n.created_at ? new Date(n.created_at).toLocaleString() : 'Just now',
            assigned: assignees[i % assignees.length],
            category: 'System',
            description: n.message,
          }));
        if (newAlerts.length > 0) setAlerts(newAlerts);
      }
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const [filterSeverity, setFilterSeverity] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  const filteredAlerts = useMemo(() => {
    return alerts.filter(a => {
      if (filterSeverity !== 'All' && a.severity !== filterSeverity) return false;
      if (filterStatus !== 'All' && a.status !== filterStatus) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return a.title.toLowerCase().includes(q) || a.id.toLowerCase().includes(q) || a.assigned.toLowerCase().includes(q) || a.description.toLowerCase().includes(q);
      }
      return true;
    }).sort((a, b) => (SEVERITY_CONFIG[a.severity]?.score || 0) > (SEVERITY_CONFIG[b.severity]?.score || 0) ? -1 : 1);
  }, [alerts, filterSeverity, filterStatus, searchQuery]);

  const handleResolve = (id) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'Resolved' } : a));
  };

  const handleInvestigate = (alert) => {
    setSelectedAlert(alert);
    setShowDetail(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-textPrimary">Alert Center</h1>
          <p className="text-sm text-textSecondary font-medium">{alerts.filter(a => a.status !== 'Resolved').length} active alerts requiring attention</p>
        </div>
      </div>

      <div className="bg-surface rounded-2xl border border-border/80 p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
            <input
              type="text"
              placeholder="Search alerts..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="enterprise-input pl-9 w-full"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-textSecondary" />
            <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)} className="enterprise-select text-xs">
              <option>All</option>
              <option>Critical</option>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="enterprise-select text-xs">
              {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
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
              className="group bg-surface rounded-2xl border border-border/80 p-5 hover:border-primary/30 hover:shadow-[0_4px_20px_rgb(0_0_0_/_0.06)] transition-all duration-200 animate-fade-in-up"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div className="flex items-start gap-4">
                <div className={`p-2.5 rounded-xl shrink-0 ${sev.color}`}>
                  <SevIcon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-textPrimary text-sm">{alert.title}</h3>
                      <p className="text-xs text-textSecondary mt-1 leading-relaxed">{alert.description}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${sev.color}`}>{alert.severity}</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${
                        alert.status === 'Resolved' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                        alert.status === 'Investigating' ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' :
                        'bg-amber-500/10 text-amber-500 border-amber-500/20'
                      }`}>{alert.status}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 mt-3 text-[10px] font-semibold text-textSecondary">
                    <span className="flex items-center gap-1"><Clock size={10} /> {alert.time}</span>
                    <span className="flex items-center gap-1"><User size={10} /> {alert.assigned}</span>
                    <span className="flex items-center gap-1"><Tag size={10} /> {alert.category}</span>
                    <span className="flex items-center gap-1 font-mono text-primary">{alert.id}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleInvestigate(alert)}
                    className="enterprise-btn-primary py-2 px-3 text-xs flex items-center gap-1"
                  >
                    <ArrowUpRight size={12} /> Investigate
                  </button>
                  {alert.status !== 'Resolved' && (
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
          <div className="text-center py-12 text-textSecondary">
            <ShieldCheck size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm font-semibold">No alerts match your filters</p>
          </div>
        )}
      </div>

      <Modal isOpen={showDetail} onClose={() => setShowDetail(false)} title={`Investigate Alert: ${selectedAlert?.id}`}>
        {selectedAlert && (
          <div className="p-6 space-y-5">
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded text-[10px] font-black uppercase tracking-wider border ${SEVERITY_CONFIG[selectedAlert.severity]?.color}`}>{selectedAlert.severity}</span>
              <span className={`px-3 py-1 rounded text-[10px] font-black uppercase tracking-wider border ${
                selectedAlert.status === 'Resolved' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                selectedAlert.status === 'Investigating' ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' :
                'bg-amber-500/10 text-amber-500 border-amber-500/20'
              }`}>{selectedAlert.status}</span>
            </div>
            <h3 className="text-lg font-bold text-textPrimary">{selectedAlert.title}</h3>
            <p className="text-sm text-textSecondary leading-relaxed">{selectedAlert.description}</p>
            <div className="grid grid-cols-2 gap-4 text-xs border-t border-border/60 pt-4">
              <div><span className="text-textSecondary block mb-1">Alert ID</span><span className="font-mono font-bold text-textPrimary">{selectedAlert.id}</span></div>
              <div><span className="text-textSecondary block mb-1">Category</span><span className="font-bold text-textPrimary">{selectedAlert.category}</span></div>
              <div><span className="text-textSecondary block mb-1">Assigned To</span><span className="font-bold text-textPrimary">{selectedAlert.assigned}</span></div>
              <div><span className="text-textSecondary block mb-1">Generated</span><span className="font-bold text-textPrimary">{selectedAlert.time}</span></div>
            </div>
            <div className="flex gap-3 pt-2">
              <button className="enterprise-btn-primary flex-1 py-3 text-sm">Investigate in Claims</button>
              {selectedAlert.status !== 'Resolved' && (
                <button onClick={() => { handleResolve(selectedAlert.id); setShowDetail(false); }} className="enterprise-btn-ghost flex-1 py-3 text-sm">Mark Resolved</button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
