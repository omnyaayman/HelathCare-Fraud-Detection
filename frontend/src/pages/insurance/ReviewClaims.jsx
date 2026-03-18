import { useState, useEffect } from 'react';
import api from '../../api'; 
import StatusBadge from '../../components/StatusBadge';
import Skeleton from '../../components/Skeleton';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import BulkActions from '../../components/BulkActions';
import { Loader, Search, Filter, AlertCircle, FileText } from 'lucide-react';

const PAGE_SIZE = 10;

export default function ReviewClaims() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('claim_date');
  const [page, setPage] = useState(1);

  // 1. جلب البيانات من Azure SQL
  const fetchClaims = async () => {
    setLoading(true);
    try {
      const data = await api.getClaims();
      setClaims(data || []);
    } catch (error) {
      console.error("Audit Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, []);

  // 2. تحديث التصنيف (Real/Fraud)
  const handleLabel = async (claimId, label) => {
    try {
      const status = label === 'Fraud' ? 'Fraud Confirmed' : 'Cleared';
      
      // نستخدم PATCH لتحديث السجل في SQL
      await api.updateClaimStatus(claimId, { status, label });

      setClaims((prev) =>
        prev.map((c) => (c.id === claimId ? { ...c, label, status } : c))
      );
      setSelected(null);
    } catch (error) {
      alert("Failed to update status on Azure server.");
    }
  };

  // 3. الفلترة والترتيب الذكي (Handling Nulls)
  const filtered = claims
    .filter((c) => {
        const q = search.toLowerCase();
        return (
          c.id?.toString().toLowerCase().includes(q) ||
          c.patient_name?.toLowerCase().includes(q) ||
          c.provider_name?.toLowerCase().includes(q)
        );
    })
    .sort((a, b) => {
      if (sortBy === 'fraud_score') return (b.fraud_score || 0) - (a.fraud_score || 0);
      if (sortBy === 'amount') return (b.amount || 0) - (a.amount || 0);
      return new Date(b.claim_date || 0) - new Date(a.claim_date || 0);
    });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h2 className="text-xl font-bold text-textPrimary flex items-center gap-2">
                <FileText size={20} className="text-primary" />
                Claims Audit Workbench
            </h2>
            <p className="text-xs text-textSecondary mt-1">Review AI-flagged claims and assign final labels.</p>
        </div>
        <BulkActions data={filtered} filename="insurance_audit_export" />
      </div>

      {/* البحث والترتيب */}
      <div className="flex flex-col sm:flex-row gap-3 bg-surface p-3 border border-border rounded-lg">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
          <input
            type="text"
            placeholder="Search by ID, Patient, or Hospital..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-3 py-2 bg-bg border border-border rounded-md text-sm text-textPrimary focus:border-primary outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
            <Filter size={14} className="text-textSecondary" />
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
              className="px-3 py-2 bg-bg border border-border rounded-md text-sm text-textPrimary focus:border-primary outline-none"
            >
              <option value="claim_date">Sort: Latest First</option>
              <option value="fraud_score">Sort: AI Risk Score</option>
              <option value="amount">Sort: Claim Amount</option>
            </select>
        </div>
      </div>

      {loading ? (
        <div className="p-4 bg-surface border border-border rounded-lg shadow-sm">
            <Skeleton rows={8} />
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-bg/50 border-b border-border">
                <tr className="text-xs text-textSecondary uppercase tracking-wider">
                  <th className="px-6 py-4 font-bold">Claim ID</th>
                  <th className="px-6 py-4 font-bold">Patient</th>
                  <th className="px-6 py-4 font-bold">Hospital</th>
                  <th className="px-6 py-4 font-bold">Amount</th>
                  <th className="px-6 py-4 font-bold">Risk Score</th>
                  <th className="px-6 py-4 font-bold">Status</th>
                  <th className="px-6 py-4 font-bold text-right">Review</th>
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
                    <td className="px-6 py-4 text-textPrimary font-medium">{c.patient_name || 'N/A'}</td>
                    <td className="px-6 py-4 text-textSecondary text-xs">{c.provider_name || 'N/A'}</td>
                    <td className="px-6 py-4 text-textPrimary font-mono">${(c.amount || 0).toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 bg-bg rounded-full overflow-hidden">
                            <div 
                                className={`h-full rounded-full ${ (c.fraud_score || 0) > 0.7 ? 'bg-danger' : (c.fraud_score || 0) > 0.4 ? 'bg-warning' : 'bg-success' }`}
                                style={{ width: `${(c.fraud_score || 0) * 100}%` }}
                            />
                        </div>
                        <span className={`font-mono text-xs font-bold ${ (c.fraud_score || 0) > 0.6 ? 'text-danger' : 'text-textSecondary'}`}>
                          {((c.fraud_score || 0) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4"><StatusBadge status={c.status} /></td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-xs font-bold text-primary group-hover:underline">Review Details</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="p-20 text-center">
                <AlertCircle size={40} className="mx-auto text-textSecondary/20 mb-3" />
                <p className="text-sm text-textSecondary italic">No claims found matching your criteria.</p>
            </div>
          )}
        </div>
      )}

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />

      {/* نافذة المراجعة التفصيلية */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Claim Audit: ${selected?.id}`} wide>
        {selected && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
              <div className="space-y-3 bg-bg/50 p-4 rounded-lg border border-border">
                <h4 className="text-[10px] uppercase font-bold text-textSecondary mb-2 tracking-widest">Medical Context</h4>
                <p className="flex justify-between"><span className="text-textSecondary">Patient:</span> <span className="font-medium">{selected.patient_name}</span></p>
                <p className="flex justify-between"><span className="text-textSecondary">Diagnosis:</span> <span className="text-textPrimary text-xs">{selected.diagnosis_code || 'Not Provided'}</span></p>
                <p className="flex justify-between"><span className="text-textSecondary">Procedure:</span> <span className="text-textPrimary text-xs">{selected.procedure_code || 'Not Provided'}</span></p>
              </div>
              <div className="space-y-3 bg-bg/50 p-4 rounded-lg border border-border">
                <h4 className="text-[10px] uppercase font-bold text-textSecondary mb-2 tracking-widest">Financial & Risk</h4>
                <p className="flex justify-between"><span className="text-textSecondary">Claim Amount:</span> <span className="font-bold text-textPrimary">${selected.amount?.toLocaleString()}</span></p>
                <p className="flex justify-between"><span className="text-textSecondary">AI Risk Level:</span> <span className={`font-bold ${selected.fraud_score > 0.7 ? 'text-danger' : 'text-textPrimary'}`}>{(selected.fraud_score * 100).toFixed(1)}%</span></p>
                <p className="flex justify-between"><span className="text-textSecondary">Service Date:</span> <span className="text-textPrimary">{selected.service_date || 'N/A'}</span></p>
              </div>
            </div>

            <div className="pt-6 border-t border-border">
              <div className="bg-warning/5 border border-warning/20 p-3 rounded-md mb-6 flex items-start gap-3">
                <AlertCircle size={16} className="text-warning mt-0.5" />
                <p className="text-xs text-textSecondary leading-relaxed">
                    By labeling this claim, you are confirming its validity for payment. This action updates the **Azure SQL** record and will be used for future model retraining.
                </p>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => handleLabel(selected.id, 'Real')} 
                  className="flex-1 py-3 bg-success text-white rounded-lg font-bold hover:bg-success/90 transition-all shadow-md active:scale-95"
                >
                  Approve (Legitimate)
                </button>
                <button 
                  onClick={() => handleLabel(selected.id, 'Fraud')} 
                  className="flex-1 py-3 bg-danger text-white rounded-lg font-bold hover:bg-danger/90 transition-all shadow-md active:scale-95"
                >
                  Reject (Fraudulent)
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}