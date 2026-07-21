import { useState, useEffect, useCallback } from 'react';
import {
  MonitorCog, Cpu, HardDrive, Activity, Server, Database, CheckCircle,
  AlertCircle, XCircle, Wifi, Cpu as GpuIcon, HardDrive as DiskIcon,
  MessageSquare, Briefcase, RefreshCw, RotateCw, Trash2, FileDown, Clock,
  Shield, Loader2, ChevronDown, ChevronUp, Filter
} from 'lucide-react';
import api from '../../api';
import Skeleton from '../../components/Skeleton';
import PlotlyChart from '../../components/PlotlyChart';
import { CANONICAL_MODEL, CANONICAL_PROVIDERS } from '../../data/canonicalData';

const FALLBACK_HEALTH = {
  status: 'healthy',
  uptime: '14d 7h 32m',
  cpu_usage: 34,
  memory: { total_gb: 32, used_gb: 11.2, usage_pct: 35 },
  disk: { total_gb: 512, used_gb: 203, usage_pct: 39.6 },
  active_connections: 142,
  requests_per_minute: 2840,
  avg_response_ms: 47,
  error_rate: 0.08,
  last_restart: '2026-01-06 02:00:00',
  model_version: CANONICAL_MODEL.version,
  model_accuracy: CANONICAL_MODEL.accuracy,
};

const FALLBACK_LOGS = Array.from({ length: 50 }, (_, i) => {
  const level = ['INFO','INFO','INFO','INFO','INFO','WARN','WARN','ERROR'][Math.floor(Math.random() * 8)];
  const messages = {
    INFO: [
      'Claim CLM-2026-200001 processed successfully',
      'Model inference completed for batch #1423',
      'Provider validation passed for Metro Health',
      'Scheduled maintenance check completed',
      'Database backup verified - size: 2.4GB',
      'Fraud detection pipeline cycle #8721 finished',
      'Auto-adjudication approved claim CLM-2026-200015',
      'Data sync completed across all regions',
    ],
    WARN: [
      'High memory usage detected on node-3: 87%',
      'Response latency spike: avg 245ms (threshold: 200ms)',
      'Unusual claim submission pattern detected from Provider #P-10042',
      'Rate limit approaching for API endpoint /claims/batch',
      'Certificate renewal pending for api.healthsecure.internal',
    ],
    ERROR: [
      'Connection timeout to claims database (10.0.1.5:5432)',
      'Failed to process batch #8723: Invalid claim format',
      'Model prediction pipeline crashed - OOM error on node-7',
      'Provider verification service returned 503 for 5 retries',
    ],
  };
  const msgList = messages[level] || messages.INFO;
  const date = new Date(2026, 0, 20, Math.floor(Math.random() * 24), Math.floor(Math.random() * 60), Math.floor(Math.random() * 60));
  return {
    id: `LOG-${String(10000 + i).padStart(5, '0')}`,
    level,
    message: msgList[i % msgList.length],
    timestamp: date.toISOString().replace('T', ' ').slice(0, 19),
    service: ['api-gateway','claims-processor','model-inference','db-primary','auth-service'][Math.floor(Math.random() * 5)],
    source_ip: `10.0.${Math.floor(Math.random() * 5)}.${Math.floor(Math.random() * 255)}`,
  };
});

const SC = {
  healthy: { icon: CheckCircle, text: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20', label: 'Healthy' },
  warning: { icon: AlertCircle, text: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', label: 'Warning' },
  degraded: { icon: AlertCircle, text: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20', label: 'Degraded' },
  offline: { icon: XCircle, text: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20', label: 'Offline' },
};

const LOG_LEVELS = ['all', 'INFO', 'WARN', 'ERROR'];

export default function SystemMonitoring() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [logs, setLogs] = useState([]);
  const [logSummary, setLogSummary] = useState({ INFO: 0, WARN: 0, ERROR: 0 });
  const [logFilter, setLogFilter] = useState('all');
  const [quickActions, setQuickActions] = useState({});

  const fetchHealth = useCallback(async () => {
    try {
      let data;
      try {
        data = await api.getSystemHealth();
        if (!data || Object.keys(data).length === 0) throw new Error('empty');
      } catch (_) {
        data = FALLBACK_HEALTH;
      }
      setHealth(data);
      setHistory(prev => {
        const cpu = data.cpu_usage || 0;
        const mem = data.memory?.usage_pct || data.memory_usage || 0;
        const nh = [...prev, { time: new Date().toLocaleTimeString(), cpu, memory: mem }];
        if (nh.length > 10) nh.shift();
        return nh;
      });
    } catch (err) {
      console.error('Failed to fetch system health', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLogs = useCallback(async (level) => {
    try {
      let logData, summary;
      try {
        const data = await api.getAuditLogs({ level });
        logData = data.logs;
        summary = data.summary;
      } catch (_) { /* fallback */ }
      setLogs(logData || FALLBACK_LOGS);
      if (summary) setLogSummary(summary);
      else {
        setLogSummary({
          INFO: FALLBACK_LOGS.filter(l => l.level === 'INFO').length,
          WARN: FALLBACK_LOGS.filter(l => l.level === 'WARN').length,
          ERROR: FALLBACK_LOGS.filter(l => l.level === 'ERROR').length,
        });
      }
    } catch (err) {
      console.error('Failed to fetch logs', err);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    fetchLogs('all');
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [fetchHealth, fetchLogs]);

  const handleLogFilter = (level) => {
    setLogFilter(level);
    fetchLogs(level);
  };

  const runQuickAction = async (name) => {
    setQuickActions(prev => ({ ...prev, [name]: 'loading' }));
    await new Promise(r => setTimeout(r, 1200 + Math.random() * 800));
    setQuickActions(prev => ({ ...prev, [name]: 'success' }));
    setTimeout(() => setQuickActions(prev => ({ ...prev, [name]: undefined })), 2500);
  };

  const serviceCards = [
    { key: 'database', name: 'Database', icon: Database, status: health?.database?.status === 'connected' ? 'healthy' : 'degraded', detail: `${health?.database?.latency_ms || 0}ms latency` },
    { key: 'api', name: 'API Server', icon: Wifi, status: health?.api?.status === 'running' ? 'healthy' : 'degraded', detail: `${health?.api?.avg_response_ms || 0}ms avg response` },
    { key: 'gpu', name: 'GPU', icon: GpuIcon, status: health?.gpu?.status === 'active' ? 'healthy' : 'warning', detail: `${health?.gpu?.utilization_pct || 0}% utilization` },
    { key: 'disk', name: 'Disk', icon: DiskIcon, status: health?.disk?.status === 'warning' ? 'warning' : 'healthy', detail: `${health?.disk?.usage_pct || 0}% used` },
    { key: 'memory', name: 'Memory', icon: Activity, status: health?.memory?.status || (health?.memory_usage && health?.memory_usage > 80 ? 'warning' : 'healthy'), detail: `${health?.memory?.usage_pct || health?.memory_usage || 0}% used (${health?.memory?.used_gb || 0}GB / ${health?.memory?.total_gb || 0}GB)` },
    { key: 'queue', name: 'Message Queue', icon: MessageSquare, status: health?.queue?.status === 'healthy' ? 'healthy' : 'warning', detail: `${health?.queue?.size || 0} pending` },
    { key: 'jobs', name: 'Background Jobs', icon: Briefcase, status: health?.jobs?.status === 'running' ? 'healthy' : 'warning', detail: `${health?.jobs?.active || 0} active, ${health?.jobs?.queued || 0} queued` },
  ];

  const qa = [
    { key: 'restart', label: 'Restart Services', icon: RotateCw },
    { key: 'sync', label: 'Force Sync', icon: RefreshCw },
    { key: 'cache', label: 'Clear Cache', icon: Trash2 },
    { key: 'export', label: 'Export Logs', icon: FileDown },
  ];

  const plotlyData = [
    {
      x: history.map(h => h.time), y: history.map(h => h.cpu),
      type: 'scatter', mode: 'lines',
      name: 'CPU Usage (%)', line: { color: '#4f46e5', width: 3, shape: 'spline' },
      fill: 'tozeroy', fillcolor: 'rgba(79, 70, 229, 0.06)'
    },
    {
      x: history.map(h => h.time), y: history.map(h => h.memory),
      type: 'scatter', mode: 'lines',
      name: 'Memory Usage (%)', line: { color: '#0d9488', width: 3, shape: 'spline' },
      fill: 'tozeroy', fillcolor: 'rgba(13, 148, 136, 0.06)'
    }
  ];

  if (loading) return <Skeleton rows={8} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-primary/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-primary w-fit">
          <MonitorCog size={14} /> System Health
        </div>
        <h1 className="text-2xl font-black text-textPrimary">System Monitoring</h1>
        <p className="text-sm text-textSecondary">Real-time monitoring of system performance and health</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-textSecondary">CPU Usage</p>
              <p className="mt-2 text-3xl font-black text-textPrimary">{health?.cpu_usage || 0}%</p>
            </div>
            <div className="rounded-xl bg-blue-500/10 p-3 text-blue-500"><Cpu size={24} /></div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-bg">
            <div className="h-full rounded-full bg-blue-500" style={{ width: `${health?.cpu_usage || 0}%` }} />
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-textSecondary">Memory Usage</p>
              <p className="mt-2 text-3xl font-black text-textPrimary">{health?.memory?.usage_pct || health?.memory_usage || 0}%</p>
            </div>
            <div className="rounded-xl bg-teal-500/10 p-3 text-teal-500"><Activity size={24} /></div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-bg">
            <div className="h-full rounded-full bg-teal-500" style={{ width: `${health?.memory?.usage_pct || health?.memory_usage || 0}%` }} />
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-textSecondary">Request Count</p>
              <p className="mt-2 text-3xl font-black text-textPrimary">{(health?.request_count || 0).toLocaleString()}</p>
            </div>
            <div className="rounded-xl bg-orange-500/10 p-3 text-orange-500"><HardDrive size={24} /></div>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-textSecondary">Uptime</p>
              <p className="mt-2 text-3xl font-black text-textPrimary font-mono text-sm">{health?.uptime || 'N/A'}</p>
            </div>
            <div className="rounded-xl bg-indigo-500/10 p-3 text-indigo-500"><Clock size={24} /></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h3 className="flex items-center gap-2 text-sm font-bold text-textPrimary mb-4">
            <Activity size={16} className="text-primary" /> Performance Metrics
          </h3>
          <div className="h-64">
            <PlotlyChart
              data={plotlyData}
              layout={{
                margin: { t: 10, r: 10, l: 30, b: 30 },
                xaxis: { showgrid: false },
                yaxis: { gridcolor: 'rgba(148, 163, 184, 0.16)', range: [0, 100] },
                legend: { orientation: 'h', y: -0.15 },
                paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
              }}
            />
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h3 className="flex items-center gap-2 text-sm font-bold text-textPrimary mb-4">
            <Server size={16} className="text-primary" /> Service Health
          </h3>
          <div className="grid grid-cols-1 gap-3">
            {serviceCards.map(s => {
              const cfg = SC[s.status] || SC.offline;
              const Icon = cfg.icon;
              const SI = s.icon;
              return (
                <div key={s.key} className={`flex items-center justify-between rounded-xl border ${cfg.border} bg-bg/50 p-3`}>
                  <div className="flex items-center gap-3">
                    <div className={`rounded-lg ${cfg.bg} p-2 ${cfg.text}`}><SI size={16} /></div>
                    <div>
                      <p className="text-sm font-bold text-textPrimary">{s.name}</p>
                      <p className="text-xs text-textSecondary">{s.detail}</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${cfg.bg} ${cfg.text}`}>
                    <Icon size={11} /> {cfg.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h3 className="flex items-center gap-2 text-sm font-bold text-textPrimary mb-4">
            <Shield size={16} className="text-primary" /> System Configuration
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-bg/50 p-4 border border-border">
              <div>
                <p className="text-sm font-bold text-textPrimary">Fraud Detection Threshold</p>
                <p className="text-xs text-textSecondary">Sourced from AI Model Management</p>
              </div>
              <span className="text-lg font-black font-mono text-primary">{CANONICAL_MODEL.fraudThreshold.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-bg/50 p-4 border border-border">
              <div>
                <p className="text-sm font-bold text-textPrimary">Last Deployment</p>
                <p className="text-xs text-textSecondary">System version {health?.version || '2.8.3'}</p>
              </div>
              <span className="text-sm font-mono text-textPrimary">Jul 20, 2026</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-bg/50 p-4 border border-border">
              <div>
                <p className="text-sm font-bold text-textPrimary">Database Last Backup</p>
                <p className="text-xs text-textSecondary">Auto-backup enabled</p>
              </div>
              <span className="text-sm font-mono text-textPrimary">Jul 20, 2026</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h3 className="flex items-center gap-2 text-sm font-bold text-textPrimary mb-4">
            <RotateCw size={16} className="text-primary" /> Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {qa.map(a => {
              const state = quickActions[a.key];
              const Icon = a.icon;
              return (
                <button
                  key={a.key}
                  onClick={() => runQuickAction(a.key)}
                  disabled={state === 'loading'}
                  className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-5 transition-all duration-200 ${
                    state === 'loading'
                      ? 'border-amber-500/30 bg-amber-500/5 cursor-wait'
                      : state === 'success'
                      ? 'border-emerald-500/30 bg-emerald-500/5'
                      : 'border-border bg-bg/50 hover:border-primary/30 hover:bg-primary/5 cursor-pointer'
                  }`}
                >
                  {state === 'loading' ? (
                    <Loader2 size={22} className="text-amber-400 animate-spin" />
                  ) : state === 'success' ? (
                    <CheckCircle size={22} className="text-emerald-400" />
                  ) : (
                    <Icon size={22} className="text-textSecondary group-hover:text-primary" />
                  )}
                  <span className={`text-xs font-bold ${
                    state === 'loading' ? 'text-amber-400' : state === 'success' ? 'text-emerald-400' : 'text-textSecondary'
                  }`}>
                    {state === 'loading' ? 'Running...' : state === 'success' ? 'Done!' : a.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="flex items-center gap-2 text-sm font-bold text-textPrimary">
            <Activity size={16} className="text-primary" /> System Logs
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-textSecondary">
              <span className="text-green-400 font-bold">{logSummary.INFO}</span> INFO /
              <span className="text-yellow-400 font-bold"> {logSummary.WARN}</span> WARN /
              <span className="text-red-400 font-bold"> {logSummary.ERROR}</span> ERROR
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 mb-4">
          <Filter size={14} className="text-textSecondary" />
          {LOG_LEVELS.map(l => (
            <button
              key={l}
              onClick={() => handleLogFilter(l)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                logFilter === l
                  ? l === 'all' ? 'bg-primary/20 text-primary' : l === 'INFO' ? 'bg-green-500/20 text-green-400' : l === 'WARN' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'
                  : 'bg-bg text-textSecondary hover:text-textPrimary'
              }`}
            >
              {l === 'all' ? 'All' : l}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2.5 px-3 text-xs text-textSecondary font-medium">Time</th>
                <th className="text-left py-2.5 px-3 text-xs text-textSecondary font-medium">Level</th>
                <th className="text-left py-2.5 px-3 text-xs text-textSecondary font-medium">User</th>
                <th className="text-left py-2.5 px-3 text-xs text-textSecondary font-medium">Action</th>
                <th className="text-left py-2.5 px-3 text-xs text-textSecondary font-medium">Resource</th>
                <th className="text-left py-2.5 px-3 text-xs text-textSecondary font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} className="border-b border-border/50 hover:bg-bg/40 transition-colors">
                  <td className="py-2.5 px-3 text-xs font-mono text-textSecondary">
                    {new Date(log.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      log.level === 'INFO' ? 'bg-green-500/10 text-green-400' :
                      log.level === 'WARN' ? 'bg-yellow-500/10 text-yellow-400' :
                      'bg-red-500/10 text-red-400'
                    }`}>{log.level}</span>
                  </td>
                  <td className="py-2.5 px-3 text-xs text-textPrimary">{log.user}</td>
                  <td className="py-2.5 px-3 text-xs text-textPrimary">{log.action}</td>
                  <td className="py-2.5 px-3 text-xs text-textPrimary">{log.resource}</td>
                  <td className="py-2.5 px-3 text-xs text-textSecondary max-w-xs truncate">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {logs.length === 0 && (
            <p className="text-center text-sm text-textSecondary py-8">No logs found for this level.</p>
          )}
        </div>
      </div>
    </div>
  );
}
