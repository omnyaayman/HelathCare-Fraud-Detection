import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, ShieldCheck, AlertTriangle, Activity, Calendar, Clock, DollarSign, TrendingUp, RefreshCw } from 'lucide-react';
import api from '../../api';
import { formatCurrency, formatNumber } from '../../data/dataUtils';
import Skeleton from '../../components/Skeleton';

const MIN_CLAIMS_FOR_FRAUD_RATE = 3;
const MAX_EXPECTED_CLAIMS = 60;
const RENEWAL_RISK_LABELS = ['Low', 'Medium', 'High', 'Critical'];
const RENEWAL_RISK_COLORS = { Low: 'bg-green-500/10 text-green-400 border-green-500/20', Medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20', High: 'bg-orange-500/10 text-orange-400 border-orange-500/20', Critical: 'bg-red-500/10 text-red-400 border-red-500/20' };

const getCoverageClass = (copay) => {
  if (copay <= 100) return 'Platinum';
  if (copay <= 250) return 'Gold';
  if (copay <= 500) return 'Silver';
  return 'Bronze';
};
const getCoverageClassColor = (cc) => {
  if (cc === 'Platinum') return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
  if (cc === 'Gold') return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
  if (cc === 'Silver') return 'bg-slate-400/10 text-slate-300 border-slate-400/20';
  return 'bg-amber-700/10 text-amber-500 border-amber-700/20';
};
const getPolicyType = (d) => { if (d >= 6000) return 'Corporate Gold'; if (d >= 4000) return 'Family Premium'; if (d >= 2000) return 'Standard Plus'; return 'Individual Starter'; };
const getFraudRateDisplay = (claims, frauds) => {
  if (claims < MIN_CLAIMS_FOR_FRAUD_RATE) return { rate: null, display: `${frauds}/${claims} claims` };
  const rate = (frauds / claims) * 100;
  return { rate, display: `${rate.toFixed(1)}%` };
};
const getRenewalRisk = (p) => {
  if (p.policy_status !== 'Active' || !p.policy_end_date) return null;
  const endDate = new Date(p.policy_end_date);
  const now = new Date();
  const diffDays = (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays <= 0) return null;
  const fraudRate = p.fraud_rate || 0;
  const utilization = Math.min(100, ((p.claim_count || 0) / MAX_EXPECTED_CLAIMS) * 100);
  let score = 0;
  if (fraudRate >= 15) score += 40; else if (fraudRate >= 5) score += 20;
  score += utilization * 0.35;
  if (diffDays <= 60) score += 20; else if (diffDays <= 120) score += 10;
  const s = Math.min(100, Math.round(score));
  return { score: s, level: RENEWAL_RISK_LABELS[s >= 70 ? 3 : s >= 45 ? 2 : s >= 20 ? 1 : 0], daysLeft: Math.round(diffDays) };
};

export default function PolicyDetail() {
  const { policyId } = useParams();
  const navigate = useNavigate();
  const [policy, setPolicy] = useState(null);
  const [allPolicies, setAllPolicies] = useState([]);
  const [allClaims, setAllClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [polRes, claimsRes] = await Promise.all([
          api.getPolicies(),
          api.getClaims({ page_size: 500 })
        ]);
        setAllPolicies(polRes || []);
        const match = (polRes || []).find(p => p.policy_id === policyId);
        if (match) {
          const fraudDisplay = getFraudRateDisplay(match.claim_count || 0, match.fraud_count || 0);
          const premium = ((match.annual_deductible || 2000) * 0.18) + (match.copay_amount || 250);
          const coverageUtil = Math.min(100, ((match.claim_count || 0) / MAX_EXPECTED_CLAIMS) * 100);
          const renewalRisk = getRenewalRisk({ ...match, fraud_rate: fraudDisplay.rate });
          const fraudExposure = ((match.fraud_count || 0) / Math.max(1, match.claim_count || 1)) * (match.total_billed || 0);
          setPolicy({
            ...match,
            policy_type: getPolicyType(match.annual_deductible),
            coverage_class: getCoverageClass(match.copay_amount),
            annual_premium: premium,
            fraud_rate: fraudDisplay.rate,
            fraud_rate_display: fraudDisplay.display,
            has_enough_data: fraudDisplay.rate !== null,
            fraud_exposure_score: fraudExposure,
            coverage_utilization: coverageUtil,
            renewal_risk: renewalRisk,
            days_remaining: match.policy_end_date ? Math.max(0, Math.ceil((new Date(match.policy_end_date).getTime() - Date.now()) / (1000*60*60*24))) : null,
          });
        }
        const allC = claimsRes?.claims || claimsRes?.data || claimsRes || [];
        setAllClaims(Array.isArray(allC) ? allC : []);
      } catch (err) {
        console.error('Failed to load policy detail', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [policyId]);

  const matchingClaims = useMemo(() => {
    if (!policy || !allClaims.length) return [];
    return allClaims.filter(c => c.patient_name === policy.patient_name);
  }, [policy, allClaims]);

  if (loading) return <div className="p-6"><Skeleton rows={12} /></div>;
  if (!policy) return (
    <div className="p-6">
      <button onClick={() => navigate('/insurance/policies')} className="flex items-center gap-2 text-textSecondary hover:text-textPrimary mb-4 transition-colors text-sm font-bold">
        <ArrowLeft size={16} /> Back to Policies
      </button>
      <div className="text-center py-16 text-textSecondary">Policy not found.</div>
    </div>
  );

  const r = policy.renewal_risk;

  return (
    <div className="space-y-6 animate-in fade-in duration-300 p-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/insurance/policies')}
          className="h-9 w-9 flex items-center justify-center rounded-xl border border-border bg-surface text-textSecondary hover:text-textPrimary hover:border-primary transition-colors">
          <ArrowLeft size={16} />
        </button>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg">
          <FileText size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-textPrimary">{policy.policy_id}</h1>
          <p className="text-sm text-textSecondary">{policy.patient_name} &bull; {policy.policy_type} &bull; {policy.plan_type}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${policy.policy_status === 'Expired' ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${policy.policy_status === 'Expired' ? 'bg-red-500' : 'bg-green-500'}`} />
            {policy.policy_status}
          </span>
          {r && (
            <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border ${RENEWAL_RISK_COLORS[r.level]}`}>
              Renewal Risk: {r.level}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm border-l-4 border-l-indigo-500">
          <p className="text-[10px] uppercase font-bold text-textSecondary mb-1">Annual Premium</p>
          <p className="text-2xl font-black text-indigo-400 font-mono">{formatCurrency(policy.annual_premium)}</p>
        </div>
        <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm border-l-4 border-l-primary">
          <p className="text-[10px] uppercase font-bold text-textSecondary mb-1">Deductible</p>
          <p className="text-2xl font-black text-textPrimary font-mono">{formatCurrency(policy.annual_deductible)}</p>
        </div>
        <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm border-l-4 border-l-blue-500">
          <p className="text-[10px] uppercase font-bold text-textSecondary mb-1">Claims</p>
          <p className="text-2xl font-black text-blue-400 font-mono">{formatNumber(policy.claim_count || 0)}</p>
        </div>
        <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm border-l-4 border-l-violet-500">
          <p className="text-[10px] uppercase font-bold text-textSecondary mb-1">Total Billed</p>
          <p className="text-2xl font-black text-violet-400 font-mono">{formatCurrency(policy.total_billed || 0)}</p>
        </div>
        <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm border-l-4 border-l-orange-500">
          <p className="text-[10px] uppercase font-bold text-textSecondary mb-1">Fraud Exposure</p>
          <p className="text-2xl font-black text-orange-400 font-mono">{formatCurrency(policy.fraud_exposure_score)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
          <h5 className="text-xs font-black uppercase text-textSecondary tracking-wider mb-3 flex items-center gap-2">
            <ShieldCheck size={14} className="text-primary" /> Coverage Details
          </h5>
          <div className="grid grid-cols-2 gap-4 bg-bg/50 rounded-xl p-4 border border-border">
            <div>
              <p className="text-[10px] font-black uppercase text-textSecondary">Policy Type</p>
              <p className="font-bold text-textPrimary text-sm mt-1">{policy.policy_type}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-textSecondary">Coverage Class</p>
              <p className="mt-1"><span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase border ${getCoverageClassColor(policy.coverage_class)}`}>{policy.coverage_class}</span></p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-textSecondary">Copay</p>
              <p className="font-bold text-textPrimary font-mono text-sm mt-1">{formatCurrency(policy.copay_amount)}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-textSecondary">Max Coverage</p>
              <p className="font-bold text-textPrimary font-mono text-sm mt-1">{formatCurrency(policy.max_coverage)}</p>
            </div>
            <div className="col-span-2">
              <p className="text-[10px] font-black uppercase text-textSecondary">Provider</p>
              <p className="font-semibold text-textPrimary text-sm mt-1">{policy.provider || 'N/A'}</p>
            </div>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
          <h5 className="text-xs font-black uppercase text-textSecondary tracking-wider mb-3 flex items-center gap-2">
            <Calendar size={14} className="text-primary" /> Policy Timeline
          </h5>
          <div className="grid grid-cols-2 gap-4 bg-bg/50 rounded-xl p-4 border border-border">
            <div>
              <p className="text-[10px] font-black uppercase text-textSecondary">Start Date</p>
              <p className="font-semibold text-textPrimary text-sm mt-1">{policy.policy_start_date ? new Date(policy.policy_start_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-textSecondary">End Date</p>
              <p className="font-semibold text-textPrimary text-sm mt-1">{policy.policy_end_date ? new Date(policy.policy_end_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-textSecondary">Days Remaining</p>
              <p className={`font-bold text-sm mt-1 ${policy.policy_status === 'Active' && policy.days_remaining <= 60 ? 'text-amber-400' : 'text-textPrimary'}`}>
                {policy.policy_status === 'Active' && policy.days_remaining !== null ? `${policy.days_remaining} days` : policy.policy_status === 'Expired' ? 'Expired' : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-textSecondary">Utilization</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-16 h-1.5 bg-border rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${policy.coverage_utilization >= 80 ? 'bg-red-500' : policy.coverage_utilization >= 50 ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${Math.min(100, policy.coverage_utilization)}%` }} />
                </div>
                <span className="text-xs font-mono text-textPrimary font-bold">{policy.coverage_utilization.toFixed(0)}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {r && (
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
          <h5 className="text-xs font-black uppercase text-textSecondary tracking-wider mb-3 flex items-center gap-2">
            <RefreshCw size={14} className="text-primary" /> Renewal Risk Assessment
          </h5>
          <div className="bg-bg/50 rounded-xl p-4 border border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-textSecondary">Renewal Risk Score</span>
              <span className={`text-xs font-black ${r.level === 'Critical' ? 'text-red-400' : r.level === 'High' ? 'text-orange-400' : r.level === 'Medium' ? 'text-amber-400' : 'text-green-400'}`}>
                {r.score}% — {r.level}
              </span>
            </div>
            <div className="w-full h-3 bg-border rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${r.score >= 70 ? 'bg-gradient-to-r from-red-500 to-red-600' : r.score >= 45 ? 'bg-gradient-to-r from-orange-500 to-amber-500' : r.score >= 20 ? 'bg-gradient-to-r from-amber-500 to-yellow-500' : 'bg-gradient-to-r from-green-500 to-green-400'}`} style={{ width: `${r.score}%` }} />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[9px] text-green-500 font-bold">Low</span>
              <span className="text-[9px] text-amber-500 font-bold">Medium</span>
              <span className="text-[9px] text-orange-500 font-bold">High</span>
              <span className="text-[9px] text-red-500 font-bold">Critical</span>
            </div>
            <p className="text-[11px] text-textSecondary mt-3">
              {r.daysLeft} days until policy end.
              {policy.has_enough_data && policy.fraud_rate > 5 && ' Elevated fraud rate increases non-renewal probability.'}
              {policy.coverage_utilization > 80 && ' High coverage utilization may require premium adjustment.'}
            </p>
          </div>
        </div>
      )}

      <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
        <h5 className="text-xs font-black uppercase text-textSecondary tracking-wider mb-3 flex items-center gap-2">
          <AlertTriangle size={14} className="text-red-500" /> Fraud Exposure
        </h5>
        <div className="grid grid-cols-3 gap-4 bg-bg/50 rounded-xl p-4 border border-border">
          <div>
            <p className="text-[10px] font-black uppercase text-textSecondary">Fraud Count</p>
            <p className={`font-bold font-mono text-lg mt-1 ${policy.fraud_count > 0 ? 'text-red-500' : 'text-textPrimary'}`}>{policy.fraud_count || 0}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-textSecondary">Fraud Rate</p>
            <p className="mt-1 text-lg font-black">
              {policy.has_enough_data ? (
                <span className={`${policy.fraud_rate > 15 ? 'text-red-500' : policy.fraud_rate > 5 ? 'text-amber-500' : 'text-green-500'}`}>
                  {policy.fraud_rate_display}
                </span>
              ) : (
                <span className="text-slate-400">{policy.fraud_rate_display}</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-textSecondary">Exposure Amount</p>
            <p className="font-bold font-mono text-lg text-orange-400">{formatCurrency(policy.fraud_exposure_score)}</p>
          </div>
        </div>
      </div>

      {matchingClaims.length > 0 && (
        <div className="bg-surface border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2"><Activity size={16} className="text-primary" /> Associated Claims ({matchingClaims.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="enterprise-table">
              <thead>
                <tr><th>Claim ID</th><th>Date</th><th>Service</th><th>Amount</th><th>Status</th></tr>
              </thead>
              <tbody>
                {matchingClaims.map(claim => (
                  <tr key={claim.claim_id || claim.id}>
                    <td className="font-mono text-xs font-bold text-textSecondary">#{claim.claim_id || claim.id}</td>
                    <td className="text-xs text-textSecondary">{claim.claim_date}</td>
                    <td className="text-xs text-textSecondary">{claim.service_name || 'N/A'}</td>
                    <td className="font-mono text-xs font-bold text-textPrimary">{formatCurrency(claim.claim_amount || claim.amount)}</td>
                    <td><span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border bg-primary/10 text-primary border-primary/20">{claim.status || 'N/A'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
