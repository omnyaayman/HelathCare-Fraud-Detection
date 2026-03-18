import { useState, useEffect } from 'react';
import { Plus, AlertCircle, CheckCircle, Loader, Database, Search, Filter } from 'lucide-react';
import api from '../../api'; 
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import BulkActions from '../../components/BulkActions';
import StatusBadge from '../../components/StatusBadge';

const PAGE_SIZE = 10;

const COLUMNS = [
  { key: 'id', label: 'Record ID' },
  { key: 'claim_id', label: 'Claim ID' },
  { key: 'patient_name', label: 'Patient' },
  { key: 'provider_name', label: 'Hospital' },
  { key: 'amount', label: 'Amount' },
  { key: 'label', label: 'Status' },
  { key: 'claim_date', label: 'Audit Date' },
];

export default function LabeledData() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [labelFilter, setLabelFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState(null);
  
  const [form, setForm] = useState({ 
    claim_id: '', patient_name: '', provider_name: '', 
    amount: '', label: 'Fraud', notes: '' 
  });

  const flash = (type, text) => { 
    setMessage({ type, text }); 
    setTimeout(() => setMessage(null), 3000); 
  };

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  // 1. جلب البيانات المصنفة من Azure SQL
  const fetchLabeledData = async () => {
    setLoading(true);
    try {
      const data = await api.getLabeledData();
      setRecords(data || []);
    } catch (error) {
      flash('error', 'Failed to pull training data from Azure.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLabeledData();
  }, []);

  // 2. إضافة سجل يدوي (مثلاً حالة تم اكتشافها يدوياً)
  const handleAdd = async () => {
    if (!form.claim_id.trim()) { flash('error', 'Claim ID is essential'); return; }
    
    try {
      const payload = { ...form, amount: parseFloat(form.amount) || 0 };
      await api.createLabeledRecord(payload);
      
      flash('success', 'Record secured in training set');
      setShowAdd(false);
      setForm({ claim_id: '', patient_name: '', provider_name: '', amount: '', label: 'Fraud', notes: '' });
      fetchLabeledData();
    } catch (error) {
      flash('error', 'Database write failed');
    }
  };

  // 3. استيراد بيانات ضخمة (CSV) للتدريب
  const handleImport = async (rows) => {
    try {
      await api.importLabeledData(rows);
      flash('success', `${rows.length} ground-truth records imported`);
      fetchLabeledData();
    } catch (error) {
      flash('error', 'Bulk sync failed');
    }
  };

  // 4. منطق الفلترة
  const filtered = records
    .filter((r) => labelFilter === 'All' || r.label === labelFilter)
    .filter((r) => {
      const q = search.toLowerCase();
      return !search || r.claim_id?.toLowerCase().includes(q) || r.patient_name?.toLowerCase().includes(q);
    });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface border border-border p-5 rounded-xl">
          <p className="text-[10px] uppercase font-bold text-textSecondary mb-2">Total Training Set</p>
          <div className="flex items-center gap-3">
            <Database className="text-primary" size={20} />
            <p className="text-3xl font-mono text-textPrimary">{records.length}</p>
          </div>
        </div>
        <div className="bg-surface border border-border p-5 rounded-xl border-b-2 border-b-danger">
          <p className="text-[10px] uppercase font-bold text-textSecondary mb-2 text-danger">Fraud Samples</p>
          <p className="text-3xl font-mono text-danger">{records.filter(r => r.label === 'Fraud').length}</p>
        </div>
        <div className="bg-surface border border-border p-5 rounded-xl border-b-2 border-b-success">
          <p className="text-[10px] uppercase font-bold text-textSecondary mb-2 text-success">Clean Samples</p>
          <p className="text-3xl font-mono text-success">{records.filter(r => r.label === 'Real').length}</p>
        </div>
      </div>

      {/* Toolbar */}
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
            <option value="Real">Clean Only</option>
          </select>
          <button onClick={() => setShowAdd(true)} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:brightness-110">
            <Plus size={16} /> New Entry
          </button>
        </div>
      </div>

      <BulkActions 
        data={filtered} 
        onImport={handleImport} 
        filename="fraud_detection_ground_truth" 
        importLabel="Upload Audited Dataset"
      />

      {loading ? (
        <div className="py-20 text-center"><Loader className="animate-spin mx-auto text-primary" size={32} /></div>
      ) : (
        <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-bg/50 border-b border-border">
              <tr className="text-[10px] uppercase font-bold text-textSecondary tracking-wider">
                {COLUMNS.map(col => <th key={col.key} className="px-6 py-4">{col.label}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginated.map((r) => (
                <tr key={r.id} className="hover:bg-bg/30 transition-colors">
                  <td className="px-6 py-4 font-mono text-[10px] text-textSecondary">{r.id}</td>
                  <td className="px-6 py-4 font-mono text-xs text-primary font-bold">{r.claim_id}</td>
                  <td className="px-6 py-4 text-textPrimary">{r.patient_name || '—'}</td>
                  <td className="px-6 py-4 text-textSecondary text-xs">{r.provider_name || '—'}</td>
                  <td className="px-6 py-4 text-textPrimary font-mono">${(r.amount || 0).toLocaleString()}</td>
                  <td className="px-6 py-4"><StatusBadge status={r.label === 'Fraud' ? 'Fraud Confirmed' : 'Cleared'} /></td>
                  <td className="px-6 py-4 text-textSecondary text-[10px]">{r.claim_date}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="p-10 text-center text-textSecondary italic">No records match your filters.</div>}
        </div>
      )}

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Add Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Ground Truth Record">
        <div className="space-y-4 p-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase font-bold text-textSecondary mb-1">Claim ID *</label>
              <input type="text" value={form.claim_id} onChange={e => update('claim_id', e.target.value)} className="w-full bg-bg border border-border p-2 rounded text-sm text-textPrimary focus:border-primary outline-none" placeholder="e.g. CLM-123" />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-textSecondary mb-1">Final Label</label>
              <select value={form.label} onChange={e => update('label', e.target.value)} className="w-full bg-bg border border-border p-2 rounded text-sm text-textPrimary focus:border-primary outline-none">
                <option value="Fraud">Fraud (Confirmed)</option>
                <option value="Real">Real (Legitimate)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-textSecondary mb-1">Patient Name</label>
            <input type="text" value={form.patient_name} onChange={e => update('patient_name', e.target.value)} className="w-full bg-bg border border-border p-2 rounded text-sm text-textPrimary focus:border-primary outline-none" />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-textSecondary mb-1">Audit Notes</label>
            <textarea value={form.notes} onChange={e => update('notes', e.target.value)} className="w-full bg-bg border border-border p-2 rounded text-sm text-textPrimary focus:border-primary outline-none h-20" placeholder="Reason for this label..."></textarea>
          </div>
          <button onClick={handleAdd} className="w-full bg-primary text-white py-3 rounded-lg font-bold shadow-lg shadow-primary/20 hover:brightness-110 transition-all mt-4">Save to Training Set</button>
        </div>
      </Modal>
    </div>
  );
}