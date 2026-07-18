import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Filter, Download, ArrowUpDown, FileText, AlertTriangle,
  Clock, User, Building2, DollarSign, ChevronLeft, ChevronRight, CheckCircle, XCircle
} from "lucide-react";
import api from "../../api";
import StatusBadge from "../../components/StatusBadge";
import Skeleton from "../../components/Skeleton";
import Pagination from "../../components/Pagination";
import { formatCurrency } from "../../utils/format";

export default function ReviewClaims() {
  const navigate = useNavigate();
  const [claims, setClaimsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('claim_id');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ status: 'All', minScore: 0, maxScore: 1 });

  useEffect(() => {
    const fetchClaims = async () => {
      setLoading(true);
      try {
        const res = await api.getClaims({ page, page_size: pageSize });
        const data = Array.isArray(res) ? res : (res.data || res?.results || []);
        setClaimsList(data);
        setTotal(data.length < pageSize ? (page - 1) * pageSize + data.length : page * pageSize + pageSize);
      } catch (err) {
        console.error("Failed to load claims", err);
      } finally {
        setLoading(false);
      }
    };
    fetchClaims();
  }, [page, pageSize]);

  const filteredSorted = useMemo(() => {
    let result = [...claims];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        (c.claim_id?.toString().includes(q)) ||
        (c.patient_name?.toLowerCase().includes(q)) ||
        (c.provider_name?.toLowerCase().includes(q)) ||
        (c.diagnosis_code?.toLowerCase().includes(q))
      );
    }
    if (filters.status !== 'All') {
      result = result.filter(c => c.status === filters.status);
    }
    result.sort((a, b) => {
      let aVal = a[sortField], bVal = b[sortField];
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  }, [claims, search, filters, sortField, sortDir]);

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  if (loading) {
    return <div className="space-y-4">{[...Array(10)].map((_, i) => <Skeleton key={i} rows={1} />)}</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-textPrimary">Review Claims</h1>
          <p className="text-sm text-textSecondary font-medium">{total} claims loaded</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="enterprise-btn-ghost py-2 px-4 text-xs flex items-center gap-1.5">
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      <div className="bg-surface rounded-2xl border border-border/80 p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
            <input type="text" placeholder="Search by ID, patient, provider..." value={search} onChange={e => setSearch(e.target.value)} className="enterprise-input pl-9 w-full text-xs" />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-textSecondary" />
            <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} className="enterprise-select text-xs">
              <option>All</option>
              <option>Pending</option>
              <option>Approved</option>
              <option>Denied</option>
              <option>Flagged</option>
            </select>
            <select value={filters.minScore} onChange={e => setFilters(f => ({ ...f, minScore: parseFloat(e.target.value) }))} className="enterprise-select text-xs">
              <option value={0}>Min Score: 0</option>
              <option value={0.3}>Min Score: 0.3</option>
              <option value={0.5}>Min Score: 0.5</option>
              <option value={0.7}>Min Score: 0.7</option>
              <option value={0.9}>Min Score: 0.9</option>
            </select>
          </div>
          <span className="text-[10px] text-textSecondary font-mono">{filteredSorted.length} results</span>
        </div>
      </div>

      <div className="bg-surface rounded-2xl border border-border/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="enterprise-table w-full text-sm text-left">
            <thead>
              <tr className="bg-bg/50 border-b border-border text-[10px] font-black text-textSecondary uppercase tracking-widest">
                <th className="px-5 py-3.5 cursor-pointer hover:text-primary" onClick={() => handleSort('claim_id')}>
                  <span className="flex items-center gap-1">Claim ID <ArrowUpDown size={10} /></span>
                </th>
                <th className="px-5 py-3.5 cursor-pointer hover:text-primary" onClick={() => handleSort('patient_name')}>
                  <span className="flex items-center gap-1"><User size={10} /> Patient <ArrowUpDown size={10} /></span>
                </th>
                <th className="px-5 py-3.5 cursor-pointer hover:text-primary" onClick={() => handleSort('provider_name')}>
                  <span className="flex items-center gap-1"><Building2 size={10} /> Provider <ArrowUpDown size={10} /></span>
                </th>
                <th className="px-5 py-3.5 cursor-pointer hover:text-primary" onClick={() => handleSort('claim_amount')}>
                  <span className="flex items-center gap-1"><DollarSign size={10} /> Amount <ArrowUpDown size={10} /></span>
                </th>
                <th className="px-5 py-3.5 cursor-pointer hover:text-primary" onClick={() => handleSort('fraud_score')}>
                  <span className="flex items-center gap-1"><AlertTriangle size={10} /> Risk Score <ArrowUpDown size={10} /></span>
                </th>
                <th className="px-5 py-3.5 cursor-pointer hover:text-primary" onClick={() => handleSort('status')}>
                  <span className="flex items-center gap-1">Status <ArrowUpDown size={10} /></span>
                </th>
                <th className="px-5 py-3.5">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredSorted.map((c) => (
                <tr key={c.claim_id} className="hover:bg-bg/30 transition-colors group">
                  <td className="px-5 py-4 font-mono text-xs font-bold text-primary">#{c.claim_id}</td>
                  <td className="px-5 py-4 font-semibold text-textPrimary text-sm">{c.patient_name}</td>
                  <td className="px-5 py-4 text-textSecondary text-xs max-w-[150px] truncate">{c.provider_name}</td>
                  <td className="px-5 py-4 font-mono text-sm font-bold text-textPrimary">
                    {formatCurrency(c.claim_amount)}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 max-w-[80px] bg-bg/60 rounded-full h-1.5 overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${(c.fraud_score || 0) >= 0.7 ? 'bg-danger' : (c.fraud_score || 0) >= 0.4 ? 'bg-warning' : 'bg-success'}`}
                          style={{ width: `${((c.fraud_score || 0) * 100).toFixed(0)}%` }} />
                      </div>
                      <span className={`text-[10px] font-black ${(c.fraud_score || 0) >= 0.7 ? 'text-danger' : (c.fraud_score || 0) >= 0.4 ? 'text-warning' : 'text-success'}`}>
                        {((c.fraud_score || 0) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4"><StatusBadge status={c.status || 'pending'} /></td>
                  <td className="px-5 py-4">
                    <button onClick={() => navigate(`/insurance/claims/${c.claim_id}`)}
                      className="text-xs font-bold text-primary hover:underline opacity-0 group-hover:opacity-100 transition-opacity">
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
              {filteredSorted.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-textSecondary italic">No claims match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border/60 px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-textSecondary font-semibold">Rows per page:</span>
            <select
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="bg-bg border border-border rounded-lg px-2 py-1 text-[10px] font-bold text-textPrimary outline-none"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-[10px] text-textSecondary font-mono">Page {page}</span>
          </div>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}
              className="enterprise-btn-ghost p-2 disabled:opacity-30"><ChevronLeft size={14} /></button>
            <span className="text-xs font-mono text-textPrimary font-bold">{page}</span>
            <button onClick={() => setPage(p => p + 1)}
              className="enterprise-btn-ghost p-2"><ChevronRight size={14} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
