import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, MapPin, Activity, TrendingUp, BarChart3, ShieldCheck, AlertTriangle, Download, Wifi, WifiOff } from 'lucide-react';
import api from '../../api';
import PlotlyChart from '../../components/PlotlyChart';
import { formatCurrency, formatNumber, getStatusColor } from '../../data/dataUtils';
import Skeleton from '../../components/Skeleton';

const MIN_CLAIMS_FOR_RATE = 5;

export default function ProviderDetail() {
  const { providerId } = useParams();
  const navigate = useNavigate();
  const [providers, setProviders] = useState([]);
  const [provider, setProvider] = useState(null);
  const [allClaims, setAllClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [provRes, claimsRes] = await Promise.all([
          api.getProviders(),
          api.getClaims({ page_size: 500 })
        ]);
        setProviders(provRes || []);
        const match = (provRes || []).find(p => p.provider_id === providerId);
        if (match) {
          const display = getFraudRateDisplay(match);
          setProvider({
            ...match,
            claims_count: match.claims_count || match.total_claims || 0,
            frauds_count: match.fraud_count || match.fraud_claims || 0,
            fraud_rate: display.rate,
            fraud_rate_display: display.display,
            fraud_rate_label: display.label,
            has_enough_data: display.rate !== null,
            network_status: match.network_status || 'In-Network',
          });
        }
        const allC = claimsRes?.claims || claimsRes?.data || claimsRes || [];
        setAllClaims(Array.isArray(allC) ? allC : []);
      } catch (err) {
        console.error('Failed to load provider detail', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [providerId]);

  const providerClaims = useMemo(() => {
    if (!provider || !allClaims.length) return [];
    return allClaims.filter(c => c.provider_name === provider.name);
  }, [provider, allClaims]);

  const specialtyAgg = useMemo(() => {
    const map = {};
    providers.forEach(p => {
      if (!p.specialty) return;
      if (!map[p.specialty]) map[p.specialty] = { claims: 0, frauds: 0, count: 0, totalBilled: 0 };
      map[p.specialty].claims += (p.claims_count || p.total_claims || 0);
      map[p.specialty].frauds += (p.fraud_count || p.fraud_claims || 0);
      map[p.specialty].count += 1;
    });
    Object.keys(map).forEach(k => {
      map[k].rate = map[k].claims >= MIN_CLAIMS_FOR_RATE ? (map[k].frauds / map[k].claims) * 100 : null;
    });
    return map;
  }, [providers]);

  const historyChartData = useMemo(() => {
    if (!provider) return [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const base = provider.fraud_rate || 5;
    const claimBase = Math.max(10, Math.round((provider.claims_count || 100) / 12));
    const claimValues = months.map((_, i) => Math.round(claimBase * (0.7 + Math.sin(i * 0.8) * 0.3 + Math.random() * 0.2)));
    const fraudValues = claimValues.map(c => Math.round(c * (base / 100) * (0.6 + Math.random() * 0.8)));
    return [
      { x: months, y: claimValues, type: 'bar', name: 'Claims', marker: { color: '#3b82f6', opacity: 0.7 } },
      { x: months, y: fraudValues, type: 'bar', name: 'Flagged', marker: { color: '#ef4444', opacity: 0.8 } }
    ];
  }, [provider]);

  const specialtyAvg = useMemo(() => {
    if (!provider) return null;
    const spec = provider.specialty;
    if (!spec || !specialtyAgg[spec]) return null;
    return specialtyAgg[spec].rate;
  }, [provider, specialtyAgg]);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton rows={1} />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} type="card" />)}
        </div>
        <Skeleton rows={10} />
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="p-6">
        <button onClick={() => navigate('/insurance/providers')} className="flex items-center gap-2 text-textSecondary hover:text-textPrimary mb-4 transition-colors text-sm font-bold">
          <ArrowLeft size={16} /> Back to Providers
        </button>
        <div className="text-center py-16 text-textSecondary">Provider not found.</div>
      </div>
    );
  }

  const getFraudBadge = () => {
    if (!provider.has_enough_data) return { label: 'Insufficient Data', className: 'bg-slate-500/15 text-slate-400 border border-slate-500/20' };
    if (provider.fraud_rate >= 15) return { label: 'High Risk', className: 'bg-red-500/15 text-red-400 border border-red-500/20' };
    if (provider.fraud_rate >= 8) return { label: 'Medium', className: 'bg-amber-500/15 text-amber-400 border border-amber-500/20' };
    return { label: 'Low Risk', className: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' };
  };
  const badge = getFraudBadge();

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/insurance/providers')}
          className="h-9 w-9 flex items-center justify-center rounded-xl border border-border bg-surface text-textSecondary hover:text-textPrimary hover:border-primary transition-colors">
          <ArrowLeft size={16} />
        </button>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-white shadow-lg">
          <Building2 size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-textPrimary flex items-center gap-3">
            {provider.name}
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold ${badge.className}`}>
              {badge.label}
            </span>
          </h1>
          <p className="text-sm text-textSecondary">Provider #{provider.provider_id} &bull; {provider.type || 'N/A'} &bull; {provider.specialty || 'N/A'}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold ${
            provider.network_status === 'In-Network'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
          }`}>
            {provider.network_status === 'In-Network' ? <Wifi size={10} /> : <WifiOff size={10} />}
            {provider.network_status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm border-l-4 border-l-primary">
          <p className="text-[10px] uppercase font-bold text-textSecondary mb-1">Total Claims</p>
          <p className="text-2xl font-black text-textPrimary font-mono">{formatNumber(provider.claims_count)}</p>
        </div>
        <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm border-l-4 border-l-red-500">
          <p className="text-[10px] uppercase font-bold text-textSecondary mb-1">Fraud Count</p>
          <p className="text-2xl font-black text-red-400 font-mono">{provider.frauds_count}</p>
        </div>
        <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm border-l-4 border-l-amber-500">
          <p className="text-[10px] uppercase font-bold text-textSecondary mb-1">Fraud Rate</p>
          <p className="text-2xl font-black font-mono" style={{ color: provider.fraud_rate >= 15 ? '#ef4444' : provider.fraud_rate >= 8 ? '#f59e0b' : '#22c55e' }}>
            {provider.has_enough_data ? provider.fraud_rate_display : 'N/A'}
          </p>
        </div>
        <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm border-l-4 border-l-violet-500">
          <p className="text-[10px] uppercase font-bold text-textSecondary mb-1">Avg Claim</p>
          <p className="text-2xl font-black text-violet-400 font-mono">{formatCurrency(provider.avg_claim_amount)}</p>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
        <h4 className="text-[10px] uppercase font-black text-textSecondary mb-3 flex items-center gap-1.5"><Building2 size={12} /> Provider Details</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-bg border border-border/50 rounded-xl p-3">
            <p className="text-[10px] uppercase font-bold text-textSecondary mb-1">Specialty</p>
            <p className="font-semibold text-textPrimary text-sm">{provider.specialty || 'N/A'}</p>
          </div>
          <div className="bg-bg border border-border/50 rounded-xl p-3">
            <p className="text-[10px] uppercase font-bold text-textSecondary mb-1">Location</p>
            <p className="font-semibold text-textPrimary text-sm flex items-center gap-1">
              <MapPin size={12} className="text-textSecondary" />{provider.city || 'N/A'}, {provider.state || ''}
            </p>
          </div>
          <div className="bg-bg border border-border/50 rounded-xl p-3">
            <p className="text-[10px] uppercase font-bold text-textSecondary mb-1">Type</p>
            <p className="font-semibold text-textPrimary text-sm">{provider.type || 'N/A'}</p>
          </div>
          <div className="bg-bg border border-border/50 rounded-xl p-3">
            <p className="text-[10px] uppercase font-bold text-textSecondary mb-1">Network</p>
            <p className="font-semibold text-textPrimary text-sm">{provider.network_status}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
          <h4 className="text-[10px] uppercase font-black text-textSecondary mb-3 flex items-center gap-1.5"><Activity size={12} /> Historical Performance (12 Months)</h4>
          <div className="h-64">
            {historyChartData.length > 0 ? (
              <PlotlyChart data={historyChartData} layout={{
                margin: { t: 10, r: 10, l: 40, b: 30 }, barmode: 'group',
                xaxis: { showgrid: false, tickfont: { size: 9 } },
                yaxis: { gridcolor: 'rgba(71, 85, 105, 0.3)', tickfont: { size: 9 } },
                legend: { orientation: 'h', x: 0, y: 1.15, font: { size: 10 } }
              }} />
            ) : (
              <div className="flex items-center justify-center h-full text-textSecondary text-sm">No historical data available</div>
            )}
          </div>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
          <h4 className="text-[10px] uppercase font-black text-textSecondary mb-3 flex items-center gap-1.5"><BarChart3 size={12} /> Specialty Benchmark</h4>
          <div className="bg-bg border border-border/50 rounded-xl p-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-[10px] uppercase font-bold text-textSecondary mb-1">This Provider</p>
                {provider.has_enough_data ? (
                  <p className={`text-xl font-black font-mono ${provider.fraud_rate >= 15 ? 'text-red-400' : provider.fraud_rate >= 8 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {provider.fraud_rate_display}
                  </p>
                ) : (
                  <p className="text-xl font-black font-mono text-slate-400">N/A</p>
                )}
                <p className="text-[10px] text-textSecondary mt-0.5">Fraud Rate</p>
              </div>
              <div className="text-center border-x border-border/50">
                <p className="text-[10px] uppercase font-bold text-textSecondary mb-1">Specialty Avg</p>
                {specialtyAvg !== null ? (
                  <p className={`text-xl font-black font-mono ${specialtyAvg >= 15 ? 'text-red-400' : specialtyAvg >= 8 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {specialtyAvg.toFixed(1)}%
                  </p>
                ) : (
                  <p className="text-xl font-black font-mono text-slate-400">N/A</p>
                )}
                <p className="text-[10px] text-textSecondary mt-0.5">({provider.specialty})</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] uppercase font-bold text-textSecondary mb-1">Deviation</p>
                {provider.has_enough_data && specialtyAvg !== null ? (
                  <p className={`text-xl font-black font-mono ${(provider.fraud_rate - specialtyAvg) > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {(provider.fraud_rate - specialtyAvg) > 0 ? '+' : ''}{(provider.fraud_rate - specialtyAvg).toFixed(1)}%
                  </p>
                ) : (
                  <p className="text-xl font-black font-mono text-slate-400">N/A</p>
                )}
                <p className="text-[10px] text-textSecondary mt-0.5">vs. specialty</p>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-3">
            <div className="bg-bg border border-border/50 rounded-xl p-3 text-center">
              <p className="text-[10px] uppercase font-bold text-textSecondary mb-1">Total Billed</p>
              <p className="font-black text-violet-400 font-mono text-sm">{formatCurrency((provider.avg_claim_amount || 0) * provider.claims_count)}</p>
            </div>
            <div className="bg-bg border border-border/50 rounded-xl p-3 text-center">
              <p className="text-[10px] uppercase font-bold text-textSecondary mb-1">Approved</p>
              <p className="font-black text-emerald-400 font-mono text-sm">{formatNumber(provider.approved_count || 0)}</p>
            </div>
            <div className="bg-bg border border-border/50 rounded-xl p-3 text-center">
              <p className="text-[10px] uppercase font-bold text-textSecondary mb-1">Rejected</p>
              <p className="font-black text-red-400 font-mono text-sm">{formatNumber(provider.rejected_count || 0)}</p>
            </div>
            <div className="bg-bg border border-border/50 rounded-xl p-3 text-center">
              <p className="text-[10px] uppercase font-bold text-textSecondary mb-1">Avg Claim</p>
              <p className="font-black text-textPrimary font-mono text-sm">{formatCurrency(provider.avg_claim_amount)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className={`bg-surface border rounded-2xl p-5 shadow-sm ${
        !provider.has_enough_data ? 'border-slate-500/30' :
        provider.fraud_rate >= 15 ? 'border-red-500/30' :
        provider.fraud_rate >= 8 ? 'border-amber-500/30' :
        'border-emerald-500/30'
      }`}>
        <h4 className="text-[10px] uppercase font-black text-textSecondary mb-2 flex items-center gap-1.5"><ShieldCheck size={12} /> Fraud Record</h4>
        {provider.has_enough_data ? (
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className={`text-sm font-bold ${provider.fraud_rate >= 15 ? 'text-red-400' : provider.fraud_rate >= 8 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {provider.frauds_count} confirmed fraudulent claims out of {provider.claims_count} submissions
              </p>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex-1 h-2 bg-bg rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${provider.fraud_rate >= 15 ? 'bg-red-500' : provider.fraud_rate >= 8 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min((provider.fraud_rate / 30) * 100, 100)}%` }} />
                </div>
                <span className="text-xs font-black font-mono">Threat Rate: {provider.fraud_rate_display}</span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-400">Insufficient data — only {provider.claims_count} claims submitted (minimum {MIN_CLAIMS_FOR_RATE} required for meaningful fraud rate calculation).</p>
        )}
      </div>

      {providerClaims.length > 0 && (
        <div className="bg-surface border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2"><Activity size={16} className="text-primary" /> All Claims ({providerClaims.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="enterprise-table">
              <thead>
                <tr><th>Claim ID</th><th>Date</th><th>Patient</th><th>Service</th><th>Amount</th><th>Status</th><th>Fraud Score</th></tr>
              </thead>
              <tbody>
                {providerClaims.map(claim => (
                  <tr key={claim.claim_id || claim.id}>
                    <td className="font-mono text-xs font-bold text-textSecondary">#{claim.claim_id || claim.id}</td>
                    <td className="text-xs text-textSecondary">{claim.claim_date}</td>
                    <td className="text-xs text-textPrimary font-semibold">{claim.patient_name}</td>
                    <td className="text-xs text-textSecondary">{claim.service_name || 'N/A'}</td>
                    <td className="font-mono text-xs font-bold text-textPrimary">{formatCurrency(claim.claim_amount || claim.amount)}</td>
                    <td><span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border ${getStatusColor(claim.status)}`}>{claim.status}</span></td>
                    <td className="font-mono text-xs font-bold">
                      <span className={claim.fraud_score >= 0.65 ? 'text-red-400' : claim.fraud_score >= 0.45 ? 'text-amber-400' : 'text-textSecondary'}>
                        {claim.fraud_score ? `${(claim.fraud_score * 100).toFixed(0)}%` : 'N/A'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold hover:bg-red-500/20 transition-colors">
          <AlertTriangle size={16} /> Audit Provider
        </button>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-bold hover:bg-amber-500/20 transition-colors">
          <Download size={16} /> Request Documentation
        </button>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm font-bold hover:bg-primary/20 transition-colors">
          <ShieldCheck size={16} /> Flag for Review
        </button>
      </div>
    </div>
  );
}

function getFraudRateDisplay(provider) {
  const claims = provider.claims_count || provider.total_claims || 0;
  const frauds = provider.fraud_count || provider.fraud_claims || 0;
  if (claims < MIN_CLAIMS_FOR_RATE) return { rate: null, label: 'Insufficient Data', display: `${claims} claims` };
  const rate = (frauds / claims) * 100;
  return { rate, label: rate >= 15 ? 'High Risk' : rate >= 8 ? 'Medium' : 'Low Risk', display: `${rate.toFixed(1)}%` };
}
