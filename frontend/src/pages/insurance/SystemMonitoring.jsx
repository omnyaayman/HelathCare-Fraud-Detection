import { useState, useEffect, useCallback } from 'react';
import { MonitorCog, Cpu, HardDrive, Activity, Server, Database, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import api from '../../api';
import Skeleton from '../../components/Skeleton';
import PlotlyChart from '../../components/PlotlyChart';

const statusConfig = {
  online: { icon: CheckCircle, text: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20' },
  warning: { icon: AlertCircle, text: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
  offline: { icon: XCircle, text: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20' },
};

export default function SystemMonitoring() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);

  const fetchHealth = useCallback(async () => {
    try {
      const data = await api.getSystemHealth();
      setHealth(data);
      setHistory(prev => {
        const newHistory = [...prev, {
          time: new Date().toLocaleTimeString(),
          cpu: data.cpu_usage || 0,
          memory: data.memory_usage || 0,
        }];
        if (newHistory.length > 10) newHistory.shift();
        return newHistory;
      });
    } catch (error) {
      console.error('Failed to fetch system health', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [fetchHealth]);

  const services = [
    { name: 'API Server', status: health?.api_status === 'healthy' ? 'online' : health?.api_status === 'degraded' ? 'warning' : 'offline' },
    { name: 'Database', status: health?.db_status === 'healthy' ? 'online' : health?.db_status === 'degraded' ? 'warning' : 'offline' },
    { name: 'ML Service', status: health?.api_status === 'healthy' ? 'online' : 'warning' },
    { name: 'Redis Cache', status: 'online' },
  ];

  const plotlyPerformanceData = [
    {
      x: history.map(h => h.time),
      y: history.map(h => h.cpu),
      type: 'scatter',
      mode: 'lines',
      name: 'CPU Usage (%)',
      line: { color: '#4f46e5', width: 3, shape: 'spline' },
      fill: 'tozeroy',
      fillcolor: 'rgba(79, 70, 229, 0.06)'
    },
    {
      x: history.map(h => h.time),
      y: history.map(h => h.memory),
      type: 'scatter',
      mode: 'lines',
      name: 'Memory Usage (%)',
      line: { color: '#0d9488', width: 3, shape: 'spline' },
      fill: 'tozeroy',
      fillcolor: 'rgba(13, 148, 136, 0.06)'
    }
  ];

  if (loading) {
    return <Skeleton rows={8} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-primary/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-primary w-fit">
          <MonitorCog size={14} />
          System Health
        </div>
        <h1 className="text-2xl font-black text-textPrimary">System Monitoring</h1>
        <p className="text-sm text-textSecondary">Real-time monitoring of system performance and health</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-textSecondary">CPU Usage</p>
              <p className="mt-2 text-3xl font-black text-textPrimary">{health?.cpu_usage || 0}%</p>
            </div>
            <div className="rounded-xl bg-blue-500/10 p-3 text-blue-500">
              <Cpu size={24} />
            </div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-bg">
            <div className="h-full rounded-full bg-blue-500" style={{ width: `${health?.cpu_usage || 0}%` }} />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-textSecondary">Memory Usage</p>
              <p className="mt-2 text-3xl font-black text-textPrimary">{health?.memory_usage || 0}%</p>
            </div>
            <div className="rounded-xl bg-teal-500/10 p-3 text-teal-500">
              <Activity size={24} />
            </div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-bg">
            <div className="h-full rounded-full bg-teal-500" style={{ width: `${health?.memory_usage || 0}%` }} />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-textSecondary">Request Count</p>
              <p className="mt-2 text-3xl font-black text-textPrimary">{(health?.request_count || 0).toLocaleString()}</p>
            </div>
            <div className="rounded-xl bg-orange-500/10 p-3 text-orange-500">
              <HardDrive size={24} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h3 className="flex items-center gap-2 text-sm font-bold text-textPrimary">
            <Activity size={16} className="text-primary" />
            Performance Metrics
          </h3>
          <div className="mt-6 h-64 bg-surface p-2">
            <PlotlyChart
              data={plotlyPerformanceData}
              layout={{
                margin: { t: 10, r: 10, l: 30, b: 30 },
                xaxis: { showgrid: false },
                yaxis: { gridcolor: 'rgba(148, 163, 184, 0.16)', range: [0, 100] },
                legend: { orientation: 'h', y: -0.15 }
              }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h3 className="flex items-center gap-2 text-sm font-bold text-textPrimary">
            <Server size={16} className="text-primary" />
            Services Status
          </h3>
          <div className="mt-6 space-y-4">
            {services.map((service, idx) => {
              const cfg = statusConfig[service.status];
              const Icon = cfg.icon;
              return (
                <div key={idx} className={`flex items-center justify-between rounded-xl border ${cfg.border} bg-bg/50 p-4`}>
                  <div className="flex items-center gap-4">
                    <div className={`rounded-lg ${cfg.bg} p-2 ${cfg.text}`}>
                      <Database size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-textPrimary">{service.name}</p>
                      <p className="text-xs text-textSecondary">Uptime: 14d 2h</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <div className={`flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${cfg.bg} ${cfg.text}`}>
                      <Icon size={12} />
                      {service.status}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
