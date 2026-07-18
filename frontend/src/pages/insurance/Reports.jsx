import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, FileText, RefreshCcw, Search, ShieldAlert } from 'lucide-react';
import api from '../../api';
import BulkActions from '../../components/BulkActions';
import Skeleton from '../../components/Skeleton';
import StatusBadge from '../../components/StatusBadge';
import { toNumber as n, formatCurrency } from '../../utils/format';

function risk(score) {
  const value = n(score);
  const normalized = value > 1 ? value / 100 : value;
  if (normalized >= 0.7) return 'High';
  if (normalized >= 0.4) return 'Medium';
  return 'Low';
}

const columns = [
  { key: 'claim_id', label: 'Claim ID' },
  { key: 'patient_name', label: 'Patient' },
  { key: 'provider_name', label: 'Provider' },
  { key: 'service_name', label: 'Service' },
  { key: 'amount', label: 'Amount' },
  { key: 'fraud_score', label: 'Risk Score' },
  { key: 'status', label: 'Status' },
  { key: 'claim_date', label: 'Claim Date' },
];

export default function Reports() {
  const [claims, setClaims] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('All');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [claimRows, metricRows] = await Promise.all([api.getClaims(), api.getMetrics()]);
      setClaims(Array.isArray(claimRows) ? claimRows : []);
      setMetrics(metricRows || {});
    } catch (err) {
      setError(err.message || 'Unable to load reports.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return claims
      .map((claim) => ({ ...claim, risk_level: risk(claim.fraud_score), amount_value: n(claim.amount) }))
      .filter((claim) => riskFilter === 'All' || claim.risk_level === riskFilter)
      .filter((claim) => !q || JSON.stringify(claim).toLowerCase().includes(q));
  }, [claims, search, riskFilter]);

  const summary = useMemo(() => ({
    value: rows.reduce((sum, claim) => sum + claim.amount_value, 0),
    high: rows.filter((claim) => claim.risk_level === 'High').length,
    pending: rows.filter((claim) => String(claim.status || '').toLowerCase().includes('review') || String(claim.status || '').toLowerCase().includes('flagged')).length,
  }), [rows]);

  if (loading) return <Skeleton rows={8} />;

  return (
    <div className="space-y-6">
      <header className="rounded-xl border border-border bg-surface p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-primary">Reports</p>
            <h1 className="mt-2 flex items-center gap-2 text-2xl font-black text-textPrimary"><FileText className="text-primary" />Executive Claims Reports</h1>
            <p className="mt-1 text-sm text-textSecondary">Exportable operational reports sourced from backend claims and metrics.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search report rows" className="w-full rounded-lg border border-border py-2.5 pl-9 pr-3 text-sm sm:w-72" />
            </div>
            <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)} className="rounded-lg border border-border px-3 py-2.5 text-sm font-bold">
              {['All', 'High', 'Medium', 'Low'].map((x) => <option key={x}>{x}</option>)}
            </select>
            <button onClick={load} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-black text-white"><RefreshCcw size={16} />Refresh</button>
          </div>
        </div>
      </header>

      {error && <div className="rounded-xl border border-danger/20 bg-danger/10 p-4 text-sm font-bold text-danger">{error}</div>}

      <section className="grid gap-4 md:grid-cols-4">
        <div className="enterprise-card p-4"><p className="text-[10px] font-black uppercase text-textSecondary">Report Rows</p><p className="mt-2 text-2xl font-black">{rows.length}</p></div>
        <div className="enterprise-card p-4"><p className="text-[10px] font-black uppercase text-textSecondary">Claim Value</p><p className="mt-2 text-2xl font-black">{formatCurrency(summary.value)}</p></div>
        <div className="enterprise-card p-4"><p className="text-[10px] font-black uppercase text-textSecondary">High Risk</p><p className="mt-2 text-2xl font-black text-danger">{summary.high}</p></div>
        <div className="enterprise-card p-4"><p className="text-[10px] font-black uppercase text-textSecondary">Backend Total</p><p className="mt-2 text-2xl font-black">{metrics?.total_claims ?? claims.length}</p></div>
      </section>

      <section className="enterprise-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-black text-textPrimary"><ShieldAlert size={16} className="text-warning" />Claims Audit Export</h2>
            <p className="mt-1 text-xs text-textSecondary">Filtered report rows are exportable as CSV.</p>
          </div>
          <div className="flex items-center gap-2">
            <Download size={16} className="text-textSecondary" />
            <BulkActions data={rows} columns={columns} filename="healthcare_claims_report" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="enterprise-table">
            <thead>
              <tr>{columns.map((c) => <th key={c.key}>{c.label}</th>)}<th>Risk</th></tr>
            </thead>
            <tbody>
              {rows.map((claim) => (
                <tr key={claim.id || claim.claim_id}>
                  <td className="font-mono text-xs font-bold">{claim.claim_id || claim.id}</td>
                  <td>{claim.patient_name || claim.patient_id}</td>
                  <td>{claim.provider_name || claim.provider_id}</td>
                  <td>{claim.service_name || 'Unspecified'}</td>
                  <td className="font-mono font-bold">{formatCurrency(claim.amount_value)}</td>
                  <td className="font-mono">{((n(claim.fraud_score) > 1 ? n(claim.fraud_score) / 100 : n(claim.fraud_score)) * 100).toFixed(1)}%</td>
                  <td><StatusBadge status={claim.status || 'Pending'} /></td>
                  <td>{claim.claim_date ? new Date(claim.claim_date).toLocaleDateString() : 'N/A'}</td>
                  <td className="text-xs font-black">{claim.risk_level}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <div className="p-10 text-center text-sm font-bold text-textSecondary">No report rows matched the current filters.</div>}
        </div>
      </section>
    </div>
  );
}
