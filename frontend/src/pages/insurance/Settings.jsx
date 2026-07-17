import { useCallback, useEffect, useState } from 'react';
import { Activity, Database, RefreshCcw, Settings as SettingsIcon, ShieldCheck } from 'lucide-react';
import api from '../../api';
import Skeleton from '../../components/Skeleton';

export default function Settings() {
  const [health, setHealth] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [metricRows, healthRes] = await Promise.all([
        api.getMetrics(),
        fetch(`${(import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')}/health`).then((r) => r.json()),
      ]);
      setMetrics(metricRows || {});
      setHealth(healthRes || {});
    } catch (err) {
      setError(err.message || 'Unable to load system settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Skeleton rows={6} />;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-primary">Settings</p>
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-black text-textPrimary"><SettingsIcon className="text-primary" />System Readiness</h1>
          <p className="mt-1 text-sm text-textSecondary">Live backend, database, and model status for presentation checks.</p>
        </div>
        <button onClick={load} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-black text-white"><RefreshCcw size={16} />Refresh</button>
      </header>

      {error && <div className="rounded-xl border border-danger/20 bg-danger/10 p-4 text-sm font-bold text-danger">{error}</div>}

      <section className="grid gap-4 md:grid-cols-3">
        <div className="enterprise-card p-5">
          <div className="flex items-center gap-2 text-sm font-black"><Activity className="text-success" />API Status</div>
          <p className="mt-3 text-2xl font-black capitalize">{health?.status || 'Unknown'}</p>
          <p className="mt-1 text-xs text-textSecondary">{health?.engine || 'FastAPI backend'}</p>
        </div>
        <div className="enterprise-card p-5">
          <div className="flex items-center gap-2 text-sm font-black"><Database className="text-primary" />Database</div>
          <p className="mt-3 text-2xl font-black capitalize">{health?.database || health?.database_connection || 'Unknown'}</p>
          <p className="mt-1 text-xs text-textSecondary">{health?.provider || 'Configured SQL provider'}</p>
        </div>
        <div className="enterprise-card p-5">
          <div className="flex items-center gap-2 text-sm font-black"><ShieldCheck className="text-warning" />Fraud Model</div>
          <p className="mt-3 text-2xl font-black">{metrics?.model_accuracy ? `${(Number(metrics.model_accuracy) * 100).toFixed(1)}%` : 'Connected'}</p>
          <p className="mt-1 text-xs text-textSecondary">Claims scored through backend ML prediction flow.</p>
        </div>
      </section>

      <section className="enterprise-card p-5">
        <h2 className="text-sm font-black text-textPrimary">Presentation Checklist</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {[
            ['Authentication', 'Role-based login uses backend Basic Auth.'],
            ['Dashboard Data', 'KPIs and charts are loaded from API responses.'],
            ['Claim Submission', 'Backend persists evaluated claims after ML scoring.'],
            ['Empty Database', 'Backend seeds realistic records only when core claim data is empty.'],
          ].map(([title, body]) => (
            <div key={title} className="rounded-lg border border-border bg-bg/50 p-4">
              <p className="text-xs font-black uppercase text-textPrimary">{title}</p>
              <p className="mt-1 text-xs leading-5 text-textSecondary">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
