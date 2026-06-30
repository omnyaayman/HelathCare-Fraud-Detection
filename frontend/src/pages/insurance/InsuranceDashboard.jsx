import { useState, useEffect, useMemo } from 'react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Tooltip, Filler, Legend
} from 'chart.js';
import { Activity, AlertTriangle, ShieldCheck, TrendingUp, Hospital, Users } from 'lucide-react';
import api from '../../api';
import Skeleton from '../../components/Skeleton';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Tooltip, Filler, Legend);

// إعدادات التصميم الموحدة (GitHub Dark Style)
const chartOpts = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: { 
    x: { grid: { color: '#21262d' }, ticks: { color: '#8b949e', font: { size: 10 } } }, 
    y: { grid: { color: '#21262d' }, ticks: { color: '#8b949e', font: { size: 10 } } } 
  },
};

const TABS = ['Overview', 'Fraud Analysis', 'Provider Audit'];

export default function InsuranceDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('Overview');

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const [m, c] = await Promise.all([
          api.getMetrics(),
          api.getClaims()
        ]);
        setMetrics(m);
        setClaims(c || []);
      } catch (err) {
        console.error("Dashboard Sync Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, []);

  // --- معالجة البيانات (Data Aggregation) ---
  const stats = useMemo(() => {
    const statusCounts = { Pending: 0, Cleared: 0, 'Fraud Confirmed': 0, Flagged: 0 };
    const providerStats = {};
    const dateSeries = {};

    claims.forEach(c => {
      // 1. حساب الحالات
      const status = c.status || 'Pending';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
      
      // 2. تجميع حسب المستشفى
      const pName = c.provider_name || 'Unknown';
      if (!providerStats[pName]) providerStats[pName] = { total: 0, fraud: 0, amount: 0 };
      providerStats[pName].total += 1;
      providerStats[pName].amount += (c.amount || 0);
      if (c.status === 'Fraud Confirmed' || (c.fraud_score > 0.7)) providerStats[pName].fraud += 1;

      // 3. تجميع حسب التاريخ
      const date = c.submitted_at?.split('T')[0] || 'Unknown';
      dateSeries[date] = (dateSeries[date] || 0) + 1;
    });

    return { statusCounts, providerStats, dateSeries };
  }, [claims]);

  if (loading || !metrics) return <div className="p-10"><Skeleton rows={12} /></div>;

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-xl font-bold text-textPrimary flex items-center gap-2">
          <Activity size={20} className="text-primary" /> Insurance Intelligence
        </h2>
        <div className="flex bg-surface border border-border p-1 rounded-lg">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${tab === t ? 'bg-bg text-primary shadow-sm' : 'text-textSecondary hover:text-textPrimary'}`}
            >{t}</button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface border border-border p-4 rounded-xl">
          <p className="text-[10px] text-textSecondary uppercase font-bold mb-1">Total Exposure</p>
          <p className="text-2xl font-mono text-textPrimary">${(claims.reduce((s,c)=>s+(c.amount||0),0)/1e6).toFixed(2)}M</p>
        </div>
        <div className="bg-surface border border-border p-4 rounded-xl border-l-4 border-l-danger">
          <p className="text-[10px] text-danger uppercase font-bold mb-1 flex items-center gap-1"><AlertTriangle size={10}/> High Risk Score</p>
          <p className="text-2xl font-mono text-textPrimary">{claims.filter(c => c.fraud_score > 0.7).length}</p>
        </div>
        <div className="bg-surface border border-border p-4 rounded-xl">
          <p className="text-[10px] text-textSecondary uppercase font-bold mb-1">Model Precision</p>
          <p className="text-2xl font-mono text-primary">{(metrics.model_accuracy * 100).toFixed(1)}%</p>
        </div>
        <div className="bg-surface border border-border p-4 rounded-xl">
          <p className="text-[10px] text-textSecondary uppercase font-bold mb-1">Active Patients</p>
          <p className="text-2xl font-mono text-textPrimary">{metrics.total_patients}</p>
        </div>
      </div>

      {/* Tab Content: Overview */}
      {tab === 'Overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-surface border border-border rounded-xl p-5">
            <h3 className="text-xs font-bold text-textSecondary uppercase mb-6 flex items-center gap-2">
              <TrendingUp size={14} /> Claim Submission Trend
            </h3>
            <div className="h-64">
              <Line data={{
                labels: Object.keys(stats.dateSeries).slice(-10),
                datasets: [{ 
                  data: Object.values(stats.dateSeries).slice(-10), 
                  borderColor: '#58a6ff', backgroundColor: 'rgba(88,166,255,0.1)', fill: true, tension: 0.4 
                }]
              }} options={chartOpts} />
            </div>
          </div>
          
          <div className="bg-surface border border-border rounded-xl p-5">
            <h3 className="text-xs font-bold text-textSecondary uppercase mb-6">Status Distribution</h3>
            <div className="h-48 flex items-center justify-center">
              <Doughnut data={{
                labels: Object.keys(stats.statusCounts),
                datasets: [{
                  data: Object.values(stats.statusCounts),
                  backgroundColor: ['#d29922', '#3fb950', '#f85149', '#f78166'],
                  borderWidth: 0, cutout: '75%'
                }]
              }} options={{ ...chartOpts, plugins: { legend: { display: true, position: 'bottom', labels: { color: '#8b949e', boxWidth: 10, font: { size: 10 } } } } }} />
            </div>
          </div>
        </div>
      )}

      {/* Tab: Provider Audit */}
      {tab === 'Provider Audit' && (
        <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-border bg-bg/20 flex justify-between items-center">
            <span className="text-xs font-bold text-textSecondary uppercase flex items-center gap-2"><Hospital size={14}/> Hospital Risk Ranking</span>
            <span className="text-[10px] text-textSecondary italic">Data pulled from Azure SQL</span>
          </div>
          <table className="w-full text-sm text-left">
            <thead className="bg-bg/50 border-b border-border text-[10px] text-textSecondary uppercase">
              <tr>
                <th className="px-6 py-4">Provider / Hospital</th>
                <th className="px-6 py-4 text-right">Claims</th>
                <th className="px-6 py-4 text-right">Suspicious Ratio</th>
                <th className="px-6 py-4 text-right">Total Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {Object.entries(stats.providerStats).sort((a,b) => b[1].fraud - a[1].fraud).map(([name, data]) => (
                <tr key={name} className="hover:bg-bg/30 transition-colors">
                  <td className="px-6 py-4 font-medium text-textPrimary">{name}</td>
                  <td className="px-6 py-4 text-right font-mono">{data.total}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className={`text-xs font-bold ${data.fraud/data.total > 0.3 ? 'text-danger' : 'text-textSecondary'}`}>
                        {((data.fraud/data.total)*100).toFixed(1)}%
                      </span>
                      <div className="w-16 h-1 bg-bg rounded-full overflow-hidden">
                        <div className="h-full bg-danger" style={{ width: `${(data.fraud/data.total)*100}%` }}></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-textSecondary">${(data.amount/1e3).toFixed(1)}k</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Fraud Analysis */}
      {tab === 'Fraud Analysis' && (
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-surface border border-border rounded-xl p-5 border-t-4 border-t-danger">
                <div className="flex items-center gap-2 mb-4 text-danger">
                    <ShieldCheck size={18} />
                    <h3 className="text-sm font-bold uppercase">AI Prediction Accuracy</h3>
                </div>
                <p className="text-xs text-textSecondary leading-relaxed mb-4">
                   The system currently operates with an accuracy of **{(metrics.model_accuracy * 100).toFixed(2)}%**. 
                   The F1-Score is monitored to balance precision and recall in fraud detection.
                </p>
                <div className="flex gap-4">
                    <div className="flex-1 bg-bg p-3 rounded-lg border border-border">
                        <p className="text-[10px] text-textSecondary uppercase">Precision</p>
                        <p className="text-lg font-mono text-primary">{(metrics.model_precision * 100).toFixed(1)}%</p>
                    </div>
                    <div className="flex-1 bg-bg p-3 rounded-lg border border-border">
                        <p className="text-[10px] text-textSecondary uppercase">Recall</p>
                        <p className="text-lg font-mono text-success">{(metrics.model_recall * 100).toFixed(1)}%</p>
                    </div>
                </div>
            </div>
         </div>
      )}
    </div>
  );
}