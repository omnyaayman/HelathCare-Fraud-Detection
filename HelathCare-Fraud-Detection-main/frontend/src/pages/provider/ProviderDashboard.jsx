import { useState, useEffect, useMemo } from 'react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Tooltip, Filler, Legend
} from 'chart.js';
import { Activity, CreditCard, AlertCircle, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import api from '../../api'; 
import Skeleton from '../../components/Skeleton';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Tooltip, Filler, Legend);

const chartOpts = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: { 
    x: { grid: { color: '#21262d' }, ticks: { color: '#8b949e', font: { size: 10 } } }, 
    y: { grid: { color: '#21262d' }, ticks: { color: '#8b949e', font: { size: 10 } } } 
  },
};

export default function ProviderDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [metricsData, claimsData] = await Promise.all([
          api.getMetrics(),
          api.getClaims()
        ]);
        setMetrics(metricsData);
        setClaims(claimsData || []);
      } catch (error) {
        console.error("Dashboard Loading Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // حساب الإحصائيات باستخدام useMemo للأداء العالي
  const stats = useMemo(() => {
    const total = claims.length;
    const pending = claims.filter(c => c.status === 'Pending').length;
    const flagged = claims.filter(c => c.status === 'Flagged' || c.status === 'Fraud Confirmed').length;
    const approved = claims.filter(c => c.status === 'Cleared').length;
    const amount = claims.reduce((s, c) => s + (parseFloat(c.amount) || 0), 0);
    const avgRisk = total ? (claims.reduce((s, c) => s + (c.fraud_score || 0), 0) / total) : 0;

    return { total, pending, flagged, approved, amount, avgRisk };
  }, [claims]);

  if (loading || !metrics) return <div className="p-8"><Skeleton rows={10} /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Activity className="text-primary" size={24} />
        <h2 className="text-xl font-bold text-textPrimary">Provider Analytics Portal</h2>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Claims', value: stats.total, icon: CreditCard, color: 'text-primary' },
          { label: 'Pending Audit', value: stats.pending, icon: Clock, color: 'text-warning' },
          { label: 'Risk Flagged', value: stats.flagged, icon: AlertCircle, color: 'text-danger' },
          { label: 'Final Approved', value: stats.approved, icon: CheckCircle, color: 'text-success' },
          { label: 'Total Billed', value: `USD ${stats.amount.toLocaleString()}`, icon: TrendingUp, color: 'text-textPrimary' },
          { label: 'Avg Risk Score', value: `${(stats.avgRisk * 100).toFixed(1)}%`, icon: Activity, color: 'text-textSecondary' },
          { label: 'AI Accuracy', value: `${(metrics.model_accuracy * 100).toFixed(1)}%`, icon: ShieldCheck, color: 'text-primary' },
          { label: 'Last Sync', value: new Date(metrics.last_retrain).toLocaleDateString(), icon: Clock, color: 'text-textSecondary' },
        ].map((kpi, i) => (
          <div key={i} className="bg-surface border border-border rounded-xl p-4 hover:border-primary/30 transition-all">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] text-textSecondary uppercase font-bold tracking-wider">{kpi.label}</span>
              {kpi.icon && <kpi.icon size={14} className={kpi.color} />}
            </div>
            <div className={`text-xl font-mono font-bold ${kpi.color}`}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Chart */}
        <div className="lg:col-span-2 bg-surface border border-border rounded-xl p-5 shadow-sm">
          <h3 className="text-xs font-bold text-textSecondary uppercase mb-6">Submission History</h3>
          <div className="h-64">
            <Line 
              data={{
                labels: claims.slice(-10).map(c => c.submitted_at?.split('T')[0] || 'N/A'),
                datasets: [{
                  label: 'Claims count',
                  data: claims.slice(-10).map((_, i) => i + 1), // تجريبي بناءً على العدد
                  borderColor: '#58a6ff',
                  backgroundColor: 'rgba(88, 166, 255, 0.1)',
                  fill: true,
                  tension: 0.4
                }]
              }} 
              options={chartOpts} 
            />
          </div>
        </div>

        {/* Status Doughnut */}
        <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
          <h3 className="text-xs font-bold text-textSecondary uppercase mb-6 text-center">Current Status Mix</h3>
          <div className="h-48 flex items-center justify-center">
            <Doughnut 
              data={{
                labels: ['Pending', 'Approved', 'Flagged'],
                datasets: [{
                  data: [stats.pending, stats.approved, stats.flagged],
                  backgroundColor: ['#d29922', '#3fb950', '#f85149'],
                  borderWidth: 0,
                  cutout: '70%'
                }]
              }} 
              options={{ ...chartOpts, plugins: { legend: { display: true, position: 'bottom', labels: { color: '#8b949e', font: { size: 10 } } } } }} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// أيقونة إضافية للاستخدام
function ShieldCheck({ size, className }) {
    return <CheckCircle size={size} className={className} />;
}