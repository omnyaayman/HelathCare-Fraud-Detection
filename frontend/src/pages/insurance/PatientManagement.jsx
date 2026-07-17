
import { useState, useEffect } from 'react';
import { Search, Users, Plus, Download, Eye } from 'lucide-react';
import api from '../../api';

export default function PatientManagement() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.getPatients();
        setPatients(res);
      } catch (err) {
        console.error('Failed to load patients', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filtered = patients.filter(p =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-textSecondary">Loading patients...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-textPrimary">Patient Management</h1>
          <p className="mt-1 text-sm text-textSecondary">Manage all patients and their policies</p>
        </div>
        <button className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-bold text-textPrimary hover:bg-bg">
          <Download size={16} />
          Export
        </button>
      </div>

      <div className="enterprise-card">
        <div className="flex items-center gap-4 border-b border-border p-4">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm">
            <Search size={16} className="text-textSecondary" />
            <input
              type="text"
              placeholder="Search patients..."
              className="flex-1 bg-transparent outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="enterprise-table">
            <thead>
              <tr>
                <th>Patient ID</th>
                <th>Name</th>
                <th>Age</th>
                <th>Gender</th>
                <th>Location</th>
                <th>Policy</th>
                <th>Total Claims</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((patient) => (
                <tr key={patient.patient_id}>
                  <td className="font-mono text-xs font-bold text-textSecondary">#{patient.patient_id}</td>
                  <td className="font-semibold text-textPrimary">{patient.name}</td>
                  <td className="text-sm text-textSecondary">{patient.age} years</td>
                  <td className="text-sm text-textSecondary">{patient.gender}</td>
                  <td className="text-sm text-textSecondary">{patient.city}, {patient.state}</td>
                  <td className="text-sm font-semibold text-textPrimary">{patient.policy_id || 'No Policy'}</td>
                  <td className="text-sm text-textSecondary">{patient.total_claims || 0} claims</td>
                  <td>
                    <button
                      onClick={() => setSelectedPatient(patient)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-textSecondary hover:border-primary hover:text-primary"
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedPatient(null)}>
          <div className="enterprise-card max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-border px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-black text-textPrimary">Patient Details</h3>
              <button onClick={() => setSelectedPatient(null)} className="text-textSecondary hover:text-textPrimary">
                <Plus size={20} className="rotate-45" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary text-white text-2xl font-black">
                  {selectedPatient.name?.charAt(0) || 'P'}
                </div>
                <div>
                  <h4 className="text-xl font-black text-textPrimary">{selectedPatient.name}</h4>
                  <p className="text-sm text-textSecondary">Patient #{selectedPatient.patient_id}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-textSecondary">Age</p>
                  <p className="font-semibold text-textPrimary">{selectedPatient.age} years</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-textSecondary">Gender</p>
                  <p className="font-semibold text-textPrimary">{selectedPatient.gender}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-textSecondary">Location</p>
                  <p className="font-semibold text-textPrimary">{selectedPatient.city}, {selectedPatient.state}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-textSecondary">Total Claims</p>
                  <p className="font-semibold text-textPrimary">{selectedPatient.total_claims || 0}</p>
                </div>
                {selectedPatient.policy_id && (
                  <>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-textSecondary">Policy ID</p>
                      <p className="font-mono font-semibold text-textPrimary">{selectedPatient.policy_id}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-textSecondary">Annual Deductible</p>
                      <p className="font-semibold text-textPrimary">${selectedPatient.annual_deductible?.toLocaleString()}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

