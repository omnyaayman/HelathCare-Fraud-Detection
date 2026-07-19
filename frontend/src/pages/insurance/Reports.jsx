import { useState, useMemo, useCallback, useRef } from 'react';
import PlotlyChart from '../../components/PlotlyChart';
import Skeleton from '../../components/Skeleton';
import Pagination from '../../components/Pagination';
import {
  BarChart3, Download, FileText, Filter, TrendingUp, AlertTriangle,
  Building2, Users, Activity, Calendar, ChevronDown, ChevronUp, Search,
  X, RefreshCw, ArrowUpDown, Loader2, CheckCircle2
} from 'lucide-react';

const fmt = new Intl.NumberFormat('en-US');
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const monthlyData = [
  { month: 'Jan 2025', claims: 98450, fraud: 6892, amount: 18750000, loss: 2340000 },
  { month: 'Feb 2025', claims: 95230, fraud: 6667, amount: 18100000, loss: 2210000 },
  { month: 'Mar 2025', claims: 102800, fraud: 7196, amount: 19800000, loss: 2520000 },
  { month: 'Apr 2025', claims: 108900, fraud: 7623, amount: 20900000, loss: 2780000 },
  { month: 'May 2025', claims: 112400, fraud: 8430, amount: 21500000, loss: 3120000 },
  { month: 'Jun 2025', claims: 106700, fraud: 7469, amount: 20100000, loss: 2650000 },
  { month: 'Jul 2025', claims: 115800, fraud: 8685, amount: 22200000, loss: 3340000 },
  { month: 'Aug 2025', claims: 118200, fraud: 8865, amount: 22800000, loss: 3450000 },
  { month: 'Sep 2025', claims: 109500, fraud: 8213, amount: 20800000, loss: 2960000 },
  { month: 'Oct 2025', claims: 113700, fraud: 8528, amount: 21600000, loss: 3210000 },
  { month: 'Nov 2025', claims: 120100, fraud: 9008, amount: 23100000, loss: 3580000 },
  { month: 'Dec 2025', claims: 146952, fraud: 10480, amount: 28250000, loss: 4120000 },
];

const statusData = [
  { status: 'Approved', count: 845230, color: '#10b981' },
  { status: 'Under Review', count: 198450, color: '#f59e0b' },
  { status: 'Denied', count: 114696, color: '#ef4444' },
  { status: 'Pending', count: 89456, color: '#6366f1' },
];

const providerFraud = [
  { name: 'Metropolitan General Hospital', fraudCases: 4523, totalClaims: 38900, rate: 11.6 },
  { name: 'St. Mary Medical Center', fraudCases: 3891, totalClaims: 35200, rate: 11.1 },
  { name: 'City Health Network', fraudCases: 3456, totalClaims: 42100, rate: 8.2 },
  { name: 'Pacific Wellness Group', fraudCases: 2987, totalClaims: 28700, rate: 10.4 },
  { name: 'Summit Healthcare Partners', fraudCases: 2654, totalClaims: 31200, rate: 8.5 },
  { name: 'Lakeside Medical Associates', fraudCases: 2345, totalClaims: 26800, rate: 8.8 },
  { name: 'Valley Regional Hospital', fraudCases: 2198, totalClaims: 29500, rate: 7.5 },
  { name: 'Northeast Health Services', fraudCases: 1987, totalClaims: 24100, rate: 8.2 },
  { name: 'Premier Care Network', fraudCases: 1823, totalClaims: 22400, rate: 8.1 },
  { name: 'Community Health Alliance', fraudCases: 1654, totalClaims: 21800, rate: 7.6 },
];

const diagnosisData = [
  { code: 'M54.5', name: 'Low Back Pain', cases: 8945, amount: 12700000, rate: 14.2 },
  { code: 'E11.9', name: 'Type 2 Diabetes', cases: 7832, amount: 11200000, rate: 9.8 },
  { code: 'I10', name: 'Essential Hypertension', cases: 7234, amount: 8900000, rate: 8.4 },
  { code: 'J06.9', name: 'Acute URI', cases: 6543, amount: 4300000, rate: 12.1 },
  { code: 'Z00.00', name: 'General Exam', cases: 5987, amount: 3200000, rate: 6.7 },
  { code: 'M79.3', name: 'Panniculitis', cases: 5234, amount: 7800000, rate: 15.8 },
  { code: 'G43.909', name: 'Migraine', cases: 4876, amount: 6500000, rate: 11.3 },
  { code: 'F32.1', name: 'Major Depression', cases: 4321, amount: 5900000, rate: 8.9 },
  { code: 'N39.0', name: 'UTI', cases: 3987, amount: 3400000, rate: 7.2 },
  { code: 'K21.0', name: 'GERD', cases: 3654, amount: 4100000, rate: 9.4 },
];

const fraudCategories = [
  { category: 'Upcoding', cases: 28450, percentage: 31.8 },
  { category: 'Duplicate Claims', cases: 18230, percentage: 20.4 },
  { category: 'Phantom Billing', cases: 14890, percentage: 16.6 },
  { category: 'Unbundling', cases: 11230, percentage: 12.6 },
  { category: 'Kickback Schemes', cases: 8940, percentage: 10.0 },
  { category: 'Identity Fraud', cases: 4560, percentage: 5.1 },
  { category: 'Other', cases: 3156, percentage: 3.5 },
];

const regionData = [
  { region: 'Northeast', fraud: 23400, percentage: 26.2 },
  { region: 'Southeast', fraud: 21800, percentage: 24.4 },
  { region: 'Midwest', fraud: 16500, percentage: 18.4 },
  { region: 'West', fraud: 18900, percentage: 21.1 },
  { region: 'Southwest', fraud: 8856, percentage: 9.9 },
];

const allClaims = [
  { id: 'CLM-2025-089451', patient: 'Margaret Thompson', provider: 'Metropolitan General Hospital', amount: 45230, status: 'Approved', fraudScore: 12.3, riskLevel: 'low', date: '2025-12-15', insurance: 'Medicare' },
  { id: 'CLM-2025-089452', patient: 'Robert Chen', provider: 'St. Mary Medical Center', amount: 89750, status: 'Under Review', fraudScore: 78.9, riskLevel: 'high', date: '2025-12-14', insurance: 'Blue Cross' },
  { id: 'CLM-2025-089453', patient: 'Sarah Mitchell', provider: 'City Health Network', amount: 12340, status: 'Approved', fraudScore: 5.6, riskLevel: 'low', date: '2025-12-14', insurance: 'Aetna' },
  { id: 'CLM-2025-089454', patient: 'James Wilson', provider: 'Pacific Wellness Group', amount: 156800, status: 'Denied', fraudScore: 92.1, riskLevel: 'critical', date: '2025-12-13', insurance: 'UnitedHealth' },
  { id: 'CLM-2025-089455', patient: 'Linda Garcia', provider: 'Summit Healthcare Partners', amount: 23400, status: 'Pending', fraudScore: 34.7, riskLevel: 'medium', date: '2025-12-13', insurance: 'Cigna' },
  { id: 'CLM-2025-089456', patient: 'William Brown', provider: 'Lakeside Medical Associates', amount: 67890, status: 'Approved', fraudScore: 18.9, riskLevel: 'low', date: '2025-12-12', insurance: 'Medicaid' },
  { id: 'CLM-2025-089457', patient: 'Patricia Davis', provider: 'Metropolitan General Hospital', amount: 234500, status: 'Under Review', fraudScore: 87.3, riskLevel: 'critical', date: '2025-12-12', insurance: 'Medicare' },
  { id: 'CLM-2025-089458', patient: 'Michael Johnson', provider: 'Valley Regional Hospital', amount: 8920, status: 'Approved', fraudScore: 7.2, riskLevel: 'low', date: '2025-12-11', insurance: 'Blue Cross' },
  { id: 'CLM-2025-089459', patient: 'Jennifer Anderson', provider: 'Northeast Health Services', amount: 45670, status: 'Denied', fraudScore: 65.4, riskLevel: 'high', date: '2025-12-11', insurance: 'Aetna' },
  { id: 'CLM-2025-089460', patient: 'David Martinez', provider: 'Premier Care Network', amount: 123400, status: 'Under Review', fraudScore: 96.4, riskLevel: 'critical', date: '2025-12-10', insurance: 'UnitedHealth' },
  { id: 'CLM-2025-089461', patient: 'Barbara Robinson', provider: 'Community Health Alliance', amount: 19870, status: 'Approved', fraudScore: 14.5, riskLevel: 'low', date: '2025-12-10', insurance: 'Cigna' },
  { id: 'CLM-2025-089462', patient: 'Thomas Clark', provider: 'City Health Network', amount: 78340, status: 'Pending', fraudScore: 42.1, riskLevel: 'medium', date: '2025-12-09', insurance: 'Medicare' },
  { id: 'CLM-2025-089463', patient: 'Elizabeth Rodriguez', provider: 'Metropolitan General Hospital', amount: 167800, status: 'Denied', fraudScore: 89.7, riskLevel: 'critical', date: '2025-12-09', insurance: 'Medicaid' },
  { id: 'CLM-2025-089464', patient: 'Richard Lewis', provider: 'St. Mary Medical Center', amount: 56780, status: 'Approved', fraudScore: 22.8, riskLevel: 'low', date: '2025-12-08', insurance: 'Blue Cross' },
  { id: 'CLM-2025-089465', patient: 'Susan Walker', provider: 'Pacific Wellness Group', amount: 34560, status: 'Under Review', fraudScore: 58.3, riskLevel: 'medium', date: '2025-12-08', insurance: 'Aetna' },
  { id: 'CLM-2025-089466', patient: 'Charles Hall', provider: 'Summit Healthcare Partners', amount: 89010, status: 'Approved', fraudScore: 11.4, riskLevel: 'low', date: '2025-12-07', insurance: 'UnitedHealth' },
  { id: 'CLM-2025-089467', patient: 'Karen Allen', provider: 'Lakeside Medical Associates', amount: 12340, status: 'Pending', fraudScore: 28.9, riskLevel: 'low', date: '2025-12-07', insurance: 'Cigna' },
  { id: 'CLM-2025-089468', patient: 'Daniel Young', provider: 'Metropolitan General Hospital', amount: 245600, status: 'Under Review', fraudScore: 94.2, riskLevel: 'critical', date: '2025-12-06', insurance: 'Medicare' },
  { id: 'CLM-2025-089469', patient: 'Nancy King', provider: 'Valley Regional Hospital', amount: 23450, status: 'Approved', fraudScore: 9.8, riskLevel: 'low', date: '2025-12-06', insurance: 'Blue Cross' },
  { id: 'CLM-2025-089470', patient: 'Matthew Wright', provider: 'Northeast Health Services', amount: 56780, status: 'Denied', fraudScore: 71.6, riskLevel: 'high', date: '2025-12-05', insurance: 'Aetna' },
  { id: 'CLM-2025-089471', patient: 'Betty Lopez', provider: 'City Health Network', amount: 8920, status: 'Approved', fraudScore: 4.3, riskLevel: 'low', date: '2025-12-05', insurance: 'UnitedHealth' },
  { id: 'CLM-2025-089472', patient: 'Andrew Hill', provider: 'Premier Care Network', amount: 123400, status: 'Under Review', fraudScore: 83.5, riskLevel: 'critical', date: '2025-12-04', insurance: 'Cigna' },
  { id: 'CLM-2025-089473', patient: 'Dorothy Scott', provider: 'Community Health Alliance', amount: 34560, status: 'Approved', fraudScore: 16.7, riskLevel: 'low', date: '2025-12-04', insurance: 'Medicare' },
  { id: 'CLM-2025-089474', patient: 'Joshua Green', provider: 'Metropolitan General Hospital', amount: 189700, status: 'Denied', fraudScore: 91.8, riskLevel: 'critical', date: '2025-12-03', insurance: 'Medicaid' },
  { id: 'CLM-2025-089475', patient: 'Sandra Adams', provider: 'St. Mary Medical Center', amount: 67890, status: 'Pending', fraudScore: 45.2, riskLevel: 'medium', date: '2025-12-03', insurance: 'Blue Cross' },
  { id: 'CLM-2025-089476', patient: 'Kevin Baker', provider: 'Pacific Wellness Group', amount: 23400, status: 'Approved', fraudScore: 8.1, riskLevel: 'low', date: '2025-12-02', insurance: 'Aetna' },
  { id: 'CLM-2025-089477', patient: 'Donna Nelson', provider: 'Summit Healthcare Partners', amount: 156800, status: 'Under Review', fraudScore: 76.4, riskLevel: 'high', date: '2025-12-02', insurance: 'UnitedHealth' },
  { id: 'CLM-2025-089478', patient: 'Mark Carter', provider: 'Lakeside Medical Associates', amount: 45230, status: 'Approved', fraudScore: 19.3, riskLevel: 'low', date: '2025-12-01', insurance: 'Cigna' },
  { id: 'CLM-2025-089479', patient: 'Michelle Mitchell', provider: 'Metropolitan General Hospital', amount: 89750, status: 'Denied', fraudScore: 68.9, riskLevel: 'high', date: '2025-12-01', insurance: 'Medicare' },
  { id: 'CLM-2025-089480', patient: 'Steven Perez', provider: 'Valley Regional Hospital', amount: 12340, status: 'Approved', fraudScore: 3.7, riskLevel: 'low', date: '2025-11-30', insurance: 'Blue Cross' },
  { id: 'CLM-2025-089481', patient: 'Laura Roberts', provider: 'Northeast Health Services', amount: 234500, status: 'Under Review', fraudScore: 88.6, riskLevel: 'critical', date: '2025-11-30', insurance: 'Aetna' },
  { id: 'CLM-2025-089482', patient: 'Brian Turner', provider: 'City Health Network', amount: 8920, status: 'Pending', fraudScore: 31.4, riskLevel: 'medium', date: '2025-11-29', insurance: 'UnitedHealth' },
  { id: 'CLM-2025-089483', patient: 'Carol Phillips', provider: 'Premier Care Network', amount: 67890, status: 'Approved', fraudScore: 21.6, riskLevel: 'low', date: '2025-11-29', insurance: 'Cigna' },
  { id: 'CLM-2025-089484', patient: 'George Campbell', provider: 'Community Health Alliance', amount: 167800, status: 'Denied', fraudScore: 85.3, riskLevel: 'critical', date: '2025-11-28', insurance: 'Medicare' },
  { id: 'CLM-2025-089485', patient: 'Angela Parker', provider: 'Metropolitan General Hospital', amount: 34560, status: 'Under Review', fraudScore: 52.8, riskLevel: 'medium', date: '2025-11-28', insurance: 'Medicaid' },
  { id: 'CLM-2025-089486', patient: 'Edward Evans', provider: 'St. Mary Medical Center', amount: 45230, status: 'Approved', fraudScore: 15.4, riskLevel: 'low', date: '2025-11-27', insurance: 'Blue Cross' },
  { id: 'CLM-2025-089487', patient: 'Melissa Edwards', provider: 'Pacific Wellness Group', amount: 89750, status: 'Pending', fraudScore: 39.7, riskLevel: 'medium', date: '2025-11-27', insurance: 'Aetna' },
  { id: 'CLM-2025-089488', patient: 'Ronald Collins', provider: 'Summit Healthcare Partners', amount: 123400, status: 'Denied', fraudScore: 93.1, riskLevel: 'critical', date: '2025-11-26', insurance: 'UnitedHealth' },
  { id: 'CLM-2025-089489', patient: 'Deborah Stewart', provider: 'Lakeside Medical Associates', amount: 23400, status: 'Approved', fraudScore: 6.9, riskLevel: 'low', date: '2025-11-26', insurance: 'Cigna' },
  { id: 'CLM-2025-089490', patient: 'Timothy Sanchez', provider: 'Metropolitan General Hospital', amount: 189700, status: 'Under Review', fraudScore: 82.4, riskLevel: 'critical', date: '2025-11-25', insurance: 'Medicare' },
  { id: 'CLM-2025-089491', patient: 'Sharon Morris', provider: 'Valley Regional Hospital', amount: 56780, status: 'Approved', fraudScore: 17.2, riskLevel: 'low', date: '2025-11-25', insurance: 'Blue Cross' },
  { id: 'CLM-2025-089492', patient: 'Jeffrey Rogers', provider: 'Northeast Health Services', amount: 34560, status: 'Denied', fraudScore: 63.8, riskLevel: 'high', date: '2025-11-24', insurance: 'Aetna' },
  { id: 'CLM-2025-089493', patient: 'Cynthia Reed', provider: 'City Health Network', amount: 89010, status: 'Pending', fraudScore: 44.5, riskLevel: 'medium', date: '2025-11-24', insurance: 'UnitedHealth' },
  { id: 'CLM-2025-089494', patient: 'Larry Cook', provider: 'Premier Care Network', amount: 19870, status: 'Approved', fraudScore: 10.8, riskLevel: 'low', date: '2025-11-23', insurance: 'Cigna' },
  { id: 'CLM-2025-089495', patient: 'Kathleen Morgan', provider: 'Community Health Alliance', amount: 156800, status: 'Under Review', fraudScore: 79.2, riskLevel: 'high', date: '2025-11-23', insurance: 'Medicare' },
  { id: 'CLM-2025-089496', patient: 'Jerry Bell', provider: 'Metropolitan General Hospital', amount: 45230, status: 'Denied', fraudScore: 72.5, riskLevel: 'high', date: '2025-11-22', insurance: 'Medicaid' },
  { id: 'CLM-2025-089497', patient: 'Gloria Murphy', provider: 'St. Mary Medical Center', amount: 8920, status: 'Approved', fraudScore: 2.1, riskLevel: 'low', date: '2025-11-22', insurance: 'Blue Cross' },
  { id: 'CLM-2025-089498', patient: 'Dennis Bailey', provider: 'Pacific Wellness Group', amount: 234500, status: 'Pending', fraudScore: 55.6, riskLevel: 'medium', date: '2025-11-21', insurance: 'Aetna' },
  { id: 'CLM-2025-089499', patient: 'Beverly Rivera', provider: 'Summit Healthcare Partners', amount: 67890, status: 'Approved', fraudScore: 13.9, riskLevel: 'low', date: '2025-11-21', insurance: 'UnitedHealth' },
  { id: 'CLM-2025-089500', patient: 'Arthur Cooper', provider: 'Lakeside Medical Associates', amount: 34560, status: 'Denied', fraudScore: 86.7, riskLevel: 'critical', date: '2025-11-20', insurance: 'Cigna' },
];

const kpis = [
  { label: 'Total Claims Analyzed', value: '1,247,832', icon: BarChart3, color: 'from-indigo-500/20 to-indigo-600/5', iconColor: 'text-indigo-400', change: '+8.3%', up: true },
  { label: 'Fraud Cases Detected', value: '89,456', icon: AlertTriangle, color: 'from-amber-500/20 to-amber-600/5', iconColor: 'text-amber-400', change: '+12.1%', up: true },
  { label: 'Financial Impact', value: '$234.7M', icon: TrendingUp, color: 'from-red-500/20 to-red-600/5', iconColor: 'text-red-400', change: '+15.4%', up: true },
  { label: 'Detection Rate', value: '7.17%', icon: Activity, color: 'from-emerald-500/20 to-emerald-600/5', iconColor: 'text-emerald-400', change: '+0.4%', up: true },
];

const dateRanges = ['All Time', 'Last 30 Days', 'Last 90 Days', 'Last 6 Months', 'This Year'];
const providers = [...new Set(allClaims.map(c => c.provider))];
const statuses = ['Approved', 'Under Review', 'Denied', 'Pending'];
const riskLevels = ['Low', 'Medium', 'High', 'Critical'];
const insurancePlans = ['Medicare', 'Medicaid', 'Blue Cross', 'Aetna', 'UnitedHealth', 'Cigna'];

const riskColor = (score) => {
  if (score < 30) return 'text-emerald-400';
  if (score < 60) return 'text-amber-400';
  if (score < 80) return 'text-orange-400';
  return 'text-red-400';
};

const riskBadge = (level) => {
  const map = {
    low: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    medium: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    high: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    critical: 'bg-red-500/15 text-red-400 border-red-500/30',
  };
  return map[level] || map.low;
};

const statusBadge = (status) => {
  const map = {
    Approved: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    'Under Review': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    Denied: 'bg-red-500/15 text-red-400 border-red-500/30',
    Pending: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  };
  return map[status] || '';
};

function Toast({ message, onClose }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-[#0f172a] px-5 py-3 shadow-2xl shadow-emerald-500/10">
      <CheckCircle2 size={18} className="text-emerald-400" />
      <span className="text-sm font-medium text-[#f8fafc]">{message}</span>
      <button onClick={onClose} className="ml-2 text-[#94a3b8] hover:text-[#f8fafc] transition-colors"><X size={14} /></button>
    </div>
  );
}

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [toast, setToast] = useState('');
  const [exporting, setExporting] = useState(null);

  const [filters, setFilters] = useState({
    dateRange: 'All Time',
    provider: '',
    hospital: '',
    status: '',
    risk: '',
    insurance: '',
  });

  const toastTimer = useRef(null);
  const showToast = useCallback((msg) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 3000);
  }, []);

  const updateFilter = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({ dateRange: 'All Time', provider: '', hospital: '', status: '', risk: '', insurance: '' });
    setSearch('');
    setPage(1);
  }, []);

  const removeFilter = useCallback((key) => {
    setFilters((prev) => ({ ...prev, [key]: key === 'dateRange' ? 'All Time' : '' }));
    setPage(1);
  }, []);

  const activeFilterPills = useMemo(() => {
    const pills = [];
    if (filters.dateRange !== 'All Time') pills.push({ key: 'dateRange', label: `Date: ${filters.dateRange}` });
    if (filters.provider) pills.push({ key: 'provider', label: `Provider: ${filters.provider}` });
    if (filters.hospital) pills.push({ key: 'hospital', label: `Hospital: ${filters.hospital}` });
    if (filters.status) pills.push({ key: 'status', label: `Status: ${filters.status}` });
    if (filters.risk) pills.push({ key: 'risk', label: `Risk: ${filters.risk}` });
    if (filters.insurance) pills.push({ key: 'insurance', label: `Plan: ${filters.insurance}` });
    return pills;
  }, [filters]);

  const filteredClaims = useMemo(() => {
    let data = [...allClaims];
    if (search) {
      const q = search.toLowerCase();
      data = data.filter((c) => c.id.toLowerCase().includes(q) || c.patient.toLowerCase().includes(q) || c.provider.toLowerCase().includes(q));
    }
    if (filters.provider) data = data.filter((c) => c.provider === filters.provider);
    if (filters.hospital) data = data.filter((c) => c.provider === filters.hospital);
    if (filters.status) data = data.filter((c) => c.status === filters.status);
    if (filters.insurance) data = data.filter((c) => c.insurance === filters.insurance);
    if (filters.risk) {
      const rl = filters.risk.toLowerCase();
      data = data.filter((c) => c.riskLevel === rl);
    }
    if (filters.dateRange !== 'All Time') {
      const now = new Date('2025-12-31');
      let cutoff;
      if (filters.dateRange === 'Last 30 Days') { cutoff = new Date(now); cutoff.setDate(cutoff.getDate() - 30); }
      else if (filters.dateRange === 'Last 90 Days') { cutoff = new Date(now); cutoff.setDate(cutoff.getDate() - 90); }
      else if (filters.dateRange === 'Last 6 Months') { cutoff = new Date(now); cutoff.setMonth(cutoff.getMonth() - 6); }
      else if (filters.dateRange === 'This Year') { cutoff = new Date('2025-01-01'); }
      if (cutoff) data = data.filter((c) => new Date(c.date) >= cutoff);
    }
    data.sort((a, b) => {
      let va = a[sortKey], vb = b[sortKey];
      if (typeof va === 'string') { va = va.toLowerCase(); vb = vb.toLowerCase(); }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return data;
  }, [search, filters, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredClaims.length / 10));
  const pagedClaims = filteredClaims.slice((page - 1) * 10, page * 10);

  const handleSort = useCallback((key) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }, [sortKey]);

  const columns = [
    { key: 'id', label: 'Claim ID' },
    { key: 'patient', label: 'Patient' },
    { key: 'provider', label: 'Provider' },
    { key: 'amount', label: 'Amount' },
    { key: 'status', label: 'Status' },
    { key: 'fraudScore', label: 'Fraud Score' },
    { key: 'riskLevel', label: 'Risk Level' },
    { key: 'date', label: 'Date' },
  ];

  const handleExportCSV = useCallback(() => {
    setExporting('csv');
    setTimeout(() => {
      const headers = ['Claim ID', 'Patient', 'Provider', 'Amount', 'Status', 'Fraud Score', 'Risk Level', 'Date', 'Insurance'];
      const rows = filteredClaims.map((c) => [c.id, c.patient, c.provider, c.amount, c.status, c.fraudScore, c.riskLevel, c.date, c.insurance]);
      const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${v}"`).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fraud-report-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setExporting(null);
      showToast('CSV exported successfully');
    }, 600);
  }, [filteredClaims, showToast]);

  const handleExportExcel = useCallback(() => {
    setExporting('excel');
    setTimeout(() => { setExporting(null); showToast('Excel export coming soon'); }, 1200);
  }, [showToast]);

  const handleExportPDF = useCallback(() => {
    setExporting('pdf');
    setTimeout(() => { setExporting(null); showToast('PDF export coming soon'); }, 1200);
  }, [showToast]);

  const SortHeader = ({ columnKey, label }) => (
    <th
      onClick={() => handleSort(columnKey)}
      className="cursor-pointer select-none whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#94a3b8] hover:text-[#f8fafc] transition-colors"
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortKey === columnKey ? (
          sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
        ) : (
          <ArrowUpDown size={10} className="opacity-30" />
        )}
      </span>
    </th>
  );

  return (
    <div className="min-h-screen bg-[#0b0f19] p-6 space-y-6">
      <Toast message={toast} onClose={() => setToast('')} />

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#f8fafc] tracking-tight">Executive Analytics Dashboard</h1>
          <p className="mt-1 text-sm text-[#94a3b8]">Comprehensive Fraud Intelligence & Reporting Hub</p>
        </div>
        <button
          onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 800); }}
          className="inline-flex items-center gap-2 rounded-xl border border-[#1e293b] bg-[#0f172a]/80 px-4 py-2 text-sm font-medium text-[#94a3b8] hover:border-[#4f46e5]/50 hover:text-[#818cf8] transition-all"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} type="card" />)
        ) : kpis.map((kpi) => (
          <div key={kpi.label} className={`rounded-2xl border border-[#1e293b]/80 bg-gradient-to-br ${kpi.color} p-5 backdrop-blur-sm`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#94a3b8]">{kpi.label}</span>
              <kpi.icon size={20} className={kpi.iconColor} />
            </div>
            <div className="mt-3 text-2xl font-extrabold text-[#f8fafc]">{kpi.value}</div>
            <div className="mt-1 text-xs text-emerald-400">{kpi.up ? '↑' : '↓'} {kpi.change} vs last period</div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl border border-[#1e293b]/80 bg-[#0f172a]/80 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center gap-2 rounded-xl border border-[#1e293b] bg-[#0b0f19] px-4 py-2 text-sm font-medium text-[#94a3b8] hover:border-[#4f46e5]/50 hover:text-[#818cf8] transition-all"
          >
            <Filter size={14} /> Filters {activeFilterPills.length > 0 && <span className="ml-1 rounded-full bg-[#4f46e5] px-1.5 text-[10px] font-bold text-white">{activeFilterPills.length}</span>}
          </button>

          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search claims..."
              className="w-full rounded-xl border border-[#1e293b] bg-[#0b0f19] py-2 pl-9 pr-4 text-sm text-[#f8fafc] placeholder-[#94a3b8]/60 focus:border-[#4f46e5]/60 focus:outline-none transition-colors"
            />
          </div>

          <button
            onClick={resetFilters}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#1e293b] bg-[#0b0f19] px-4 py-2 text-sm font-medium text-[#94a3b8] hover:border-[#ef4444]/50 hover:text-[#ef4444] transition-all"
          >
            <X size={13} /> Reset
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 grid grid-cols-1 gap-3 border-t border-[#1e293b]/60 pt-4 sm:grid-cols-3 lg:grid-cols-6">
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">Date Range</label>
              <select
                value={filters.dateRange}
                onChange={(e) => updateFilter('dateRange', e.target.value)}
                className="w-full rounded-lg border border-[#1e293b] bg-[#0b0f19] px-3 py-2 text-sm text-[#f8fafc] focus:border-[#4f46e5]/60 focus:outline-none"
              >
                {dateRanges.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">Provider</label>
              <select value={filters.provider} onChange={(e) => updateFilter('provider', e.target.value)} className="w-full rounded-lg border border-[#1e293b] bg-[#0b0f19] px-3 py-2 text-sm text-[#f8fafc] focus:border-[#4f46e5]/60 focus:outline-none">
                <option value="">All Providers</option>
                {providers.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">Hospital</label>
              <select value={filters.hospital} onChange={(e) => updateFilter('hospital', e.target.value)} className="w-full rounded-lg border border-[#1e293b] bg-[#0b0f19] px-3 py-2 text-sm text-[#f8fafc] focus:border-[#4f46e5]/60 focus:outline-none">
                <option value="">All Hospitals</option>
                {providers.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">Claim Status</label>
              <select value={filters.status} onChange={(e) => updateFilter('status', e.target.value)} className="w-full rounded-lg border border-[#1e293b] bg-[#0b0f19] px-3 py-2 text-sm text-[#f8fafc] focus:border-[#4f46e5]/60 focus:outline-none">
                <option value="">All Statuses</option>
                {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">Fraud Risk</label>
              <select value={filters.risk} onChange={(e) => updateFilter('risk', e.target.value)} className="w-full rounded-lg border border-[#1e293b] bg-[#0b0f19] px-3 py-2 text-sm text-[#f8fafc] focus:border-[#4f46e5]/60 focus:outline-none">
                <option value="">All Risks</option>
                {riskLevels.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">Insurance Plan</label>
              <select value={filters.insurance} onChange={(e) => updateFilter('insurance', e.target.value)} className="w-full rounded-lg border border-[#1e293b] bg-[#0b0f19] px-3 py-2 text-sm text-[#f8fafc] focus:border-[#4f46e5]/60 focus:outline-none">
                <option value="">All Plans</option>
                {insurancePlans.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
        )}

        {activeFilterPills.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {activeFilterPills.map((pill) => (
              <span key={pill.key} className="inline-flex items-center gap-1.5 rounded-full border border-[#4f46e5]/30 bg-[#4f46e5]/10 px-3 py-1 text-xs font-medium text-[#818cf8]">
                {pill.label}
                <button onClick={() => removeFilter(pill.key)} className="rounded-full p-0.5 hover:bg-[#4f46e5]/20 transition-colors"><X size={10} /></button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Charts Grid 1 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-[#1e293b]/80 bg-[#0f172a]/80 p-5">
              <Skeleton rows={3} />
              <div className="mt-4 h-64 skeleton-shimmer rounded-lg" />
            </div>
          ))
        ) : (
          <>
            <div className="rounded-2xl border border-[#1e293b]/80 bg-[#0f172a]/80 p-5">
              <h3 className="mb-1 text-sm font-bold text-[#f8fafc]">Monthly Fraud Trend</h3>
              <p className="mb-3 text-xs text-[#94a3b8]">Claims volume vs fraud detection over 12 months</p>
              <PlotlyChart
                data={[
                  { x: monthlyData.map((d) => d.month), y: monthlyData.map((d) => d.claims), type: 'scatter', mode: 'lines+markers', name: 'Total Claims', line: { color: '#6366f1', width: 2 }, fill: 'tozeroy', fillcolor: 'rgba(99,102,241,0.08)' },
                  { x: monthlyData.map((d) => d.month), y: monthlyData.map((d) => d.fraud), type: 'scatter', mode: 'lines+markers', name: 'Fraud Cases', line: { color: '#ef4444', width: 2 }, fill: 'tozeroy', fillcolor: 'rgba(239,68,68,0.08)' },
                ]}
                layout={{ height: 300, xaxis: { tickangle: -45 }, yaxis: { title: 'Count' }, legend: { orientation: 'h', x: 0, y: -0.25 } }}
              />
            </div>

            <div className="rounded-2xl border border-[#1e293b]/80 bg-[#0f172a]/80 p-5">
              <h3 className="mb-1 text-sm font-bold text-[#f8fafc]">Claims by Status</h3>
              <p className="mb-3 text-xs text-[#94a3b8]">Distribution of all claims by current status</p>
              <PlotlyChart
                data={[{
                  labels: statusData.map((d) => d.status),
                  values: statusData.map((d) => d.count),
                  type: 'pie',
                  hole: 0.55,
                  marker: { colors: statusData.map((d) => d.color) },
                  textinfo: 'label+percent',
                  textfont: { size: 11, color: '#f8fafc' },
                  hovertemplate: '%{label}: %{value:,.0f}<extra></extra>',
                }]}
                layout={{ height: 300, showlegend: true, legend: { orientation: 'h', x: 0, y: -0.1 } }}
              />
            </div>

            <div className="rounded-2xl border border-[#1e293b]/80 bg-[#0f172a]/80 p-5">
              <h3 className="mb-1 text-sm font-bold text-[#f8fafc]">Fraud by Provider</h3>
              <p className="mb-3 text-xs text-[#94a3b8]">Top providers by number of fraud cases</p>
              <PlotlyChart
                data={[{
                  y: providerFraud.map((d) => d.name),
                  x: providerFraud.map((d) => d.fraudCases),
                  type: 'bar',
                  orientation: 'h',
                  marker: { color: providerFraud.map((d) => d.rate > 10 ? '#ef4444' : d.rate > 8 ? '#f59e0b' : '#6366f1'), },
                  text: providerFraud.map((d) => `${d.fraudCases.toLocaleString()} (${d.rate}%)`),
                  textposition: 'auto',
                  textfont: { size: 9, color: '#f8fafc' },
                  hovertemplate: '%{y}<br>Cases: %{x}<extra></extra>',
                }]}
                layout={{ height: 320, margin: { l: 160, r: 20, t: 10, b: 30 }, xaxis: { title: 'Fraud Cases' }, yaxis: { automargin: true }, showlegend: false }}
              />
            </div>

            <div className="rounded-2xl border border-[#1e293b]/80 bg-[#0f172a]/80 p-5">
              <h3 className="mb-1 text-sm font-bold text-[#f8fafc]">Fraud by Diagnosis</h3>
              <p className="mb-3 text-xs text-[#94a3b8]">Top diagnosis codes associated with fraud</p>
              <PlotlyChart
                data={[{
                  y: diagnosisData.map((d) => `${d.code} - ${d.name}`),
                  x: diagnosisData.map((d) => d.cases),
                  type: 'bar',
                  orientation: 'h',
                  marker: { color: diagnosisData.map((d) => d.rate > 12 ? '#ef4444' : d.rate > 10 ? '#f59e0b' : '#818cf8') },
                  text: diagnosisData.map((d) => `${d.cases.toLocaleString()} (${d.rate}%)`),
                  textposition: 'auto',
                  textfont: { size: 9, color: '#f8fafc' },
                  hovertemplate: '%{y}<br>Cases: %{x}<extra></extra>',
                }]}
                layout={{ height: 320, margin: { l: 160, r: 20, t: 10, b: 30 }, xaxis: { title: 'Fraud Cases' }, yaxis: { automargin: true }, showlegend: false }}
              />
            </div>
          </>
        )}
      </div>

      {/* Charts Grid 2 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-[#1e293b]/80 bg-[#0f172a]/80 p-5">
              <Skeleton rows={3} />
              <div className="mt-4 h-64 skeleton-shimmer rounded-lg" />
            </div>
          ))
        ) : (
          <>
            <div className="rounded-2xl border border-[#1e293b]/80 bg-[#0f172a]/80 p-5">
              <h3 className="mb-1 text-sm font-bold text-[#f8fafc]">Financial Loss by Month</h3>
              <p className="mb-3 text-xs text-[#94a3b8]">Estimated financial losses attributed to fraud</p>
              <PlotlyChart
                data={[{
                  x: monthlyData.map((d) => d.month),
                  y: monthlyData.map((d) => d.loss),
                  type: 'bar',
                  marker: { color: monthlyData.map((d) => d.loss > 3000000 ? '#ef4444' : '#6366f1'), },
                  hovertemplate: '%{x}<br>Loss: $%{y:,.0f}<extra></extra>',
                }]}
                layout={{ height: 300, xaxis: { tickangle: -45 }, yaxis: { title: 'Loss ($)', tickformat: '$.2s' }, showlegend: false }}
              />
            </div>

            <div className="rounded-2xl border border-[#1e293b]/80 bg-[#0f172a]/80 p-5">
              <h3 className="mb-1 text-sm font-bold text-[#f8fafc]">Provider Risk Ranking</h3>
              <p className="mb-3 text-xs text-[#94a3b8]">Top 10 providers ranked by fraud risk rate</p>
              <PlotlyChart
                data={[{
                  y: providerFraud.map((d) => d.name),
                  x: providerFraud.map((d) => d.rate),
                  type: 'bar',
                  orientation: 'h',
                  marker: { color: providerFraud.map((d) => d.rate > 10 ? '#ef4444' : d.rate > 8 ? '#f59e0b' : '#10b981') },
                  text: providerFraud.map((d) => `${d.rate}%`),
                  textposition: 'auto',
                  textfont: { size: 9, color: '#f8fafc' },
                  hovertemplate: '%{y}<br>Risk Rate: %{x}%<extra></extra>',
                }]}
                layout={{ height: 320, margin: { l: 160, r: 20, t: 10, b: 30 }, xaxis: { title: 'Risk Rate (%)', range: [0, 14] }, yaxis: { automargin: true }, showlegend: false }}
              />
            </div>

            <div className="rounded-2xl border border-[#1e293b]/80 bg-[#0f172a]/80 p-5">
              <h3 className="mb-1 text-sm font-bold text-[#f8fafc]">Top Fraud Categories</h3>
              <p className="mb-3 text-xs text-[#94a3b8]">Most common fraud scheme types</p>
              <PlotlyChart
                data={[{
                  x: fraudCategories.map((d) => d.category),
                  y: fraudCategories.map((d) => d.cases),
                  type: 'bar',
                  marker: { color: ['#ef4444', '#f59e0b', '#6366f1', '#8b5cf6', '#ec4899', '#06b6d4', '#94a3b8'] },
                  text: fraudCategories.map((d) => `${d.percentage}%`),
                  textposition: 'auto',
                  textfont: { size: 10, color: '#f8fafc' },
                  hovertemplate: '%{x}<br>Cases: %{y:,.0f}<extra></extra>',
                }]}
                layout={{ height: 300, xaxis: { tickangle: -25 }, yaxis: { title: 'Cases' }, showlegend: false }}
              />
            </div>

            <div className="rounded-2xl border border-[#1e293b]/80 bg-[#0f172a]/80 p-5">
              <h3 className="mb-1 text-sm font-bold text-[#f8fafc]">Fraud Distribution by Region</h3>
              <p className="mb-3 text-xs text-[#94a3b8]">Geographic breakdown of fraud cases</p>
              <PlotlyChart
                data={[{
                  labels: regionData.map((d) => d.region),
                  values: regionData.map((d) => d.fraud),
                  type: 'pie',
                  hole: 0.4,
                  marker: { colors: ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'] },
                  textinfo: 'label+percent',
                  textfont: { size: 11, color: '#f8fafc' },
                  hovertemplate: '%{label}<br>Cases: %{value:,.0f}<br>Share: %{percent}<extra></extra>',
                }]}
                layout={{ height: 300, showlegend: true, legend: { orientation: 'h', x: 0, y: -0.1 } }}
              />
            </div>
          </>
        )}
      </div>

      {/* Claims Table */}
      <div className="rounded-2xl border border-[#1e293b]/80 bg-[#0f172a]/80 p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#f8fafc]">Claims Detail</h3>
            <p className="text-xs text-[#94a3b8]">{filteredClaims.length} records found</p>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search table..."
              className="rounded-xl border border-[#1e293b] bg-[#0b0f19] py-2 pl-9 pr-4 text-sm text-[#f8fafc] placeholder-[#94a3b8]/60 focus:border-[#4f46e5]/60 focus:outline-none transition-colors w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-[#1e293b]">
                {columns.map((col) => (
                  <SortHeader key={col.key} columnKey={col.key} label={col.label} />
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#1e293b]/50">
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3"><div className="h-4 w-full skeleton-shimmer rounded" /></td>
                    ))}
                  </tr>
                ))
              ) : pagedClaims.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-[#94a3b8]">No claims match the current filters.</td>
                </tr>
              ) : (
                pagedClaims.map((claim, idx) => (
                  <tr
                    key={claim.id}
                    className={`border-b border-[#1e293b]/30 transition-colors hover:bg-[#4f46e5]/5 ${idx % 2 === 1 ? 'bg-[#0b0f19]/30' : ''}`}
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-xs font-mono font-medium text-[#818cf8]">{claim.id}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-[#f8fafc]">{claim.patient}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-[#94a3b8]">{claim.provider}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs font-semibold text-[#f8fafc]">{money.format(claim.amount)}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${statusBadge(claim.status)}`}>{claim.status}</span>
                    </td>
                    <td className={`whitespace-nowrap px-4 py-3 text-xs font-bold ${riskColor(claim.fraudScore)}`}>{claim.fraudScore.toFixed(1)}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${riskBadge(claim.riskLevel)}`}>{claim.riskLevel}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-[#94a3b8]">{claim.date}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      {/* Export Section */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-bold uppercase tracking-wider text-[#94a3b8]">Export:</span>
        <button
          onClick={handleExportCSV}
          disabled={exporting === 'csv'}
          className="inline-flex items-center gap-2 rounded-full border border-[#1e293b] bg-[#0f172a]/80 px-5 py-2 text-xs font-semibold text-[#94a3b8] hover:border-[#4f46e5]/50 hover:text-[#818cf8] disabled:opacity-50 transition-all"
        >
          {exporting === 'csv' ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
          CSV Export
        </button>
        <button
          onClick={handleExportExcel}
          disabled={exporting === 'excel'}
          className="inline-flex items-center gap-2 rounded-full border border-[#1e293b] bg-[#0f172a]/80 px-5 py-2 text-xs font-semibold text-[#94a3b8] hover:border-[#4f46e5]/50 hover:text-[#818cf8] disabled:opacity-50 transition-all"
        >
          {exporting === 'excel' ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
          Excel Export
        </button>
        <button
          onClick={handleExportPDF}
          disabled={exporting === 'pdf'}
          className="inline-flex items-center gap-2 rounded-full border border-[#1e293b] bg-[#0f172a]/80 px-5 py-2 text-xs font-semibold text-[#94a3b8] hover:border-[#4f46e5]/50 hover:text-[#818cf8] disabled:opacity-50 transition-all"
        >
          {exporting === 'pdf' ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
          PDF Export
        </button>
      </div>
    </div>
  );
}
