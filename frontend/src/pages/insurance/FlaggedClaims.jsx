import { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../../api';
import StatusBadge from '../../components/StatusBadge';
import Skeleton from '../../components/Skeleton';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import BulkActions from '../../components/BulkActions';
import { AlertCircle, Search, ShieldAlert, ArrowUpRight, RefreshCcw, Inbox } from 'lucide-react';
import { clampScore, formatCurrency as formatUsd, formatScore as formatPercent, formatDate } from '../../utils/format';

const PAGE_SIZE = 10;

const formatCurrency = (value) => formatUsd(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatScore = (score) => formatPercent(score, 0);
const getSafeScore = (c) => clampScore(c?.fraud_score);

function SeverityBadge({ score }) {
  const safe = Number.isFinite(Number(score)) ? Number(score) : 0;
  let classes = 'bg-warning/20 text-warning';
  let label = 'High';
  if (safe >= 0.9) {
    classes = 'bg-danger text-white';
    label = 'Critical';
  } else if (safe >= 0.7) {
    classes = 'bg-danger/80 text-white';
    label = 'High';
  } else {
    classes = 'bg-warning/20 text-warning';
    label = 'Elevated';
  }
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${classes}`}>
      {label} - {formatScore(safe)}
    </span>
  );
}

export default function FlaggedClaims() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [providerFilter, setProviderFilter] = useState('All');
  const [scoreFilter, setScoreFilter] = useState('All');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchFlaggedClaims = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getClaims({ min_fraud_score: 0.6 });
      const list = Array.isArray(data) ? data : (data.data || []);
      list.sort((a, b) => getSafeScore(b) - getSafeScore(a));
      setClaims(list);
    } catch (err) {
      console.error('Error fetching flagged claims:', err);
      setError('Unable to load flagged claims. Please check your connection and try again.');
      setClaims([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFlaggedClaims();
  }, [fetchFlaggedClaims]);

  const handleLabel = useCallback(async (claimId, decision) => {
    if (!claimId) return;
    setActionLoading(true);
    try {
      const status = decision === 'Fraud' ? 'Fraud Confirmed' : 'Cleared';
      await api.updateClaimStatus(claimId, { status, label: decision });

      setClaims((prev) => prev.filter((c) => c.claim_id !== claimId));
      setSelected(null);
    } catch (err) {
      console.error('Error updating claim status:', err);
      alert('Failed to update database. Please try again.');
    } finally {
      setActionLoading(false);
    }
  }, []);

  // Top 5 suspicious providers by flagged claim count
  const aggByProvider = useMemo(() => {
    const map = {};
    claims.forEach((c) => {
      const name = c.provider_name || 'Unknown Provider';
      if (!map[name]) map[name] = { count: 0, totalScore: 0 };
      map[name].count += 1;
      map[name].totalScore += getSafeScore(c);
    });
    return Object.entries(map)
      .map(([name, data]) => ({ name, count: data.count, avgScore: data.totalScore / data.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [claims]);

  const providerOptions = useMemo(() => {
    const names = new Set(claims.map((c) => c.provider_name || 'Unknown Provider'));
    return ['All', ...Array.from(names).sort()];
  }, [claims]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return claims.filter((c) => {
      const matchesSearch =
        !q ||
        c.claim_id?.toString().toLowerCase().includes(q) ||
        (c.patient_name || '').toLowerCase().includes(q);

      const matchesProvider =
        providerFilter === 'All' || (c.provider_name || 'Unknown Provider') === providerFilter;

      const score = getSafeScore(c);
      const matchesScore =
        scoreFilter === 'All' ||
        (scoreFilter === '90+' ? score >= 0.9 : score >= 0.7 && score < 0.9);

      return matchesSearch && matchesProvider && matchesScore;
    });
  }, [claims, search, providerFilter, scoreFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  );
  const hasStatusColumn = useMemo(() => claims.some((c) => c.status), [claims]);

  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [totalPages, page]);

  if (loading) {
    return (
      <div className="p-4 sm:p-10">
        <Skeleton rows={10} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 px-4 bg-surface border border-border rounded-xl">
        <AlertCircle className="text-danger mb-3" size={36} />
        <p className="text-textPrimary font-bold mb-1">Something went wrong</p>
        <p className="text-textSecondary text-sm mb-4 max-w-sm">{error}</p>
        <button
          onClick={fetchFlaggedClaims}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:brightness-110 transition-all"
        >
          <RefreshCcw size={14} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-bold text-textPrimary flex items-center gap-2">
            <ShieldAlert className="text-danger" size={24} /> High Risk Investigation Unit
          </h2>
          <p className="text-xs text-textSecondary mt-1">
            AI has flagged {claims.length} claim{claims.length === 1 ? '' : 's'} for urgent manual audit.
          </p>
        </div>
        <BulkActions data={filtered} filename="flagged_investigation_report" />
      </div>

      {claims.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-20 px-4 bg-surface border border-border rounded-xl">
          <Inbox className="text-textSecondary mb-3" size={36} />
          <p className="text-textPrimary font-bold mb-1">No high-risk claims found</p>
          <p className="text-textSecondary text-sm max-w-sm">
            There are currently no claims flagged above the risk threshold. Check back later.
          </p>
        </div>
      ) : (
        <>
          {/* Top Suspicious Providers (KPIs) */}
          {aggByProvider.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {aggByProvider.map((data) => (
                <div
                  key={data.name}
                  className="p-4 bg-surface border border-border rounded-xl border-t-2 border-t-danger/50 shadow-sm"
                >
                  <p className="text-[10px] text-textSecondary uppercase font-bold truncate mb-2">
                    {data.name}
                  </p>
                  <div className="flex justify-between items-end">
                    <span className="text-2xl font-mono text-danger">{data.count}</span>
                    <span className="text-[10px] text-textSecondary bg-bg px-1.5 py-0.5 rounded">
                      Risk: {formatScore(data.avgScore)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Filters Bar */}
          <div className="flex flex-col lg:flex-row gap-3 bg-surface p-3 border border-border rounded-xl">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary"
              />
              <input
                type="text"
                placeholder="Quick search ID or Patient..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-3 py-2 bg-bg border border-border rounded-lg text-sm focus:border-primary outline-none"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={providerFilter}
                onChange={(e) => {
                  setProviderFilter(e.target.value);
                  setPage(1);
                }}
                className="bg-bg border border-border px-3 py-2 rounded-lg text-xs font-medium text-textPrimary outline-none"
              >
                {providerOptions.map((name) => (
                  <option key={name} value={name}>
                    {name === 'All' ? 'All Providers' : name}
                  </option>
                ))}
              </select>
              <select
                value={scoreFilter}
                onChange={(e) => {
                  setScoreFilter(e.target.value);
                  setPage(1);
                }}
                className="bg-bg border border-border px-3 py-2 rounded-lg text-xs font-medium text-textPrimary outline-none"
              >
                <option value="All">All Risk Levels</option>
                <option value="90+">Critical (90%+)</option>
                <option value="70-90">High (70%-90%)</option>
              </select>
            </div>
          </div>

          {/* Flagged Table */}
          <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-bg/50 border-b border-border">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-textSecondary uppercase tracking-wider">
                      Claim ID
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-textSecondary uppercase tracking-wider">
                      Patient
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-textSecondary uppercase tracking-wider">
                      Provider
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-textSecondary uppercase tracking-wider">
                      Risk Score
                    </th>
                    {hasStatusColumn && (
                      <th className="px-6 py-4 text-xs font-bold text-textSecondary uppercase tracking-wider">
                        Status
                      </th>
                    )}
                    <th className="px-6 py-4 text-xs font-bold text-textSecondary uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-textSecondary uppercase tracking-wider text-right">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginated.map((c) => {
                    const score = getSafeScore(c);
                    return (
                      <tr key={c.claim_id} className="hover:bg-danger/5 transition-colors group">
                        <td className="px-6 py-4 font-mono text-xs text-primary font-bold">
                          {c.claim_id ?? 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-textPrimary">
                          {c.patient_name || 'Unknown Patient'}
                        </td>
                        <td className="px-6 py-4 text-textPrimary text-xs">
                          {c.provider_name || 'Unknown Provider'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <SeverityBadge score={score} />
                            <div className="w-16 h-1 bg-bg rounded-full overflow-hidden hidden sm:block">
                              <div
                                className="h-full bg-danger"
                                style={{ width: `${score * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        {hasStatusColumn && (
                          <td className="px-6 py-4">
                            {c.status ? <StatusBadge status={c.status} /> : 'N/A'}
                          </td>
                        )}
                        <td className="px-6 py-4 font-mono text-textPrimary">
                          {formatCurrency(c.claim_amount)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => setSelected(c)}
                            className="text-xs font-bold text-primary flex items-center gap-1 ml-auto hover:underline"
                          >
                            Investigate <ArrowUpRight size={12} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filtered.length === 0 && (
              <div className="p-10 text-center text-textSecondary italic">
                No claims match your current search or filters.
              </div>
            )}
          </div>

          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      {/* Investigation Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Investigation: ${selected?.claim_id ?? ''}`} wide>
        {selected && (
          <div className="space-y-6">
            <div className="flex flex-col items-center py-6 bg-danger/5 rounded-xl border border-danger/10">
              <span className="text-[10px] text-danger uppercase font-black tracking-widest mb-1">
                AI Risk Probability
              </span>
              <span className="text-5xl font-black text-danger">
                {formatScore(getSafeScore(selected))}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2 md:border-r border-border md:pr-4">
                <p className="flex justify-between">
                  <span className="text-textSecondary">Patient:</span>{' '}
                  <span className="font-bold text-textPrimary">
                    {selected.patient_name || 'Unknown Patient'}
                  </span>
                </p>
                <p className="flex justify-between">
                  <span className="text-textSecondary">Provider:</span>{' '}
                  <span className="text-textPrimary">
                    {selected.provider_name || 'Unknown Provider'}
                  </span>
                </p>
                <p className="flex justify-between">
                  <span className="text-textSecondary">Amount:</span>{' '}
                  <span className="font-mono text-textPrimary">
                    {formatCurrency(selected.claim_amount)}
                  </span>
                </p>
                {selected.status && (
                  <p className="flex justify-between items-center">
                    <span className="text-textSecondary">Status:</span>{' '}
                    <StatusBadge status={selected.status} />
                  </p>
                )}
              </div>
              <div className="space-y-2 pl-0 md:pl-4">
                <p className="flex justify-between">
                  <span className="text-textSecondary">Diagnosis:</span>{' '}
                  <span className="text-textPrimary text-xs">
                    {selected.diagnosis_code || 'N/A'}
                  </span>
                </p>
                <p className="flex justify-between">
                  <span className="text-textSecondary">Service:</span>{' '}
                  <span className="text-textPrimary text-xs">
                    {selected.service_name || 'General'}
                  </span>
                </p>
                <p className="flex justify-between">
                  <span className="text-textSecondary">Submission:</span>{' '}
                  <span className="text-textPrimary text-xs">
                    {formatDate(selected.claim_date)}
                  </span>
                </p>
              </div>
            </div>

            <div className="bg-warning/10 p-4 rounded-lg border border-warning/20">
              <div className="flex gap-3">
                <AlertCircle className="text-warning shrink-0" size={18} />
                <p className="text-xs text-textSecondary leading-relaxed italic">
                  Human override required. Confirming fraud will stop the payment process and
                  blacklist this claim in the training set. Clearing it will move it to the
                  payment queue.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-border">
              <button
                onClick={() => handleLabel(selected.claim_id, 'Real')}
                disabled={actionLoading}
                className="flex-1 py-3 bg-success text-white rounded-lg font-bold hover:brightness-110 shadow-lg shadow-success/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? 'Processing...' : 'Clear & Approve'}
              </button>
              <button
                onClick={() => handleLabel(selected.claim_id, 'Fraud')}
                disabled={actionLoading}
                className="flex-1 py-3 bg-danger text-white rounded-lg font-bold hover:brightness-110 shadow-lg shadow-danger/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? 'Processing...' : 'Confirm Fraud'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
