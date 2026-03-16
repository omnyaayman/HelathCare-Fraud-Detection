import { useState } from 'react';
import { Plus, AlertCircle, CheckCircle } from 'lucide-react';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import BulkActions from '../../components/BulkActions';
import StatusBadge from '../../components/StatusBadge';

const PAGE_SIZE = 10;

const COLUMNS = [
  { key: 'id', label: 'Record ID' },
  { key: 'claim_id', label: 'Claim ID' },
  { key: 'patient_name', label: 'Patient Name' },
  { key: 'provider_name', label: 'Provider' },
  { key: 'procedure_label', label: 'Procedure' },
  { key: 'service_label', label: 'Service' },
  { key: 'amount', label: 'Amount' },
  { key: 'label', label: 'Label' },
  { key: 'notes', label: 'Notes' },
  { key: 'claim_date', label: 'Date' },
];

function generateId() {
  return 'LBL-' + String(Math.floor(Math.random() * 90000) + 10000);
}

export default function LabeledData() {
  const [records, setRecords] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [labelFilter, setLabelFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState(null);
  const [form, setForm] = useState({ claim_id: '', patient_name: '', provider_name: '', procedure_label: '', service_label: '', amount: '', label: 'Fraud', notes: '' });

  const flash = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleAdd = () => {
    if (!form.claim_id.trim() && !form.patient_name.trim()) { flash('error', 'Claim ID or patient name is required'); return; }
    const record = {
      id: generateId(),
      claim_id: form.claim_id,
      patient_name: form.patient_name,
      provider_name: form.provider_name,
      procedure_label: form.procedure_label,
      service_label: form.service_label,
      amount: Number(form.amount) || 0,
      label: form.label,
      notes: form.notes,
      claim_date: new Date().toISOString().slice(0, 10),
    };
    setRecords((prev) => [record, ...prev]);
    setForm({ claim_id: '', patient_name: '', provider_name: '', procedure_label: '', service_label: '', amount: '', label: 'Fraud', notes: '' });
    setShowAdd(false);
    flash('success', `Labeled record added (${record.label})`);
  };

  const handleImport = (rows) => {
    const imported = rows.map((r) => ({
      id: r.id || generateId(),
      claim_id: r.claim_id || '',
      patient_name: r.patient_name || '',
      provider_name: r.provider_name || r.provider || '',
      procedure_label: r.procedure_label || r.procedure || '',
      service_label: r.service_label || r.service || '',
      amount: Number(r.amount) || 0,
      label: r.label === 'Real' ? 'Real' : r.label === 'Fraud' ? 'Fraud' : 'Fraud',
      notes: r.notes || '',
      claim_date: r.claim_date || new Date().toISOString().slice(0, 10),
    }));
    setRecords((prev) => [...imported, ...prev]);
    setPage(1);
  };

  const filtered = records
    .filter((r) => labelFilter === 'All' || r.label === labelFilter)
    .filter((r) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        r.id.toLowerCase().includes(q) ||
        r.claim_id.toLowerCase().includes(q) ||
        r.patient_name.toLowerCase().includes(q) ||
        r.provider_name.toLowerCase().includes(q)
      );
    });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const fraudCount = records.filter((r) => r.label === 'Fraud').length;
  const realCount = records.filter((r) => r.label === 'Real').length;

  return (
    <div>
      {message && (
        <div className={`flex items-center gap-2 px-3 py-2.5 mb-4 rounded-md text-sm ${message.type === 'success' ? 'bg-success/10 border border-success/20 text-success' : 'bg-danger/10 border border-danger/20 text-danger'}`}>
          {message.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
          {message.text}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="text-xs text-textSecondary mb-1">Total Records</div>
          <div className="text-xl font-mono text-textPrimary">{records.length}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="text-xs text-textSecondary mb-1">Confirmed Fraud</div>
          <div className="text-xl font-mono text-danger">{fraudCount}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="text-xs text-textSecondary mb-1">Confirmed Real</div>
          <div className="text-xl font-mono text-success">{realCount}</div>
        </div>
      </div>

      <p className="text-xs text-textSecondary mb-4">
        Add verified fraud/real claim data here. This data is used for model retraining — not for live detection.
      </p>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full">
          <input
            type="text"
            placeholder="Search by ID, claim, patient, or provider..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="flex-1 px-3 py-2 bg-surface border border-border rounded-md text-sm text-textPrimary placeholder-textSecondary/50 focus:outline-none focus:border-primary transition-colors duration-150"
          />
          <select
            value={labelFilter}
            onChange={(e) => { setLabelFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-surface border border-border rounded-md text-sm text-textPrimary focus:outline-none focus:border-primary transition-colors duration-150"
          >
            <option value="All">All labels</option>
            <option value="Fraud">Fraud</option>
            <option value="Real">Real</option>
          </select>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-primary/15 border border-primary/30 rounded-md text-primary hover:bg-primary/25 transition-colors duration-150 whitespace-nowrap"
          >
            <Plus size={14} />
            Add record
          </button>
        </div>
      </div>

      <div className="mb-4">
        <BulkActions
          data={filtered}
          columns={COLUMNS}
          onImport={handleImport}
          filename="labeled_data"
          importLabel="Import labeled data (CSV)"
          exportLabel="Export labeled data"
        />
      </div>

      {records.length === 0 ? (
        <div className="border border-border rounded-lg px-4 py-12 text-center">
          <p className="text-sm text-textSecondary mb-1">No labeled data yet</p>
          <p className="text-xs text-textSecondary">Add records manually or bulk import from CSV</p>
        </div>
      ) : (
        <>
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface">
                    <th className="text-left px-4 py-3 text-xs text-textSecondary font-medium">Record ID</th>
                    <th className="text-left px-4 py-3 text-xs text-textSecondary font-medium">Claim ID</th>
                    <th className="text-left px-4 py-3 text-xs text-textSecondary font-medium">Patient</th>
                    <th className="text-left px-4 py-3 text-xs text-textSecondary font-medium hidden md:table-cell">Provider</th>
                    <th className="text-left px-4 py-3 text-xs text-textSecondary font-medium hidden lg:table-cell">Procedure</th>
                    <th className="text-left px-4 py-3 text-xs text-textSecondary font-medium hidden lg:table-cell">Service</th>
                    <th className="text-left px-4 py-3 text-xs text-textSecondary font-medium">Amount</th>
                    <th className="text-left px-4 py-3 text-xs text-textSecondary font-medium">Label</th>
                    <th className="text-left px-4 py-3 text-xs text-textSecondary font-medium hidden lg:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-[#1c2128] transition-colors duration-100">
                      <td className="px-4 py-3 text-textPrimary font-mono text-xs">{r.id}</td>
                      <td className="px-4 py-3 text-textPrimary font-mono text-xs">{r.claim_id || '—'}</td>
                      <td className="px-4 py-3 text-textPrimary">{r.patient_name || '—'}</td>
                      <td className="px-4 py-3 text-textSecondary hidden md:table-cell">{r.provider_name || '—'}</td>
                      <td className="px-4 py-3 text-textSecondary hidden lg:table-cell">{r.procedure_label || '—'}</td>
                      <td className="px-4 py-3 text-textSecondary hidden lg:table-cell">{r.service_label || '—'}</td>
                      <td className="px-4 py-3 text-textPrimary">{r.amount ? `$${r.amount.toLocaleString()}` : '—'}</td>
                      <td className="px-4 py-3"><StatusBadge status={r.label === 'Fraud' ? 'Fraud Confirmed' : 'Cleared'} /></td>
                      <td className="px-4 py-3 text-textSecondary hidden lg:table-cell">{r.claim_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      {/* Add record modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add labeled record">
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-textSecondary mb-1.5">Claim ID</label>
            <input type="text" value={form.claim_id} onChange={(e) => update('claim_id', e.target.value)} className="w-full px-3 py-2 bg-[#0d1117] border border-[#383e47] rounded-md text-sm text-textPrimary placeholder-textSecondary/50 focus:outline-none focus:border-primary transition-colors duration-150" placeholder="e.g. CLM-0001" />
          </div>
          <div>
            <label className="block text-xs text-textSecondary mb-1.5">Patient Name</label>
            <input type="text" value={form.patient_name} onChange={(e) => update('patient_name', e.target.value)} className="w-full px-3 py-2 bg-[#0d1117] border border-[#383e47] rounded-md text-sm text-textPrimary placeholder-textSecondary/50 focus:outline-none focus:border-primary transition-colors duration-150" placeholder="e.g. John Doe" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-textSecondary mb-1.5">Provider</label>
              <input type="text" value={form.provider_name} onChange={(e) => update('provider_name', e.target.value)} className="w-full px-3 py-2 bg-[#0d1117] border border-[#383e47] rounded-md text-sm text-textPrimary placeholder-textSecondary/50 focus:outline-none focus:border-primary transition-colors duration-150" placeholder="Hospital/clinic name" />
            </div>
            <div>
              <label className="block text-xs text-textSecondary mb-1.5">Amount</label>
              <input type="number" value={form.amount} onChange={(e) => update('amount', e.target.value)} className="w-full px-3 py-2 bg-[#0d1117] border border-[#383e47] rounded-md text-sm text-textPrimary placeholder-textSecondary/50 focus:outline-none focus:border-primary transition-colors duration-150" placeholder="15000" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-textSecondary mb-1.5">Procedure</label>
            <input type="text" value={form.procedure_label} onChange={(e) => update('procedure_label', e.target.value)} className="w-full px-3 py-2 bg-[#0d1117] border border-[#383e47] rounded-md text-sm text-textPrimary placeholder-textSecondary/50 focus:outline-none focus:border-primary transition-colors duration-150" placeholder="e.g. MRI Brain" />
          </div>
          <div>
            <label className="block text-xs text-textSecondary mb-1.5">Service Type</label>
            <input type="text" value={form.service_label} onChange={(e) => update('service_label', e.target.value)} className="w-full px-3 py-2 bg-[#0d1117] border border-[#383e47] rounded-md text-sm text-textPrimary placeholder-textSecondary/50 focus:outline-none focus:border-primary transition-colors duration-150" placeholder="e.g. Inpatient" />
          </div>
          <div>
            <label className="block text-xs text-textSecondary mb-1.5">Label *</label>
            <select value={form.label} onChange={(e) => update('label', e.target.value)} className="w-full px-3 py-2 bg-[#0d1117] border border-[#383e47] rounded-md text-sm text-textPrimary focus:outline-none focus:border-primary transition-colors duration-150">
              <option value="Fraud">Fraud (confirmed fraudulent)</option>
              <option value="Real">Real (confirmed legitimate)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-textSecondary mb-1.5">Notes</label>
            <textarea value={form.notes} onChange={(e) => update('notes', e.target.value)} rows={3} className="w-full px-3 py-2 bg-[#0d1117] border border-[#383e47] rounded-md text-sm text-textPrimary placeholder-textSecondary/50 focus:outline-none focus:border-primary transition-colors duration-150 resize-none" placeholder="Additional details or evidence notes" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm border border-border rounded-md text-textSecondary hover:text-textPrimary hover:border-textSecondary transition-colors duration-150">Cancel</button>
            <button onClick={handleAdd} className="px-4 py-2 text-sm bg-primary/15 border border-primary/30 rounded-md text-primary hover:bg-primary/25 transition-colors duration-150">Add record</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
