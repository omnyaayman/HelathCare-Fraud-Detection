import { useState, useEffect } from 'react';
import { Plus, Trash2, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import api from '../../api'; 
import { PROVIDER_TYPES, SPECIALTIES, CITIES, STATES } from '../../constants'; 
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import SelectWithAdd from '../../components/SelectWithAdd';

const PAGE_SIZE = 10;

export default function ProviderManagement() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // أضفنا State للقوائم لتمكين إضافة خيارات جديدة لحظياً
  const [providerTypes, setProviderTypes] = useState(PROVIDER_TYPES);
  const [specialties, setSpecialties] = useState(SPECIALTIES);
  const [cities, setCities] = useState(CITIES);
  const [states, setStates] = useState(STATES);

  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [form, setForm] = useState({ name: '', type: '', specialty: '', city: '', state: '' });

  const flash = (type, text) => { setMessage({ type, text }); setTimeout(() => setMessage(null), 3000); };
  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const fetchProviders = async () => {
    setLoading(true);
    try {
      const data = await api.request('GET', '/api/providers-list');
      setProviders(data || []);
    } catch (error) {
      flash('error', 'Failed to load providers from Azure SQL');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const handleAdd = async () => {
    if (!form.name.trim() || !form.type) { 
      flash('error', 'Provider name and type are required'); 
      return; 
    }

    try {
      await api.request('POST', '/api/providers', form);
      flash('success', `Provider "${form.name}" added successfully`);
      setShowAdd(false);
      setForm({ name: '', type: '', specialty: '', city: '', state: '' });
      fetchProviders();
    } catch (error) {
      flash('error', 'Error saving provider to database');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.request('DELETE', `/api/providers/${id}`);
      flash('success', 'Provider removed from database');
      setConfirmDelete(null);
      fetchProviders();
    } catch (error) {
      flash('error', 'Failed to delete provider');
    }
  };

  const filtered = providers.filter((p) => {
    const q = search.toLowerCase();
    return !search || 
           p.name?.toLowerCase().includes(q) || 
           p.type?.toLowerCase().includes(q) ||
           p.specialty?.toLowerCase().includes(q);
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (loading) return (
    <div className="p-10 text-center">
      <Loader className="animate-spin mx-auto text-primary" />
      <p className="text-xs text-textSecondary mt-2">Connecting to SQL Server...</p>
    </div>
  );

  return (
    <div>
      {message && (
        <div className={`flex items-center gap-2 px-3 py-2.5 mb-4 rounded-md text-sm shadow-sm ${message.type === 'success' ? 'bg-success/10 border border-success/20 text-success' : 'bg-danger/10 border border-danger/20 text-danger'}`}>
          {message.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
          {message.text}
        </div>
      )}

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-surface border border-border rounded-lg p-4">
          <p className="text-xs text-textSecondary mb-1">Total Providers</p>
          <p className="text-2xl font-mono text-textPrimary">{providers.length}</p>
        </div>
        <div className="bg-surface border border-border rounded-lg p-4">
          <p className="text-xs text-textSecondary mb-1">Active Specialties</p>
          <p className="text-2xl font-mono text-textPrimary">{new Set(providers.map(p => p.specialty)).size}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <input type="text" placeholder="Search by name, type, or specialty..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full px-3 py-2 bg-surface border border-border rounded-md text-sm text-textPrimary placeholder-textSecondary/50 focus:outline-none focus:border-primary transition-all" />
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/30 text-primary rounded-md text-sm font-medium hover:bg-primary/20 transition-all">
          <Plus size={16} /> Add Provider
        </button>
      </div>

      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-bg/50 border-b border-border">
              <tr>
                <th className="px-4 py-3 text-xs text-textSecondary font-medium uppercase tracking-wider">ID</th>
                <th className="px-4 py-3 text-xs text-textSecondary font-medium uppercase tracking-wider">Hospital Name</th>
                <th className="px-4 py-3 text-xs text-textSecondary font-medium uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-xs text-textSecondary font-medium uppercase tracking-wider">Specialty</th>
                <th className="px-4 py-3 text-right text-xs text-textSecondary font-medium uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-bg/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-primary">{p.id}</td>
                  <td className="px-4 py-3 text-textPrimary font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-textSecondary text-xs">{p.type}</td>
                  <td className="px-4 py-3 text-textSecondary text-xs">{p.specialty || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setConfirmDelete(p)} className="p-1.5 text-textSecondary hover:text-danger hover:bg-danger/10 rounded-md transition-all"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-4 py-10 text-center text-textSecondary italic">No providers found matching your search.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Add Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Register New Provider">
        <div className="space-y-4 p-1">
          <div>
            <label className="block text-xs text-textSecondary mb-1.5 font-medium">Hospital Name *</label>
            <input type="text" value={form.name} onChange={(e) => update('name', e.target.value)} className="w-full px-3 py-2 bg-bg border border-border rounded-md text-sm text-textPrimary focus:border-primary outline-none" placeholder="e.g. City General Hospital" />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SelectWithAdd label="Type *" value={form.type} options={providerTypes} onChange={v => update('type', v)} onAddNew={v => setProviderTypes([...providerTypes, v])} />
            <SelectWithAdd label="Specialty" value={form.specialty} options={specialties} onChange={v => update('specialty', v)} onAddNew={v => setSpecialties([...specialties, v])} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SelectWithAdd label="City" value={form.city} options={cities} onChange={v => update('city', v)} onAddNew={v => setCities([...cities, v])} />
            <SelectWithAdd label="State" value={form.state} options={states} onChange={v => update('state', v)} onAddNew={v => setStates([...states, v])} />
          </div>

          <div className="flex gap-3 mt-6 pt-4 border-t border-border">
            <button onClick={() => setShowAdd(false)} className="flex-1 py-2 border border-border rounded-md text-sm font-medium text-textSecondary hover:bg-bg transition-all">Cancel</button>
            <button onClick={handleAdd} className="flex-1 py-2 bg-primary text-white rounded-md text-sm font-bold hover:opacity-90 shadow-lg shadow-primary/20 transition-all">Save Provider</button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Provider">
        <div className="p-2 text-center">
          <div className="w-12 h-12 bg-danger/10 text-danger rounded-full flex items-center justify-center mx-auto mb-4">
            <Trash2 size={24} />
          </div>
          <p className="text-sm text-textSecondary mb-6">
            Are you sure you want to remove <span className="font-bold text-textPrimary">{confirmDelete?.name}</span>? 
            <br /> <span className="text-xs text-danger mt-1 block">This action is permanent in Azure SQL.</span>
          </p>
          <div className="flex gap-3">
            <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2 border border-border rounded-md text-sm font-medium text-textSecondary hover:bg-bg">Cancel</button>
            <button onClick={() => handleDelete(confirmDelete.id)} className="flex-1 py-2 bg-danger text-white rounded-md text-sm font-bold hover:bg-danger/90 transition-all">Confirm Delete</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}