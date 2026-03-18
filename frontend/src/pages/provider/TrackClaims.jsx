import { useState, useEffect, useMemo } from 'react';
import api from '../../api'; 
import StatusBadge from '../../components/StatusBadge';
import Skeleton from '../../components/Skeleton';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import BulkActions from '../../components/BulkActions';
import { Search, Filter, FileText, AlertCircle, Calendar } from 'lucide-react';

const CLAIM_COLUMNS = [
  { key: 'id', label: 'Claim ID' },
  { key: 'patient_name', label: 'Patient' },
  { key: 'service_date', label: 'Service Date' },
  { key: 'diagnosis_code', label: 'Diagnosis' },
  { key: 'service_label', label: 'Service' },
  { key: 'amount', label: 'Amount' },
  { key: 'fraud_score', label: 'AI Risk' },
  { key: 'status', label: 'Status' },
];

const PAGE_SIZE = 10;

export default function TrackClaims() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const data = await api.getClaims();
      setClaims(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch claims:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, []);

  const statuses = ['All', 'Pending', 'Processing', 'Flagged', 'Cleared', 'Fraud Confirmed'];

  // استخدام useMemo لتحسين الأداء عند البحث والفلترة
  const filtered = useMemo(() => {
    return claims.filter((c) => {
      const q = search.toLowerCase();
      const matchesFilter = filter === 'All' || c.status === filter;
      const matchesSearch = !search.trim() || 
        c.id?.toString().toLowerCase().includes(q) ||
        c.patient_name?.toLowerCase().includes(q) ||
        c.diagnosis_code?.toLowerCase().includes(q);
      
      return matchesFilter && matchesSearch;
    });
  }, [claims, search, filter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (loading) return <div className="p-8"><Skeleton rows={10} /></div>;

  return (
    <div className="space-y-6">
      {/* Header & Export */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-textPrimary flex items-center gap-2">
            <FileText className="text-primary" size={20} /> Claim Tracking Logs
          </h2>
          <p className="text-xs text-textSecondary mt-1">Monitor AI auditing progress and payment status.</p>
        </div>
        <BulkActions data={filtered} columns={CLAIM_COLUMNS} filename="provider_claims_history" />
      </div>

      {/* Search & Status Filters */}
      <div className="bg-surface border border-border rounded-xl p-4 space-y-4 shadow-sm">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
          <input 
            type="text" 
            placeholder="Search by ID, Patient, or Diagnosis..." 
            value={search} 
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 bg-bg border border-border rounded-lg text-sm text-textPrimary focus:border-primary outline-none transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase font-bold text-textSecondary mr-2 tracking-widest">Filter Status:</span>
          {statuses.map((s) => (
            <button 
              key={s} 
              onClick={() => { setFilter(s); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                filter === s ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-bg border-border text-textSecondary hover:border-primary/50'
              }`}
            >
              {s}
            </button>
          ))}
          <div className="ml-auto text-[10px] font-mono text-textSecondary bg-bg px-2 py-1 rounded border border-border">
            Total Records: {filtered.length}
          </div>
        </div>
      </div>

      {/* Claims Table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-bg/50 border-b border-border">
              <tr className="text-[10px] text-textSecondary uppercase font-bold tracking-wider">
                <th className="px-6 py-4">Claim ID</th>
                <th className="px-6 py-4">Patient Information</th>
                <th className="px-6 py-4 text-center">Service Details</th>
                <th className="px-6 py-4 text-center">Amount</th>
                <th className="px-6 py-4 text-center">AI Risk</th>
                <th className="px-6 py-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginated.map((c) => (
                <tr 
                  key={c.id} 
                  onClick={() => setSelected(c)} 
                  className="hover:bg-primary/5 cursor-pointer transition-colors group"
                >
                  <td className="px-6 py-4 font-mono text-xs text-primary font-bold">{c.id}</td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-textPrimary">{c.patient_name || 'N/A'}</div>
                    <div className="text-[10px] text-textSecondary flex items-center gap-1 mt-1">
                      <Calendar size={10} /> {c.service_date}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="text-xs text-textPrimary">{c.service_label || 'Medical Service'}</div>
                    <div className="text-[10px] text-textSecondary">ICD-10: {c.diagnosis_code || '—'}</div>
                  </td>
                  <td className="px-6 py-4 text-center font-mono text-textPrimary">
                    ${(c.amount || 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className={`font-mono text-[11px] font-bold ${
                        (c.fraud_score || 0) > 0.7 ? 'text-danger' : (c.fraud_score || 0) > 0.4 ? 'text-warning' : 'text-success'
                      }`}>
                        {((c.fraud_score || 0) * 100).toFixed(1)}%
                      </span>
                      <div className="w-12 h-1 bg-bg rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${(c.fraud_score || 0) > 0.7 ? 'bg-danger' : (c.fraud_score || 0) > 0.4 ? 'bg-warning' : 'bg-success'}`}
                          style={{ width: `${(c.fraud_score || 0) * 100}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right"><StatusBadge status={c.status} /></td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-textSecondary italic">
                    <AlertCircle size={32} className="mx-auto mb-2 opacity-20" />
                    No claims found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Detail Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Claim Audit Details: ${selected?.id}`} wide>
        {selected && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3 p-4 bg-bg rounded-xl border border-border">
                <h4 className="text-[10px] font-bold text-textSecondary uppercase tracking-widest mb-2">Patient & Service</h4>
                {[
                  ['Full Name', selected.patient_name],
                  ['Service Type', selected.service_label],
                  ['Date of Service', selected.service_date],
                  ['Diagnosis Code', selected.diagnosis_code],
                  ['Procedure Code', selected.procedure_code],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between items-center text-xs">
                    <span className="text-textSecondary">{label}</span>
                    <span className="text-textPrimary font-medium">{value || 'N/A'}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-3 p-4 bg-bg rounded-xl border border-border">
                <h4 className="text-[10px] font-bold text-textSecondary uppercase tracking-widest mb-2">AI Audit Analysis</h4>
                {[
                  ['Fraud Probability', `${((selected.fraud_score || 0) * 100).toFixed(2)}%`],
                  ['Current Status', selected.status],
                  ['Total Amount', `$${(selected.amount || 0).toLocaleString()}`],
                  ['Submission Date', selected.submitted_at ? new Date(selected.submitted_at).toLocaleString() : 'N/A'],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between items-center text-xs">
                    <span className="text-textSecondary">{label}</span>
                    <span className={`font-medium ${label === 'Fraud Probability' && selected.fraud_score > 0.7 ? 'text-danger' : 'text-textPrimary'}`}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg flex items-start gap-3">
              <AlertCircle size={16} className="text-primary mt-0.5" />
              <p className="text-[10px] text-textSecondary leading-relaxed">
                This claim is currently synchronized with the <b>Azure SQL Database</b>. AI Risk scores are calculated using the <b>XGBoost</b> production model. If you disagree with a 'Flagged' status, please contact the insurance auditor.
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}