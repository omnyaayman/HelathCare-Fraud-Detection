import { useState } from 'react';
import { Plus, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import { MOCK_PROVIDERS, PROVIDER_TYPES, SPECIALTIES, CITIES, STATES } from '../../mockData';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import SelectWithAdd from '../../components/SelectWithAdd';

const PAGE_SIZE = 10;

function generateId() {
  return 'PRV-' + String(Math.floor(Math.random() * 900) + 100);
}

export default function ProviderManagement() {
  const [providers, setProviders] = useState([...MOCK_PROVIDERS]);
  const [providerTypes, setProviderTypes] = useState([...PROVIDER_TYPES]);
  const [specialties, setSpecialties] = useState([...SPECIALTIES]);
  const [cities, setCities] = useState([...CITIES]);
  const [states, setStates] = useState([...STATES]);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [form, setForm] = useState({ name: '', type: '', specialty: '', city: '', state: '' });

  const flash = (type, text) => { setMessage({ type, text }); setTimeout(() => setMessage(null), 3000); };
  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleAdd = () => {
    if (!form.name.trim()) { flash('error', 'Provider name is required'); return; }
    if (!form.type) { flash('error', 'Provider type is required'); return; }
    const provider = { id: generateId(), ...form };
    setProviders((prev) => [provider, ...prev]);
    setForm({ name: '', type: '', specialty: '', city: '', state: '' });
    setShowAdd(false);
    flash('success', `Provider "${provider.name}" added`);
  };

  const handleDelete = (id) => {
    setProviders((prev) => prev.filter((p) => p.id !== id));
    setConfirmDelete(null);
    flash('success', 'Provider removed');
  };

  const filtered = providers.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.type.toLowerCase().includes(q) || p.specialty.toLowerCase().includes(q) || p.city.toLowerCase().includes(q);
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      {message && (
        <div className={`flex items-center gap-2 px-3 py-2.5 mb-4 rounded-md text-sm ${message.type === 'success' ? 'bg-success/10 border border-success/20 text-success' : 'bg-danger/10 border border-danger/20 text-danger'}`}>
          {message.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="text-xs text-textSecondary mb-1">Total Providers</div>
          <div className="text-xl font-mono text-textPrimary">{providers.length}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="text-xs text-textSecondary mb-1">Types</div>
          <div className="text-xl font-mono text-textPrimary">{new Set(providers.map((p) => p.type)).size}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="text-xs text-textSecondary mb-1">Specialties</div>
          <div className="text-xl font-mono text-textPrimary">{new Set(providers.map((p) => p.specialty)).size}</div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-5">
        <input
          type="text"
          placeholder="Search providers..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 px-3 py-2 bg-surface border border-border rounded-md text-sm text-textPrimary placeholder-textSecondary/50 focus:outline-none focus:border-primary transition-colors duration-150"
        />
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-3 py-2 text-sm bg-primary/15 border border-primary/30 rounded-md text-primary hover:bg-primary/25 transition-colors duration-150 whitespace-nowrap">
          <Plus size={14} />Add Provider
        </button>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface">
                <th className="text-left px-4 py-3 text-xs text-textSecondary font-medium">ID</th>
                <th className="text-left px-4 py-3 text-xs text-textSecondary font-medium">Name</th>
                <th className="text-left px-4 py-3 text-xs text-textSecondary font-medium">Type</th>
                <th className="text-left px-4 py-3 text-xs text-textSecondary font-medium hidden md:table-cell">Specialty</th>
                <th className="text-left px-4 py-3 text-xs text-textSecondary font-medium hidden lg:table-cell">City</th>
                <th className="text-left px-4 py-3 text-xs text-textSecondary font-medium hidden lg:table-cell">State</th>
                <th className="text-right px-4 py-3 text-xs text-textSecondary font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-[#1c2128] transition-colors duration-100">
                  <td className="px-4 py-3 text-textPrimary font-mono text-xs">{p.id}</td>
                  <td className="px-4 py-3 text-textPrimary">{p.name}</td>
                  <td className="px-4 py-3 text-textSecondary text-xs">{p.type}</td>
                  <td className="px-4 py-3 text-textSecondary text-xs hidden md:table-cell">{p.specialty || '—'}</td>
                  <td className="px-4 py-3 text-textSecondary text-xs hidden lg:table-cell">{p.city || '—'}</td>
                  <td className="px-4 py-3 text-textSecondary text-xs hidden lg:table-cell">{p.state || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setConfirmDelete(p)} className="p-1.5 text-textSecondary hover:text-danger transition-colors duration-150"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-textSecondary">No providers found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Add Provider Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Provider">
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-textSecondary mb-1.5">Provider Name *</label>
            <input type="text" value={form.name} onChange={(e) => update('name', e.target.value)} className="w-full px-3 py-2 bg-[#0d1117] border border-[#383e47] rounded-md text-sm text-textPrimary placeholder-textSecondary/50 focus:outline-none focus:border-primary transition-colors duration-150" placeholder="e.g. City General Hospital" />
          </div>
          <SelectWithAdd label="Provider Type *" value={form.type} options={providerTypes} onChange={(v) => update('type', v)} onAddNew={(v) => { setProviderTypes((prev) => [...prev, v]); update('type', v); }} placeholder="Select type" />
          <SelectWithAdd label="Specialty" value={form.specialty} options={specialties} onChange={(v) => update('specialty', v)} onAddNew={(v) => { setSpecialties((prev) => [...prev, v]); update('specialty', v); }} placeholder="Select specialty" />
          <div className="grid grid-cols-2 gap-4">
            <SelectWithAdd label="City" value={form.city} options={cities} onChange={(v) => update('city', v)} onAddNew={(v) => { setCities((prev) => [...prev, v]); update('city', v); }} placeholder="Select city" />
            <SelectWithAdd label="State" value={form.state} options={states} onChange={(v) => update('state', v)} onAddNew={(v) => { setStates((prev) => [...prev, v]); update('state', v); }} placeholder="Select state" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm border border-border rounded-md text-textSecondary hover:text-textPrimary hover:border-textSecondary transition-colors duration-150">Cancel</button>
            <button onClick={handleAdd} className="px-4 py-2 text-sm bg-primary/15 border border-primary/30 rounded-md text-primary hover:bg-primary/25 transition-colors duration-150">Add Provider</button>
          </div>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Confirm Delete">
        {confirmDelete && (
          <div>
            <p className="text-sm text-textSecondary mb-4">Remove provider <span className="text-textPrimary font-medium">{confirmDelete.name}</span>? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm border border-border rounded-md text-textSecondary hover:text-textPrimary hover:border-textSecondary transition-colors duration-150">Cancel</button>
              <button onClick={() => handleDelete(confirmDelete.id)} className="px-4 py-2 text-sm bg-danger/15 border border-danger/30 rounded-md text-danger hover:bg-danger/25 transition-colors duration-150">Delete</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
