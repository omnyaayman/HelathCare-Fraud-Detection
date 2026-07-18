import { useState, useEffect, useMemo } from 'react';
import { Search, Users, Download, Eye, AlertTriangle, ShieldCheck, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../api';
import Skeleton from '../../components/Skeleton';
import PlotlyChart from '../../components/PlotlyChart';

const formatCurrency = (val) => {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num);
};

export default function PatientManagement() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.getPatients();
        setPatients(res || []);
      } catch (err) {
        console.error('Failed to load patients', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    return patients.filter(p =>
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.state?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.gender?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.patient_id?.toString().includes(searchTerm)
    );
  }, [patients, searchTerm]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  // Compute Patient Statistics
  const stats = useMemo(() => {
    const total = patients.length;
    const avgAge = total ? Math.round(patients.reduce((sum, p) => sum + (p.age || 0), 0) / total) : 0;
    const highRisk = patients.filter(p => (p.fraud_count || 0) > 0).length;
    return { total, avgAge, highRisk };
  }, [patients]);

  // Risk Categories Donut
  const riskCategoriesData = useMemo(() => {
    const high = stats.highRisk;
    const low = stats.total - high;
    return [
      {
        labels: ['High Risk', 'Low Risk'],
        values: [high, low],
        type: 'pie',
        hole: 0.6,
        marker: { colors: ['#ef4444', '#10b981'] },
        textinfo: 'percent',
        textposition: 'inside',
        showlegend: true
      }
    ];
  }, [stats]);

  // Age Distribution Chart Data
  const ageChartData = useMemo(() => {
    const ranges = { 'Under 30': 0, '30-49': 0, '50-69': 0, '70+': 0 };
    patients.forEach(p => {
      if (p.age < 30) ranges['Under 30'] += 1;
      else if (p.age < 50) ranges['30-49'] += 1;
      else if (p.age < 70) ranges['50-69'] += 1;
      else ranges['70+'] += 1;
    });

    return [
      {
        x: Object.keys(ranges),
        y: Object.values(ranges),
        type: 'bar',
        marker: { color: '#6366f1' }
      }
    ];
  }, [patients]);

  // Claims Distribution Chart Data
  const claimsChartData = useMemo(() => {
    const distributions = { '1 Claim': 0, '2-4 Claims': 0, '5-9 Claims': 0, '10+ Claims': 0 };
    patients.forEach(p => {
      const c = p.total_claims || 0;
      if (c === 1) distributions['1 Claim'] += 1;
      else if (c <= 4) distributions['2-4 Claims'] += 1;
      else if (c <= 9) distributions['5-9 Claims'] += 1;
      else distributions['10+ Claims'] += 1;
    });

    return [
      {
        x: Object.keys(distributions),
        y: Object.values(distributions),
        type: 'bar',
        marker: { color: '#0d9488' }
      }
    ];
  }, [patients]);

  const exportCSV = () => {
    const headers = ['Patient ID', 'Name', 'Age', 'Gender', 'Location', 'Claims Count', 'Fraud Count'];
    const csvContent = [
      headers.join(','),
      ...patients.map(p => [
        p.patient_id,
        `"${p.name || ''}"`,
        p.age || 0,
        p.gender || '',
        `"${p.city || ''}, ${p.state || ''}"`,
        p.total_claims || 0,
        p.fraud_count || 0
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `patients_registry.csv`);
    link.click();
  };

  if (loading) {
    return <div className="p-6"><Skeleton rows={8} /></div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-textPrimary">Patient Management</h1>
          <p className="mt-1 text-sm text-textSecondary">Manage insurance policyholder profiles and monitor their clinical billing threat stats.</p>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-bold text-textPrimary hover:bg-bg transition-colors">
          <Download size={16} />
          Export CSV
        </button>
      </div>

      {/* Patient Statistics (3 Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl">
            <Users size={24} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-textSecondary">Total Patient Base</p>
            <p className="text-2xl font-black text-textPrimary font-mono">{stats.total}</p>
          </div>
        </div>
        <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-500/10 text-green-500 rounded-xl">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-textSecondary">Average Profile Age</p>
            <p className="text-2xl font-black text-textPrimary font-mono">{stats.avgAge} years</p>
          </div>
        </div>
        <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm flex items-center gap-4 border-l-4 border-l-red-500">
          <div className="p-3 bg-red-500/10 text-red-500 rounded-xl">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-red-500">High Risk Policyholders</p>
            <p className="text-2xl font-black text-red-500 font-mono">{stats.highRisk}</p>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-textPrimary mb-1">Age Distribution</h3>
          <p className="text-xs text-textSecondary mb-4">Frequency breakdown of policyholder age groups</p>
          <div className="h-56 bg-surface p-2">
            <PlotlyChart data={ageChartData} layout={{ margin: { t: 10, r: 10, l: 30, b: 35 }, xaxis: { showgrid: false }, yaxis: { gridcolor: 'rgba(226, 232, 240, 0.5)' } }} />
          </div>
        </div>
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-textPrimary mb-1">Claims Distribution</h3>
          <p className="text-xs text-textSecondary mb-4">Policyholders grouped by historical claims frequency</p>
          <div className="h-56 bg-surface p-2">
            <PlotlyChart data={claimsChartData} layout={{ margin: { t: 10, r: 10, l: 30, b: 35 }, xaxis: { showgrid: false }, yaxis: { gridcolor: 'rgba(226, 232, 240, 0.5)' } }} />
          </div>
        </div>
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-textPrimary mb-1">Risk Categories</h3>
          <p className="text-xs text-textSecondary mb-4 font-sans">Distribution of risk ratings</p>
          <div className="h-56 bg-surface p-2">
            <PlotlyChart data={riskCategoriesData} layout={{ margin: { t: 10, b: 10, l: 10, r: 10 }, height: 180, legend: { orientation: 'h', y: -0.15 } }} />
          </div>
        </div>
      </div>

      {/* Directory Grid */}
      <div className="enterprise-card">
        <div className="flex items-center gap-4 border-b border-border p-4">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm">
            <Search size={16} className="text-textSecondary" />
            <input
              type="text"
              placeholder="Search patients by ID, Name or City..."
              className="flex-1 bg-transparent outline-none text-textPrimary placeholder:text-textSecondary/60"
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
                <th>Claims</th>
                <th>Risk Level</th>
                <th>Profile Button</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((patient) => {
                const isRisk = (patient.fraud_count || 0) > 0;
                return (
                  <tr key={patient.patient_id}>
                    <td className="font-mono text-xs font-bold text-textSecondary">#{patient.patient_id}</td>
                    <td className="font-semibold text-textPrimary">{patient.name}</td>
                    <td className="text-sm text-textSecondary">{patient.age} years</td>
                    <td className="text-sm text-textSecondary">{patient.gender}</td>
                    <td className="text-sm text-textSecondary">{patient.city}, {patient.state}</td>
                    <td className="text-sm font-bold text-textPrimary font-mono">{patient.total_claims || 0} claims</td>
                    <td>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                        isRisk ? 'bg-danger/10 text-danger border border-danger/20' : 'bg-success/10 text-success border border-success/20'
                      }`}>
                        {isRisk ? 'High Risk' : 'Normal'}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => setSelectedPatient(patient)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-textSecondary hover:border-primary hover:text-primary transition-colors"
                        title="View Profile"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
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
            <span className="text-[10px] text-textSecondary font-mono">Page {page} of {totalPages || 1}</span>
          </div>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}
              className="enterprise-btn-ghost p-2 disabled:opacity-30"><ChevronLeft size={14} /></button>
            <span className="text-xs font-mono text-textPrimary font-bold">{page}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
              className="enterprise-btn-ghost p-2 disabled:opacity-30"><ChevronRight size={14} /></button>
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedPatient(null)}>
          <div className="enterprise-card max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-border px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-black text-textPrimary">Patient File Details</h3>
              <button onClick={() => setSelectedPatient(null)} className="text-textSecondary hover:text-textPrimary text-xl">
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary text-white text-2xl font-black">
                  {selectedPatient.name?.charAt(0) || 'P'}
                </div>
                <div>
                  <h4 className="text-xl font-black text-textPrimary">{selectedPatient.name}</h4>
                  <p className="text-sm text-textSecondary">Patient No. #{selectedPatient.patient_id}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase text-textSecondary">Age</p>
                  <p className="font-semibold text-textPrimary">{selectedPatient.age} years</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-textSecondary">Gender</p>
                  <p className="font-semibold text-textPrimary">{selectedPatient.gender}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-textSecondary">Location</p>
                  <p className="font-semibold text-textPrimary">{selectedPatient.city}, {selectedPatient.state}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-textSecondary">Total Claims Count</p>
                  <p className="font-semibold text-textPrimary">{selectedPatient.total_claims || 0}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-textSecondary">Policy No.</p>
                  <p className="font-mono font-semibold text-textPrimary">{selectedPatient.policy_id || 'No Active Policy'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-textSecondary">Deductible Limit</p>
                  <p className="font-semibold text-textPrimary">{formatCurrency(selectedPatient.annual_deductible)}</p>
                </div>
                <div className="col-span-2 border-t border-border pt-3">
                  <p className="text-[10px] font-black uppercase text-textSecondary">Historical Fraud Count</p>
                  <p className={`font-bold text-sm mt-1 ${(selectedPatient.fraud_count || 0) > 0 ? 'text-danger' : 'text-success'}`}>
                    {selectedPatient.fraud_count || 0} flagged fraudulent claims found.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
