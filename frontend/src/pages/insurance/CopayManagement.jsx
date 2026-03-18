import { useState, useEffect, useMemo } from 'react';
import { DollarSign, Edit3, CheckCircle, AlertCircle, Search, Plus, Activity, Tag } from 'lucide-react';
import api from '../../api'; 
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import Skeleton from '../../components/Skeleton';

const PAGE_SIZE = 10;

export default function CopayManagement() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null); // للخدمة الجاري تعديلها
  const [adding, setAdding] = useState(false);  // لفتح نافذة إضافة خدمة جديدة
  const [newService, setNewService] = useState({ service_type: '', copay_amount: '' });
  const [message, setMessage] = useState(null);

  const flash = (type, text) => { 
    setMessage({ type, text }); 
    setTimeout(() => setMessage(null), 3000); 
  };

  // 1. جلب البيانات من جدول Service
  const fetchServices = async () => {
    setLoading(true);
    try {
      const data = await api.request('GET', '/api/services'); 
      setServices(data || []);
    } catch (error) {
      flash('error', 'Database connection failed. Could not load services.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  // 2. تحديث الكوباي لخدمة موجودة
  const handleUpdateCopay = async () => {
    if (!editing) return;
    try {
      const amount = parseFloat(editing.copay_amount);
      if (isNaN(amount) || amount < 0) {
        flash('error', 'Copay amount must be a valid positive number');
        return;
      }

      await api.request('PATCH', `/api/services/${editing.service_id}`, {
        copay_amount: amount
      });

      flash('success', `${editing.service_type} copay updated to $${amount}`);
      setEditing(null);
      fetchServices();
    } catch (error) {
      flash('error', 'Failed to update service in Azure SQL.');
    }
  };

  // 3. إضافة خدمة جديدة
  const handleAddService = async () => {
    try {
      if (!newService.service_type.trim()) {
        flash('error', 'Service Type name is required');
        return;
      }
      const amount = parseFloat(newService.copay_amount);
      if (isNaN(amount) || amount < 0) {
        flash('error', 'Copay amount must be a valid positive number');
        return;
      }

      await api.request('POST', '/api/services', {
        service_type: newService.service_type,
        copay_amount: amount
      });

      flash('success', 'New service added successfully!');
      setAdding(false);
      setNewService({ service_type: '', copay_amount: '' });
      fetchServices();
    } catch (error) {
      flash('error', 'Failed to add new service.');
    }
  };

  // 4. منطق البحث والفلترة
  const filtered = useMemo(() => {
    return services.filter(s => 
      s.service_type?.toLowerCase().includes(search.toLowerCase()) || 
      s.service_id?.toString().includes(search)
    );
  }, [services, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (loading) return <div className="p-10"><Skeleton rows={10} /></div>;

  return (
    <div className="space-y-6">
      {/* Header & Add Button */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-textPrimary flex items-center gap-2">
            <Activity className="text-primary" size={20} /> Service Copay Management
          </h2>
          <p className="text-xs text-textSecondary mt-1">Manage fixed out-of-pocket amounts for medical services.</p>
        </div>
        <button 
          onClick={() => setAdding(true)}
          className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-primary/90 flex items-center gap-2 shadow-lg shadow-primary/20 transition-all"
        >
          <Plus size={16} /> Add New Service
        </button>
      </div>

      {/* Flash Messages */}
      {message && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg border shadow-md animate-in fade-in ${
          message.type === 'success' ? 'bg-success/10 border-success/20 text-success' : 'bg-danger/10 border-danger/20 text-danger'
        }`}>
          {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface border border-border p-5 rounded-xl">
          <p className="text-[10px] text-textSecondary uppercase font-bold mb-2">Total Services</p>
          <div className="flex items-center gap-2">
            <Tag className="text-primary" size={20} />
            <p className="text-3xl font-mono text-textPrimary">{services.length}</p>
          </div>
        </div>
        <div className="bg-surface border border-border p-5 rounded-xl">
          <p className="text-[10px] text-textSecondary uppercase font-bold mb-2">Average Copay Amount</p>
          <div className="flex items-center gap-2">
            <DollarSign className="text-success" size={20} />
            <p className="text-3xl font-mono text-textPrimary">
                {(services.reduce((s, c) => s + (parseFloat(c.copay_amount) || 0), 0) / (services.length || 1)).toFixed(2)}
            </p>
          </div>
        </div>
        <div className="bg-surface border border-border p-5 rounded-xl border-l-4 border-l-warning">
          <p className="text-[10px] text-textSecondary uppercase font-bold mb-2">Highest Copay</p>
          <div className="flex items-center gap-2">
            <DollarSign className="text-warning" size={20} />
            <p className="text-3xl font-mono text-textPrimary">
              {Math.max(0, ...services.map(s => parseFloat(s.copay_amount) || 0)).toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-surface border border-border p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
          <input 
            type="text" placeholder="Search by Service Name or ID..." 
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2 bg-bg border border-border rounded-lg text-sm text-textPrimary focus:border-primary outline-none transition-all" 
          />
        </div>
      </div>

      {/* Table */}
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
              <tr key={s.service_id} className="hover:bg-primary/5 transition-colors group">
                <td className="px-6 py-4 font-mono text-xs text-textSecondary">SRV-{s.service_id}</td>
                <td className="px-6 py-4 text-textPrimary font-medium">{s.service_type}</td>
                <td className="px-6 py-4 text-center">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-success/10 text-success border border-success/20 font-mono">
                    ${parseFloat(s.copay_amount || 0).toFixed(2)}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => setEditing(s)}
                    className="p-2 text-textSecondary hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                    title="Edit Copay"
                  >
                    <Edit3 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-textSecondary italic">
                    No services found matching your search.
                  </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Edit Copay Modal */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Update Copay Amount">
        {editing && (
          <div className="space-y-6">
            <div className="bg-bg p-4 rounded-lg border border-border">
                <p className="text-xs text-textSecondary mb-1">Editing Service:</p>
                <p className="text-sm font-bold text-textPrimary">{editing.service_type}</p>
                <p className="text-[10px] font-mono text-primary mt-1">ID: SRV-{editing.service_id}</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-textSecondary uppercase mb-2 tracking-wider">New Copay Amount (USD)</label>
              <div className="relative">
                <input 
                  type="number" 
                  value={editing.copay_amount} 
                  onChange={e => setEditing({...editing, copay_amount: e.target.value})}
                  className="w-full pl-10 pr-4 py-3 bg-bg border border-border rounded-lg text-lg font-mono text-textPrimary focus:border-primary outline-none transition-all"
                  min="0" step="0.01"
                />
                <DollarSign size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-success" />
              </div>
            </div>

            <div className="flex gap-4 pt-4 border-t border-border">
              <button onClick={() => setEditing(null)} className="flex-1 py-3 border border-border rounded-lg text-sm font-bold text-textSecondary hover:bg-bg transition-all">Cancel</button>
              <button onClick={handleUpdateCopay} className="flex-1 py-3 bg-primary text-white rounded-lg font-bold shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all">
                Save Changes
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add New Service Modal */}
      <Modal open={adding} onClose={() => setAdding(false)} title="Add New Service">
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-textSecondary uppercase mb-2 tracking-wider">Service Type Name</label>
            <input 
              type="text" 
              placeholder="e.g., MRI Scan, Blood Test..."
              value={newService.service_type} 
              onChange={e => setNewService({...newService, service_type: e.target.value})}
              className="w-full px-4 py-3 bg-bg border border-border rounded-lg text-sm text-textPrimary focus:border-primary outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-textSecondary uppercase mb-2 tracking-wider">Fixed Copay Amount (USD)</label>
            <div className="relative">
              <input 
                type="number" 
                placeholder="0.00"
                value={newService.copay_amount} 
                onChange={e => setNewService({...newService, copay_amount: e.target.value})}
                className="w-full pl-10 pr-4 py-3 bg-bg border border-border rounded-lg text-lg font-mono text-textPrimary focus:border-primary outline-none transition-all"
                min="0" step="0.01"
              />
              <DollarSign size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-success" />
            </div>
          </div>

          <div className="flex gap-4 pt-4 border-t border-border">
            <button onClick={() => setAdding(false)} className="flex-1 py-3 border border-border rounded-lg text-sm font-bold text-textSecondary hover:bg-bg transition-all">Cancel</button>
            <button onClick={handleAddService} className="flex-1 py-3 bg-success text-white rounded-lg font-bold shadow-lg shadow-success/20 hover:brightness-110 active:scale-95 transition-all">
              Create Service
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}