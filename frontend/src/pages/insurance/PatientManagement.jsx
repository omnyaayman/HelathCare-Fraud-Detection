import { useState, useEffect } from 'react';
import { Plus, Trash2, Pencil, CheckCircle, AlertCircle, Loader, Search, Users } from 'lucide-react';
import api from '../../api'; 
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import BulkActions from '../../components/BulkActions';

const PAGE_SIZE = 10;

export default function PatientManagement() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [policyFilter, setPolicyFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    policy_id: '', name: '', age: '', gender: 'Male', city: '', state: '',
    annual_deductible: '', policy_start: '', policy_end: '', copay: '',
  });

  const flash = (type, text) => { setMessage({ type, text }); setTimeout(() => setMessage(null), 3000); };
  const today = new Date().toISOString().slice(0, 10);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const data = await api.getPatients();
      setPatients(data || []);
    } catch (error) {
      flash('error', 'Failed to connect to Azure SQL Server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleAdd = async () => {
    if (!form.name.trim() || !form.policy_id.trim()) {
      flash('error', 'Name and Policy ID are required');
      return;
    }
    try {
      await api.createPatient(form);
      flash('success', `Patient "${form.name}" added to Azure DB`);
      setShowAdd(false);
      setForm({ policy_id: '', name: '', age: '', gender: 'Male', city: '', state: '', annual_deductible: '', policy_start: '', policy_end: '', copay: '' }); // Reset
      fetchPatients();
    } catch (error) {
      flash('error', 'Error saving to Database');
    }
  };

  const handleSaveEdit = async () => {
    try {
      await api.updatePatient(editing.patient_id, editing);
      flash('success', 'Patient updated in Azure SQL');
      setEditing(null);
      fetchPatients();
    } catch (error) {
      flash('error', 'Failed to update record');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deletePatient(id);
      flash('success', 'Patient removed from Database');
      setConfirmDelete(null);
      fetchPatients();
    } catch (error) {
      flash('error', 'Delete operation failed');
    }
  };

  const handleImport = async (rows) => {
    try {
      await api.importPatients(rows);
      flash('success', `${rows.length} patients imported to Azure`);
      fetchPatients();
    } catch (error) {
      flash('error', 'Bulk import failed');
    }
  };

  // Logic للبحث والفلترة
  const filtered = patients.filter((p) => {
    const q = search.toLowerCase();
    const matchesSearch = !search || p.name?.toLowerCase().includes(q) || p.policy_id?.toLowerCase().includes(q);
    const isActive = p.policy_end >= today;
    const matchesPolicy = policyFilter === 'All' || (policyFilter === 'Active' ? isActive : !isActive);
    return matchesSearch && matchesPolicy;
  });

  // حسابات الـ Pagination
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (loading) return (
    <div className="p-20 text-center">
      <Loader className="animate-spin mx-auto text-primary" size={32} />
      <p className="text-sm text-textSecondary mt-4">Syncing with Azure SQL Server...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {message && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg border shadow-sm ${message.type === 'success' ? 'bg-success/10 border-success/20 text-success' : 'bg-danger/10 border-danger/20 text-danger'}`}>
          {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          <span className="text-sm font-medium">{message.text}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface border border-border p-5 rounded-xl">
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs text-textSecondary uppercase font-semibold">Total Patients</p>
            <Users size={16} className="text-primary" />
          </div>
          <p className="text-3xl font-mono text-textPrimary">{patients.length}</p>
        </div>
        <div className="bg-surface border border-border p-5 rounded-xl border-l-4 border-l-success">
          <p className="text-xs text-textSecondary uppercase font-semibold mb-2">Active Policies</p>
          <p className="text-3xl font-mono text-success">{patients.filter(p => p.policy_end >= today).length}</p>
        </div>
        <div className="bg-surface border border-border p-5 rounded-xl border-l-4 border-l-danger">
          <p className="text-xs text-textSecondary uppercase font-semibold mb-2">Expired Policies</p>
          <p className="text-3xl font-mono text-danger">{patients.filter(p => p.policy_end < today).length}</p>
        </div>
      </div>

      {/* Search & Actions Bar */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-center bg-surface p-4 border border-border rounded-xl">
        <div className="relative w-full lg:w-96">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
          <input 
            type="text" 
            placeholder="Search by name or policy ID..." 
            value={search} 
            onChange={e => { setSearch(e.target.value); setPage(1); }} 
            className="w-full bg-bg border border-border pl-10 pr-4 py-2 rounded-lg text-sm focus:border-primary outline-none transition-all" 
          />
        </div>

        <div className="flex items-center gap-2 bg-bg p-1 rounded-lg border border-border">
          {['All', 'Active', 'Expired'].map(f => (
            <button 
              key={f}
              onClick={() => { setPolicyFilter(f); setPage(1); }}
              className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${policyFilter === f ? 'bg-surface text-primary shadow-sm' : 'text-textSecondary hover:text-textPrimary'}`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="flex gap-2 w-full lg:w-auto">
          <BulkActions data={filtered} onImport={handleImport} filename="azure_patients_export" />
          <button onClick={() => setShowAdd(true)} className="flex-1 lg:flex-none bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
            <Plus size={16}/> Add Patient
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-bg/50 border-b border-border">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-textSecondary uppercase tracking-wider">Patient Name</th>
                <th className="px-6 py-4 text-xs font-bold text-textSecondary uppercase tracking-wider">Policy ID</th>
                <th className="px-6 py-4 text-xs font-bold text-textSecondary uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-textSecondary uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginated.map((p) => (
                <tr key={p.patient_id} className="hover:bg-bg/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-textPrimary">{p.name}</div>
                    <div className="text-xs text-textSecondary">{p.gender}, {p.age}y</div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-primary font-semibold">{p.policy_id}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${p.policy_end >= today ? 'bg-success/10 text-success border-success/20' : 'bg-danger/10 text-danger border-danger/20'}`}>
                      {p.policy_end >= today ? 'Active' : 'Expired'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button onClick={() => setEditing(p)} className="p-2 text-textSecondary hover:text-primary hover:bg-primary/10 rounded-lg transition-all"><Pencil size={14}/></button>
                    <button onClick={() => setConfirmDelete(p)} className="p-2 text-textSecondary hover:text-danger hover:bg-danger/10 rounded-lg transition-all"><Trash2 size={14}/></button>
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-textSecondary italic">No patients found in Azure SQL.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Modals placeholders - Ensure they are connected to handleAdd, handleSaveEdit, etc. */}
    </div>
  );
}