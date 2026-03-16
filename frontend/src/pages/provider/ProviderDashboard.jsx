import { useState, useEffect } from 'react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Tooltip, Filler,
} from 'chart.js';
import { generateMockMetrics, generateMockClaims } from '../../mockData';
import Skeleton from '../../components/Skeleton';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Tooltip, Filler);

const chartOpts = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1c2128', borderColor: '#383e47', borderWidth: 1, titleColor: '#c9d1d9', bodyColor: '#8b949e', padding: 8, cornerRadius: 4 } },
  scales: {
    x: { grid: { color: '#21262d' }, ticks: { color: '#8b949e', font: { size: 11 } } },
    y: { grid: { color: '#21262d' }, ticks: { color: '#8b949e', font: { size: 11 } } },
  },
};

const doughnutOpts = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1c2128', borderColor: '#383e47', borderWidth: 1, titleColor: '#c9d1d9', bodyColor: '#8b949e', padding: 8, cornerRadius: 4 } },
  cutout: '65%',
};

export default function ProviderDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMetrics(generateMockMetrics());
      setClaims(generateMockClaims(100));
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="bg-surface border border-border rounded-lg p-4"><Skeleton rows={2} /></div>
          ))}
        </div>
      </div>
    );
  }

  const myClaims = claims;
  const pending = myClaims.filter((c) => c.status === 'Pending').length;
  const flagged = myClaims.filter((c) => c.status === 'Flagged').length;
  const cleared = myClaims.filter((c) => c.status === 'Cleared').length;
  const fraudConfirmed = myClaims.filter((c) => c.status === 'Fraud Confirmed').length;
  const totalAmount = myClaims.reduce((s, c) => s + c.amount, 0);
  const avgScore = myClaims.length ? (myClaims.reduce((s, c) => s + c.fraud_score, 0) / myClaims.length) : 0;

  const kpis = [
    { label: 'Total Claims', value: myClaims.length },
    { label: 'Pending', value: pending },
    { label: 'Flagged', value: flagged },
    { label: 'Cleared', value: cleared },
    { label: 'Fraud Confirmed', value: fraudConfirmed },
    { label: 'Total Billed', value: `$${totalAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
    { label: 'Avg Fraud Score', value: avgScore.toFixed(3) },
    { label: 'Model Accuracy', value: `${(metrics.model_accuracy * 100).toFixed(1)}%` },
  ];

  // Claims by date (group by claim_date)
  const byDate = {};
  myClaims.forEach((c) => {
    const d = c.claim_date;
    byDate[d] = (byDate[d] || 0) + 1;
  });
  const sortedDates = Object.keys(byDate).sort();
  const last14 = sortedDates.slice(-14);

  const claimsByDateData = {
    labels: last14.map((d) => d.slice(5)),
    datasets: [{
      data: last14.map((d) => byDate[d]),
      backgroundColor: '#58a6ff15',
      borderColor: '#58a6ff',
      borderWidth: 1.5,
      fill: true,
      tension: 0.3,
      pointRadius: 3,
      pointBackgroundColor: '#58a6ff',
    }],
  };

  // Status distribution
  const statusCounts = {};
  myClaims.forEach((c) => { statusCounts[c.status] = (statusCounts[c.status] || 0) + 1; });
  const statusColors = { Pending: '#d29922', Processing: '#58a6ff', Flagged: '#f78166', Cleared: '#3fb950', 'Fraud Confirmed': '#f85149' };

  const statusData = {
    labels: Object.keys(statusCounts),
    datasets: [{
      data: Object.values(statusCounts),
      backgroundColor: Object.keys(statusCounts).map((s) => statusColors[s] || '#8b949e'),
      borderWidth: 0,
    }],
  };

  // Claims by service type
  const byService = {};
  myClaims.forEach((c) => { byService[c.service_label] = (byService[c.service_label] || 0) + 1; });

  const serviceBarData = {
    labels: Object.keys(byService),
    datasets: [{
      data: Object.values(byService),
      backgroundColor: '#79c0ff30',
      borderColor: '#79c0ff',
      borderWidth: 1,
      borderRadius: 4,
    }],
  };

  // Model performance history
  const modelData = {
    labels: metrics.model_history.map((m) => m.version),
    datasets: [
      { label: 'Accuracy', data: metrics.model_history.map((m) => m.accuracy), borderColor: '#58a6ff', backgroundColor: '#58a6ff', borderWidth: 1.5, pointRadius: 3, tension: 0.2 },
      { label: 'F1 Score', data: metrics.model_history.map((m) => m.f1), borderColor: '#3fb950', backgroundColor: '#3fb950', borderWidth: 1.5, pointRadius: 3, tension: 0.2 },
    ],
  };

  const modelOpts = {
    ...chartOpts,
    scales: { ...chartOpts.scales, y: { ...chartOpts.scales.y, min: 0.8, max: 1.0, ticks: { ...chartOpts.scales.y.ticks, callback: (v) => `${(v * 100).toFixed(0)}%` } } },
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-surface border border-border rounded-lg px-4 py-3">
            <div className="text-xs text-textSecondary">{kpi.label}</div>
            <div className="text-lg text-textPrimary font-medium mt-1">{kpi.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="text-xs text-textSecondary mb-3">Claims by Date</div>
          <div className="h-56"><Line data={claimsByDateData} options={chartOpts} /></div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="text-xs text-textSecondary mb-3">Claims by Service Type</div>
          <div className="h-56"><Bar data={serviceBarData} options={chartOpts} /></div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="text-xs text-textSecondary mb-3">Claim Status Distribution</div>
          <div className="h-44 flex items-center justify-center">
            <div className="w-40 h-40"><Doughnut data={statusData} options={doughnutOpts} /></div>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 justify-center">
            {Object.entries(statusCounts).map(([status, count]) => (
              <div key={status} className="flex items-center gap-1.5 text-xs text-textSecondary">
                <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: statusColors[status] }} />
                {status} ({count})
              </div>
            ))}
          </div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="text-xs text-textSecondary mb-3">Model Performance Over Versions</div>
          <div className="h-56"><Line data={modelData} options={modelOpts} /></div>
          <div className="flex gap-4 mt-3 justify-center">
            <div className="flex items-center gap-1.5 text-xs text-textSecondary"><span className="w-2 h-2 rounded-sm bg-primary" />Accuracy</div>
            <div className="flex items-center gap-1.5 text-xs text-textSecondary"><span className="w-2 h-2 rounded-sm bg-success" />F1 Score</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border"><span className="text-xs text-textSecondary">Pipeline Status</span></div>
          <div className="p-4 space-y-3">
            {Object.entries(statusCounts).map(([status, count]) => {
              const pct = (count / myClaims.length) * 100;
              return (
                <div key={status}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-textPrimary">{status}</span>
                    <span className="text-textSecondary">{count} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="h-1.5 bg-border/30 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: statusColors[status] }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border"><span className="text-xs text-textSecondary">Model Metrics</span></div>
          <table className="w-full text-sm">
            <tbody>
              {[
                ['Accuracy', `${(metrics.model_accuracy * 100).toFixed(1)}%`],
                ['Precision', `${(metrics.model_precision * 100).toFixed(1)}%`],
                ['Recall', `${(metrics.model_recall * 100).toFixed(1)}%`],
                ['F1 Score', `${(metrics.model_f1 * 100).toFixed(1)}%`],
                ['Avg Processing', `${metrics.avg_processing_time}s`],
                ['Last Retrain', new Date(metrics.last_retrain).toLocaleDateString()],
              ].map(([metric, value]) => (
                <tr key={metric} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 text-textSecondary text-xs">{metric}</td>
                  <td className="px-4 py-2.5 text-textPrimary font-mono text-xs text-right">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
