import { useState, useEffect, useCallback } from 'react';
import { Plus, AlertCircle, CheckCircle, Loader, Database, Search, Filter, Edit3, Trash2, Download, Upload } from 'lucide-react';
import api from '../../api';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import StatusBadge from '../../components/StatusBadge';
import { buildCsv, downloadFile } from '../../utils/csv';

const PAGE_SIZE = 10;

const EXPORT_COLUMNS = [
  { key: 'id', label: 'ID' },
  { key: 'claim_id', label: 'Claim ID' },
  { key: 'patient_name', label: 'Patient' },
  { key: 'provider_name', label: 'Provider' },
  { key: 'amount', label: 'Amount' },
  { key: 'fraud_label', label: 'Fraud Label' },
  { key: 'auditor', label: 'Auditor' },
  { key: 'audit_date', label: 'Audit Date' },
  { key: 'notes', label: 'Notes' },
];

export default function LabeledData() {
  const [records, setRecords] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(null);
  const [search, setSearch] = useState('');
  const [labelFilter, setLabelFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState(null);
  const [form, setForm] = useState({
    claim_id: '',
    patient_name: '',
    provider_name: '',
    amount: '',
    fraud_label: 'Fraud',
    auditor: '',
    notes: ''
  });

  const flash = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        page_size: PAGE_SIZE,
        search: search || undefined,
        fraud_label: labelFilter !== 'All' ? labelFilter : undefined
      };
      const data = await api.getLabeledData(params);
      if (data.data) {
        setRecords(data.data);
        setTotalCount(data.total);
      } else {
        setRecords(data);
        setTotalCount(data.length);
      }
    } catch (error) {
      flash('error', 'Failed to load labeled data.');
    } finally {
      setLoading(false);
    }
  }, [page, search, labelFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAdd = async () => {
    try {
      await api.createLabeledRecord({
        ...form,
        amount: parseFloat(form.amount) || 0
      });
      flash('success', 'Record added successfully.');
      setShowAddModal(false);
      setForm({
        claim_id: '',
        patient_name: '',
        provider_name: '',
        amount: '',
        fraud_label: 'Fraud',
        auditor: '',
        notes: ''
      });
      fetchData();
    } catch (error) {
      flash('error', 'Failed to add record.');
    }
  };

  const handleEdit = async () => {
    try {
      await api.updateLabeledRecord(showEditModal.id, {
        ...form,
        amount: parseFloat(form.amount) || 0
      });
      flash('success', 'Record updated successfully.');
      setShowEditModal(null);
      fetchData();
    } catch (error) {
      flash('error', 'Failed to update record.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    try {
      await api.deleteLabeledRecord(id);
      flash('success', 'Record deleted successfully.');
      fetchData();
    } catch (error) {
      flash('error', 'Failed to delete record.');
    }
  };

  const exportCSV = () => {
    downloadFile(buildCsv(records, EXPORT_COLUMNS), 'labeled_data.csv');
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      flash('info', 'CSV import feature would process the file here.');
    };
    reader.readAsText(file);
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const fraudCount = records.filter(r => r.fraud_label === 'Fraud').length;
  const cleanCount = records.filter(r => r.fraud_label === 'Clean' || r.fraud_label === 'Real').length;

  return (
    <div className="space-y-6">
      {message && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg border shadow-sm animate-in fade-in slide-in-from-top-2 ${
          message.type === 'success' ? 'bg-success/10 border-success/20 text-success' : 'bg-danger/10 border-danger/20 text-danger'
        }`}>
          {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface border border-border p-5 rounded-xl">
          <p className="text-[10px] uppercase font-bold text-textSecondary mb-2">Total Training Set</p>
          <div className="flex items-center gap-3">
            <Database className="text-primary" size={20} />
            <p className="text-3xl font-mono text-textPrimary">{totalCount}</p>
          </div>
        </div>
        <div className="bg-surface border border-border p-5 rounded-xl border-b-2 border-b-danger">
          <p className="text-[10px] uppercase font-bold text-textSecondary mb-2 text-danger">Fraud Samples</p>
          <p className="text-3xl font-mono text-danger">{fraudCount}</p>
        </div>
        <div className="bg-surface border border-border p-5 rounded-xl border-b-2 border-b-success">
          <p className="text-[10px] uppercase font-bold text-textSecondary mb-2 text-success">Clean Samples</p>
          <p className="text-3xl font-mono text-success">{cleanCount}</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 bg-surface p-4 border border-border rounded-xl">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
          <input
            type="text"
            placeholder="Search training data..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2 bg-bg border border-border rounded-lg text-sm text-textPrimary focus:border-primary outline-none"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={labelFilter}
            onChange={(e) => { setLabelFilter(e.target.value); setPage(1); }}
            className="bg-bg border border-border px-3 py-2 rounded-lg text-sm text-textPrimary outline-none"
          >
            <option value="All">All Labels</option>
            <option value="Fraud">Fraud Only</option>
            <option value="Clean">Clean Only</option>
          </select>
          <button onClick={() => setShowAddModal(true)} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:brightness-110">
            <Plus size={16} /> New Entry
          </button>
          <button onClick={exportCSV} className="bg-success text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:brightness-110">
            <Download size={16} /> Export CSV
          </button>
          <label className="bg-warning text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:brightness-110 cursor-pointer">
            <Upload size={16} /> Import CSV
            <input type="file" accept=".csv" onChange={handleImport} className="hidden" />
          </label>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center"><Loader className="animate-spin mx-auto text-primary" size={32} /></div>
      ) : (
        <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-bg/50 border-b border-border">
              <tr className="text-[10px] uppercase font-bold text-textSecondary tracking-wider">
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Claim ID</th>
                <th className="px-6 py-4">Patient</th>
                <th className="px-6 py-4">Provider</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Label</th>
                <th className="px-6 py-4">Auditor</th>
                <th className="px-6 py-4">Audit Date</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {records.map((r) => (
                <tr key={r.id} className="hover:bg-bg/30 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs text-textSecondary">{r.id}</td>
                  <td className="px-6 py-4 font-mono text-xs text-primary font-bold">{r.claim_id}</td>
                  <td className="px-6 py-4 text-textPrimary">{r.patient_name || '—'}</td>
                  <td className="px-6 py-4 text-textSecondary text-xs">{r.provider_name || '—'}</td>
                  <td className="px-6 py-4 text-textPrimary font-mono">${(r.amount || 0).toLocaleString()}</td>
                  <td className="px-6 py-4"><StatusBadge status={r.fraud_label === 'Fraud' ? 'Fraud Confirmed' : 'Cleared'} /></td>
                  <td className="px-6 py-4 text-textSecondary text-xs">{r.auditor || '—'}</td>
                  <td className="px-6 py-4 text-textSecondary text-xs">{r.audit_date || '—'}</td>
                  <td className="px-6 py-4 flex gap-2">
                    <button
                      onClick={() => {
                        setShowEditModal(r);
                        setForm({
                          claim_id: r.claim_id,
                          patient_name: r.patient_name || '',
                          provider_name: r.provider_name || '',
                          amount: r.amount,
                          fraud_label: r.fraud_label,
                          auditor: r.auditor || '',
                          notes: r.notes || ''
                        });
                      }}
                      className="p-1 hover:bg-bg rounded"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button onClick={() => handleDelete(r.id)} className="p-1 hover:bg-bg rounded text-danger">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {records.length === 0 && <div className="p-10 text-center text-textSecondary italic">No records found.</div>}
        </div>
      )}

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />

      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add Ground Truth Record">
        <div className="space-y-4 p-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase font-bold text-textSecondary mb-1">Claim ID *</label>
              <input type="text" value={form.claim_id} onChange={e => setForm({...form, claim_id: e.target.value})} className="w-full bg-bg border border-border p-2 rounded text-sm text-textPrimary focus:border-primary outline-none" />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-textSecondary mb-1">Label</label>
              <select value={form.fraud_label} onChange={e => setForm({...form, fraud_label: e.target.value})} className="w-full bg-bg border border-border p-2 rounded text-sm text-textPrimary focus:border-primary outline-none">
                <option value="Fraud">Fraud</option>
                <option value="Clean">Clean</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-textSecondary mb-1">Patient Name</label>
            <input type="text" value={form.patient_name} onChange={e => setForm({...form, patient_name: e.target.value})} className="w-full bg-bg border border-border p-2 rounded text-sm text-textPrimary focus:border-primary outline-none" />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-textSecondary mb-1">Provider Name</label>
            <input type="text" value={form.provider_name} onChange={e => setForm({...form, provider_name: e.target.value})} className="w-full bg-bg border border-border p-2 rounded text-sm text-textPrimary focus:border-primary outline-none" />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-textSecondary mb-1">Amount</label>
            <input type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="w-full bg-bg border border-border p-2 rounded text-sm text-textPrimary focus:border-primary outline-none" />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-textSecondary mb-1">Auditor</label>
            <input type="text" value={form.auditor} onChange={e => setForm({...form, auditor: e.target.value})} className="w-full bg-bg border border-border p-2 rounded text-sm text-textPrimary focus:border-primary outline-none" />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-textSecondary mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="w-full bg-bg border border-border p-2 rounded text-sm text-textPrimary focus:border-primary outline-none h-20" />
          </div>
          <button onClick={handleAdd} className="w-full bg-primary text-white py-3 rounded-lg font-bold shadow-lg shadow-primary/20 hover:brightness-110 transition-all">Save</button>
        </div>
      </Modal>

      {showEditModal && (
        <Modal open={!!showEditModal} onClose={() => setShowEditModal(null)} title="Edit Record">
          <div className="space-y-4 p-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-textSecondary mb-1">Claim ID *</label>
                <input type="text" value={form.claim_id} onChange={e => setForm({...form, claim_id: e.target.value})} className="w-full bg-bg border border-border p-2 rounded text-sm text-textPrimary focus:border-primary outline-none" />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-textSecondary mb-1">Label</label>
                <select value={form.fraud_label} onChange={e => setForm({...form, fraud_label: e.target.value})} className="w-full bg-bg border border-border p-2 rounded text-sm text-textPrimary focus:border-primary outline-none">
                  <option value="Fraud">Fraud</option>
                  <option value="Clean">Clean</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-textSecondary mb-1">Patient Name</label>
              <input type="text" value={form.patient_name} onChange={e => setForm({...form, patient_name: e.target.value})} className="w-full bg-bg border border-border p-2 rounded text-sm text-textPrimary focus:border-primary outline-none" />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-textSecondary mb-1">Provider Name</label>
              <input type="text" value={form.provider_name} onChange={e => setForm({...form, provider_name: e.target.value})} className="w-full bg-bg border border-border p-2 rounded text-sm text-textPrimary focus:border-primary outline-none" />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-textSecondary mb-1">Amount</label>
              <input type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="w-full bg-bg border border-border p-2 rounded text-sm text-textPrimary focus:border-primary outline-none" />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-textSecondary mb-1">Auditor</label>
              <input type="text" value={form.auditor} onChange={e => setForm({...form, auditor: e.target.value})} className="w-full bg-bg border border-border p-2 rounded text-sm text-textPrimary focus:border-primary outline-none" />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-textSecondary mb-1">Notes</label>
              <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="w-full bg-bg border border-border p-2 rounded text-sm text-textPrimary focus:border-primary outline-none h-20" />
            </div>
            <div className="flex gap-4 pt-4 border-t border-border">
              <button onClick={() => setShowEditModal(null)} className="flex-1 py-3 border border-border rounded-lg text-sm font-bold text-textSecondary hover:bg-bg transition-all">Cancel</button>
              <button onClick={handleEdit} className="flex-1 py-3 bg-primary text-white rounded-lg font-bold shadow-lg shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all">Update</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
