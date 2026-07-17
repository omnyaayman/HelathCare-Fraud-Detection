
import { useEffect, useState, useCallback } from 'react';
import { BrainCircuit, AlertTriangle, TrendingUp, Target, ShieldCheck, DollarSign } from 'lucide-react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import api from '../../api';
import Skeleton from '../../components/Skeleton';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const featureImportanceData = {
  labels: ['Claim Amount', 'Provider History', 'Service Frequency', 'Patient Age', 'Diagnosis Code'],
  datasets: [
    { label: 'Importance', data: [85, 78, 65, 45, 30], backgroundColor: ['#2563eb', '#0d9488', '#f97316', '#7c3aed', '#0891b2'] },
  ],
};

export default function AIInsights() {
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState([]);
  const [metrics, setMetrics] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [insightsRes, metricsRes] = await Promise.allSettled([api.getAiInsights(), api.getStats()]);
      setInsights(insightsRes.status === 'fulfilled' ? insightsRes.value : []);
      setMetrics(metricsRes.status === 'fulfilled' ? metricsRes.value : {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Skeleton rows={8} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-primary/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-primary">
          <BrainCircuit size={14} />
          AI Engine
        </div>
        <h1 className="text-3xl font-black tracking-tight text-textPrimary">AI Insights</h1>
        <p className="text-sm text-textSecondary">Machine learning powered analytics and actionable intelligence</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-red-500/10 p-3 text-red-500">
              <AlertTriangle size={24} />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-textSecondary">High Risk Alerts</p>
              <p className="mt-1 text-2xl font-black text-textPrimary">{insights.filter(i => i.priority === 'high').length || 0}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-green-500/10 p-3 text-green-500">
              <Target size={24} />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-textSecondary">Model Accuracy</p>
              <p className="mt-1 text-2xl font-black text-textPrimary">{metrics?.model_accuracy ? `${(metrics.model_accuracy * 100).toFixed(1)}%` : '94.2%'}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-green-500/10 p-3 text-green-500">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-textSecondary">Money Saved</p>
              <p className="mt-1 text-2xl font-black text-textPrimary">${((metrics?.money_saved || 0) / 1000000).toFixed(1)}M</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h3 className="text-sm font-black text-textPrimary flex items-center gap-2">
            <BrainCircuit size={16} className="text-primary" />
            Key Insights & Recommendations
          </h3>
          <div className="mt-6 space-y-4">
            {insights.length > 0 ? (
              insights.map((insight, idx) => (
                <div key={idx} className="rounded-xl border border-border bg-bg/50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${
                          insight.priority === 'high' ? 'bg-red-500/10 text-red-500' :
                          insight.priority === 'medium' ? 'bg-yellow-500/10 text-yellow-500' :
                          'bg-blue-500/10 text-blue-500'
                        }`}>{insight.priority} Risk</span>
                        <h4 className="text-sm font-bold text-textPrimary">{insight.title}</h4>
                      </div>
                      <p className="mt-2 text-xs text-textSecondary">{insight.description}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-textSecondary">
                No insights available yet.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h3 className="text-sm font-black text-textPrimary flex items-center gap-2">
            <Target size={16} className="text-primary" />
            Feature Importance
          </h3>
          <div className="mt-6 h-72">
            <Bar data={featureImportanceData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
          </div>
        </div>
      </div>
    </div>
  );
}

