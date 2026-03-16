import { useState } from 'react';
import { CheckCircle, AlertCircle, Save } from 'lucide-react';
import { MOCK_PATIENTS } from '../../mockData';
import Pagination from '../../components/Pagination';

const PAGE_SIZE = 10;

export default function CopayManagement() {
  const [patients, setPatients] = useState(() => MOCK_PATIENTS.map((p) => ({ ...p })));
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editId, setEditId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [message, setMessage] = useState(null);

  const flash = (type, text) => { setMessage({ type, text }); setTimeout(() => setMessage(null), 3000); };

  const today = new Date().toISOString().slice(0, 10);

  const startEdit = (patient) => {
    setEditId(patient.patient_id);
    setEditValue(String(patient.copay));
  };

  const cancelEdit = () => { setEditId(null); setEditValue(''); };

  const saveEdit = (patientId) => {
    const val = Number(editValue);
    if (isNaN(val) || val < 0) { flash('error', 'Invalid copay amount'); return; }
    setPatients((prev) => prev.map((p) => p.patient_id === patientId ? { ...p, copay: val } : p));
    setEditId(null);
    setEditValue('');
    flash('success', 'Copay updated');
  };

  const handleBulkUpdate = (amount) => {
    setPatients((prev) => prev.map((p) => p.policy_end >= today ? { ...p, copay: amount } : p));
    flash('success', `All active patients updated to $${amount} copay`);
  };

  const filtered = patients.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.patient_id.toLowerCase().includes(q) || p.policy_id.toLowerCase().includes(q);
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const activePatients = patients.filter((p) => p.policy_end >= today);
  const avgCopay = activePatients.length > 0 ? activePatients.reduce((s, p) => s + p.copay, 0) / activePatients.length : 0;
  const minCopay = activePatients.length > 0 ? Math.min(...activePatients.map((p) => p.copay)) : 0;
  const maxCopay = activePatients.length > 0 ? Math.max(...activePatients.map((p) => p.copay)) : 0;

  return (
    <div>
      {message && (
        <div className={`flex items-center gap-2 px-3 py-2.5 mb-4 rounded-md text-sm ${message.type === 'success' ? 'bg-success/10 border border-success/20 text-success' : 'bg-danger/10 border border-danger/20 text-danger'}`}>
          {message.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
          {message.text}
        </div>
      )}

      <p className="text-xs text-textSecondary mb-5">Manage copay amounts for insured patients. Click a copay value to edit it.</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="text-xs text-textSecondary mb-1">Active Patients</div>
          <div className="text-xl font-mono text-textPrimary">{activePatients.length}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="text-xs text-textSecondary mb-1">Avg Copay</div>
          <div className="text-xl font-mono text-primary">${avgCopay.toFixed(2)}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="text-xs text-textSecondary mb-1">Min Copay</div>
          <div className="text-xl font-mono text-success">${minCopay}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="text-xs text-textSecondary mb-1">Max Copay</div>
          <div className="text-xl font-mono text-warning">${maxCopay}</div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <input type="text" placeholder="Search by name, ID, or policy..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 px-3 py-2 bg-surface border border-border rounded-md text-sm text-textPrimary placeholder-textSecondary/50 focus:outline-none focus:border-primary transition-colors duration-150" />
        <div className="flex gap-2">
          {[20, 30, 40, 50].map((amt) => (
            <button key={amt} onClick={() => handleBulkUpdate(amt)}
              className="px-3 py-2 text-xs bg-surface border border-border rounded-md text-textSecondary hover:text-textPrimary hover:border-textSecondary transition-colors duration-150">
              Set all ${amt}
            </button>
          ))}
        </div>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface">
                <th className="text-left px-4 py-3 text-xs text-textSecondary font-medium">Patient</th>
                <th className="text-left px-4 py-3 text-xs text-textSecondary font-medium hidden md:table-cell">Policy ID</th>
                <th className="text-left px-4 py-3 text-xs text-textSecondary font-medium hidden lg:table-cell">Policy Period</th>
                <th className="text-left px-4 py-3 text-xs text-textSecondary font-medium">Status</th>
                <th className="text-left px-4 py-3 text-xs text-textSecondary font-medium hidden md:table-cell">Deductible</th>
                <th className="text-left px-4 py-3 text-xs text-textSecondary font-medium">Copay</th>
                <th className="text-right px-4 py-3 text-xs text-textSecondary font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((p) => {
                const active = p.policy_end >= today;
                const isEditing = editId === p.patient_id;
                return (
                  <tr key={p.patient_id} className="border-b border-border last:border-0 hover:bg-[#1c2128] transition-colors duration-100">
                    <td className="px-4 py-3">
                      <div className="text-textPrimary">{p.name}</div>
                      <div className="text-xs text-textSecondary font-mono">{p.patient_id}</div>
                    </td>
                    <td className="px-4 py-3 text-textPrimary font-mono text-xs hidden md:table-cell">{p.policy_id}</td>
                    <td className="px-4 py-3 text-textSecondary text-xs hidden lg:table-cell">{p.policy_start} — {p.policy_end}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded border ${active ? 'bg-success/10 border-success/20 text-success' : 'bg-danger/10 border-danger/20 text-danger'}`}>{active ? 'Active' : 'Expired'}</span></td>
                    <td className="px-4 py-3 text-textPrimary text-xs hidden md:table-cell">${p.annual_deductible.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <span className="text-textSecondary text-xs">$</span>
                          <input type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(p.patient_id); if (e.key === 'Escape') cancelEdit(); }}
                            className="w-16 px-2 py-1 bg-[#0d1117] border border-primary rounded text-sm text-textPrimary focus:outline-none"
                            autoFocus />
                        </div>
                      ) : (
                        <button onClick={() => startEdit(p)} className="text-primary font-mono text-sm hover:underline">${p.copay}</button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isEditing ? (
                        <div className="flex justify-end gap-1">
                          <button onClick={() => saveEdit(p.patient_id)} className="p-1.5 text-success hover:text-success/80 transition-colors duration-150"><Save size={14} /></button>
                          <button onClick={cancelEdit} className="p-1.5 text-textSecondary hover:text-textPrimary text-xs transition-colors duration-150">Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => startEdit(p)} className="text-xs text-textSecondary hover:text-primary transition-colors duration-150">Edit</button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {paginated.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-textSecondary">No patients found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
