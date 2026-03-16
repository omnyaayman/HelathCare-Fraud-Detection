import { useState, useEffect } from 'react';
import { generateMockClaims, ADMISSION_TYPES, SERVICES } from '../../mockData';
import StatusBadge from '../../components/StatusBadge';
import Skeleton from '../../components/Skeleton';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import BulkActions from '../../components/BulkActions';

const CLAIM_COLUMNS = [
  { key: 'id', label: 'Claim ID' },
  { key: 'patient_name', label: 'Patient' },
  { key: 'provider_name', label: 'Provider' },
  { key: 'service_date', label: 'Service Date' },
  { key: 'claim_date', label: 'Claim Date' },
  { key: 'admission_label', label: 'Admission' },
  { key: 'diagnosis_code', label: 'Diagnosis' },
  { key: 'procedure_code', label: 'Procedure' },
  { key: 'service_label', label: 'Service' },
  { key: 'discharge_label', label: 'Discharge' },
  { key: 'amount', label: 'Amount' },
  { key: 'fraud_score', label: 'Fraud Score' },
  { key: 'status', label: 'Status' },
];

const PAGE_SIZE = 10;

export default function TrackClaims() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setClaims(generateMockClaims(80));
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const statuses = ['All', 'Pending', 'Processing', 'Flagged', 'Cleared', 'Fraud Confirmed'];

  const filtered = claims
    .filter((c) => filter === 'All' || c.status === filter)
    .filter((c) =>
      !search.trim() ||
      c.id.toLowerCase().includes(search.toLowerCase()) ||
      c.patient_name.toLowerCase().includes(search.toLowerCase()) ||
      c.diagnosis_code.toLowerCase().includes(search.toLowerCase()) ||
      c.procedure_code.toLowerCase().includes(search.toLowerCase())
    );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input type="text" placeholder="Search by ID, patient, diagnosis, procedure..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 px-3 py-2 bg-surface border border-border rounded-md text-sm text-textPrimary placeholder-textSecondary/50 focus:outline-none focus:border-primary transition-colors duration-150"
        />
      </div>

      <div className="mb-4">
        <BulkActions data={filtered} columns={CLAIM_COLUMNS} filename="provider_claims" />
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-5">
        {statuses.map((s) => (
          <button key={s} onClick={() => { setFilter(s); setPage(1); }}
            className={`px-3 py-1.5 text-xs rounded-md border transition-colors duration-150 ${filter === s ? 'bg-primary/15 border-primary/30 text-primary' : 'bg-surface border-border text-textSecondary hover:text-textPrimary hover:border-textSecondary'}`}
          >{s}</button>
        ))}
        <span className="text-xs text-textSecondary ml-2">{filtered.length} claims</span>
      </div>

      {loading ? (
        <div className="bg-surface border border-border rounded-lg p-4"><Skeleton rows={8} /></div>
      ) : (
        <div className="bg-surface border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="border-b border-border">
                {['Claim ID', 'Patient', 'Service Date', 'Admission', 'Diagnosis', 'Procedure', 'Service', 'Amount', 'Score', 'Status'].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs text-textSecondary font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map((c) => (
                <tr key={c.id} onClick={() => setSelected(c)} className="border-b border-border last:border-0 hover:bg-[#1c2128] cursor-pointer transition-colors duration-100">
                  <td className="px-4 py-2.5 font-mono text-xs text-primary">{c.id}</td>
                  <td className="px-4 py-2.5 text-textPrimary">{c.patient_name}</td>
                  <td className="px-4 py-2.5 text-textSecondary text-xs">{c.service_date}</td>
                  <td className="px-4 py-2.5 text-textSecondary text-xs">{c.admission_label}</td>
                  <td className="px-4 py-2.5 text-textSecondary text-xs">{c.diagnosis_code}</td>
                  <td className="px-4 py-2.5 text-textSecondary text-xs">{c.procedure_code}</td>
                  <td className="px-4 py-2.5 text-textSecondary text-xs">{c.service_label}</td>
                  <td className="px-4 py-2.5 text-textPrimary font-mono text-xs">${c.amount.toLocaleString()}</td>
                  <td className="px-4 py-2.5"><span className={`font-mono text-xs ${c.fraud_score > 0.7 ? 'text-danger' : c.fraud_score > 0.4 ? 'text-warning' : 'text-success'}`}>{c.fraud_score.toFixed(2)}</span></td>
                  <td className="px-4 py-2.5"><StatusBadge status={c.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.id || ''} wide>
        {selected && (
          <div className="space-y-3">
            {[
              ['Patient', `${selected.patient_name} (${selected.patient_id})`],
              ['Provider', selected.provider_name],
              ['Service Date', selected.service_date],
              ['Claim Date', selected.claim_date],
              ['Admission', selected.admission_label],
              ['Diagnosis', `${selected.diagnosis_code} - ${selected.diagnosis_label}`],
              ['Procedure', `${selected.procedure_code} - ${selected.procedure_label}`],
              ['Service', selected.service_label],
              ['Discharge', selected.discharge_label],
              ['Amount', `$${selected.amount.toLocaleString()}`],
              ['Fraud Score', selected.fraud_score.toFixed(3)],
              ['Status', selected.status],
              ['Submitted', new Date(selected.submitted_at).toLocaleString()],
              ['Processed', selected.processed_at ? new Date(selected.processed_at).toLocaleString() : 'Pending'],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between text-sm border-b border-[#383e47] pb-2">
                <span className="text-textSecondary">{label}</span>
                <span className="text-textPrimary text-right max-w-[60%]">{value}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
