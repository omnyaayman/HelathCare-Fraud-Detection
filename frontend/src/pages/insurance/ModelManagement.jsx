import { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler,
} from 'chart.js';
import { RefreshCw, CheckCircle, AlertCircle, Loader, Cpu, Database, TrendingUp } from 'lucide-react';
import api from '../../api';
import Skeleton from '../../components/Skeleton';

// تسجيل مكونات Chart.js
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

// إعدادات الرسم البياني (GitHub Dark Style)
const chartOpts = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { 
    legend: { display: false },
    tooltip: { 
      backgroundColor: '#1c2128', 
      borderColor: '#383e47', 
      borderWidth: 1, 
      titleColor: '#c9d1d9', 
      bodyColor: '#8b949e', 
      padding: 10, 
      cornerRadius: 4 
    } 
  },
  scales: { 
    x: { grid: { color: '#21262d' }, ticks: { color: '#8b949e', font: { size: 11 } } }, 
    y: { grid: { color: '#21262d' }, ticks: { color: '#8b949e', font: { size: 11 } }, min: 0, max: 1 } 
  },
};

export default function ModelManagement() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [retraining, setRetraining] = useState(false);
  const [message, setMessage] = useState(null);

  const flash = (type, text) => { 
    setMessage({ type, text }); 
    setTimeout(() => setMessage(null), 5000); 
  };

  const fetchModelData = async () => {
    try {
      const data = await api.getMetrics();
      setMetrics(data);
    } catch (error) {
      flash('error', 'Unable to fetch model metrics. Check database connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModelData();
  }, []);

  const handleRetrain = async () => {
    if (!window.confirm("Triggering a retrain will use all new labeled data from SQL. Proceed?")) return;
    
    setRetraining(true);
    try {
      await api.triggerRetrain(); 
      flash('success', 'Airflow DAG triggered! The model is now learning from new data.');
      setTimeout(fetchModelData, 15000); 
    } catch (error) {
      flash('error', 'Failed to communicate with the retraining service.');
    } finally {
      setRetraining(false);
    }
  };

  if (loading || !metrics) return <div className="p-8"><Skeleton rows={10} /></div>;

  const history = metrics.model_history || [];
  const currentVersion = history.length > 0 ? history[history.length - 1].version : 'v1.0';
  const lastSync = metrics.last_retrain ? new Date(metrics.last_retrain).toLocaleString() : 'Never';
  const totalSamples = (metrics.confirmed_fraud || 0) + (metrics.cleared_claims || 0);

  return (
    <div className="space-y-6">
      {message && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg animate-in fade-in slide-in-from-top-2 ${
          message.type === 'success' ? 'bg-success/10 border-success/20 text-success' : 'bg-danger/10 border-danger/20 text-danger'
        }`}>
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Accuracy', value: metrics.model_accuracy },
          { label: 'Precision', value: metrics.model_precision },
          { label: 'Recall', value: metrics.model_recall },
          { label: 'F1 Score', value: metrics.model_f1 },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-surface border border-border rounded-xl p-4 hover:border-primary/40 transition-all group">
            <div className="text-[10px] text-textSecondary uppercase font-bold tracking-wider mb-1">{kpi.label}</div>
            <div className="text-2xl text-textPrimary font-mono group-hover:text-primary transition-colors">
                {( (kpi.value || 0) * 100).toFixed(1)}%
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface border border-border rounded-xl shadow-sm">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Cpu size={16} className="text-primary" />
                <span className="text-xs font-bold text-textPrimary uppercase">Active Model Specs</span>
            </div>
            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">Stable</span>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-textSecondary">Production Version</span>
              <span className="font-mono font-bold text-textPrimary">{currentVersion}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-textSecondary">Last Weight Update</span>
              <span className="text-textPrimary text-xs">{lastSync}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-textSecondary">Validated Samples</span>
              <span className="text-textPrimary font-mono">{totalSamples.toLocaleString()} records</span>
            </div>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-6 flex flex-col justify-between border-t-4 border-t-warning/30">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-warning">
                <Database size={18} />
                <span className="text-xs font-bold uppercase tracking-tight">Data Drift Management</span>
            </div>
            <p className="text-xs text-textSecondary leading-relaxed">
              When enough new labels are verified in **Azure SQL**, trigger a retrain to update the XGBoost engine.
              The F1-Score helps balance precision and recall.
            </p>
          </div>
          <button
            onClick={handleRetrain}
            disabled={retraining}
            className={`mt-6 w-full flex items-center justify-center gap-2 py-3 rounded-lg font-bold transition-all shadow-md ${
              retraining ? 'bg-border text-textSecondary cursor-not-allowed' : 'bg-primary text-white hover:brightness-110 active:scale-[0.98]'
            }`}
          >
            {retraining ? <Loader className="animate-spin" size={18} /> : <RefreshCw size={18} />}
            {retraining ? 'Pipeline in Progress...' : 'Trigger Airflow Retrain'}
          </button>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-success" />
                <h3 className="text-xs font-bold text-textSecondary uppercase tracking-wider">Accuracy Performance History</h3>
            </div>
            <div className="text-[10px] text-textSecondary font-mono">Records: {history.length} versions</div>
        </div>
        <div className="h-64">
          {history.length > 0 ? (
            <Line data={{
              labels: history.map(m => m.version),
              datasets: [{ 
                label: 'Accuracy',
                data: history.map(m => m.accuracy), 
                borderColor: '#58a6ff', 
                backgroundColor: 'rgba(88, 166, 255, 0.1)', 
                fill: true, 
                tension: 0.4,
                pointRadius: 5,
                pointHoverRadius: 7,
                pointBackgroundColor: '#58a6ff',
                pointBorderColor: '#1c2128',
                pointBorderWidth: 2
              }]
            }} options={chartOpts} />
          ) : (
            <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl bg-bg/20">
                <AlertCircle size={24} className="text-textSecondary mb-2" />
                <p className="text-xs text-textSecondary italic">No historical data available for this model yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}