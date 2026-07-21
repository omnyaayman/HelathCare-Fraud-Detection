import { useState, useEffect, useMemo } from 'react';
import Skeleton from '../../components/Skeleton';
import StatusBadge from '../../components/StatusBadge';
import { CANONICAL_MODEL, CANONICAL_REFERENCE } from '../../data/canonicalData';
import { formatNumber } from '../../data/dataUtils';
import {
  Settings as SettingsIcon,
  Activity,
  Database,
  Server,
  Wifi,
  HardDrive,
  Shield,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Cpu,
  MemoryStick,
  Monitor,
  Bell,
  FileText,
  Download,
  Loader2,
  TrendingUp,
  Zap,
  Eye,
  Lock,
  Users,
  BarChart3,
  GitBranch,
  Calendar,
  ArrowUpRight,
  UserPlus,
  Trash2,
  Edit,
  Save,
  ShieldCheck,
  Key,
  Gauge,
} from 'lucide-react';
import api from '../../api';

const STATUS_COLORS = {
  operational: { dot: 'bg-emerald-400', text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-l-emerald-400', label: 'Operational' },
  warning: { dot: 'bg-amber-400', text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-l-amber-400', label: 'Warning' },
  critical: { dot: 'bg-red-400', text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-l-red-400', label: 'Critical' },
};

const METRIC_COLORS = {
  green: 'text-emerald-400',
  yellow: 'text-amber-400',
  red: 'text-red-400',
  gray: 'text-slate-400',
};

const LOG_LEVEL_STYLES = {
  INFO: { text: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  WARN: { text: 'text-amber-400', bg: 'bg-amber-500/10' },
  ERROR: { text: 'text-red-400', bg: 'bg-red-500/10' },
  DEBUG: { text: 'text-slate-400', bg: 'bg-slate-500/10' },
};

const primaryHealthCards = [
  {
    status: 'operational',
    label: 'Database Status',
    icon: Database,
    metrics: [
      { label: 'Status', value: 'Connected', color: 'green' },
      { label: 'Latency', value: '12ms', color: 'green' },
      { label: 'Connections', value: '47 / 200', color: 'green' },
      { label: 'Last Backup', value: '2 hours ago', color: 'green' },
    ],
    lastChecked: '2 min ago',
  },
  {
    status: 'operational',
    label: 'API Server',
    icon: Server,
    metrics: [
      { label: 'Status', value: 'Running', color: 'green' },
      { label: 'Avg Response', value: '145ms', color: 'green' },
      { label: 'Requests/min', value: '1,247', color: 'green' },
      { label: 'Uptime', value: '99.97%', color: 'green' },
    ],
    lastChecked: '1 min ago',
  },
  {
    status: 'operational',
    label: 'GPU Acceleration',
    icon: Cpu,
    metrics: [
      { label: 'Status', value: 'Active', color: 'green' },
      { label: 'Utilization', value: '67%', color: 'green' },
      { label: 'Memory', value: '14.2 / 24 GB', color: 'green' },
      { label: 'Temperature', value: '72\u00B0C', color: 'yellow' },
    ],
    lastChecked: '30 sec ago',
  },
  {
    status: 'warning',
    label: 'Disk Storage',
    icon: HardDrive,
    metrics: [
      { label: 'Status', value: 'Warning', color: 'yellow' },
      { label: 'Used', value: '847 GB / 1 TB', color: 'yellow' },
      { label: 'Usage', value: '82.7%', color: 'yellow' },
      { label: 'IOPS', value: '12,400', color: 'green' },
    ],
    lastChecked: '5 min ago',
  },
  {
    status: 'operational',
    label: 'Message Queue',
    icon: Activity,
    metrics: [
      { label: 'Status', value: 'Healthy', color: 'green' },
      { label: 'Queue Size', value: '23', color: 'green' },
      { label: 'Processed/hr', value: '45,230', color: 'green' },
      { label: 'Failed (24h)', value: '3', color: 'green' },
    ],
    lastChecked: '1 min ago',
  },
  {
    status: 'operational',
    label: 'Background Jobs',
    icon: Clock,
    metrics: [
      { label: 'Status', value: 'Running', color: 'green' },
      { label: 'Active', value: '4', color: 'green' },
      { label: 'Queued', value: '12', color: 'green' },
      { label: 'Completed (24h)', value: '1,847', color: 'green' },
    ],
    lastChecked: '2 min ago',
  },
];

const secondaryMetrics = [
  { label: 'Failed Requests', value: '23', detail: 'vs 31 yesterday', trend: '\u2193 25.8%', trendColor: 'text-emerald-400', icon: XCircle },
  { label: 'Model Sync', value: 'Synced', detail: 'v3.2.1, 45 min ago', trend: 'On schedule', trendColor: 'text-emerald-400', icon: RefreshCw },
  { label: 'Last Backup', value: '2 hours ago', detail: '2.4 GB, compressed', trend: 'Automated', trendColor: 'text-slate-400', icon: Database },
  { label: 'Last Deployment', value: 'Jan 14, 2026', detail: 'v2.8.3, rolling update', trend: 'Successful', trendColor: 'text-emerald-400', icon: GitBranch },
  { label: 'System Uptime', value: '47 days, 14h', detail: 'Since Nov 28, 2025', trend: 'No interruptions', trendColor: 'text-emerald-400', icon: Clock },
  { label: 'Health Checks', value: '48 / 50 passed', detail: '2 degraded (disk, memory)', trend: '96% pass rate', trendColor: 'text-amber-400', icon: Shield },
  { label: 'Fraud Threshold', value: '0.75', detail: 'Last adjusted Dec 10', trend: 'Optimal', trendColor: 'text-emerald-400', icon: BarChart3 },
  { label: 'Notifications', value: 'Enabled', detail: '156 sent, 3 pending today', trend: 'All systems normal', trendColor: 'text-emerald-400', icon: Bell },
];

const systemLogs = [
  { id: 1, timestamp: '2026-01-16 14:32:18', level: 'INFO', service: 'API Server', message: 'Request completed: GET /api/claims - 200 OK (145ms)', source: 'api-gateway' },
  { id: 2, timestamp: '2026-01-16 14:32:15', level: 'WARN', service: 'Disk Storage', message: 'Disk usage exceeded 80% threshold on /data partition', source: 'monitor' },
  { id: 3, timestamp: '2026-01-16 14:31:58', level: 'INFO', service: 'ML Pipeline', message: 'Fraud prediction batch completed: 2,340 claims processed in 4.2s', source: 'ml-engine' },
  { id: 4, timestamp: '2026-01-16 14:31:42', level: 'ERROR', service: 'Notification', message: 'Failed to send email notification to admin@healthsec.com - SMTP timeout', source: 'notification-svc' },
  { id: 5, timestamp: '2026-01-16 14:31:30', level: 'INFO', service: 'Database', message: 'Connection pool stats: active=47, idle=153, waiting=0', source: 'db-pool' },
  { id: 6, timestamp: '2026-01-16 14:31:15', level: 'INFO', service: 'Auth', message: 'User login: admin_insurance from 192.168.1.45', source: 'auth-service' },
  { id: 7, timestamp: '2026-01-16 14:30:58', level: 'WARN', service: 'GPU', message: 'GPU temperature reached 72°C - approaching thermal threshold', source: 'gpu-monitor' },
  { id: 8, timestamp: '2026-01-16 14:30:45', level: 'INFO', service: 'ML Pipeline', message: 'Model v3.2.1 prediction accuracy: 94.6% on validation set', source: 'ml-engine' },
  { id: 9, timestamp: '2026-01-16 14:30:20', level: 'INFO', service: 'Queue', message: 'Message queue consumer started: claim-processor (batch size: 50)', source: 'queue-mgr' },
  { id: 10, timestamp: '2026-01-16 14:29:55', level: 'INFO', service: 'API Server', message: 'POST /api/notifications/generate - 201 Created (312ms)', source: 'api-gateway' },
  { id: 11, timestamp: '2026-01-16 14:29:30', level: 'DEBUG', service: 'Cache', message: 'Redis cache hit ratio: 94.2% (hits: 12,450, misses: 756)', source: 'cache-mgr' },
  { id: 12, timestamp: '2026-01-16 14:29:15', level: 'INFO', service: 'Scheduler', message: 'Daily backup job scheduled for 02:00 AM EST', source: 'scheduler' },
  { id: 13, timestamp: '2026-01-16 14:28:45', level: 'ERROR', service: 'Claim Parser', message: 'Failed to parse claim CLM-2026-091234: invalid ICD-10 format', source: 'parser' },
  { id: 14, timestamp: '2026-01-16 14:28:30', level: 'INFO', service: 'Database', message: 'Automated index optimization completed: 3 indexes rebuilt', source: 'db-maint' },
  { id: 15, timestamp: '2026-01-16 14:28:10', level: 'INFO', service: 'API Server', message: 'GET /api/stats - 200 OK (89ms)', source: 'api-gateway' },
  { id: 16, timestamp: '2026-01-16 14:27:55', level: 'WARN', service: 'Memory', message: 'Memory usage at 78% - monitoring for potential leak', source: 'system-monitor' },
  { id: 17, timestamp: '2026-01-16 14:27:30', level: 'INFO', service: 'ML Pipeline', message: 'Feature extraction completed for 1,890 new claims', source: 'ml-engine' },
  { id: 18, timestamp: '2026-01-16 14:27:10', level: 'INFO', service: 'Auth', message: 'Session token refreshed for user: auditor_insurance', source: 'auth-service' },
  { id: 19, timestamp: '2026-01-16 14:26:50', level: 'DEBUG', service: 'Queue', message: 'Dead letter queue: 0 messages (all processed)', source: 'queue-mgr' },
  { id: 20, timestamp: '2026-01-16 14:26:30', level: 'INFO', service: 'Export', message: 'CSV export completed: 12,450 records (2.3 MB)', source: 'export-svc' },
];

const activeWarnings = [
  {
    id: 1,
    severity: 'warning',
    title: 'Disk Storage Warning',
    message: 'Disk usage at 82.7% - Consider archiving old data or expanding storage.',
    icon: HardDrive,
    timestamp: '2 min ago',
  },
  {
    id: 2,
    severity: 'warning',
    title: 'GPU Temperature',
    message: 'GPU temperature at 72\u00B0C - approaching thermal threshold of 80\u00B0C.',
    icon: Cpu,
    timestamp: '5 min ago',
  },
];

const modelConfig = [
  { label: 'Model Version', value: 'v3.2.1', icon: GitBranch },
  { label: 'Algorithm', value: 'XGBoost + Neural Network Ensemble', icon: BarChart3 },
  { label: 'Training Dataset', value: '128,450 records (v4.2)', icon: Database },
  { label: 'Feature Count', value: '47', icon: Activity },
  { label: 'Fraud Threshold', value: '0.75', icon: Shield },
  { label: 'Auto-Retrain', value: 'Enabled (every 14 days)', icon: RefreshCw },
  { label: 'Last Retrained', value: 'Jan 15, 2026', icon: Calendar },
  { label: 'Next Scheduled', value: 'Jan 29, 2026', icon: Clock },
];

function StatusDot({ status }) {
  const style = STATUS_COLORS[status];
  return (
    <span className="relative flex h-3 w-3">
      {status !== 'operational' && (
        <span
          className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${style.dot}`}
          style={{ animationDuration: status === 'critical' ? '1s' : '2s' }}
        />
      )}
      <span className={`relative inline-flex h-3 w-3 rounded-full ${style.dot}`} />
    </span>
  );
}

function HealthCard({ card }) {
  const style = STATUS_COLORS[card.status];
  const Icon = card.icon;
  return (
    <div
      className={`bg-[#0f172a]/80 rounded-2xl border border-[#1e293b]/80 border-l-4 ${style.border} p-5 transition-all duration-300 hover:bg-[#0f172a] hover:shadow-lg hover:shadow-black/20 hover:border-[#334155]`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${style.bg}`}>
            <Icon className={`w-5 h-5 ${style.text}`} />
          </div>
          <div>
            <h3 className="text-[#f8fafc] font-semibold text-sm">{card.label}</h3>
            <p className="text-[#64748b] text-xs mt-0.5">Last checked {card.lastChecked}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusDot status={card.status} />
          <span className={`text-xs font-medium ${style.text}`}>{style.label}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {card.metrics.map((m, i) => (
          <div key={i} className="bg-[#0b0f19]/60 rounded-xl p-3">
            <p className="text-[#64748b] text-xs mb-1">{m.label}</p>
            <p className={`text-sm font-semibold ${METRIC_COLORS[m.color]}`}>{m.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SecondaryMetricCard({ metric }) {
  const Icon = metric.icon;
  return (
    <div className="bg-[#0f172a]/80 rounded-2xl border border-[#1e293b]/80 p-4 transition-all duration-300 hover:bg-[#0f172a] hover:border-[#334155]">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 rounded-lg bg-[#1e293b]/60">
          <Icon className="w-4 h-4 text-[#818cf8]" />
        </div>
        <p className="text-[#64748b] text-xs font-medium">{metric.label}</p>
      </div>
      <p className="text-[#f8fafc] font-bold text-lg mb-1">{metric.value}</p>
      <p className="text-[#64748b] text-xs mb-2">{metric.detail}</p>
      <div className="flex items-center gap-1">
        <span className={`text-xs font-medium ${metric.trendColor}`}>{metric.trend}</span>
      </div>
    </div>
  );
}

function LogRow({ log }) {
  const levelStyle = LOG_LEVEL_STYLES[log.level];
  return (
    <tr className="border-b border-[#1e293b]/50 hover:bg-[#1e293b]/30 transition-colors">
      <td className="px-4 py-3 text-xs text-[#64748b] whitespace-nowrap">{log.timestamp}</td>
      <td className="px-4 py-3 whitespace-nowrap">
        <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${levelStyle.text} ${levelStyle.bg}`}>
          {log.level}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-[#94a3b8] whitespace-nowrap">{log.service}</td>
      <td className="px-4 py-3 text-xs text-[#94a3b8]">{log.message}</td>
      <td className="px-4 py-3 text-xs text-[#64748b] whitespace-nowrap">{log.source}</td>
    </tr>
  );
}

function WarningCard({ warning }) {
  const Icon = warning.icon;
  return (
    <div className="bg-amber-500/5 rounded-2xl border border-amber-500/20 p-4 flex items-start gap-4 transition-all duration-300 hover:bg-amber-500/10">
      <div className="p-2 rounded-xl bg-amber-500/10 mt-0.5">
        <Icon className="w-5 h-5 text-amber-400" />
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <h4 className="text-amber-400 font-semibold text-sm">{warning.title}</h4>
          <span className="text-[#64748b] text-xs">{warning.timestamp}</span>
        </div>
        <p className="text-[#94a3b8] text-xs leading-relaxed">{warning.message}</p>
      </div>
    </div>
  );
}

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [healthCards, setHealthCards] = useState(primaryHealthCards);
  const [actionStates, setActionStates] = useState({
    restart: false,
    sync: false,
    clearCache: false,
    exportLogs: false,
  });

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setLastRefresh(new Date());
      setHealthCards((prev) =>
        prev.map((card) => ({
          ...card,
          lastChecked: 'just now',
        }))
      );
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const overallStatus = useMemo(() => {
    if (healthCards.some((c) => c.status === 'critical')) return 'critical';
    if (healthCards.some((c) => c.status === 'warning')) return 'warning';
    return 'operational';
  }, [healthCards]);

  const overallStyle = STATUS_COLORS[overallStatus];

  const formatLastChecked = (date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  const triggerAction = (actionKey) => {
    setActionStates((prev) => ({ ...prev, [actionKey]: true }));
    setTimeout(() => setActionStates((prev) => ({ ...prev, [actionKey]: false })), 2000);
  };

  const handleExportLogs = () => {
    setActionStates((prev) => ({ ...prev, exportLogs: true }));
    const csvHeader = 'Timestamp,Level,Service,Message,Source\n';
    const csvRows = systemLogs
      .map((l) => `"${l.timestamp}","${l.level}","${l.service}","${l.message}","${l.source}"`)
      .join('\n');
    const blob = new Blob([csvHeader + csvRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `system-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setTimeout(() => setActionStates((prev) => ({ ...prev, exportLogs: false })), 1500);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] p-6 space-y-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-16 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-52" />
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-xl bg-[#4f46e5]/10">
              <SettingsIcon className="w-6 h-6 text-[#818cf8]" />
            </div>
            <h1 className="text-2xl font-bold text-[#f8fafc]">System Monitoring & Diagnostics</h1>
          </div>
          <p className="text-[#64748b] text-sm ml-11">
            Real-time System Health, Performance Metrics & Operational Intelligence
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#64748b]">
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refreshed {formatLastChecked(lastRefresh)}</span>
        </div>
      </div>

      <div className={`flex items-center justify-between rounded-2xl border border-[#1e293b]/80 bg-[#0f172a]/80 p-4 ${overallStyle.border} border-l-4`}>
        <div className="flex items-center gap-4">
          <StatusDot status={overallStatus} />
          <div>
            <p className="text-[#f8fafc] font-semibold text-sm">System Status: {overallStyle.label}</p>
            <p className="text-[#64748b] text-xs mt-0.5">
              {healthCards.filter((c) => c.status === 'operational').length} of {healthCards.length} services operational
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#64748b]">
          <Clock className="w-3.5 h-3.5" />
          <span>Last checked {formatLastChecked(lastRefresh)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {healthCards.map((card, i) => (
          <HealthCard key={i} card={card} />
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {secondaryMetrics.map((metric, i) => (
          <SecondaryMetricCard key={i} metric={metric} />
        ))}
      </div>

      <div className="bg-[#0f172a]/80 rounded-2xl border border-[#1e293b]/80 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e293b]/80">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-[#818cf8]" />
            <h2 className="text-[#f8fafc] font-semibold text-sm">System Logs</h2>
            <span className="text-[#64748b] text-xs bg-[#1e293b]/60 px-2 py-0.5 rounded-md">
              {systemLogs.length} entries
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
              {systemLogs.filter((l) => l.level === 'INFO').length} INFO
            </span>
            <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">
              {systemLogs.filter((l) => l.level === 'WARN').length} WARN
            </span>
            <span className="text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded-md">
              {systemLogs.filter((l) => l.level === 'ERROR').length} ERROR
            </span>
          </div>
        </div>
        <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-[#0f172a] z-10">
              <tr className="border-b border-[#1e293b]/80">
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider">Timestamp</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider">Level</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider">Service</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider">Message</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider">Source</th>
              </tr>
            </thead>
            <tbody>
              {systemLogs.map((log) => (
                <LogRow key={log.id} log={log} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {activeWarnings.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h2 className="text-[#f8fafc] font-semibold text-sm">Active Warnings</h2>
            <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">
              {activeWarnings.length}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeWarnings.map((warning) => (
              <WarningCard key={warning.id} warning={warning} />
            ))}
          </div>
        </div>
      )}

      <div className="bg-[#0f172a]/80 rounded-2xl border border-[#1e293b]/80 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-[#4f46e5]/10">
            <Zap className="w-5 h-5 text-[#818cf8]" />
          </div>
          <h2 className="text-[#f8fafc] font-semibold text-sm">Model Configuration</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {modelConfig.map((cfg, i) => {
            const Icon = cfg.icon;
            return (
              <div key={i} className="bg-[#0b0f19]/60 rounded-xl p-3 border border-[#1e293b]/40">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-3.5 h-3.5 text-[#818cf8]" />
                  <p className="text-[#64748b] text-xs">{cfg.label}</p>
                </div>
                <p className="text-[#f8fafc] text-sm font-semibold">{cfg.value}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ──── ENTERPRISE: User Management ──── */}
      <div className="bg-[#0f172a]/80 rounded-2xl border border-[#1e293b]/80 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#4f46e5]/10">
              <Users className="w-5 h-5 text-[#818cf8]" />
            </div>
            <div>
              <h2 className="text-[#f8fafc] font-semibold text-sm">User Management</h2>
              <p className="text-[10px] text-[#64748b]">Manage system users and access control</p>
            </div>
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#4f46e5] text-white text-[10px] font-bold hover:bg-[#4338ca] transition-colors">
            <UserPlus size={12} /> Add User
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1e293b]/80">
                <th className="px-4 py-2.5 text-left text-[10px] font-bold text-[#64748b] uppercase tracking-wider">User</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold text-[#64748b] uppercase tracking-wider">Role</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold text-[#64748b] uppercase tracking-wider">Department</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold text-[#64748b] uppercase tracking-wider">Last Active</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold text-[#64748b] uppercase tracking-wider">Status</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-bold text-[#64748b] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'Dr. Sarah Mitchell', email: 'sarah.m@metro-general.org', role: 'Admin', department: 'SIU Division', lastActive: '2 min ago', status: 'Active' },
                { name: 'James Rodriguez', email: 'james.r@metro-general.org', role: 'Investigator', department: 'Fraud Detection', lastActive: '15 min ago', status: 'Active' },
                { name: 'Emily Chen', email: 'emily.c@metro-general.org', role: 'Analyst', department: 'Data Science', lastActive: '1 hour ago', status: 'Active' },
                { name: 'Michael Thompson', email: 'michael.t@metro-general.org', role: 'Reviewer', department: 'Claims Processing', lastActive: '3 hours ago', status: 'Active' },
                { name: 'Lisa Park', email: 'lisa.p@metro-general.org', role: 'Viewer', department: 'Compliance', lastActive: '1 day ago', status: 'Inactive' },
              ].map((user, i) => (
                <tr key={i} className="border-b border-[#1e293b]/40 hover:bg-[#1e293b]/20 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-xs font-bold text-[#f8fafc]">{user.name}</p>
                      <p className="text-[10px] text-[#64748b]">{user.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                      user.role === 'Admin' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                      user.role === 'Investigator' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                      user.role === 'Analyst' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                      user.role === 'Reviewer' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                      'bg-slate-500/10 text-slate-400 border-slate-500/20'
                    }`}>{user.role}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#94a3b8]">{user.department}</td>
                  <td className="px-4 py-3 text-[10px] text-[#64748b]">{user.lastActive}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      user.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-500/10 text-slate-400'
                    }`}>{user.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button className="p-1.5 rounded-lg hover:bg-[#1e293b] text-[#64748b] hover:text-[#818cf8] transition-colors"><Edit size={12} /></button>
                      <button className="p-1.5 rounded-lg hover:bg-[#1e293b] text-[#64748b] hover:text-red-400 transition-colors"><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ──── ENTERPRISE: Role & Permission Management ──── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#0f172a]/80 rounded-2xl border border-[#1e293b]/80 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-purple-500/10">
              <ShieldCheck className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-[#f8fafc] font-semibold text-sm">Role Management</h2>
              <p className="text-[10px] text-[#64748b]">Define RBAC roles and capabilities</p>
            </div>
          </div>
          <div className="space-y-3">
            {[
              { name: 'Admin', desc: 'Full system access, user management, configuration', users: 1, color: 'red', perms: ['All Access'] },
              { name: 'Investigator', desc: 'Case management, claim investigation, evidence review', users: 3, color: 'amber', perms: ['View Claims', 'Manage Cases', 'Add Notes'] },
              { name: 'Analyst', desc: 'Read-only analytics, model metrics, reporting', users: 2, color: 'blue', perms: ['View Analytics', 'Export Reports'] },
              { name: 'Reviewer', desc: 'Claim review, approve/reject, limited case access', users: 4, color: 'purple', perms: ['Review Claims', 'Approve/Reject'] },
              { name: 'Viewer', desc: 'Read-only dashboard access, no data export', users: 5, color: 'slate', perms: ['View Dashboard'] },
            ].map((role, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-[#1e293b]/40 border border-[#1e293b]/60 hover:border-purple-500/20 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full bg-${role.color}-400`} />
                  <div>
                    <p className="text-xs font-bold text-[#f8fafc]">{role.name}</p>
                    <p className="text-[10px] text-[#64748b]">{role.desc}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-[#94a3b8]">{role.users} users</p>
                  <div className="flex gap-1 mt-1 justify-end">
                    {role.perms.slice(0, 2).map((p, j) => (
                      <span key={j} className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-[#1e293b] text-[#64748b]">{p}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#0f172a]/80 rounded-2xl border border-[#1e293b]/80 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-amber-500/10">
              <Key className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-[#f8fafc] font-semibold text-sm">Permission Matrix</h2>
              <p className="text-[10px] text-[#64748b]">Granular access control per module</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1e293b]/80">
                  <th className="px-2 py-2 text-left text-[9px] font-bold text-[#64748b] uppercase">Module</th>
                  {['Admin', 'Investigator', 'Analyst', 'Reviewer', 'Viewer'].map(r => (
                    <th key={r} className="px-2 py-2 text-center text-[9px] font-bold text-[#64748b] uppercase">{r}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { module: 'Dashboard', perms: [true, true, true, true, true] },
                  { module: 'Claims', perms: [true, true, true, true, false] },
                  { module: 'Flagged Claims', perms: [true, true, true, true, false] },
                  { module: 'Patients', perms: [true, true, true, false, false] },
                  { module: 'Providers', perms: [true, true, true, false, false] },
                  { module: 'Analytics', perms: [true, true, true, false, false] },
                  { module: 'AI Insights', perms: [true, true, true, false, false] },
                  { module: 'Reports', perms: [true, true, true, false, false] },
                  { module: 'Model Mgmt', perms: [true, false, true, false, false] },
                  { module: 'Settings', perms: [true, false, false, false, false] },
                ].map((row, i) => (
                  <tr key={i} className="border-b border-[#1e293b]/30 hover:bg-[#1e293b]/20">
                    <td className="px-2 py-1.5 text-[10px] font-bold text-[#94a3b8]">{row.module}</td>
                    {row.perms.map((has, j) => (
                      <td key={j} className="px-2 py-1.5 text-center">
                        {has ? (
                          <span className="inline-block w-4 h-4 rounded bg-emerald-500/20 text-emerald-400 text-[10px] leading-4">&#10003;</span>
                        ) : (
                          <span className="inline-block w-4 h-4 rounded bg-[#1e293b]/60 text-[#475569] text-[10px] leading-4">&mdash;</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ──── ENTERPRISE: Threshold Configuration ──── */}
      <div className="bg-[#0f172a]/80 rounded-2xl border border-[#1e293b]/80 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-500/10">
              <Gauge className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h2 className="text-[#f8fafc] font-semibold text-sm">Fraud Detection Thresholds</h2>
              <p className="text-[10px] text-[#64748b]">Configure system-wide detection parameters</p>
            </div>
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors">
            <Save size={12} /> Save Changes
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { label: 'AI Fraud Score Threshold', value: `${(CANONICAL_MODEL.fraudThreshold * 100).toFixed(0)}%`, desc: 'Minimum score to flag a claim', slider: CANONICAL_MODEL.fraudThreshold * 100, color: '#ef4444' },
            { label: 'Auto-Escalation Threshold', value: '90%', desc: 'Score above which cases auto-escalate', slider: 90, color: '#f97316' },
            { label: 'Investigation SLA (hours)', value: '72h', desc: 'Max time before case is overdue', slider: 72, color: '#f59e0b' },
            { label: 'Min Claims for Provider Rate', value: '5', desc: 'Minimum claims before provider fraud rate is calculated', slider: 5, color: '#6366f1' },
            { label: 'Data Drift Alert Threshold', value: `${CANONICAL_MODEL.dataDrift}%`, desc: 'Model drift % that triggers retraining alert', slider: CANONICAL_MODEL.dataDrift, color: '#8b5cf6' },
            { label: 'Auto-Retrain Trigger', value: 'Disabled', desc: 'Automatically retrain model when drift exceeds threshold', slider: 0, color: '#10b981' },
          ].map((cfg, i) => (
            <div key={i} className="bg-[#0b0f19]/60 rounded-xl p-4 border border-[#1e293b]/40">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">{cfg.label}</p>
                <span className="text-xs font-mono font-bold" style={{ color: cfg.color }}>{cfg.value}</span>
              </div>
              <p className="text-[10px] text-[#64748b] mb-3">{cfg.desc}</p>
              <input
                type="range"
                min="0"
                max={cfg.label.includes('SLA') ? 168 : cfg.label.includes('Min Claims') ? 20 : cfg.label.includes('Auto-Retrain') ? 1 : 100}
                value={cfg.slider}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                style={{ background: `linear-gradient(to right, ${cfg.color} ${cfg.slider}%, #1e293b ${cfg.slider}%)` }}
                readOnly
              />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#0f172a]/80 rounded-2xl border border-[#1e293b]/80 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-[#4f46e5]/10">
            <Zap className="w-5 h-5 text-[#818cf8]" />
          </div>
          <h2 className="text-[#f8fafc] font-semibold text-sm">Quick Actions</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => triggerAction('restart')}
            disabled={actionStates.restart}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] disabled:opacity-60 text-white text-sm font-medium transition-all duration-200"
          >
            {actionStates.restart ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {actionStates.restart ? 'Restarting...' : 'Restart Services'}
          </button>
          <button
            onClick={() => triggerAction('sync')}
            disabled={actionStates.sync}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1e293b] hover:bg-[#334155] disabled:opacity-60 text-[#f8fafc] text-sm font-medium border border-[#1e293b] transition-all duration-200"
          >
            {actionStates.sync ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {actionStates.sync ? 'Syncing...' : 'Force Sync'}
          </button>
          <button
            onClick={() => triggerAction('clearCache')}
            disabled={actionStates.clearCache}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1e293b] hover:bg-[#334155] disabled:opacity-60 text-[#f8fafc] text-sm font-medium border border-[#1e293b] transition-all duration-200"
          >
            {actionStates.clearCache ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <HardDrive className="w-4 h-4" />
            )}
            {actionStates.clearCache ? 'Clearing...' : 'Clear Cache'}
          </button>
          <button
            onClick={handleExportLogs}
            disabled={actionStates.exportLogs}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1e293b] hover:bg-[#334155] disabled:opacity-60 text-[#f8fafc] text-sm font-medium border border-[#1e293b] transition-all duration-200"
          >
            {actionStates.exportLogs ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {actionStates.exportLogs ? 'Exporting...' : 'Export Logs'}
          </button>
        </div>
      </div>
    </div>
  );
}
