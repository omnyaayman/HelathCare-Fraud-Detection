import { useState, useEffect, useCallback } from 'react';
import { Activity, Clock, User, Search, Filter, Download, FileText, ShieldCheck } from 'lucide-react';
import api from '../../api';
import Skeleton from '../../components/Skeleton';

const statusClasses = {
  success: 'border-green-500/20 bg-green-500/10 text-green-500',
  warning: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-500',
  danger: 'border-red-500/20 bg-red-500/10 text-red-500',
};

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 10;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        page_size: PAGE_SIZE,
        search: search || undefined,
        action_type: statusFilter !== 'all' ? statusFilter : undefined,
      };
      const data = await api.getAuditLogs(params);
      if (data.data) {
        setLogs(data.data);
        setTotal(data.total);
      } else {
        setLogs(data);
        setTotal(data.length);
      }
    } catch (error) {
      console.error('Failed to fetch audit logs', error);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = logs.filter(log => {
    if (statusFilter === 'all') return true;
    const logAction = log.action?.toLowerCase() || '';
    if (statusFilter === 'success') return logAction.includes('create') || logAction.includes('update') || logAction.includes('read');
    if (statusFilter === 'danger') return logAction.includes('delete') || logAction.includes('fraud');
    if (statusFilter === 'warning') return logAction.includes('retrain');
    return true;
  });

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-primary/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-primary">
            <Activity size={14} />
            Audit & Compliance
          </div>
          <h1 className="mt-4 text-2xl font-bold text-textPrimary">Audit Logs</h1>
          <p className="mt-2 text-sm text-textSecondary">Complete audit trail of all system activities</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-bold text-textPrimary hover:border-primary/40 hover:bg-primary/5">
          <Download size={16} />
          Export Logs
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="relative lg:col-span-2">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
          <input
            type="text"
            placeholder="Search logs by user, action, or details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface py-3 pl-10 pr-4 text-sm outline-none"
          />
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3">
          <Filter size={16} className="text-textSecondary" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full border-0 bg-transparent text-sm font-bold outline-none"
          >
            <option value="all">All Status</option>
            <option value="success">Success</option>
            <option value="warning">Warning</option>
            <option value="danger">Danger</option>
          </select>
        </div>
      </div>

      {loading ? <Skeleton rows={10} /> : (
        <div className="rounded-2xl border border-border bg-surface shadow-sm">
          <div className="border-b border-border px-6 py-4">
            <div className="grid grid-cols-12 gap-4 text-xs font-black uppercase tracking-widest text-textSecondary">
              <div className="col-span-1">ID</div>
              <div className="col-span-2">User</div>
              <div className="col-span-3">Action</div>
              <div className="col-span-3">Details</div>
              <div className="col-span-2">Timestamp</div>
              <div className="col-span-1">IP</div>
            </div>
          </div>
          <div className="divide-y divide-border">
            {filteredLogs.map(log => {
              const logAction = log.action?.toLowerCase() || '';
              let status = 'info';
              if (logAction.includes('delete') || logAction.includes('fraud')) status = 'danger';
              else if (logAction.includes('retrain')) status = 'warning';
              else status = 'success';

              return (
                <div key={log.id} className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-bg/50">
                  <div className="col-span-1 flex items-center">
                    <span className="font-mono text-xs font-bold text-textSecondary">{log.id}</span>
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <User size={16} />
                    </div>
                    <span className="text-sm font-bold text-textPrimary">{log.user}</span>
                  </div>
                  <div className="col-span-3 flex items-center">
                    <span className="text-sm text-textPrimary">{log.action}</span>
                  </div>
                  <div className="col-span-3 flex items-center">
                    <span className="text-sm text-textSecondary">{log.affected_record || 'N/A'}</span>
                  </div>
                  <div className="col-span-2 flex items-center gap-2 text-xs text-textSecondary">
                    <Clock size={12} />
                    {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                  </div>
                  <div className="col-span-1 flex items-center">
                    <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${statusClasses[status]}`}>
                      {status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center">
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 rounded border border-border text-sm">
              Prev
            </button>
            <span className="text-sm text-textSecondary">Page {page} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 rounded border border-border text-sm">
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
