import { useState, useEffect } from 'react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Tooltip, Filler,
} from 'chart.js';
import { generateMockMetrics, generateMockClaims, MOCK_PROVIDERS } from '../../mockData';
import Skeleton from '../../components/Skeleton';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Tooltip, Filler);

const chartOpts = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1c2128', borderColor: '#383e47', borderWidth: 1, titleColor: '#c9d1d9', bodyColor: '#8b949e', padding: 8, cornerRadius: 4 } },
  scales: { x: { grid: { color: '#21262d' }, ticks: { color: '#8b949e', font: { size: 11 } } }, y: { grid: { color: '#21262d' }, ticks: { color: '#8b949e', font: { size: 11 } } } },
};
const doughnutOpts = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1c2128', borderColor: '#383e47', borderWidth: 1, titleColor: '#c9d1d9', bodyColor: '#8b949e', padding: 8, cornerRadius: 4 } },
  cutout: '65%',
};

const TABS = ['Overview', 'Claims Analysis', 'Fraud Analysis', 'Provider Analysis', 'Model Performance'];

export default function InsuranceDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('Overview');

  useEffect(() => {
    const timer = setTimeout(() => {
      setMetrics(generateMockMetrics());
      setClaims(generateMockClaims(200));
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  if (loading) return <div className="space-y-6"><div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({ length: 8 }, (_, i) => <div key={i} className="bg-surface border border-border rounded-lg p-4"><Skeleton rows={2} /></div>)}</div></div>;

  const totalAmount = claims.reduce((s, c) => s + c.amount, 0);
  const statusCounts = {};
  claims.forEach((c) => { statusCounts[c.status] = (statusCounts[c.status] || 0) + 1; });
  const statusColors = { Pending: '#d29922', Processing: '#58a6ff', Flagged: '#f78166', Cleared: '#3fb950', 'Fraud Confirmed': '#f85149' };

  const byDate = {};
  claims.forEach((c) => { byDate[c.claim_date] = (byDate[c.claim_date] || 0) + 1; });
  const sortedDates = Object.keys(byDate).sort();
  const last30 = sortedDates.slice(-30);

  const byService = {};
  claims.forEach((c) => { byService[c.service_label] = (byService[c.service_label] || 0) + 1; });

  const byProvider = {};
  claims.forEach((c) => { byProvider[c.provider_name] = (byProvider[c.provider_name] || 0) + 1; });

  const fraudByProv = {};
  claims.filter((c) => c.status === 'Fraud Confirmed' || c.fraud_score > 0.7).forEach((c) => {
    fraudByProv[c.provider_name] = (fraudByProv[c.provider_name] || 0) + 1;
  });

  return (
    <div className="space-y-6">
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-xs whitespace-nowrap border-b-2 transition-colors duration-150 ${t === tab ? 'border-primary text-primary' : 'border-transparent text-textSecondary hover:text-textPrimary'}`}
          >{t}</button>
        ))}
      </div>

      {tab === 'Overview' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Claims', value: metrics.total_claims.toLocaleString() },
              { label: 'Flagged', value: metrics.flagged_claims.toLocaleString() },
              { label: 'Confirmed Fraud', value: metrics.confirmed_fraud.toLocaleString() },
              { label: 'Cleared', value: metrics.cleared_claims.toLocaleString() },
              { label: 'Total Patients', value: metrics.total_patients },
              { label: 'Total Providers', value: metrics.total_providers },
              { label: 'Total Payout', value: `$${(metrics.total_payout / 1000000).toFixed(2)}M` },
              { label: 'Model Accuracy', value: `${(metrics.model_accuracy * 100).toFixed(1)}%` },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-surface border border-border rounded-lg px-4 py-3">
                <div className="text-xs text-textSecondary">{kpi.label}</div>
                <div className="text-lg text-textPrimary font-medium mt-1">{kpi.value}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-surface border border-border rounded-lg p-4">
              <div className="text-xs text-textSecondary mb-3">Claims by Date (recent)</div>
              <div className="h-56"><Line data={{ labels: last30.map((d) => d.slice(5)), datasets: [{ data: last30.map((d) => byDate[d]), backgroundColor: '#58a6ff15', borderColor: '#58a6ff', borderWidth: 1.5, fill: true, tension: 0.3, pointRadius: 2, pointBackgroundColor: '#58a6ff' }] }} options={chartOpts} /></div>
            </div>
            <div className="bg-surface border border-border rounded-lg p-4">
              <div className="text-xs text-textSecondary mb-3">Claim Status Distribution</div>
              <div className="h-44 flex items-center justify-center"><div className="w-40 h-40"><Doughnut data={{ labels: Object.keys(statusCounts), datasets: [{ data: Object.values(statusCounts), backgroundColor: Object.keys(statusCounts).map((s) => statusColors[s] || '#8b949e'), borderWidth: 0 }] }} options={doughnutOpts} /></div></div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 justify-center">
                {Object.entries(statusCounts).map(([s, c]) => (
                  <div key={s} className="flex items-center gap-1.5 text-xs text-textSecondary"><span className="w-2 h-2 rounded-sm" style={{ backgroundColor: statusColors[s] }} />{s} ({c})</div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-border"><span className="text-xs text-textSecondary">Pipeline Status</span></div>
            <div className="p-4 space-y-3">
              {Object.entries(statusCounts).map(([status, count]) => {
                const pct = (count / claims.length) * 100;
                return (
                  <div key={status}>
                    <div className="flex justify-between text-xs mb-1"><span className="text-textPrimary">{status}</span><span className="text-textSecondary">{count} ({pct.toFixed(0)}%)</span></div>
                    <div className="h-1.5 bg-border/30 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: statusColors[status] }} /></div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {tab === 'Claims Analysis' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Amount', value: `$${totalAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
              { label: 'Avg Claim', value: `$${(totalAmount / claims.length).toFixed(2)}` },
              { label: 'This Month', value: metrics.monthly_claims[metrics.monthly_claims.length - 1].count },
              { label: 'Avg Processing', value: `${metrics.avg_processing_time}s` },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-surface border border-border rounded-lg px-4 py-3">
                <div className="text-xs text-textSecondary">{kpi.label}</div>
                <div className="text-lg text-textPrimary font-medium mt-1">{kpi.value}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-surface border border-border rounded-lg p-4">
              <div className="text-xs text-textSecondary mb-3">Monthly Claim Volume</div>
              <div className="h-56"><Bar data={{
                labels: metrics.monthly_claims.map((m) => m.month),
                datasets: [
                  { label: 'Total', data: metrics.monthly_claims.map((m) => m.count), backgroundColor: '#58a6ff40', borderColor: '#58a6ff', borderWidth: 1, borderRadius: 4 },
                  { label: 'Fraud', data: metrics.monthly_claims.map((m) => m.fraud), backgroundColor: '#f8514940', borderColor: '#f85149', borderWidth: 1, borderRadius: 4 },
                ],
              }} options={chartOpts} /></div>
            </div>
            <div className="bg-surface border border-border rounded-lg p-4">
              <div className="text-xs text-textSecondary mb-3">Claims by Service Category</div>
              <div className="h-56"><Bar data={{ labels: Object.keys(byService), datasets: [{ data: Object.values(byService), backgroundColor: '#79c0ff30', borderColor: '#79c0ff', borderWidth: 1, borderRadius: 4 }] }} options={chartOpts} /></div>
            </div>
            <div className="bg-surface border border-border rounded-lg p-4 lg:col-span-2">
              <div className="text-xs text-textSecondary mb-3">Claims by Date (full range)</div>
              <div className="h-56"><Line data={{ labels: sortedDates.map((d) => d.slice(5)), datasets: [{ data: sortedDates.map((d) => byDate[d]), backgroundColor: '#3fb95015', borderColor: '#3fb950', borderWidth: 1.5, fill: true, tension: 0.3, pointRadius: 1 }] }} options={chartOpts} /></div>
            </div>
          </div>
          <div className="bg-surface border border-border rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-border"><span className="text-xs text-textSecondary">Claims by Service (table)</span></div>
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border"><th className="text-left px-4 py-2.5 text-xs text-textSecondary font-medium">Service</th><th className="text-right px-4 py-2.5 text-xs text-textSecondary font-medium">Count</th><th className="text-right px-4 py-2.5 text-xs text-textSecondary font-medium">%</th></tr></thead>
              <tbody>
                {metrics.claims_by_service.map((s) => (
                  <tr key={s.service} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 text-textPrimary">{s.service}</td>
                    <td className="px-4 py-2.5 text-textPrimary text-right font-mono text-xs">{s.count.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-textSecondary text-right text-xs">{((s.count / metrics.total_claims) * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'Fraud Analysis' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Fraud', value: metrics.confirmed_fraud },
              { label: 'Fraud Rate', value: `${((metrics.confirmed_fraud / metrics.total_claims) * 100).toFixed(1)}%` },
              { label: 'Model F1', value: metrics.model_f1.toFixed(3) },
              { label: 'Model Recall', value: `${(metrics.model_recall * 100).toFixed(1)}%` },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-surface border border-border rounded-lg px-4 py-3">
                <div className="text-xs text-textSecondary">{kpi.label}</div>
                <div className="text-lg text-textPrimary font-medium mt-1">{kpi.value}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-surface border border-border rounded-lg p-4">
              <div className="text-xs text-textSecondary mb-3">Fraud by Category</div>
              <div className="h-56"><Bar data={{ labels: metrics.fraud_by_category.map((c) => c.category), datasets: [{ data: metrics.fraud_by_category.map((c) => c.count), backgroundColor: '#f7816640', borderColor: '#f78166', borderWidth: 1, borderRadius: 4 }] }} options={chartOpts} /></div>
            </div>
            <div className="bg-surface border border-border rounded-lg p-4">
              <div className="text-xs text-textSecondary mb-3">Fraud Distribution</div>
              <div className="h-44 flex items-center justify-center"><div className="w-40 h-40"><Doughnut data={{ labels: metrics.fraud_by_category.map((c) => c.category), datasets: [{ data: metrics.fraud_by_category.map((c) => c.count), backgroundColor: ['#58a6ff', '#f78166', '#3fb950', '#d29922', '#79c0ff'], borderWidth: 0 }] }} options={doughnutOpts} /></div></div>
            </div>
            <div className="bg-surface border border-border rounded-lg p-4">
              <div className="text-xs text-textSecondary mb-3">Fraud by Admission Type</div>
              <div className="h-56"><Bar data={{ labels: metrics.fraud_by_admission.map((a) => a.type), datasets: [{ data: metrics.fraud_by_admission.map((a) => a.count), backgroundColor: '#f8514940', borderColor: '#f85149', borderWidth: 1, borderRadius: 4 }] }} options={chartOpts} /></div>
            </div>
            <div className="bg-surface border border-border rounded-lg p-4">
              <div className="text-xs text-textSecondary mb-3">Fraud by Provider (top)</div>
              <div className="h-56"><Bar data={{ labels: metrics.fraud_by_provider.map((p) => p.provider), datasets: [{ data: metrics.fraud_by_provider.map((p) => p.count), backgroundColor: '#d2992240', borderColor: '#d29922', borderWidth: 1, borderRadius: 4 }] }} options={{ ...chartOpts, indexAxis: 'y' }} /></div>
            </div>
          </div>
        </>
      )}

      {tab === 'Provider Analysis' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: 'Total Providers', value: MOCK_PROVIDERS.length },
              { label: 'Claims Filed', value: claims.length },
              { label: 'Avg Claims/Provider', value: Math.round(claims.length / MOCK_PROVIDERS.length) },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-surface border border-border rounded-lg px-4 py-3">
                <div className="text-xs text-textSecondary">{kpi.label}</div>
                <div className="text-lg text-textPrimary font-medium mt-1">{kpi.value}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-surface border border-border rounded-lg p-4">
              <div className="text-xs text-textSecondary mb-3">Claims by Provider</div>
              <div className="h-56"><Bar data={{ labels: Object.keys(byProvider), datasets: [{ data: Object.values(byProvider), backgroundColor: '#58a6ff40', borderColor: '#58a6ff', borderWidth: 1, borderRadius: 4 }] }} options={{ ...chartOpts, indexAxis: 'y' }} /></div>
            </div>
            <div className="bg-surface border border-border rounded-lg p-4">
              <div className="text-xs text-textSecondary mb-3">Fraud Flags by Provider</div>
              <div className="h-56"><Bar data={{ labels: Object.keys(fraudByProv), datasets: [{ data: Object.values(fraudByProv), backgroundColor: '#f8514940', borderColor: '#f85149', borderWidth: 1, borderRadius: 4 }] }} options={{ ...chartOpts, indexAxis: 'y' }} /></div>
            </div>
          </div>
          <div className="bg-surface border border-border rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-border"><span className="text-xs text-textSecondary">Provider Summary</span></div>
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border">
                <th className="text-left px-4 py-2.5 text-xs text-textSecondary font-medium">Provider</th>
                <th className="text-left px-4 py-2.5 text-xs text-textSecondary font-medium">Type</th>
                <th className="text-left px-4 py-2.5 text-xs text-textSecondary font-medium">Specialty</th>
                <th className="text-right px-4 py-2.5 text-xs text-textSecondary font-medium">Claims</th>
                <th className="text-right px-4 py-2.5 text-xs text-textSecondary font-medium">Flags</th>
              </tr></thead>
              <tbody>
                {MOCK_PROVIDERS.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 text-textPrimary">{p.name}</td>
                    <td className="px-4 py-2.5 text-textSecondary text-xs">{p.type}</td>
                    <td className="px-4 py-2.5 text-textSecondary text-xs">{p.specialty}</td>
                    <td className="px-4 py-2.5 text-textPrimary font-mono text-xs text-right">{byProvider[p.name] || 0}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-right"><span className={(fraudByProv[p.name] || 0) > 5 ? 'text-danger' : 'text-textSecondary'}>{fraudByProv[p.name] || 0}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'Model Performance' && (
        <>
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
            <div className="bg-surface border border-border rounded-lg p-4">
              <div className="text-xs text-textSecondary mb-3">Model Performance Over Versions</div>
              <div className="h-56"><Line data={{
                labels: metrics.model_history.map((m) => m.version),
                datasets: [
                  { label: 'Accuracy', data: metrics.model_history.map((m) => m.accuracy), borderColor: '#58a6ff', backgroundColor: '#58a6ff', borderWidth: 1.5, pointRadius: 3, tension: 0.2 },
                  { label: 'F1', data: metrics.model_history.map((m) => m.f1), borderColor: '#3fb950', backgroundColor: '#3fb950', borderWidth: 1.5, pointRadius: 3, tension: 0.2 },
                ],
              }} options={{ ...chartOpts, scales: { ...chartOpts.scales, y: { ...chartOpts.scales.y, min: 0.8, max: 1.0, ticks: { ...chartOpts.scales.y.ticks, callback: (v) => `${(v * 100).toFixed(0)}%` } } } }} /></div>
              <div className="flex gap-4 mt-3 justify-center">
                <div className="flex items-center gap-1.5 text-xs text-textSecondary"><span className="w-2 h-2 rounded-sm bg-primary" />Accuracy</div>
                <div className="flex items-center gap-1.5 text-xs text-textSecondary"><span className="w-2 h-2 rounded-sm bg-success" />F1</div>
              </div>
            </div>
            <div className="bg-surface border border-border rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-border"><span className="text-xs text-textSecondary">Version History</span></div>
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border">
                  <th className="text-left px-4 py-2.5 text-xs text-textSecondary font-medium">Version</th>
                  <th className="text-left px-4 py-2.5 text-xs text-textSecondary font-medium">Date</th>
                  <th className="text-right px-4 py-2.5 text-xs text-textSecondary font-medium">Accuracy</th>
                  <th className="text-right px-4 py-2.5 text-xs text-textSecondary font-medium">F1</th>
                </tr></thead>
                <tbody>
                  {metrics.model_history.map((m) => (
                    <tr key={m.version} className="border-b border-border last:border-0">
                      <td className="px-4 py-2.5 text-primary font-mono text-xs">{m.version}</td>
                      <td className="px-4 py-2.5 text-textSecondary text-xs">{m.date}</td>
                      <td className="px-4 py-2.5 text-textPrimary font-mono text-xs text-right">{(m.accuracy * 100).toFixed(1)}%</td>
                      <td className="px-4 py-2.5 text-textPrimary font-mono text-xs text-right">{(m.f1 * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
