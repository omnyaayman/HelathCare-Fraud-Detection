import { useState, useEffect, useMemo, useCallback } from 'react';
import { DollarSign, Edit3, CheckCircle, AlertCircle, Search, Plus, Activity, Tag, Trash2 } from 'lucide-react';
import api from '../../api';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import Skeleton from '../../components/Skeleton';

const PAGE_SIZE = 10;

const parseCopayAmount = (value) => {
  const num = parseFloat(value);
  if (Number.isNaN(num) || !Number.isFinite(num) || num < 0) return null;
  return num;
};

const formatCurrency = (value) => {
  const num = parseCopayAmount(value);
  return (num ?? 0).toFixed(2);
};

export default function CopayManagement() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [newService, setNewService] = useState({ service_name: '', copay_amount: '' });
  const [message, setMessage] = useState(null);

  const flash = useCallback((type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  }, []);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const data = await api.getServices();
      setServices(Array.isArray(data) ? data : []);
    } catch (error) {
      setFetchError('Database connection failed. Could not load services.');
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const handleUpdateCopay = useCallback(async () => {
    if (!editing?.service_id) return;
    const amount = parseCopayAmount(editing.copay_amount);
    if (amount === null) {
      flash('error', 'Copay amount must be a valid positive number');
      return;
    }
    try {
      await api.updateService(editing.service_id, { service_name: editing.service_name, copay_amount: amount });
      flash('success', 'Copay updated successfully.');
      setEditing(null);
      fetchServices();
    } catch (error) {
      flash('error', 'Failed to update service.');
    }
  }, [editing, flash, fetchServices]);

  const handleAddService = useCallback(async () => {
    const serviceName = newService.service_name?.trim();
    if (!serviceName) {
      flash('error', 'Service Type name is required');
      return;
    }
    const amount = parseCopayAmount(newService.copay_amount);
    if (amount === null) {
      flash('error', 'Copay amount must be a valid positive number');
      return;
    }
    try {
      await api.createService({ service_name: serviceName, copay_amount: amount });
      flash('success', 'New service added successfully!');
      setAdding(false);
      setNewService({ service_name: '', copay_amount: '' });
      fetchServices();
    } catch (error) {
      flash('error', 'Failed to add service.');
    }
  }, [newService, flash, fetchServices]);

  const handleDeleteService = useCallback(async (id) => {
    if (!window.confirm('Are you sure you want to delete this service?')) return;
    try {
      await api.deleteService(id);
      flash('success', 'Service deleted successfully!');
      fetchServices();
    } catch (error) {
      flash('error', 'Failed to delete service.');
    }
  }, [flash, fetchServices]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return services;
    return services.filter((s) =>
      s?.service_name?.toLowerCase().includes(query) ||
      s?.service_id?.toString().includes(query)
    );
  }, [services, search]);

  const { totalPages, paginated } = useMemo(() => {
    const total = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const start = (page - 1) * PAGE_SIZE;
    return {
      totalPages: total,
      paginated: filtered.slice(start, start + PAGE_SIZE),
    };
  }, [filtered, page]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const { totalServices, averageCopay, highestCopay } = useMemo(() => {
    const validAmounts = services
      .map((s) => parseCopayAmount(s?.copay_amount))
      .filter((n) => n !== null);

    const average = validAmounts.length ? validAmounts.reduce((sum, n) => sum + n, 0) / validAmounts.length : 0;
    const highest = validAmounts.length ? Math.max(...validAmounts) : 0;

    return {
      totalServices: services.length,
      averageCopay: average,
      highestCopay: highest,
    };
  }, [services]);

  if (loading) return <div className="p-10"><Skeleton rows={10} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-textPrimary flex items-center gap-2">
            <Activity className="text-primary" size={20} /> Service Copay Management
          </h2>
          <p className="text-xs text-textSecondary mt-1">Manage fixed out-of-pocket amounts for medical services.</p>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold hover:brightness-110 flex items-center gap-2 shadow-lg shadow-primary/20 transition-all"
        >
          <Plus size={16} /> Add New Service
        </button>
      </div>

      {message && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg border shadow-md animate-in fade-in ${
          message.type === 'success' ? 'bg-success/10 border-success/20 text-success' : 'bg-danger/10 border-danger/20 text-danger'
        }`}>
          {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      {fetchError && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg border shadow-md bg-danger/10 border-danger/20 text-danger">
          <AlertCircle size={16} />
          <p className="text-sm font-medium">{fetchError}</p>
          <button onClick={fetchServices} className="ml-auto text-xs font-bold underline hover:no-underline">Retry</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface border border-border p-5 rounded-xl">
          <p className="text-[10px] text-textSecondary uppercase font-bold mb-2">Total Services</p>
          <div className="flex items-center gap-2">
            <Tag className="text-primary" size={20} />
            <p className="text-3xl font-mono text-textPrimary">{totalServices}</p>
          </div>
        </div>
        <div className="bg-surface border border-border p-5 rounded-xl">
          <p className="text-[10px] text-textSecondary uppercase font-bold mb-2">Average Copay Amount</p>
          <div className="flex items-center gap-2">
            <DollarSign className="text-success" size={20} />
            <p className="text-3xl font-mono text-textPrimary">{formatCurrency(averageCopay)}</p>
          </div>
        </div>
        <div className="bg-surface border border-border p-5 rounded-xl border-l-4 border-l-warning">
          <p className="text-[10px] text-textSecondary uppercase font-bold mb-2">Highest Copay</p>
          <div className="flex items-center gap-2">
            <DollarSign className="text-warning" size={20} />
            <p className="text-3xl font-mono text-textPrimary">{formatCurrency(highestCopay)}</p>
          </div>
        </div>
      </div>

      <div className="bg-surface border border-border p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
          <input
            type="text" placeholder="Search by Service Name or ID..."
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2 bg-bg border border-border rounded-lg text-sm text-textPrimary focus:border-primary outline-none transition-all"
          />
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-bg/50 border-b border-border">
            <tr className="text-[10px] text-textSecondary uppercase font-bold tracking-wider">
              <th className="px-6 py-4">Service ID</th>
              <th className="px-6 py-4">Service Type</th>
              <th className="px-6 py-4 text-center">Copay Amount</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginated.map((s) => (
              <tr key={s?.service_id} className="hover:bg-primary/5 transition-colors group">
                <td className="px-6 py-4 font-mono text-xs text-textSecondary">
                  {s?.service_id !== undefined && s?.service_id !== null ? `SRV-${s.service_id}` : 'N/A'}
                </td>
                <td className="px-6 py-4 text-textPrimary font-medium">{s?.service_name || 'Unnamed Service'}</td>
                <td className="px-6 py-4 text-center">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-success/10 text-success border border-success/20 font-mono">
                    ${formatCurrency(s?.copay_amount)}
                  </span>
                </td>
                <td className="px-6 py-4 text-right flex gap-2 justify-end">
                  <button onClick={() => setEditing(s)} className="p-2 text-textSecondary hover:text-primary hover:bg-primary/10 rounded-lg transition-all">
                    <Edit3 size={16} />
                  </button>
                  <button onClick={() => handleDeleteService(s.service_id)} className="p-2 text-textSecondary hover:text-danger hover:bg-danger/10 rounded-lg transition-all">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {!fetchError && filtered.length === 0 && (
              <tr>
                <td colSpan="4" className="px-6 py-12 text-center text-textSecondary italic">
                  {services.length === 0 ? 'No services have been added yet.' : 'No services found matching your search.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Update Copay Amount">
        {editing && (
          <div className="space-y-4 p-2">
            <div className="bg-bg p-4 rounded-lg border border-border">
              <p className="text-xs text-textSecondary mb-1">Editing Service:</p>
              <p className="text-sm font-bold text-textPrimary">{editing.service_name || 'Unnamed Service'}</p>
              <p className="text-[10px] font-mono text-primary mt-1">
                ID: {editing.service_id !== undefined && editing.service_id !== null ? `SRV-${editing.service_id}` : 'N/A'}
              </p>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-textSecondary mb-1">Service Name</label>
              <input
                type="text"
                value={editing.service_name}
                onChange={(e) => setEditing({ ...editing, service_name: e.target.value })}
                className="w-full px-4 py-2 bg-bg border border-border rounded-lg text-sm text-textPrimary focus:border-primary outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-textSecondary uppercase mb-2 tracking-wider">New Copay Amount (USD)</label>
              <div className="relative">
                <input
                  type="number"
                  value={editing.copay_amount ?? ''}
                  onChange={(e) => setEditing({ ...editing, copay_amount: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-bg border border-border rounded-lg text-lg font-mono text-textPrimary focus:border-primary outline-none transition-all"
                  min="0" step="0.01"
                />
                <DollarSign size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-success" />
              </div>
            </div>
            <div className="flex gap-4 pt-4 border-t border-border">
              <button onClick={() => setEditing(null)} className="flex-1 py-3 border border-border rounded-lg text-sm font-bold text-textSecondary hover:bg-bg transition-all">Cancel</button>
              <button onClick={handleUpdateCopay} className="flex-1 py-3 bg-primary text-white rounded-lg font-bold shadow-lg shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all">
                Save Changes
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={adding} onClose={() => setAdding(false)} title="Add New Service">
        <div className="space-y-4 p-2">
          <div>
            <label className="block text-[10px] uppercase font-bold text-textSecondary mb-1">Service Type Name</label>
            <input
              type="text"
              placeholder="e.g., MRI Scan, Blood Test..."
              value={newService.service_name}
              onChange={(e) => setNewService({ ...newService, service_name: e.target.value })}
              className="w-full px-4 py-3 bg-bg border border-border rounded-lg text-sm text-textPrimary focus:border-primary outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-textSecondary mb-1">Fixed Copay Amount (USD)</label>
            <div className="relative">
              <input
                type="number"
                placeholder="0.00"
                value={newService.copay_amount}
                onChange={(e) => setNewService({ ...newService, copay_amount: e.target.value })}
                className="w-full pl-10 pr-4 py-3 bg-bg border border-border rounded-lg text-lg font-mono text-textPrimary focus:border-primary outline-none transition-all"
                min="0" step="0.01"
              />
              <DollarSign size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-success" />
            </div>
          </div>
          <div className="flex gap-4 pt-4 border-t border-border">
            <button onClick={() => setAdding(false)} className="flex-1 py-3 border border-border rounded-lg text-sm font-bold text-textSecondary hover:bg-bg transition-all">Cancel</button>
            <button onClick={handleAddService} className="flex-1 py-3 bg-success text-white rounded-lg font-bold shadow-lg shadow-success/20 hover:brightness-110 active:scale-[0.98] transition-all">
              Create Service
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
