
import { useState, useEffect } from 'react';
import { Search, Filter, Download, Eye, CheckCircle, XCircle, Clock } from 'lucide-react';
import api from '../../api';

const statusColors = {
  'Submitted': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'AI Scored': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'Under Review': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  'Approved': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'Rejected': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  'Fraud Confirmed': 'bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-300',
  'Investigated': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'Closed': 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
};

export default function ReviewClaims() {
  const [claims, setClaims] = useState([]);
  const [filteredClaims, setFilteredClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedClaim, setSelectedClaim] = useState(null);

  const exportToCSV = () => {
    if (!filteredClaims.length) return;
    
    const headers = ['Claim ID', 'Patient', 'Provider', 'Service', 'Amount', 'Fraud Score', 'Status'];
    const rows = filteredClaims.map(claim => [
      claim.claim_id,
      claim.patient_name,
      claim.provider_name,
      claim.service_name,
      claim.claim_amount,
      (claim.fraud_score * 100).toFixed(0) + '%',
      claim.status
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `claims_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const claimsRes = await api.getClaims({ page_size: 1000 });
        const claimsData = claimsRes.data || claimsRes;
        setClaims(claimsData);
        setFilteredClaims(claimsData);
      } catch (err) {
        console.error('Failed to load claims', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    let filtered = [...claims];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(c =>
        c.patient_name?.toLowerCase().includes(term) ||
        c.provider_name?.toLowerCase().includes(term) ||
        c.claim_id?.toString().includes(term)
      );
    }
    if (statusFilter) {
      filtered = filtered.filter(c => c.status === statusFilter);
    }
    setFilteredClaims(filtered);
  }, [searchTerm, statusFilter, claims]);

  const updateClaimStatus = async (claimId, newStatus) => {
    try {
      await api.updateClaimStatus(claimId, newStatus);
      setClaims(prev => prev.map(c => c.claim_id === claimId ? { ...c, status: newStatus } : c));
    } catch (err) {
      console.error('Failed to update claim', err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-textSecondary">Loading claims...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-textPrimary">Review Claims</h1>
          <p className="mt-1 text-sm text-textSecondary">Review and manage incoming claims</p>
        </div>
        <button onClick={exportToCSV} className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-bold text-textPrimary hover:bg-bg">
          <Download size={16} />
          Export CSV
        </button>
      </div>

      <div className="enterprise-card">
        <div className="flex flex-wrap items-center gap-4 border-b border-border p-4">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm">
            <Search size={16} className="text-textSecondary" />
            <input
              type="text"
              placeholder="Search claims..."
              className="flex-1 bg-transparent outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-textSecondary" />
            <select
              className="rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              {['Submitted', 'AI Scored', 'Under Review', 'Approved', 'Rejected', 'Fraud Confirmed', 'Investigated', 'Closed'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="enterprise-table">
            <thead>
              <tr>
                <th>Claim ID</th>
                <th>Patient</th>
                <th>Provider</th>
                <th>Service</th>
                <th>Amount</th>
                <th>Fraud Score</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredClaims.map((claim) => (
                <tr key={claim.claim_id}>
                  <td className="font-mono text-xs font-bold text-textSecondary">#{claim.claim_id}</td>
                  <td className="font-semibold text-textPrimary">{claim.patient_name}</td>
                  <td className="text-sm text-textSecondary">{claim.provider_name}</td>
                  <td className="text-sm text-textSecondary">{claim.service_name}</td>
                  <td className="font-bold text-textPrimary">${claim.claim_amount?.toLocaleString()}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-20 rounded-full bg-border overflow-hidden">
                        <div
                          className={`h-full ${claim.fraud_score >= 0.7 ? 'bg-danger' : claim.fraud_score >= 0.4 ? 'bg-warning' : 'bg-success'}`}
                          style={{ width: `${claim.fraud_score * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-bold text-textSecondary">
                        {(claim.fraud_score * 100).toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-black ${statusColors[claim.status] || 'bg-gray-100 text-gray-700'}`}>
                      {claim.status}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedClaim(claim)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-textSecondary hover:border-primary hover:text-primary"
                      >
                        <Eye size={16} />
                      </button>
                      {claim.status === 'Under Review' && (
                        <>
                          <button
                            onClick={() => updateClaimStatus(claim.claim_id, 'Approved')}
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10 text-success hover:bg-success/20"
                          >
                            <CheckCircle size={16} />
                          </button>
                          <button
                            onClick={() => updateClaimStatus(claim.claim_id, 'Rejected')}
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-danger/10 text-danger hover:bg-danger/20"
                          >
                            <XCircle size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedClaim(null)}>
          <div className="enterprise-card max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-border px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-black text-textPrimary">Claim Details #{selectedClaim.claim_id}</h3>
              <button onClick={() => setSelectedClaim(null)} className="text-textSecondary hover:text-textPrimary">
                <XCircle size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-textSecondary">Patient</p>
                  <p className="font-semibold text-textPrimary">{selectedClaim.patient_name}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-textSecondary">Provider</p>
                  <p className="font-semibold text-textPrimary">{selectedClaim.provider_name}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-textSecondary">Service</p>
                  <p className="font-semibold text-textPrimary">{selectedClaim.service_name}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-textSecondary">Amount</p>
                  <p className="font-bold text-textPrimary">${selectedClaim.claim_amount?.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-textSecondary">Diagnosis Code</p>
                  <p className="font-mono text-sm text-textPrimary">{selectedClaim.diagnosis_code}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-textSecondary">Procedure Code</p>
                  <p className="font-mono text-sm text-textPrimary">{selectedClaim.procedure_code}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-textSecondary">Fraud Score</p>
                  <p className="font-bold text-textPrimary">{(selectedClaim.fraud_score * 100).toFixed(0)}%</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-textSecondary">Status</p>
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-black ${statusColors[selectedClaim.status] || 'bg-gray-100 text-gray-700'}`}>
                    {selectedClaim.status}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

