
import { useState, useEffect } from 'react';
import { Search, FileText, Plus, Download, Eye, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../../api';

export default function Policies() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPolicy, setSelectedPolicy] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.getPolicies();
        setPolicies(res);
      } catch (err) {
        console.error('Failed to load policies', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filtered = policies.filter(p =>
    p.policy_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.patient_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isExpiringSoon = (endDate) => {
    if (!endDate) return false;
    const end = new Date(endDate);
    const now = new Date();
    const diff = (end - now) / (1000 * 60 * 60 * 24);
    return diff > 0 && diff <= 30;
  };

  const isExpired = (endDate) => {
    if (!endDate) return false;
    const end = new Date(endDate);
    return end < new Date();
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-textSecondary">Loading policies...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-textPrimary">Policy Management</h1>
          <p className="mt-1 text-sm text-textSecondary">Manage patient insurance policies</p>
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
              placeholder="Search policies..."
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
                <th>Policy ID</th>
                <th>Patient</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Annual Deductible</th>
                <th>Copay Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((policy) => (
                <tr key={policy.policy_id}>
                  <td className="font-mono text-xs font-bold text-textSecondary">{policy.policy_id}</td>
                  <td className="font-semibold text-textPrimary">{policy.patient_name}</td>
                  <td className="text-sm text-textSecondary">{new Date(policy.policy_start_date).toLocaleDateString()}</td>
                  <td className="text-sm text-textSecondary">{new Date(policy.policy_end_date).toLocaleDateString()}</td>
                  <td className="font-bold text-textPrimary">${policy.annual_deductible?.toLocaleString()}</td>
                  <td className="text-sm text-textSecondary">${policy.copay_amount}</td>
                  <td>
                    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black ${
                      isExpired(policy.policy_end_date)
                        ? 'bg-danger/10 text-danger'
                        : isExpiringSoon(policy.policy_end_date)
                        ? 'bg-warning/10 text-warning'
                        : 'bg-success/10 text-success'
                    }`}>
                      {isExpired(policy.policy_end_date) ? (
                        <> <AlertCircle size={12} /> Expired </>
                      ) : isExpiringSoon(policy.policy_end_date) ? (
                        <> <AlertCircle size={12} /> Expiring Soon </>
                      ) : (
                        <> <CheckCircle size={12} /> Active </>
                      )}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => setSelectedPolicy(policy)}
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

      {selectedPolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedPolicy(null)}>
          <div className="enterprise-card max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-border px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-black text-textPrimary">Policy Details</h3>
              <button onClick={() => setSelectedPolicy(null)} className="text-textSecondary hover:text-textPrimary">
                <Plus size={20} className="rotate-45" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-success text-white text-2xl font-black">
                  <FileText size={28} />
                </div>
                <div>
                  <h4 className="text-xl font-black text-textPrimary">{selectedPolicy.policy_id}</h4>
                  <p className="text-sm text-textSecondary">{selectedPolicy.patient_name}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-textSecondary">Start Date</p>
                  <p className="font-semibold text-textPrimary">{new Date(selectedPolicy.policy_start_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-textSecondary">End Date</p>
                  <p className="font-semibold text-textPrimary">{new Date(selectedPolicy.policy_end_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-textSecondary">Annual Deductible</p>
                  <p className="font-bold text-textPrimary">${selectedPolicy.annual_deductible?.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-textSecondary">Copay Amount</p>
                  <p className="font-bold text-textPrimary">${selectedPolicy.copay_amount}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

