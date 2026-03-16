import { useState, useEffect } from 'react';
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
  { key: 'label', label: 'Label' },
  { key: 'claim_date', label: 'Claim Date' },
];

const PAGE_SIZE = 10;

export default function ReviewClaims() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('submitted_at');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setClaims(generateMockClaims(80));
      setLoading(false);
    }, 900);
    return () => clearTimeout(timer);
  }, []);

  const filtered = claims
    .filter(
      (c) =>
        c.id.toLowerCase().includes(search.toLowerCase()) ||
        c.patient_name.toLowerCase().includes(search.toLowerCase()) ||
        c.provider_name.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'fraud_score') return b.fraud_score - a.fraud_score;
      if (sortBy === 'amount') return b.amount - a.amount;
      return new Date(b.claim_date) - new Date(a.claim_date);
    });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSearch = (val) => {
    setSearch(val);
    setPage(1);
  };

  const handleSort = (val) => {
    setSortBy(val);
    setPage(1);
  };

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

  return (
    <div>
      <div className="mb-4">
        <BulkActions data={filtered} columns={CLAIM_COLUMNS} filename="review_claims" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <input
          type="text"
          placeholder="Search by ID, patient, or provider..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="flex-1 px-3 py-2 bg-surface border border-border rounded-md text-sm text-textPrimary placeholder-textSecondary/50 focus:outline-none focus:border-primary transition-colors duration-150"
        />
        <select
          value={sortBy}
          onChange={(e) => handleSort(e.target.value)}
          className="px-3 py-2 bg-surface border border-border rounded-md text-sm text-textPrimary focus:outline-none focus:border-primary transition-colors duration-150"
        >
          <option value="submitted_at">Sort by Date</option>
          <option value="fraud_score">Sort by Fraud Score</option>
          <option value="amount">Sort by Amount</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 8 }, (_, i) => (
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
                    <th className="text-left px-4 py-3 text-xs text-textSecondary font-medium hidden lg:table-cell">Label</th>
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
                        <span className={`text-xs font-mono ${claim.fraud_score > 0.7 ? 'text-danger' : claim.fraud_score > 0.4 ? 'text-warning' : 'text-success'}`}>
                          {(claim.fraud_score * 100).toFixed(0)}%
                        </span>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={claim.status} /></td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {claim.label ? <StatusBadge status={claim.label} /> : <span className="text-textSecondary text-xs">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-textSecondary">No claims match your search</div>
            )}
          </div>
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Review ${selected?.id}`}>
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
                ['Current Status', null],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between border-b border-[#383e47] pb-2 last:border-0">
                  <span className="text-textSecondary">{label}</span>
                  {label === 'Current Status' ? (
                    <StatusBadge status={selected.status} />
                  ) : (
                    <span className={`text-textPrimary ${label === 'Fraud Score' && selected.fraud_score > 0.7 ? '!text-danger' : ''}`}>
                      {value}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="border-t border-[#383e47] pt-4">
              <p className="text-xs text-textSecondary mb-3">Assign label to this claim:</p>
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
                  Mark as Fraud
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
