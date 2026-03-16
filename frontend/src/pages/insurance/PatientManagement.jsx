import { useState } from 'react';
import { Plus, Trash2, Pencil, CheckCircle, AlertCircle } from 'lucide-react';
import { MOCK_PATIENTS } from '../../mockData';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import BulkActions from '../../components/BulkActions';

const PAGE_SIZE = 10;

const COLUMNS = [
  { key: 'patient_id', label: 'Patient ID' },
  { key: 'name', label: 'Name' },
  { key: 'age', label: 'Age' },
  { key: 'gender', label: 'Gender' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'policy_id', label: 'Policy ID' },
  { key: 'member_id', label: 'Member ID' },
  { key: 'annual_deductible', label: 'Deductible' },
  { key: 'policy_start', label: 'Policy Start' },
  { key: 'policy_end', label: 'Policy End' },
  { key: 'copay', label: 'Copay ($)' },
];

function generateId() {
  return 'PAT-' + String(Math.floor(Math.random() * 90000) + 10000);
}
function generatePolicyId(existing) {
  const ids = new Set(existing.map((p) => p.policy_id));
  let id;
  do { id = 'XAI' + String(Math.floor(Math.random() * 900000000) + 100000000).padStart(9, '0'); } while (ids.has(id));
  return id;
}

export default function PatientManagement() {
  const [patients, setPatients] = useState([...MOCK_PATIENTS]);
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [policyFilter, setPolicyFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [form, setForm] = useState({
    policy_id: '', name: '', age: '', gender: 'Male', city: '', state: '',
    annual_deductible: '', policy_start: '', policy_end: '', copay: '',
  });
  const [editing, setEditing] = useState(null); // patient being edited
  const [editForm, setEditForm] = useState({});

  const policyExists = (id, excludePatientId) => patients.some((p) => p.policy_id === id && p.patient_id !== excludePatientId);

  const flash = (type, text) => { setMessage({ type, text }); setTimeout(() => setMessage(null), 3000); };
  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  const today = new Date().toISOString().slice(0, 10);

  const openAddModal = () => {
    const newPolicyId = generatePolicyId(patients);
    setForm({ policy_id: newPolicyId, name: '', age: '', gender: 'Male', city: '', state: '', annual_deductible: '', policy_start: '', policy_end: '', copay: '' });
    setShowAdd(true);
  };

  const handleAdd = () => {
    if (!form.policy_id.trim()) { flash('error', 'Policy ID is required'); return; }
    if (policyExists(form.policy_id.trim())) { flash('error', `Policy ID "${form.policy_id}" already exists`); return; }
    if (!form.name.trim()) { flash('error', 'Patient name is required'); return; }
    if (!form.policy_start || !form.policy_end) { flash('error', 'Policy dates are required'); return; }
    const patient = {
      patient_id: generateId(),
      name: form.name,
      age: Number(form.age) || 0,
      gender: form.gender,
      city: form.city,
      state: form.state,
      policy_id: form.policy_id.trim(),
      member_id: String(Math.floor(Math.random() * 90000000) + 10000000),
      annual_deductible: Number(form.annual_deductible) || 0,
      policy_start: form.policy_start,
      policy_end: form.policy_end,
      copay: Number(form.copay) || 0,
    };
    setPatients((prev) => [patient, ...prev]);
    setForm({ policy_id: '', name: '', age: '', gender: 'Male', city: '', state: '', annual_deductible: '', policy_start: '', policy_end: '', copay: '' });
    setShowAdd(false);
    flash('success', `Patient "${patient.name}" added`);
  };

  const openEdit = (patient) => {
    setEditing(patient);
    setEditForm({ ...patient });
  };

  const updateEdit = (field, value) => setEditForm((prev) => ({ ...prev, [field]: value }));

  const handleSaveEdit = () => {
    if (!editForm.name.trim()) { flash('error', 'Patient name is required'); return; }
    if (!editForm.policy_id.trim()) { flash('error', 'Policy ID is required'); return; }
    if (policyExists(editForm.policy_id.trim(), editing.patient_id)) { flash('error', `Policy ID "${editForm.policy_id}" already exists`); return; }
    if (!editForm.policy_start || !editForm.policy_end) { flash('error', 'Policy dates are required'); return; }
    setPatients((prev) => prev.map((p) => p.patient_id === editing.patient_id ? {
      ...p,
      name: editForm.name,
      age: Number(editForm.age) || 0,
      gender: editForm.gender,
      city: editForm.city,
      state: editForm.state,
      policy_id: editForm.policy_id.trim(),
      annual_deductible: Number(editForm.annual_deductible) || 0,
      policy_start: editForm.policy_start,
      policy_end: editForm.policy_end,
      copay: Number(editForm.copay) || 0,
    } : p));
    setEditing(null);
    flash('success', `Patient "${editForm.name}" updated`);
  };

  const handleDelete = (id) => {
    setPatients((prev) => prev.filter((p) => p.patient_id !== id));
    setConfirmDelete(null);
    flash('success', 'Patient removed');
  };

  const handleImport = (rows) => {
    const imported = rows.map((r) => ({
      patient_id: r.patient_id || generateId(),
      name: r.name || '',
      age: Number(r.age) || 0,
      gender: r.gender || 'Unknown',
      city: r.city || '',
      state: r.state || '',
      policy_id: r.policy_id || generatePolicyId(),
      member_id: r.member_id || '',
      annual_deductible: Number(r.annual_deductible) || 0,
      policy_start: r.policy_start || '',
      policy_end: r.policy_end || '',
      copay: Number(r.copay) || 0,
    }));
    setPatients((prev) => [...imported, ...prev]);
    setPage(1);
  };

  const filtered = patients.filter((p) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!p.name.toLowerCase().includes(q) && !p.patient_id.toLowerCase().includes(q) && !p.policy_id.toLowerCase().includes(q)) return false;
    }
    if (policyFilter === 'Active' && p.policy_end < today) return false;
    if (policyFilter === 'Expired' && p.policy_end >= today) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const activeCount = patients.filter((p) => p.policy_end >= today).length;
  const expiredCount = patients.length - activeCount;

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
          <div className="text-xs text-textSecondary mb-1">Total Patients</div>
          <div className="text-xl font-mono text-textPrimary">{patients.length}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="text-xs text-textSecondary mb-1">Active Policies</div>
          <div className="text-xl font-mono text-success">{activeCount}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="text-xs text-textSecondary mb-1">Expired Policies</div>
          <div className="text-xl font-mono text-danger">{expiredCount}</div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
        <input type="text" placeholder="Search by name, ID, or policy..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 px-3 py-2 bg-surface border border-border rounded-md text-sm text-textPrimary placeholder-textSecondary/50 focus:outline-none focus:border-primary transition-colors duration-150" />
        <select value={policyFilter} onChange={(e) => { setPolicyFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-surface border border-border rounded-md text-sm text-textPrimary focus:outline-none focus:border-primary transition-colors duration-150">
          <option value="All">All policies</option>
          <option value="Active">Active only</option>
          <option value="Expired">Expired only</option>
        </select>
        <button onClick={openAddModal} className="flex items-center gap-2 px-3 py-2 text-sm bg-primary/15 border border-primary/30 rounded-md text-primary hover:bg-primary/25 transition-colors duration-150 whitespace-nowrap">
          <Plus size={14} />Add Patient
        </button>
      </div>

      <div className="mb-4">
        <BulkActions data={filtered} columns={COLUMNS} onImport={handleImport} filename="patients" importLabel="Import patients (CSV)" exportLabel="Export patients" />
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface">
                <th className="text-left px-4 py-3 text-xs text-textSecondary font-medium">ID</th>
                <th className="text-left px-4 py-3 text-xs text-textSecondary font-medium">Name</th>
                <th className="text-left px-4 py-3 text-xs text-textSecondary font-medium hidden md:table-cell">Age/Gender</th>
                <th className="text-left px-4 py-3 text-xs text-textSecondary font-medium hidden lg:table-cell">Location</th>
                <th className="text-left px-4 py-3 text-xs text-textSecondary font-medium">Policy ID</th>
                <th className="text-left px-4 py-3 text-xs text-textSecondary font-medium hidden md:table-cell">Deductible</th>
                <th className="text-left px-4 py-3 text-xs text-textSecondary font-medium hidden lg:table-cell">Policy Period</th>
                <th className="text-left px-4 py-3 text-xs text-textSecondary font-medium">Status</th>
                <th className="text-right px-4 py-3 text-xs text-textSecondary font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((p) => {
                const active = p.policy_end >= today;
                return (
                  <tr key={p.patient_id} onClick={() => setSelected(p)} className="border-b border-border last:border-0 hover:bg-[#1c2128] cursor-pointer transition-colors duration-100">
                    <td className="px-4 py-3 text-textPrimary font-mono text-xs">{p.patient_id}</td>
                    <td className="px-4 py-3 text-textPrimary">{p.name}</td>
                    <td className="px-4 py-3 text-textSecondary text-xs hidden md:table-cell">{p.age} / {p.gender}</td>
                    <td className="px-4 py-3 text-textSecondary text-xs hidden lg:table-cell">{p.city}, {p.state}</td>
                    <td className="px-4 py-3 text-textPrimary font-mono text-xs">{p.policy_id}</td>
                    <td className="px-4 py-3 text-textPrimary text-xs hidden md:table-cell">${p.annual_deductible.toLocaleString()}</td>
                    <td className="px-4 py-3 text-textSecondary text-xs hidden lg:table-cell">{p.policy_start} — {p.policy_end}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded border ${active ? 'bg-success/10 border-success/20 text-success' : 'bg-danger/10 border-danger/20 text-danger'}`}>{active ? 'Active' : 'Expired'}</span></td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => openEdit(p)} className="p-1.5 text-textSecondary hover:text-primary transition-colors duration-150 mr-1"><Pencil size={14} /></button>
                      <button onClick={() => setConfirmDelete(p)} className="p-1.5 text-textSecondary hover:text-danger transition-colors duration-150"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                );
              })}
              {paginated.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-textSecondary">No patients found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Detail modal (read-only) */}
      <Modal open={!!selected && !editing} onClose={() => setSelected(null)} title={`Patient: ${selected?.name}`}>
        {selected && (
          <div className="space-y-3 text-sm">
            {[
              ['Patient ID', selected.patient_id],
              ['Age', selected.age],
              ['Gender', selected.gender],
              ['City', selected.city],
              ['State', selected.state],
              ['Policy ID', selected.policy_id],
              ['Member ID', selected.member_id],
              ['Annual Deductible', `$${selected.annual_deductible.toLocaleString()}`],
              ['Policy Start', selected.policy_start],
              ['Policy End', selected.policy_end],
              ['Copay', `$${selected.copay}`],
              ['Status', selected.policy_end >= today ? 'Active' : 'Expired'],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between border-b border-[#383e47] pb-2 last:border-0">
                <span className="text-textSecondary">{label}</span>
                <span className={`text-textPrimary ${label === 'Status' ? (value === 'Active' ? '!text-success' : '!text-danger') : ''}`}>{value}</span>
              </div>
            ))}
            <div className="flex justify-end pt-2">
              <button onClick={() => { setSelected(null); openEdit(selected); }} className="px-4 py-2 text-sm bg-primary/15 border border-primary/30 rounded-md text-primary hover:bg-primary/25 transition-colors duration-150">Edit Patient</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Patient modal */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title={`Edit Patient: ${editing?.name}`}>
        {editing && (
          <div className="space-y-4">
            <div className="flex justify-between text-sm border-b border-[#383e47] pb-3">
              <span className="text-textSecondary">Patient ID</span>
              <span className="text-textPrimary font-mono">{editing.patient_id}</span>
            </div>
            <div>
              <label className="block text-xs text-textSecondary mb-1.5">Name *</label>
              <input type="text" value={editForm.name} onChange={(e) => updateEdit('name', e.target.value)} className="w-full px-3 py-2 bg-[#0d1117] border border-[#383e47] rounded-md text-sm text-textPrimary focus:outline-none focus:border-primary transition-colors duration-150" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-textSecondary mb-1.5">Age</label>
                <input type="number" value={editForm.age} onChange={(e) => updateEdit('age', e.target.value)} className="w-full px-3 py-2 bg-[#0d1117] border border-[#383e47] rounded-md text-sm text-textPrimary focus:outline-none focus:border-primary transition-colors duration-150" />
              </div>
              <div>
                <label className="block text-xs text-textSecondary mb-1.5">Gender</label>
                <select value={editForm.gender} onChange={(e) => updateEdit('gender', e.target.value)} className="w-full px-3 py-2 bg-[#0d1117] border border-[#383e47] rounded-md text-sm text-textPrimary focus:outline-none focus:border-primary transition-colors duration-150">
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-textSecondary mb-1.5">City</label>
                <input type="text" value={editForm.city} onChange={(e) => updateEdit('city', e.target.value)} className="w-full px-3 py-2 bg-[#0d1117] border border-[#383e47] rounded-md text-sm text-textPrimary focus:outline-none focus:border-primary transition-colors duration-150" />
              </div>
              <div>
                <label className="block text-xs text-textSecondary mb-1.5">State</label>
                <input type="text" value={editForm.state} onChange={(e) => updateEdit('state', e.target.value)} className="w-full px-3 py-2 bg-[#0d1117] border border-[#383e47] rounded-md text-sm text-textPrimary focus:outline-none focus:border-primary transition-colors duration-150" />
              </div>
            </div>
            <div className="border-t border-[#383e47] pt-4">
              <div className="text-xs text-textSecondary mb-3">Policy Information</div>
            </div>
            <div>
              <label className="block text-xs text-textSecondary mb-1.5">Policy ID *</label>
              <input type="text" value={editForm.policy_id} onChange={(e) => updateEdit('policy_id', e.target.value)}
                className={`w-full px-3 py-2 bg-[#0d1117] border rounded-md text-sm font-mono text-textPrimary focus:outline-none focus:border-primary transition-colors duration-150 ${policyExists(editForm.policy_id?.trim(), editing.patient_id) ? 'border-danger' : 'border-[#383e47]'}`} />
              {editForm.policy_id?.trim() && policyExists(editForm.policy_id.trim(), editing.patient_id) && (
                <p className="text-xs text-danger mt-1">This policy ID already exists</p>
              )}
            </div>
            <div>
              <label className="block text-xs text-textSecondary mb-1.5">Annual Deductible ($)</label>
              <input type="number" step="0.01" value={editForm.annual_deductible} onChange={(e) => updateEdit('annual_deductible', e.target.value)} className="w-full px-3 py-2 bg-[#0d1117] border border-[#383e47] rounded-md text-sm text-textPrimary focus:outline-none focus:border-primary transition-colors duration-150" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-textSecondary mb-1.5">Policy Start *</label>
                <input type="date" value={editForm.policy_start} onChange={(e) => updateEdit('policy_start', e.target.value)} className="w-full px-3 py-2 bg-[#0d1117] border border-[#383e47] rounded-md text-sm text-textPrimary focus:outline-none focus:border-primary transition-colors duration-150" />
              </div>
              <div>
                <label className="block text-xs text-textSecondary mb-1.5">Policy End *</label>
                <input type="date" value={editForm.policy_end} onChange={(e) => updateEdit('policy_end', e.target.value)} className="w-full px-3 py-2 bg-[#0d1117] border border-[#383e47] rounded-md text-sm text-textPrimary focus:outline-none focus:border-primary transition-colors duration-150" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-textSecondary mb-1.5">Copay ($)</label>
              <input type="number" value={editForm.copay} onChange={(e) => updateEdit('copay', e.target.value)} className="w-full px-3 py-2 bg-[#0d1117] border border-[#383e47] rounded-md text-sm text-textPrimary focus:outline-none focus:border-primary transition-colors duration-150" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setEditing(null)} className="px-4 py-2 text-sm border border-border rounded-md text-textSecondary hover:text-textPrimary hover:border-textSecondary transition-colors duration-150">Cancel</button>
              <button onClick={handleSaveEdit} className="px-4 py-2 text-sm bg-primary/15 border border-primary/30 rounded-md text-primary hover:bg-primary/25 transition-colors duration-150">Save Changes</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Patient modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Patient">
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-textSecondary mb-1.5">Policy ID *</label>
            <input type="text" value={form.policy_id} onChange={(e) => update('policy_id', e.target.value)}
              className={`w-full px-3 py-2 bg-[#0d1117] border rounded-md text-sm font-mono text-textPrimary placeholder-textSecondary/50 focus:outline-none focus:border-primary transition-colors duration-150 ${policyExists(form.policy_id.trim()) ? 'border-danger' : 'border-[#383e47]'}`}
              placeholder="e.g. XAI000137254" />
            {form.policy_id.trim() && policyExists(form.policy_id.trim()) && (
              <p className="text-xs text-danger mt-1">This policy ID already exists — choose a different one</p>
            )}
          </div>
          <div>
            <label className="block text-xs text-textSecondary mb-1.5">Name *</label>
            <input type="text" value={form.name} onChange={(e) => update('name', e.target.value)} className="w-full px-3 py-2 bg-[#0d1117] border border-[#383e47] rounded-md text-sm text-textPrimary placeholder-textSecondary/50 focus:outline-none focus:border-primary transition-colors duration-150" placeholder="Full name" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-textSecondary mb-1.5">Age</label>
              <input type="number" value={form.age} onChange={(e) => update('age', e.target.value)} className="w-full px-3 py-2 bg-[#0d1117] border border-[#383e47] rounded-md text-sm text-textPrimary focus:outline-none focus:border-primary transition-colors duration-150" />
            </div>
            <div>
              <label className="block text-xs text-textSecondary mb-1.5">Gender</label>
              <select value={form.gender} onChange={(e) => update('gender', e.target.value)} className="w-full px-3 py-2 bg-[#0d1117] border border-[#383e47] rounded-md text-sm text-textPrimary focus:outline-none focus:border-primary transition-colors duration-150">
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-textSecondary mb-1.5">City</label>
              <input type="text" value={form.city} onChange={(e) => update('city', e.target.value)} className="w-full px-3 py-2 bg-[#0d1117] border border-[#383e47] rounded-md text-sm text-textPrimary placeholder-textSecondary/50 focus:outline-none focus:border-primary transition-colors duration-150" />
            </div>
            <div>
              <label className="block text-xs text-textSecondary mb-1.5">State</label>
              <input type="text" value={form.state} onChange={(e) => update('state', e.target.value)} className="w-full px-3 py-2 bg-[#0d1117] border border-[#383e47] rounded-md text-sm text-textPrimary placeholder-textSecondary/50 focus:outline-none focus:border-primary transition-colors duration-150" />
            </div>
          </div>
          <div className="border-t border-[#383e47] pt-4">
            <div className="text-xs text-textSecondary mb-3">Policy Information</div>
          </div>
          <div>
            <label className="block text-xs text-textSecondary mb-1.5">Annual Deductible ($)</label>
            <input type="number" step="0.01" value={form.annual_deductible} onChange={(e) => update('annual_deductible', e.target.value)} className="w-full px-3 py-2 bg-[#0d1117] border border-[#383e47] rounded-md text-sm text-textPrimary placeholder-textSecondary/50 focus:outline-none focus:border-primary transition-colors duration-150" placeholder="e.g. 2000" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-textSecondary mb-1.5">Policy Start *</label>
              <input type="date" value={form.policy_start} onChange={(e) => update('policy_start', e.target.value)} className="w-full px-3 py-2 bg-[#0d1117] border border-[#383e47] rounded-md text-sm text-textPrimary focus:outline-none focus:border-primary transition-colors duration-150" />
            </div>
            <div>
              <label className="block text-xs text-textSecondary mb-1.5">Policy End *</label>
              <input type="date" value={form.policy_end} onChange={(e) => update('policy_end', e.target.value)} className="w-full px-3 py-2 bg-[#0d1117] border border-[#383e47] rounded-md text-sm text-textPrimary focus:outline-none focus:border-primary transition-colors duration-150" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-textSecondary mb-1.5">Copay ($)</label>
            <input type="number" value={form.copay} onChange={(e) => update('copay', e.target.value)} className="w-full px-3 py-2 bg-[#0d1117] border border-[#383e47] rounded-md text-sm text-textPrimary placeholder-textSecondary/50 focus:outline-none focus:border-primary transition-colors duration-150" placeholder="e.g. 30" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm border border-border rounded-md text-textSecondary hover:text-textPrimary hover:border-textSecondary transition-colors duration-150">Cancel</button>
            <button onClick={handleAdd} className="px-4 py-2 text-sm bg-primary/15 border border-primary/30 rounded-md text-primary hover:bg-primary/25 transition-colors duration-150">Add Patient</button>
          </div>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Confirm Delete">
        {confirmDelete && (
          <div>
            <p className="text-sm text-textSecondary mb-4">Remove patient <span className="text-textPrimary font-medium">{confirmDelete.name}</span>? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm border border-border rounded-md text-textSecondary hover:text-textPrimary hover:border-textSecondary transition-colors duration-150">Cancel</button>
              <button onClick={() => handleDelete(confirmDelete.patient_id)} className="px-4 py-2 text-sm bg-danger/15 border border-danger/30 rounded-md text-danger hover:bg-danger/25 transition-colors duration-150">Delete</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
