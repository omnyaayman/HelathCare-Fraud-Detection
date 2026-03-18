import { useState, useEffect, useMemo } from 'react';
import api from '../../api'; 
import StatusBadge from '../../components/StatusBadge';
import Skeleton from '../../components/Skeleton';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import BulkActions from '../../components/BulkActions';
import { AlertCircle, Search, Filter, ShieldAlert, ArrowUpRight } from 'lucide-react';

const PAGE_SIZE = 10;

export default function FlaggedClaims() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [providerFilter, setProviderFilter] = useState('All');
  const [scoreFilter, setScoreFilter] = useState('All');

  const fetchFlaggedClaims = async () => {
    setLoading(true);
    try {
      // جلب المطالبات التي تتخطى حاجز الـ 60% خطورة
      const data = await api.getClaims('?min_score=0.6'); 
      setClaims(Array.isArray(data) ? data.sort((a, b) => (b.fraud_score || 0) - (a.fraud_score || 0)) : []);
    } catch (error) {
      console.error("Error fetching flagged claims:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlaggedClaims();
  }, []);

  const handleLabel = async (claimId, decision) => {
    try {
      const status = decision === 'Fraud' ? 'Fraud Confirmed' : 'Cleared';
      await api.updateClaimStatus(claimId, { status, label: decision });
      
      // إزالة المطالبة من القائمة لأنها لم تعد "تحت المراجعة"
      setClaims(prev => prev.filter(c => c.id !== claimId));
      setSelected(null);
      alert(`Decision recorded: Claim #${claimId} marked as ${decision}`);
    } catch (error) {
      alert("Failed to update database.");
    }
  };

  // إحصائيات المزودين الأكثر إثارة للريبة (Top 5 Suspicious Providers)
  const aggByProvider = useMemo(() => {
    const map = {};
    claims.forEach((c) => {
      const name = c.provider_name || 'Unknown';
      if (!map[name]) map[name] = { count: 0, avgScore: 0 };
      map[name].count++;
      map[name].avgScore += (c.fraud_score || 0);
    });
    return Object.entries(map)
      .map(([name, data]) => ({ name, ...data, avgScore: data.avgScore / data.count }))
      .sort((a, b) => b.count - a.count).slice(0, 5);
  }, [claims]);

  // منطق الفلترة البحث
  const filtered = useMemo(() => {
    return claims.filter((c) => {
      const q = search.toLowerCase();
      const matchesSearch = !search || 
        c.id?.toString().toLowerCase().includes(q) || 
        c.patient_name?.toLowerCase().includes(q);
      
      const matchesProvider = providerFilter === 'All' || c.provider_name === providerFilter;
      
      const score = (c.fraud_score || 0);
      const matchesScore = scoreFilter === 'All' || 
        (scoreFilter === '90+' ? score >= 0.9 : (score >= 0.7 && score < 0.9));

      return matchesSearch && matchesProvider && matchesScore;
    });
  }, [claims, search, providerFilter, scoreFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (loading) return <div className="p-10"><Skeleton rows={10} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-textPrimary flex items-center gap-2">
            <ShieldAlert className="text-danger" size={24} /> High Risk Investigation Unit
          </h2>
          <p className="text-xs text-textSecondary mt-1">AI has flagged {claims.length} claims for urgent manual audit.</p>
        </div>
        <BulkActions data={filtered} filename="flagged_investigation_report" />
      </div>

      {/* Top Suspicious Providers (KPIs) */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {aggByProvider.map((data) => (
          <div key={data.name} className="p-4 bg-surface border border-border rounded-xl border-t-2 border-t-danger/50 shadow-sm">
            <p className="text-[10px] text-textSecondary uppercase font-bold truncate mb-2">{data.name}</p>
            <div className="flex justify-between items-end">
              <span className="text-2xl font-mono text-danger">{data.count}</span>
              <span className="text-[10px] text-textSecondary bg-bg px-1.5 py-0.5 rounded">Risk: {(data.avgScore * 100).toFixed(0)}%</span>
            </div>
          </div>
        ))}
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col lg:flex-row gap-3 bg-surface p-3 border border-border rounded-xl">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
          <input 
            type="text" placeholder="Quick search ID or Patient..." value={search} 
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-3 py-2 bg-bg border border-border rounded-lg text-sm focus:border-primary outline-none" 
          />
        </div>
        <div className="flex gap-2">
            <select 
              value={scoreFilter} onChange={e => { setScoreFilter(e.target.value); setPage(1); }}
              className="bg-bg border border-border px-3 py-2 rounded-lg text-xs font-medium text-textPrimary outline-none"
            >
              <option value="All">All Risk Levels</option>
              <option value="90+">Critical (90%+)</option>
              <option value="70-90">High (70%-90%)</option>
            </select>
        </div>
      </div>

      {/* Flagged Table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-bg/50 border-b border-border">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-textSecondary uppercase tracking-wider">Claim ID</th>
              <th className="px-6 py-4 text-xs font-bold text-textSecondary uppercase tracking-wider">Patient</th>
              <th className="px-6 py-4 text-xs font-bold text-textSecondary uppercase tracking-wider">Risk Score</th>
              <th className="px-6 py-4 text-xs font-bold text-textSecondary uppercase tracking-wider">Amount</th>
              <th className="px-6 py-4 text-xs font-bold text-textSecondary uppercase tracking-wider text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginated.map((c) => (
              <tr key={c.id} className="hover:bg-danger/5 transition-colors group">
                <td className="px-6 py-4 font-mono text-xs text-primary font-bold">{c.id}</td>
                <td className="px-6 py-4 text-textPrimary">{c.patient_name}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${c.fraud_score > 0.85 ? 'bg-danger text-white' : 'bg-warning/20 text-warning'}`}>
                      {(c.fraud_score * 100).toFixed(0)}%
                    </span>
                    <div className="w-16 h-1 bg-bg rounded-full overflow-hidden hidden sm:block">
                        <div className="h-full bg-danger" style={{ width: `${c.fraud_score * 100}%` }}></div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 font-mono text-textPrimary">${(c.amount || 0).toLocaleString()}</td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => setSelected(c)} className="text-xs font-bold text-primary flex items-center gap-1 ml-auto hover:underline">
                    Investigate <ArrowUpRight size={12}/>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-10 text-center text-textSecondary italic">No high-risk claims found.</div>
        )}
      </div>

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Investigation Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Investigation: ${selected?.id}`} wide>
        {selected && (
          <div className="space-y-6">
            <div className="flex flex-col items-center py-6 bg-danger/5 rounded-xl border border-danger/10">
              <span className="text-[10px] text-danger uppercase font-black tracking-widest mb-1">AI Risk Probability</span>
              <span className="text-5xl font-black text-danger">{(selected.fraud_score * 100).toFixed(1)}%</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2 border-r border-border pr-4">
                <p className="flex justify-between"><span className="text-textSecondary">Patient:</span> <span className="font-bold text-textPrimary">{selected.patient_name}</span></p>
                <p className="flex justify-between"><span className="text-textSecondary">Hospital:</span> <span className="text-textPrimary">{selected.provider_name}</span></p>
                <p className="flex justify-between"><span className="text-textSecondary">Amount:</span> <span className="font-mono text-textPrimary">${selected.amount?.toLocaleString()}</span></p>
              </div>
              <div className="space-y-2 pl-0 md:pl-4">
                <p className="flex justify-between"><span className="text-textSecondary">Diagnosis:</span> <span className="text-textPrimary text-xs">{selected.diagnosis_label || 'N/A'}</span></p>
                <p className="flex justify-between"><span className="text-textSecondary">Service:</span> <span className="text-textPrimary text-xs">{selected.service_label || 'General'}</span></p>
                <p className="flex justify-between"><span className="text-textSecondary">Submission:</span> <span className="text-textPrimary text-xs">{selected.submitted_at || 'Today'}</span></p>
              </div>
            </div>

            <div className="bg-warning/10 p-4 rounded-lg border border-warning/20">
                <div className="flex gap-3">
                    <AlertCircle className="text-warning shrink-0" size={18} />
                    <p className="text-xs text-textSecondary leading-relaxed italic">
                        Human override required. Confirming fraud will stop the payment process and blacklist this claim in the training set. Clearing it will move it to the payment queue.
                    </p>
                </div>
            </div>

            <div className="flex gap-4 pt-4 border-t border-border">
              <button onClick={() => handleLabel(selected.id, 'Real')} className="flex-1 py-3 bg-success text-white rounded-lg font-bold hover:brightness-110 shadow-lg shadow-success/20 transition-all">Clear & Approve</button>
              <button onClick={() => handleLabel(selected.id, 'Fraud')} className="flex-1 py-3 bg-danger text-white rounded-lg font-bold hover:brightness-110 shadow-lg shadow-danger/20 transition-all">Confirm Fraud</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}