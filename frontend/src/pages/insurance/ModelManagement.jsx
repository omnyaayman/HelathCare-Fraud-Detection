import { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler,
} from 'chart.js';
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { generateMockMetrics } from '../../mockData';
import Skeleton from '../../components/Skeleton';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

const chartOpts = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1c2128', borderColor: '#383e47', borderWidth: 1, titleColor: '#c9d1d9', bodyColor: '#8b949e', padding: 8, cornerRadius: 4 } },
  scales: { x: { grid: { color: '#21262d' }, ticks: { color: '#8b949e', font: { size: 11 } } }, y: { grid: { color: '#21262d' }, ticks: { color: '#8b949e', font: { size: 11 } } } },
};

export default function ModelManagement() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [retraining, setRetraining] = useState(false);
  const [message, setMessage] = useState(null);

  const flash = (type, text) => { setMessage({ type, text }); setTimeout(() => setMessage(null), 4000); };

  useEffect(() => {
    const timer = setTimeout(() => {
      setMetrics(generateMockMetrics());
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const handleRetrain = () => {
    setRetraining(true);
    setTimeout(() => {
      setRetraining(false);
      flash('success', 'Model retrained successfully — new version deployed');
      setMetrics((prev) => ({
        ...prev,
        model_accuracy: Math.min(prev.model_accuracy + 0.002, 0.999),
        model_f1: Math.min(prev.model_f1 + 0.003, 0.999),
        last_retrain: new Date().toISOString(),
        model_history: [
          ...prev.model_history,
          {
            version: `v${prev.model_history.length + 1}.0`,
            date: new Date().toISOString().slice(0, 10),
            accuracy: Math.min(prev.model_accuracy + 0.002, 0.999),
            f1: Math.min(prev.model_f1 + 0.003, 0.999),
          },
        ],
      }));
    }, 3000);
  };

  if (loading) return <div className="space-y-6"><div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({ length: 4 }, (_, i) => <div key={i} className="bg-surface border border-border rounded-lg p-4"><Skeleton rows={2} /></div>)}</div></div>;

  return (
    <div className="space-y-6">
      {message && (
        <div className={`flex items-center gap-2 px-3 py-2.5 rounded-md text-sm ${message.type === 'success' ? 'bg-success/10 border border-success/20 text-success' : 'bg-danger/10 border border-danger/20 text-danger'}`}>
          {message.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Accuracy', value: `${(metrics.model_accuracy * 100).toFixed(1)}%` },
          { label: 'Precision', value: `${(metrics.model_precision * 100).toFixed(1)}%` },
          { label: 'Recall', value: `${(metrics.model_recall * 100).toFixed(1)}%` },
          { label: 'F1 Score', value: `${(metrics.model_f1 * 100).toFixed(1)}%` },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-surface border border-border rounded-lg px-4 py-3">
            <div className="text-xs text-textSecondary">{kpi.label}</div>
            <div className="text-lg text-textPrimary font-medium mt-1">{kpi.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Model info */}
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border"><span className="text-xs text-textSecondary">Model Information</span></div>
          <div className="p-4 space-y-3 text-sm">
            {[
              ['Current Version', metrics.model_history[metrics.model_history.length - 1].version],
              ['Last Retrained', new Date(metrics.last_retrain).toLocaleString()],
              ['Total Versions', metrics.model_history.length],
              ['Total Claims Processed', metrics.total_claims.toLocaleString()],
              ['Avg Processing Time', `${metrics.avg_processing_time}s`],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <span className="text-textSecondary">{label}</span>
                <span className="text-textPrimary">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Retrain trigger */}
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border"><span className="text-xs text-textSecondary">Model Retraining</span></div>
          <div className="p-4">
            <p className="text-sm text-textSecondary mb-4">Retrain the model using latest labeled data. This replaces the current model version.</p>
            <div className="bg-[#0d1117] border border-[#383e47] rounded-lg p-4 mb-4 space-y-2 text-xs text-textSecondary">
              <div className="flex justify-between"><span>Confirmed fraud labels:</span><span className="text-textPrimary">{metrics.confirmed_fraud}</span></div>
              <div className="flex justify-between"><span>Confirmed real labels:</span><span className="text-textPrimary">{metrics.cleared_claims}</span></div>
              <div className="flex justify-between"><span>Total training samples:</span><span className="text-textPrimary">{metrics.confirmed_fraud + metrics.cleared_claims}</span></div>
            </div>
            <button
              onClick={handleRetrain}
              disabled={retraining}
              className={`flex items-center gap-2 px-4 py-2 text-sm rounded-md transition-colors duration-150 ${
                retraining
                  ? 'bg-border/50 text-textSecondary cursor-not-allowed'
                  : 'bg-primary/15 border border-primary/30 text-primary hover:bg-primary/25'
              }`}
            >
              <RefreshCw size={14} className={retraining ? 'animate-spin' : ''} />
              {retraining ? 'Retraining...' : 'Trigger Retrain'}
            </button>
            {retraining && (
              <div className="mt-3">
                <div className="h-1.5 bg-border/30 rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full animate-pulse" style={{ width: '60%' }} /></div>
                <p className="text-xs text-textSecondary mt-1">Processing labeled data and updating model weights...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Performance chart */}
      <div className="bg-surface border border-border rounded-lg p-4">
        <div className="text-xs text-textSecondary mb-3">Performance Over Versions</div>
        <div className="h-56">
          <Line data={{
            labels: metrics.model_history.map((m) => m.version),
            datasets: [
              { label: 'Accuracy', data: metrics.model_history.map((m) => m.accuracy), borderColor: '#58a6ff', backgroundColor: '#58a6ff15', borderWidth: 1.5, fill: true, pointRadius: 3, tension: 0.2 },
              { label: 'F1', data: metrics.model_history.map((m) => m.f1), borderColor: '#3fb950', backgroundColor: '#3fb95015', borderWidth: 1.5, fill: true, pointRadius: 3, tension: 0.2 },
            ],
          }} options={{ ...chartOpts, scales: { ...chartOpts.scales, y: { ...chartOpts.scales.y, min: 0.8, max: 1.0, ticks: { ...chartOpts.scales.y.ticks, callback: (v) => `${(v * 100).toFixed(0)}%` } } } }} />
        </div>
        <div className="flex gap-4 mt-3 justify-center">
          <div className="flex items-center gap-1.5 text-xs text-textSecondary"><span className="w-2 h-2 rounded-sm bg-primary" />Accuracy</div>
          <div className="flex items-center gap-1.5 text-xs text-textSecondary"><span className="w-2 h-2 rounded-sm bg-success" />F1</div>
        </div>
      </div>

      {/* Version history table */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border"><span className="text-xs text-textSecondary">Version History</span></div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-2.5 text-xs text-textSecondary font-medium">Version</th>
              <th className="text-left px-4 py-2.5 text-xs text-textSecondary font-medium">Date</th>
              <th className="text-right px-4 py-2.5 text-xs text-textSecondary font-medium">Accuracy</th>
              <th className="text-right px-4 py-2.5 text-xs text-textSecondary font-medium">F1 Score</th>
              <th className="text-right px-4 py-2.5 text-xs text-textSecondary font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {[...metrics.model_history].reverse().map((m, i) => (
              <tr key={m.version} className="border-b border-border last:border-0">
                <td className="px-4 py-2.5 text-primary font-mono text-xs">{m.version}</td>
                <td className="px-4 py-2.5 text-textSecondary text-xs">{m.date}</td>
                <td className="px-4 py-2.5 text-textPrimary font-mono text-xs text-right">{(m.accuracy * 100).toFixed(1)}%</td>
                <td className="px-4 py-2.5 text-textPrimary font-mono text-xs text-right">{(m.f1 * 100).toFixed(1)}%</td>
                <td className="px-4 py-2.5 text-right">
                  <span className={`text-xs px-2 py-0.5 rounded border ${i === 0 ? 'bg-success/10 border-success/20 text-success' : 'bg-border/20 border-border text-textSecondary'}`}>
                    {i === 0 ? 'Active' : 'Archived'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
