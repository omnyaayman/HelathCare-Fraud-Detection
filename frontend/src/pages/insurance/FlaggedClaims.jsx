import { useState, useEffect, useMemo } from 'react';
import { generateMockClaims } from '../../mockData';
import StatusBadge from '../../components/StatusBadge';
import Skeleton from '../../components/Skeleton';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import BulkActions from '../../components/BulkActions';

const CLAIM_COLUMNS = [
  { key: 'id', label: 'Claim ID' },
  { key: 'patient_name', label: 'Patient' },
  { key: 'patient_id', label: 'Patient ID' },
  { key: 'provider_name', label: 'Provider' },
  { key: 'service_date', label: 'Service Date' },
  { key: 'admission_label', label: 'Admission' },
  { key: 'diagnosis_label', label: 'Diagnosis' },
  { key: 'procedure_label', label: 'Procedure' },
  { key: 'service_label', label: 'Service' },
  { key: 'amount', label: 'Amount' },
  { key: 'fraud_score', label: 'Fraud Score' },
  { key: 'status', label: 'Status' },
  { key: 'claim_date', label: 'Claim Date' },
];

const PAGE_SIZE = 10;

export default function FlaggedClaims() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [providerFilter, setProviderFilter] = useState('All');
  const [scoreFilter, setScoreFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    const timer = setTimeout(() => {
      const all = generateMockClaims(80);
      setClaims(all.filter((c) => c.fraud_score > 0.6).sort((a, b) => b.fraud_score - a.fraud_score));
      setLoading(false);
    }, 700);
    return () => clearTimeout(timer);
  }, []);

  const providers = useMemo(() => ['All', ...new Set(claims.map((c) => c.provider_name))], [claims]);
  const statuses = useMemo(() => ['All', ...new Set(claims.map((c) => c.status))], [claims]);

  const filtered = claims
    .filter((c) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!c.id.toLowerCase().includes(q) && !c.patient_name.toLowerCase().includes(q) && !c.provider_name.toLowerCase().includes(q)) return false;
      }
      if (providerFilter !== 'All' && c.provider_name !== providerFilter) return false;
      if (statusFilter !== 'All' && c.status !== statusFilter) return false;
      if (scoreFilter === '90+' && c.fraud_score < 0.9) return false;
      if (scoreFilter === '80-90' && (c.fraud_score < 0.8 || c.fraud_score >= 0.9)) return false;
      if (scoreFilter === '70-80' && (c.fraud_score < 0.7 || c.fraud_score >= 0.8)) return false;
      if (scoreFilter === '60-70' && (c.fraud_score < 0.6 || c.fraud_score >= 0.7)) return false;
      return true;
    });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const resetPage = () => setPage(1);

  const handleLabel = (claimId, label) => {
    setClaims((prev) =>
      prev.map((c) =>
        c.id === claimId
          ? { ...c, label, status: label === 'Fraud' ? 'Fraud Confirmed' : 'Cleared' }
          : c
      )
    );
    setSelected(null);
  };

  // Aggregation stats
  const aggByProvider = useMemo(() => {
    const map = {};
    claims.forEach((c) => {
      if (!map[c.provider_name]) map[c.provider_name] = { count: 0, totalAmount: 0, avgScore: 0 };
      map[c.provider_name].count++;
      map[c.provider_name].totalAmount += c.amount;
      map[c.provider_name].avgScore += c.fraud_score;
    });
    Object.keys(map).forEach((k) => { map[k].avgScore = map[k].avgScore / map[k].count; });
    return Object.entries(map).sort((a, b) => b[1].count - a[1].count).slice(0, 5);
  }, [claims]);

  return (
    <div>
      <p className="text-xs text-textSecondary mb-4">
        Claims with fraud score above 60% — {filtered.length} of {claims.length} results
      </p>

      {/* Aggregation cards */}
      {!loading && aggByProvider.length > 0 && (
        <div className="mb-5">
          <div className="text-xs text-textSecondary mb-2">Top providers by flagged claims</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {aggByProvider.map(([provider, data]) => (
              <button
                key={provider}
                onClick={() => { setProviderFilter(providerFilter === provider ? 'All' : provider); resetPage(); }}
                className={`text-left p-3 border rounded-lg transition-colors duration-150 ${
                  providerFilter === provider
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-surface hover:border-textSecondary'
                }`}
              >
                <div className="text-xs text-textPrimary truncate mb-1">{provider}</div>
                <div className="text-lg text-textPrimary font-mono">{data.count}</div>
                <div className="text-xs text-textSecondary">
                  Avg score: <span className="text-warning">{(data.avgScore * 100).toFixed(0)}%</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mb-4">
        <BulkActions data={filtered} columns={CLAIM_COLUMNS} filename="flagged_claims" />
      </div>

      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <input
          type="text"
          placeholder="Search by ID, patient, or provider..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); resetPage(); }}
          className="flex-1 px-3 py-2 bg-surface border border-border rounded-md text-sm text-textPrimary placeholder-textSecondary/50 focus:outline-none focus:border-primary transition-colors duration-150"
        />
        <select
          value={providerFilter}
          onChange={(e) => { setProviderFilter(e.target.value); resetPage(); }}
          className="px-3 py-2 bg-surface border border-border rounded-md text-sm text-textPrimary focus:outline-none focus:border-primary transition-colors duration-150"
        >
          <option value="All">All providers</option>
          {providers.filter((p) => p !== 'All').map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <select
          value={scoreFilter}
          onChange={(e) => { setScoreFilter(e.target.value); resetPage(); }}
          className="px-3 py-2 bg-surface border border-border rounded-md text-sm text-textPrimary focus:outline-none focus:border-primary transition-colors duration-150"
        >
          <option value="All">All scores</option>
          <option value="90+">90%+</option>
          <option value="80-90">80–90%</option>
          <option value="70-80">70–80%</option>
          <option value="60-70">60–70%</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); resetPage(); }}
          className="px-3 py-2 bg-surface border border-border rounded-md text-sm text-textPrimary focus:outline-none focus:border-primary transition-colors duration-150"
        >
          <option value="All">All statuses</option>
          {statuses.filter((s) => s !== 'All').map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} rows={2} />
          ))}
        </div>
      ) : (
        <>
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface">
                    <th className="text-left px-4 py-3 text-xs text-textSecondary font-medium">Claim ID</th>
                    <th className="text-left px-4 py-3 text-xs text-textSecondary font-medium">Patient</th>
                    <th className="text-left px-4 py-3 text-xs text-textSecondary font-medium hidden md:table-cell">Provider</th>
                    <th className="text-left px-4 py-3 text-xs text-textSecondary font-medium hidden lg:table-cell">Service Date</th>
                    <th className="text-left px-4 py-3 text-xs text-textSecondary font-medium">Amount</th>
                    <th className="text-left px-4 py-3 text-xs text-textSecondary font-medium">Score</th>
                    <th className="text-left px-4 py-3 text-xs text-textSecondary font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((claim) => (
                    <tr
                      key={claim.id}
                      onClick={() => setSelected(claim)}
                      className="border-b border-border last:border-0 hover:bg-[#1c2128] cursor-pointer transition-colors duration-100"
                    >
                      <td className="px-4 py-3 text-textPrimary font-mono text-xs">{claim.id}</td>
                      <td className="px-4 py-3 text-textPrimary">{claim.patient_name}</td>
                      <td className="px-4 py-3 text-textSecondary hidden md:table-cell">{claim.provider_name}</td>
                      <td className="px-4 py-3 text-textSecondary text-xs hidden lg:table-cell">{claim.service_date}</td>
                      <td className="px-4 py-3 text-textPrimary">${claim.amount.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-mono ${claim.fraud_score > 0.8 ? 'text-danger' : 'text-warning'}`}>
                          {(claim.fraud_score * 100).toFixed(0)}%
                        </span>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={claim.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Investigate ${selected?.id}`}>
        {selected && (
          <div>
            <div className="space-y-3 text-sm mb-6">
              {[
                ['Patient', selected.patient_name],
                ['Patient ID', selected.patient_id],
                ['Provider', selected.provider_name],
                ['Service Date', selected.service_date],
                ['Claim Date', selected.claim_date],
                ['Admission', selected.admission_label],
                ['Diagnosis', `${selected.diagnosis_code} — ${selected.diagnosis_label}`],
                ['Procedure', `${selected.procedure_code} — ${selected.procedure_label}`],
                ['Service', selected.service_label],
                ['Discharge', selected.discharge_label],
                ['Amount', `$${selected.amount.toLocaleString()}`],
                ['Fraud Score', `${(selected.fraud_score * 100).toFixed(1)}%`],
                ['Submitted', new Date(selected.submitted_at).toLocaleString()],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between border-b border-[#383e47] pb-2 last:border-0">
                  <span className="text-textSecondary">{label}</span>
                  <span className={`text-textPrimary ${label === 'Fraud Score' ? '!text-danger font-medium' : ''}`}>
                    {value}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-[#383e47] pt-4">
              <p className="text-xs text-textSecondary mb-3">Your determination:</p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleLabel(selected.id, 'Real')}
                  className="flex-1 px-4 py-2 text-sm bg-success/10 border border-success/30 rounded-md text-success hover:bg-success/20 transition-colors duration-150"
                >
                  Mark as Real
                </button>
                <button
                  onClick={() => handleLabel(selected.id, 'Fraud')}
                  className="flex-1 px-4 py-2 text-sm bg-danger/10 border border-danger/30 rounded-md text-danger hover:bg-danger/20 transition-colors duration-150"
                >
                  Confirm Fraud
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
