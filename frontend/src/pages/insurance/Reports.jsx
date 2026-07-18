import { useState, useEffect, useMemo, useCallback } from 'react';
import { FileText, Download, Filter, Search, Calendar, BarChart3, PieChart, TrendingUp, Loader, CheckCircle, AlertCircle, Building2, Activity, DollarSign } from 'lucide-react';
import api from '../../api';
import Skeleton from '../../components/Skeleton';
import PlotlyChart from '../../components/PlotlyChart';

const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val || 0);

export default function Reports() {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [filters, setFilters] = useState({ dateRange: 'all', status: 'All', providerFilter: '', patientFilter: '' });
  const [providers, setProviders] = useState([]);
  const [message, setMessage] = useState(null);

  const flash = useCallback((type, text) => { setMessage({ type, text }); setTimeout(() => setMessage(null), 4000); }, []);

  const fetchReportData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { date_range: filters.dateRange };
      if (filters.status !== 'All') params.status = filters.status;
      const [data, provRes] = await Promise.allSettled([
        api.getReportData(params),
        api.getProviders(),
      ]);
      if (data.status === 'fulfilled') setReportData(data.value);
      if (provRes.status === 'fulfilled') setProviders(Array.isArray(provRes.value) ? provRes.value : []);
    } catch (err) {
      console.error('Failed to load report data', err);
      flash('error', 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  }, [filters, flash]);

  useEffect(() => { fetchReportData(); }, [fetchReportData]);

  const handleExport = useCallback(async (format) => {
    setExporting(true);
    try {
      const params = { format, date_range: filters.dateRange };
      if (filters.status !== 'All') params.status = filters.status;
      const res = await api.exportReports(params);
      const data = res?.data || [];
      if (data.length === 0) { flash('error', 'No data to export'); setExporting(false); return; }

      if (format === 'csv') {
        const headers = ['Claim_ID,Patient,Provider,Diagnosis,Amount,Fraud_Score,Status,Date'];
        const rows = data.map(r => `${r.claim_id},"${r.pn || r.patient_name || ''}","${r.prn || r.provider_name || ''}","${r.diagnosis_code || ''}",${r.claim_amount || r.amount || 0},${r.fraud_score || r.score || 0},"${r.status}","${r.claim_date || r.date}"`);
        const blob = new Blob([[...headers, ...rows].join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `fraud_report_${new Date().toISOString().split('T')[0]}.csv`; a.click();
        flash('success', `Exported ${data.length} records as CSV`);
      } else if (format === 'json') {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `fraud_report_${new Date().toISOString().split('T')[0]}.json`; a.click();
        flash('success', `Exported ${data.length} records as JSON`);
      }
    } catch (err) {
      flash('error', 'Export failed');
    } finally {
      setExporting(false);
    }
  }, [filters, flash]);

  const counts = reportData?.counts;
  const fraudByProvider = reportData?.fraud_by_provider || [];
  const fraudByDiagnosis = reportData?.fraud_by_diagnosis || [];
  const fraudByMonth = reportData?.fraud_by_month || [];
  const claimDistribution = reportData?.claim_distribution || [];
  const claimsList = reportData?.claims || [];

  const providerChart = useMemo(() => fraudByProvider.length > 0 ? [{
    x: fraudByProvider.map(p => p.name?.length > 18 ? p.name.slice(0, 16) + '...' : p.name),
    y: fraudByProvider.map(p => p.fraud_count),
    type: 'bar', name: 'Fraud Claims',
    marker: { color: '#ef4444', line: { color: '#ef4444', width: 1 } },
    text: fraudByProvider.map(p => p.fraud_count.toString()),
    textposition: 'outside',
    hovertemplate: '%{x}: %{y} fraud claims<extra></extra>',
  }] : [], []);

  const diagnosisChart = useMemo(() => fraudByDiagnosis.length > 0 ? [{
    labels: fraudByDiagnosis.map(d => d.code),
    values: fraudByDiagnosis.map(d => d.fraud_count),
    type: 'pie', hole: 0.5,
    marker: { colors: ['#6366f1', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899', '#14b8a6', '#84cc16'] },
    textinfo: 'label+percent', textposition: 'outside',
    hovertemplate: '%{label}: %{value} fraud claims<extra></extra>',
  }] : [], []);

  const monthChart = useMemo(() => fraudByMonth.length > 0 ? [
    {
      x: fraudByMonth.map(m => m.month),
      y: fraudByMonth.map(m => m.total),
      type: 'scatter', mode: 'lines+markers',
      name: 'Total Claims',
      line: { color: '#6366f1', width: 2.5, shape: 'spline' },
      marker: { size: 6, color: '#6366f1' },
      hovertemplate: '%{x}: %{y} claims<extra></extra>',
    },
    {
      x: fraudByMonth.map(m => m.month),
      y: fraudByMonth.map(m => m.fraud),
      type: 'scatter', mode: 'lines+markers',
      name: 'Fraud Claims',
      line: { color: '#ef4444', width: 2.5, shape: 'spline' },
      marker: { size: 6, color: '#ef4444' },
      hovertemplate: '%{x}: %{y} fraud<extra></extra>',
    },
  ] : [], []);

  const distChart = useMemo(() => claimDistribution.length > 0 ? [{
    x: claimDistribution.map(d => d.range_name),
    y: claimDistribution.map(d => d.count),
    type: 'bar', name: 'Claims',
    marker: { color: '#6366f1', line: { color: '#4f46e5', width: 1 } },
    text: claimDistribution.map(d => d.count.toString()),
    textposition: 'outside',
    hovertemplate: '%{x}: %{y} claims<extra></extra>',
  }, {
    x: claimDistribution.map(d => d.range_name),
    y: claimDistribution.map(d => d.fraud_count),
    type: 'bar', name: 'Fraud',
    marker: { color: '#ef4444', line: { color: '#dc2626', width: 1 } },
    hovertemplate: '%{x}: %{y} fraud<extra></extra>',
  }] : [], []);

  if (loading) return <div className="p-6"><Skeleton rows={12} /></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {message && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${
          message.type === 'success' ? 'bg-success/10 border-success/20 text-success' :
          message.type === 'info' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500' :
          'bg-danger/10 border-danger/20 text-danger'
        }`}>
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-textPrimary">Reports & Analytics</h1>
          <p className="mt-1 text-sm text-textSecondary">Filter, analyze, and export fraud data with charts and detailed tables</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => handleExport('csv')} disabled={exporting}
            className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-bold text-textPrimary hover:bg-bg transition-all disabled:opacity-50">
            {exporting ? <Loader size={14} className="animate-spin" /> : <Download size={14} />}
            CSV
          </button>
          <button onClick={() => handleExport('json')} disabled={exporting}
            className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-bold text-textPrimary hover:bg-bg transition-all disabled:opacity-50">
            {exporting ? <Loader size={14} className="animate-spin" /> : <FileText size={14} />}
            JSON
          </button>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-2xl p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-textSecondary" />
            <select value={filters.dateRange} onChange={e => setFilters(f => ({ ...f, dateRange: e.target.value }))}
              className="bg-bg border border-border rounded-lg px-3 py-1.5 text-xs font-bold text-textPrimary outline-none">
              <option value="all">All Time</option>
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-textSecondary" />
            <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
              className="bg-bg border border-border rounded-lg px-3 py-1.5 text-xs font-bold text-textPrimary outline-none">
              <option value="All">All Status</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Fraud Confirmed">Fraud Confirmed</option>
              <option value="Submitted">Submitted</option>
            </select>
          </div>
          <span className="text-[10px] text-textSecondary font-mono">{claimsList.length} claims loaded</span>
        </div>
      </div>

      {counts && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-surface border border-border rounded-xl p-4">
            <p className="text-[9px] font-black uppercase tracking-widest text-textSecondary">Total Claims</p>
            <p className="text-xl font-black text-textPrimary font-mono mt-1">{(counts.total_claims || 0).toLocaleString()}</p>
          </div>
          <div className="bg-surface border border-border rounded-xl p-4">
            <p className="text-[9px] font-black uppercase tracking-widest text-textSecondary">Fraud Cases</p>
            <p className="text-xl font-black text-danger font-mono mt-1">{(counts.total_fraud || 0).toLocaleString()}</p>
          </div>
          <div className="bg-surface border border-border rounded-xl p-4">
            <p className="text-[9px] font-black uppercase tracking-widest text-textSecondary">Total Amount</p>
            <p className="text-xl font-black text-textPrimary font-mono mt-1">{formatCurrency(counts.total_amount || 0)}</p>
          </div>
          <div className="bg-surface border border-border rounded-xl p-4">
            <p className="text-[9px] font-black uppercase tracking-widest text-textSecondary">Avg Amount</p>
            <p className="text-xl font-black text-textPrimary font-mono mt-1">{formatCurrency(counts.avg_amount || 0)}</p>
          </div>
          <div className="bg-surface border border-border rounded-xl p-4">
            <p className="text-[9px] font-black uppercase tracking-widest text-textSecondary">Avg Fraud Score</p>
            <p className="text-xl font-black text-warning font-mono mt-1">{((counts.avg_fraud_score || 0) * 100).toFixed(1)}%</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {providerChart.length > 0 && (
          <div className="bg-surface border border-border rounded-2xl p-5">
            <h3 className="text-sm font-bold text-textPrimary mb-3 flex items-center gap-2"><Building2 size={16} className="text-primary" />Fraud by Provider</h3>
            <div className="h-72"><PlotlyChart data={providerChart} layout={{ margin: { t: 10, r: 10, l: 80, b: 80 }, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', xaxis: { automargin: true }, yaxis: { gridcolor: 'rgba(148,163,184,0.15)' } }} /></div>
          </div>
        )}
        {diagnosisChart.length > 0 && (
          <div className="bg-surface border border-border rounded-2xl p-5">
            <h3 className="text-sm font-bold text-textPrimary mb-3 flex items-center gap-2"><PieChart size={16} className="text-primary" />Fraud by Diagnosis</h3>
            <div className="h-72"><PlotlyChart data={diagnosisChart} layout={{ margin: { t: 10, r: 10, l: 10, b: 10 }, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', showlegend: false }} /></div>
          </div>
        )}
        {monthChart.length > 0 && (
          <div className="bg-surface border border-border rounded-2xl p-5">
            <h3 className="text-sm font-bold text-textPrimary mb-3 flex items-center gap-2"><TrendingUp size={16} className="text-primary" />Fraud by Month</h3>
            <div className="h-72"><PlotlyChart data={monthChart} layout={{ margin: { t: 10, r: 10, l: 40, b: 40 }, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', xaxis: { gridcolor: 'rgba(148,163,184,0.15)' }, yaxis: { gridcolor: 'rgba(148,163,184,0.15)' }, legend: { orientation: 'h', y: -0.2 } }} /></div>
          </div>
        )}
        {distChart.length > 0 && (
          <div className="bg-surface border border-border rounded-2xl p-5">
            <h3 className="text-sm font-bold text-textPrimary mb-3 flex items-center gap-2"><BarChart3 size={16} className="text-primary" />Claim Amount Distribution</h3>
            <div className="h-72"><PlotlyChart data={distChart} layout={{ margin: { t: 10, r: 10, l: 40, b: 60 }, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', xaxis: { automargin: true }, yaxis: { gridcolor: 'rgba(148,163,184,0.15)' }, barmode: 'group' }} /></div>
          </div>
        )}
      </div>

      {claimsList.length > 0 && (
        <div className="bg-surface border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-sm font-bold text-textPrimary">Claims Data ({claimsList.length} records)</h3>
          </div>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="enterprise-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Patient</th>
                  <th>Provider</th>
                  <th>Diagnosis</th>
                  <th>Amount</th>
                  <th>Fraud Score</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {claimsList.slice(0, 100).map((c, i) => (
                  <tr key={c.id || i} className="hover:bg-bg/30 transition-colors">
                    <td className="font-mono text-xs font-bold text-textSecondary">#{c.id}</td>
                    <td className="text-sm text-textPrimary">{c.patient_name || c.pn}</td>
                    <td className="text-sm text-textSecondary">{c.provider_name || c.prn}</td>
                    <td className="text-xs font-mono text-textSecondary">{c.diagnosis || c.diagnosis_code}</td>
                    <td className="font-mono font-bold text-textPrimary">{formatCurrency(c.amount || c.claim_amount)}</td>
                    <td className="font-mono font-bold">
                      <span className={`${(c.score || c.fraud_score || 0) >= 0.7 ? 'text-danger' : (c.score || c.fraud_score || 0) >= 0.4 ? 'text-warning' : 'text-success'}`}>
                        {((c.score || c.fraud_score || 0) * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-bg/50">{c.is_fraud ? 'Fraud' : c.status}</span></td>
                    <td className="text-xs text-textSecondary font-mono">{c.date || c.claim_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
