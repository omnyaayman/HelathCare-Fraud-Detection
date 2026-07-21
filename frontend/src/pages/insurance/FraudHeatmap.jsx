import { useState, useMemo } from 'react';
import PlotlyChart from '../../components/PlotlyChart';
import { MapPin, AlertTriangle, TrendingUp, TrendingDown, Activity, Building2, Stethoscope, Calendar, ChevronRight, Map, Search, Filter, X } from 'lucide-react';
import { CANONICAL_FUNNEL, CANONICAL_FINANCIALS, CANONICAL_MONTHLY_TRENDS, CANONICAL_REGIONAL_DATA, CANONICAL_REFERENCE, CANONICAL_PROVIDERS } from '../../data/canonicalData';
import { formatNumber, formatCurrency as fmtCurrency } from '../../data/dataUtils';

const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val || 0);

const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const CANONICAL_TOTALS = {
  totalClaims: CANONICAL_FUNNEL.totalClaims,
  totalFlagged: CANONICAL_FUNNEL.aiScoredHighRisk,
  totalCost: CANONICAL_FINANCIALS.totalClaimValue,
  fraudExposure: CANONICAL_FINANCIALS.fraudExposure,
  avgClaim: CANONICAL_FINANCIALS.avgClaimAmount,
  totalProviders: CANONICAL_FUNNEL.totalProviders,
  totalPatients: CANONICAL_FUNNEL.totalPatients,
  nationalFraudRate: CANONICAL_REFERENCE.fraudRate,
};

const NATIONAL_MONTHLY_RATES = CANONICAL_MONTHLY_TRENDS.map(m => ({
  month: m.month.substring(0, 3),
  rate: (m.fraud_claims / m.claims) * 100,
}));

const STATE_NAMES = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
};

function buildStateData() {
  const raw = CANONICAL_REGIONAL_DATA;
  const sum = raw.reduce((s, r) => s + r.total_claims, 0);
  const mult = CANONICAL_TOTALS.totalClaims / sum;

  return raw.map(r => {
    const fc = Math.round(r.fraud_claims * mult);
    const tc = Math.round(r.total_claims * mult);
    const fr = tc > 0 ? (fc / tc) * 100 : 0;
    const prov = Math.max(Math.round((tc / CANONICAL_TOTALS.totalClaims) * CANONICAL_TOTALS.totalProviders), 10);
    const hFact = { CA:85, TX:72, FL:68, NY:62, IL:48, PA:42, OH:38, GA:32, NC:28, MI:26, NJ:24, VA:22, MA:20, AZ:18, IN:16, TN:16, MD:14, MN:14, MO:14, CO:14, WI:12, AL:12, SC:12, LA:12, KY:10, OR:10, OK:10, CT:10, IA:8, MS:8, KS:8, AR:8, NV:8, UT:8, NM:6, WV:6, NE:6, ID:6, ME:6, NH:4, HI:4, MT:4, RI:4, AK:4, SD:4, ND:4, DE:4, VT:2, WY:2 }[r.state] || 10;
    const hosp = Math.max(Math.round((tc / CANONICAL_TOTALS.totalClaims) * 3200) + hFact * 7, 2);
    const ft = { CA:'Upcoding', TX:'Upcoding', FL:'Upcoding', NY:'Upcoding', IL:'Unbundling', PA:'Unbundling', OH:'Phantom Billing', GA:'Upcoding', NC:'Phantom Billing', MI:'Unbundling' }[r.state] || 'Phantom Billing';
    const icd = { CA:['E11.9','I10','J44.1'], TX:['E11.9','I10','M54.5'], FL:['E11.9','I10','M54.5'], NY:['E11.9','I10','J44.1'] }[r.state] || ['I10','M54.5','E11.9'];

    return {
      code: r.state,
      name: STATE_NAMES[r.state] || r.state,
      fraudRate: +fr.toFixed(1),
      totalClaims: tc,
      flaggedClaims: fc,
      totalCost: Math.round(tc * CANONICAL_TOTALS.avgClaim),
      avgClaim: CANONICAL_TOTALS.avgClaim,
      providers: prov,
      hospitals: hosp,
      topICD: icd,
      topFraudType: ft,
      monthlyTrend: NATIONAL_MONTHLY_RATES.map(m => +(m.rate + (m.rate * ((fc/1000) * 0.02 - 0.1))).toFixed(1)),
    };
  });
}

const STATE_DATA = buildStateData();

function getRiskColor(rate) {
  if (rate > 12) return '#ef4444';
  if (rate > 8) return '#f97316';
  if (rate > 4) return '#eab308';
  return '#22c55e';
}

function getRiskBadge(rate) {
  if (rate > 12) return { label:'Critical', color:'text-red-400', bg:'bg-red-500/10', border:'border-red-500/30', range:'> 12%' };
  if (rate > 8) return { label:'High', color:'text-orange-400', bg:'bg-orange-500/10', border:'border-orange-500/30', range:'8% � 12%' };
  if (rate > 4) return { label:'Medium', color:'text-yellow-400', bg:'bg-yellow-500/10', border:'border-yellow-500/30', range:'4% � 8%' };
  return { label:'Low', color:'text-green-400', bg:'bg-green-500/10', border:'border-green-500/30', range:'0% � 4%' };
}

const LEGEND_TIERS = [
  { label:'Critical', range:'> 12%', color:'#ef4444' },
  { label:'High', range:'8% � 12%', color:'#f97316' },
  { label:'Medium', range:'4% � 8%', color:'#eab308' },
  { label:'Low', range:'0% � 4%', color:'#22c55e' },
];

export default function FraudHeatmap() {
  const [selectedState, setSelectedState] = useState(null);
  const [stateSearch, setStateSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('All');
  const [regionFilter, setRegionFilter] = useState('All');

  const REGION_MAP = {
    Northeast: ['CT', 'ME', 'MA', 'NH', 'RI', 'VT', 'NJ', 'NY', 'PA'],
    Southeast: ['AL', 'AR', 'DE', 'FL', 'GA', 'KY', 'LA', 'MD', 'MS', 'NC', 'SC', 'TN', 'VA', 'WV'],
    Midwest: ['IL', 'IN', 'IA', 'KS', 'MI', 'MN', 'MO', 'NE', 'ND', 'OH', 'SD', 'WI'],
    West: ['AK', 'AZ', 'CA', 'CO', 'HI', 'ID', 'MT', 'NV', 'NM', 'OR', 'UT', 'WA', 'WY'],
    Southwest: ['AZ', 'NM', 'OK', 'TX'],
  };

  const filteredStates = useMemo(() => {
    return STATE_DATA.filter(s => {
      if (stateSearch && !s.name.toLowerCase().includes(stateSearch.toLowerCase()) && !s.code.toLowerCase().includes(stateSearch.toLowerCase())) return false;
      if (riskFilter !== 'All') {
        if (riskFilter === 'Critical' && s.fraudRate <= 12) return false;
        if (riskFilter === 'High' && (s.fraudRate <= 8 || s.fraudRate > 12)) return false;
        if (riskFilter === 'Medium' && (s.fraudRate <= 4 || s.fraudRate > 8)) return false;
        if (riskFilter === 'Low' && s.fraudRate > 4) return false;
      }
      if (regionFilter !== 'All') {
        const regionStates = REGION_MAP[regionFilter] || [];
        if (!regionStates.includes(s.code)) return false;
      }
      return true;
    });
  }, [stateSearch, riskFilter, regionFilter]);

  const filteredMapData = useMemo(() => [{
    type: 'choropleth',
    locationmode: 'USA-states',
    locations: filteredStates.map(s => s.code),
    z: filteredStates.map(s => s.fraudRate),
    text: filteredStates.map(s => `${s.name}\nFraud Rate: ${s.fraudRate.toFixed(1)}%\nTotal Claims: ${s.totalClaims.toLocaleString()}\nFlagged: ${s.flaggedClaims.toLocaleString()}\n\nClick for details`),
    hoverinfo: 'text',
    colorscale: [[0, '#064e3b'], [0.25, '#059669'], [0.5, '#f59e0b'], [0.75, '#ea580c'], [1, '#dc2626']],
    colorbar: { title: { text: 'Fraud Rate %', font: { color: '#94a3b8', size: 11 } }, tickfont: { color: '#94a3b8' }, thickness: 15, len: 0.6, bgcolor: 'transparent', outlinewidth: 0 },
    marker: { line: { color: '#1e293b', width: 1 } }
  }], [filteredStates]);

  const sortedByRisk = useMemo(() => [...filteredStates].sort((a, b) => b.fraudRate - a.fraudRate), [filteredStates]);
  const top5 = useMemo(() => sortedByRisk.slice(0, 5), [sortedByRisk]);
  const bottom5 = useMemo(() => sortedByRisk.slice(-5).reverse(), [sortedByRisk]);
  const maxFraudRate = useMemo(() => Math.max(...STATE_DATA.map(s => s.fraudRate)), []);

  const peakMonth = useMemo(() => {
    let mv = 0, mi = 0;
    NATIONAL_MONTHLY_RATES.forEach((m, i) => { if (m.rate > mv) { mv = m.rate; mi = i; } });
    return { label: monthLabels[mi], value: mv };
  }, []);

  const detail = selectedState ? STATE_DATA.find(s => s.code === selectedState) : null;
  const detailBadge = detail ? getRiskBadge(detail.fraudRate) : null;

  const handleMapClick = (point) => {
    if (point && point.location) {
      const clicked = STATE_DATA.find(s => s.code === point.location);
      if (clicked) setSelectedState(clicked.code);
    }
  };

  const mapData = [{
    type: 'choropleth',
    locationmode: 'USA-states',
    locations: STATE_DATA.map(s => s.code),
    z: STATE_DATA.map(s => s.fraudRate),
    text: STATE_DATA.map(s => `${s.name}\nFraud Rate: ${s.fraudRate.toFixed(1)}%\nTotal Claims: ${s.totalClaims.toLocaleString()}\nFlagged: ${s.flaggedClaims.toLocaleString()}\n\nClick for details`),
    hoverinfo: 'text',
    colorscale: [
      [0, '#064e3b'],
      [0.25, '#059669'],
      [0.5, '#f59e0b'],
      [0.75, '#ea580c'],
      [1, '#dc2626']
    ],
    colorbar: {
      title: { text: 'Fraud Rate %', font: { color: '#94a3b8', size: 11 } },
      tickfont: { color: '#94a3b8' },
      thickness: 15,
      len: 0.6,
      bgcolor: 'transparent',
      outlinewidth: 0
    },
    marker: { line: { color: '#1e293b', width: 1 } }
  }];

  const mapLayout = {
    geo: {
      scope: 'usa',
      showlakes: true,
      lakecolor: 'rgb(11, 15, 25)',
      bgcolor: 'transparent',
      landcolor: '#1e293b',
      subunitcolor: '#334155',
      countrycolor: '#334155',
      projection: { type: 'albers usa' }
    },
    margin: { t: 10, r: 10, l: 10, b: 10 },
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    dragmode: false,
    clickmode: 'event',
    height: 520
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#4f46e5]/10 text-[#818cf8]">
              <Map size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-[#f8fafc]">Geographic Intelligence Center</h1>
              <p className="text-sm text-[#94a3b8]">Interactive USA Fraud Distribution Analysis</p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Interactive Filters ─── */}
      <div className="bg-[#0f172a]/80 rounded-2xl border border-[#1e293b]/80 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-[#94a3b8]">
            <Filter size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">Filters</span>
          </div>
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
            <input
              type="text"
              placeholder="Search state..."
              value={stateSearch}
              onChange={e => setStateSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#1e293b]/60 border border-[#1e293b] text-[#f8fafc] text-xs font-medium placeholder:text-slate-600 focus:outline-none focus:border-[#818cf8]/50 transition-colors"
            />
            {stateSearch && (
              <button onClick={() => setStateSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#f8fafc]">
                <X size={12} />
              </button>
            )}
          </div>
          <select
            value={riskFilter}
            onChange={e => setRiskFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#1e293b]/60 border border-[#1e293b] text-[#f8fafc] text-xs font-medium focus:outline-none focus:border-[#818cf8]/50 transition-colors"
          >
            <option value="All">All Risk Tiers</option>
            <option value="Critical">Critical (&gt;12%)</option>
            <option value="High">High (8-12%)</option>
            <option value="Medium">Medium (4-8%)</option>
            <option value="Low">Low (&lt;4%)</option>
          </select>
          <select
            value={regionFilter}
            onChange={e => setRegionFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#1e293b]/60 border border-[#1e293b] text-[#f8fafc] text-xs font-medium focus:outline-none focus:border-[#818cf8]/50 transition-colors"
          >
            <option value="All">All Regions</option>
            <option value="Northeast">Northeast</option>
            <option value="Southeast">Southeast</option>
            <option value="Midwest">Midwest</option>
            <option value="West">West</option>
            <option value="Southwest">Southwest</option>
          </select>
          {(stateSearch || riskFilter !== 'All' || regionFilter !== 'All') && (
            <button
              onClick={() => { setStateSearch(''); setRiskFilter('All'); setRegionFilter('All'); }}
              className="flex items-center gap-1 px-3 py-2 rounded-xl bg-[#818cf8]/10 border border-[#818cf8]/20 text-[#818cf8] text-xs font-bold hover:bg-[#818cf8]/20 transition-colors"
            >
              <X size={12} /> Clear All
            </button>
          )}
          <span className="text-[10px] text-[#94a3b8] font-mono ml-auto">{filteredStates.length} of {STATE_DATA.length} states</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0f172a]/80 rounded-2xl border border-[#1e293b]/80 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-[#818cf8]/10 text-[#818cf8]">
              <TrendingUp size={18} />
            </div>
            <span className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider">Total Claims Nationwide</span>
          </div>
          <p className="text-3xl font-black text-[#f8fafc] font-mono">{formatNumber(CANONICAL_FUNNEL.totalClaims)}</p>
          <p className="text-xs text-[#94a3b8] mt-1">Across {STATE_DATA.length} states</p>
        </div>
        <div className="bg-[#0f172a]/80 rounded-2xl border border-[#1e293b]/80 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-green-500/10 text-green-400">
              <Building2 size={18} />
            </div>
            <span className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider">Total Providers</span>
          </div>
          <p className="text-3xl font-black text-[#f8fafc] font-mono">{formatNumber(CANONICAL_FUNNEL.totalProviders)}</p>
          <p className="text-xs text-[#94a3b8] mt-1">Active healthcare providers</p>
        </div>
        <div className="bg-[#0f172a]/80 rounded-2xl border border-[#1e293b]/80 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <Stethoscope size={18} />
            </div>
            <span className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider">Total Hospitals</span>
          </div>
            <p className="text-3xl font-black text-[#f8fafc] font-mono">{CANONICAL_PROVIDERS.filter(p => p.type === 'Hospital' || p.type === 'Health System').length}</p>
          <p className="text-xs text-[#94a3b8] mt-1">Hospital facilities in network</p>
        </div>
        <div className="bg-[#0f172a]/80 rounded-2xl border border-[#1e293b]/80 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-red-500/10 text-red-400">
              <AlertTriangle size={18} />
            </div>
            <span className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider">National Fraud Rate</span>
          </div>
          <p className="text-3xl font-black text-[#f8fafc] font-mono">{CANONICAL_REFERENCE.fraudRate}%</p>
          <p className="text-xs text-[#94a3b8] mt-1">{formatNumber(CANONICAL_REFERENCE.totalFraudClaims)} fraud claims detected</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-[70%]">
          <div className="bg-[#0f172a]/80 rounded-2xl border border-[#1e293b]/80 p-0 overflow-hidden">
            <div className="p-4 border-b border-[#1e293b]/80 flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#f8fafc]">USA Fraud Distribution Choropleth</h3>
            </div>
            <div className="p-2">
              <PlotlyChart
                data={filteredMapData}
                layout={mapLayout}
                onPointClick={handleMapClick}
                style={{ height: '520px' }}
              />
            </div>
            <div className="px-4 pb-3 flex items-center justify-center gap-6">
              {LEGEND_TIERS.map(t => (
                <div key={t.label} className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: t.color }} />
                  <span className="text-[10px] font-semibold text-[#94a3b8]">{t.label}</span>
                  <span className="text-[9px] text-slate-600 font-mono">({t.range})</span>
                </div>
              ))}
            </div>
            <div className="px-4 pb-4 flex justify-center">
              <div className="px-3 py-1.5 rounded-lg bg-[#818cf8]/5 border border-[#818cf8]/20 flex items-center gap-2">
                <MapPin size={12} className="text-[#818cf8] shrink-0" />
                <p className="text-[11px] text-[#94a3b8]">Click a state on the map to view detailed fraud intelligence</p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:w-[30%]">
          <div className="bg-[#0f172a]/80 rounded-2xl border border-[#1e293b]/80 p-5 h-full max-h-[600px] overflow-y-auto custom-scrollbar">
            {!detail ? (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Activity size={16} className="text-[#818cf8]" />
                  <h3 className="text-sm font-bold text-[#f8fafc]">National Summary</h3>
                </div>
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-[#1e293b]/40 border border-[#1e293b]/60">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#94a3b8]">Total Claims Nationwide</p>
                    <p className="text-xl font-black text-[#f8fafc] font-mono">{formatNumber(CANONICAL_FUNNEL.totalClaims)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-[#1e293b]/40 border border-[#1e293b]/60">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#94a3b8]">Flagged Claims (High Risk)</p>
                    <p className="text-xl font-black text-red-400 font-mono">{formatNumber(CANONICAL_FUNNEL.aiScoredHighRisk)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-[#1e293b]/40 border border-[#1e293b]/60">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#94a3b8]">Total Claim Value</p>
                    <p className="text-xl font-black text-[#f8fafc] font-mono">{formatCurrency(CANONICAL_FINANCIALS.totalClaimValue)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-[#1e293b]/40 border border-[#1e293b]/60">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#94a3b8]">Fraud Exposure</p>
                    <p className="text-xl font-black text-orange-400 font-mono">{formatCurrency(CANONICAL_FINANCIALS.fraudExposure)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-[#1e293b]/40 border border-[#1e293b]/60">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#94a3b8]">National Fraud Rate</p>
                    <p className="text-xl font-black text-yellow-400 font-mono">{CANONICAL_REFERENCE.fraudRate}%</p>
                  </div>
                  <div className="p-3 rounded-xl bg-[#1e293b]/40 border border-[#1e293b]/60">
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 size={12} className="text-[#94a3b8]" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#94a3b8]">Total Providers</p>
                    </div>
                    <p className="text-lg font-black text-[#f8fafc] font-mono">{formatNumber(CANONICAL_FUNNEL.totalProviders)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-[#1e293b]/40 border border-[#1e293b]/60">
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 size={12} className="text-[#94a3b8]" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#94a3b8]">Total Hospitals</p>
                    </div>
                    <p className="text-lg font-black text-[#f8fafc] font-mono">{CANONICAL_PROVIDERS.filter(p => p.type === 'Hospital' || p.type === 'Health System').length}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-[#1e293b]/40 border border-[#1e293b]/60">
                    <div className="flex items-center gap-2 mb-1">
                      <Stethoscope size={12} className="text-[#94a3b8]" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#94a3b8]">Total Patients</p>
                    </div>
                    <p className="text-lg font-black text-[#f8fafc] font-mono">{formatNumber(CANONICAL_FUNNEL.totalPatients)}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-[#818cf8]" />
                    <h3 className="text-sm font-bold text-[#f8fafc]">{detail.name}</h3>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-[#1e293b] text-[#94a3b8]">{detail.code}</span>
                  </div>
                  <button onClick={() => setSelectedState(null)} className="text-[10px] font-bold text-[#94a3b8] hover:text-[#f8fafc] transition-colors">National</button>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-[#94a3b8]">Fraud Rate</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${detailBadge.bg} ${detailBadge.color} ${detailBadge.border}`}>
                      {detailBadge.label} ({detailBadge.range})
                    </span>
                  </div>
                  <p className="text-3xl font-black font-mono" style={{ color: getRiskColor(detail.fraudRate) }}>{detail.fraudRate.toFixed(1)}%</p>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#1e293b]/40 border border-[#1e293b]/60">
                    <span className="text-[10px] font-bold text-[#94a3b8]">Total Claims</span>
                    <span className="font-mono font-bold text-[#f8fafc] text-sm">{detail.totalClaims.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#1e293b]/40 border border-[#1e293b]/60">
                    <span className="text-[10px] font-bold text-[#94a3b8]">Flagged Claims</span>
                    <span className="font-mono font-bold text-red-400 text-sm">{detail.flaggedClaims.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#1e293b]/40 border border-[#1e293b]/60">
                    <span className="text-[10px] font-bold text-[#94a3b8]">Est. Claim Value</span>
                    <span className="font-mono font-bold text-orange-400 text-sm">{formatCurrency(detail.totalCost)}</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#1e293b]/40 border border-[#1e293b]/60">
                    <span className="text-[10px] font-bold text-[#94a3b8]">Avg Claim Amount</span>
                    <span className="font-mono font-bold text-[#f8fafc] text-sm">{formatCurrency(detail.avgClaim)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="p-2.5 rounded-xl bg-[#1e293b]/40 border border-[#1e293b]/60 text-center">
                    <Building2 size={14} className="text-[#94a3b8] mx-auto mb-1" />
                    <p className="text-lg font-black text-[#f8fafc] font-mono">{detail.providers.toLocaleString()}</p>
                    <p className="text-[9px] font-bold text-[#94a3b8] uppercase">Providers</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#1e293b]/40 border border-[#1e293b]/60 text-center">
                    <Stethoscope size={14} className="text-[#94a3b8] mx-auto mb-1" />
                    <p className="text-lg font-black text-[#f8fafc] font-mono">{detail.hospitals}</p>
                    <p className="text-[9px] font-bold text-[#94a3b8] uppercase">Hospitals</p>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#94a3b8] mb-2">Common ICD-10 Codes</p>
                  <div className="flex flex-wrap gap-1.5">
                    {detail.topICD.map((code) => (
                      <span key={code} className="text-[10px] font-mono font-bold px-2 py-1 rounded-lg bg-[#818cf8]/10 text-[#818cf8] border border-[#818cf8]/20">{code}</span>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#94a3b8] mb-2">Top Fraud Type</p>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-500/5 border border-red-500/20">
                    <AlertTriangle size={14} className="text-red-400" />
                    <span className="text-xs font-bold text-red-400">{detail.topFraudType}</span>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#94a3b8] mb-2">Monthly Fraud Trend</p>
                  <div className="bg-[#1e293b]/40 rounded-xl border border-[#1e293b]/60 p-1">
                    <PlotlyChart
                      data={[{
                        type: 'scatter',
                        mode: 'lines+markers',
                        x: monthLabels,
                        y: detail.monthlyTrend,
                        line: { color: '#818cf8', width: 2, shape: 'spline' },
                        marker: { size: 6, color: '#818cf8' },
                        fill: 'tozeroy',
                        fillcolor: 'rgba(129,140,248,0.1)'
                      }]}
                      layout={{
                        margin: { t: 8, r: 10, l: 35, b: 25 },
                        height: 140,
                        xaxis: { showgrid: false, tickfont: { size: 9 } },
                        yaxis: { tickfont: { size: 9 }, ticksuffix: '%' },
                        showlegend: false,
                        paper_bgcolor: 'transparent',
                        plot_bgcolor: 'transparent'
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#0f172a]/80 rounded-2xl border border-[#1e293b]/80 p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={16} className="text-red-400" />
            <h3 className="text-sm font-bold text-[#f8fafc]">Top 5 Risk States</h3>
          </div>
          <div className="space-y-3">
            {top5.map((s, i) => (
              <div key={s.code} className="flex items-center gap-3 p-2.5 rounded-xl bg-[#1e293b]/40 border border-[#1e293b]/60 cursor-pointer hover:border-[#818cf8]/30 transition-colors" onClick={() => setSelectedState(s.code)}>
                <span className="text-xs font-black text-[#94a3b8] w-5 text-center">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-[#f8fafc]">{s.name}</span>
                    <span className="text-xs font-mono font-bold" style={{ color: getRiskColor(s.fraudRate) }}>{s.fraudRate.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-[#1e293b] rounded-full h-1.5 mb-1">
                    <div className="h-1.5 rounded-full" style={{ width: `${(s.fraudRate / maxFraudRate) * 100}%`, backgroundColor: getRiskColor(s.fraudRate) }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[#94a3b8]">{s.totalClaims.toLocaleString()} claims</span>
                    <ChevronRight size={12} className="text-[#94a3b8]" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#0f172a]/80 rounded-2xl border border-[#1e293b]/80 p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown size={16} className="text-green-400" />
            <h3 className="text-sm font-bold text-[#f8fafc]">Bottom 5 Risk States</h3>
          </div>
          <div className="space-y-3">
            {bottom5.map((s, i) => (
              <div key={s.code} className="flex items-center gap-3 p-2.5 rounded-xl bg-[#1e293b]/40 border border-[#1e293b]/60 cursor-pointer hover:border-[#818cf8]/30 transition-colors" onClick={() => setSelectedState(s.code)}>
                <span className="text-xs font-black text-[#94a3b8] w-5 text-center">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-[#f8fafc]">{s.name}</span>
                    <span className="text-xs font-mono font-bold" style={{ color: getRiskColor(s.fraudRate) }}>{s.fraudRate.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-[#1e293b] rounded-full h-1.5 mb-1">
                    <div className="h-1.5 rounded-full" style={{ width: `${(s.fraudRate / maxFraudRate) * 100}%`, backgroundColor: getRiskColor(s.fraudRate) }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[#94a3b8]">{s.totalClaims.toLocaleString()} claims</span>
                    <ChevronRight size={12} className="text-[#94a3b8]" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-[#0f172a]/80 rounded-2xl border border-[#1e293b]/80 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={16} className="text-[#818cf8]" />
          <h3 className="text-sm font-bold text-[#f8fafc]">National Fraud Rate Trend (12 Months)</h3>
        </div>
        <PlotlyChart
          data={[{
            type: 'scatter',
            mode: 'lines+markers',
            x: NATIONAL_MONTHLY_RATES.map(m => m.month),
            y: NATIONAL_MONTHLY_RATES.map(m => m.rate),
            line: { color: '#f59e0b', width: 3, shape: 'spline' },
            marker: { size: 8, color: NATIONAL_MONTHLY_RATES.map(m => m.rate === peakMonth.value ? '#ef4444' : '#f59e0b'), line: { color: '#0f172a', width: 2 } },
            fill: 'tozeroy',
            fillcolor: 'rgba(245,158,11,0.08)',
            name: 'Fraud Rate',
            hovertemplate: '%{x}<br>Fraud Rate: %{y:.1f}%<extra></extra>'
          }]}
          layout={{
            margin: { t: 20, r: 30, l: 50, b: 40 },
            height: 300,
            xaxis: { showgrid: false, tickfont: { size: 11, color: '#94a3b8' } },
            yaxis: {
              tickfont: { size: 11, color: '#94a3b8' },
              ticksuffix: '%',
              gridcolor: 'rgba(71,85,105,0.3)',
              range: [0, Math.max(...NATIONAL_MONTHLY_RATES.map(m => m.rate)) * 1.3]
            },
            showlegend: false,
            paper_bgcolor: 'transparent',
            plot_bgcolor: 'transparent',
            annotations: [{
              x: peakMonth.label,
              y: peakMonth.value,
              text: `Peak: ${peakMonth.value.toFixed(1)}%`,
              showarrow: true,
              arrowhead: 2,
              arrowcolor: '#ef4444',
              font: { size: 11, color: '#ef4444', family: 'monospace' },
              bgcolor: 'rgba(239,68,68,0.1)',
              bordercolor: '#ef4444',
              borderwidth: 1,
              borderpad: 4,
              ax: 0,
              ay: -40
            }]
          }}
        />
      </div>

    </div>
  );
}
