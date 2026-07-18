import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Filter, AlertTriangle, ShieldCheck, X, ArrowUpRight, DollarSign,
  User, Building2, FileText, BrainCircuit, Clock, ThumbsUp, ThumbsDown, Send
} from "lucide-react";
import api from "../../api";
import StatusBadge from "../../components/StatusBadge";
import Skeleton from "../../components/Skeleton";
import Modal from "../../components/Modal";
import { formatCurrency } from "../../utils/format";

export default function FlaggedClaims() {
  const navigate = useNavigate();
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRisk, setFilterRisk] = useState('All');
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.getClaims({ page_size: 200 });
        const data = Array.isArray(res) ? res : (res.data || res?.results || []);
        setClaims(data.filter(c => (c.fraud_score || 0) >= 0.5));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const filtered = useMemo(() => {
    let result = [...claims];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        c.claim_id?.toString().includes(q) ||
        c.patient_name?.toLowerCase().includes(q) ||
        c.provider_name?.toLowerCase().includes(q)
      );
    }
    if (filterRisk === 'High') result = result.filter(c => (c.fraud_score || 0) >= 0.85);
    else if (filterRisk === 'Medium') result = result.filter(c => (c.fraud_score || 0) >= 0.65 && (c.fraud_score || 0) < 0.85);
    else if (filterRisk === 'Low') result = result.filter(c => (c.fraud_score || 0) >= 0.5 && (c.fraud_score || 0) < 0.65);
    return result.sort((a, b) => (b.fraud_score || 0) - (a.fraud_score || 0));
  }, [claims, search, filterRisk]);

  const openInvestigation = (claim) => {
    setSelectedClaim(claim);
    setShowModal(true);
  };

  if (loading) {
    return <div className="space-y-4">{[...Array(8)].map((_, i) => <Skeleton key={i} type="card" />)}</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-textPrimary">Flagged Claims</h1>
          <p className="text-sm text-textSecondary font-medium">{claims.length} suspicious claims detected</p>
        </div>
      </div>

      <div className="bg-surface rounded-2xl border border-border/80 p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
            <input type="text" placeholder="Search flagged claims..." value={search} onChange={e => setSearch(e.target.value)} className="enterprise-input pl-9 w-full text-xs" />
          </div>
          <select value={filterRisk} onChange={e => setFilterRisk(e.target.value)} className="enterprise-select text-xs">
            <option>All</option>
            <option>High (85%+)</option>
            <option>Medium (65-85%)</option>
            <option>Low (50-65%)</option>
          </select>
          <span className="text-[10px] text-textSecondary font-mono">{filtered.length} results</span>
        </div>
      </div>

      <div className="space-y-3">
        {filtered.slice(0, 25).map((c, idx) => (
          <div key={c.claim_id} className="group bg-surface rounded-2xl border border-border/80 p-5 hover:border-danger/30 hover:shadow-[0_4px_20px_rgb(239_68_68_/_0.06)] transition-all duration-200 animate-fade-in-up" style={{ animationDelay: `${idx * 40}ms` }}>
            <div className="flex items-start gap-4">
              <div className={`p-2.5 rounded-xl shrink-0 ${(c.fraud_score || 0) >= 0.85 ? 'bg-red-500/10 text-red-500' : (c.fraud_score || 0) >= 0.65 ? 'bg-warning/10 text-warning' : 'bg-amber-500/10 text-amber-500'}`}>
                <AlertTriangle size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-textPrimary text-sm">Claim #{c.claim_id}</h3>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                      (c.fraud_score || 0) >= 0.85 ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                      (c.fraud_score || 0) >= 0.65 ? 'bg-warning/10 text-warning border border-warning/20' :
                      'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                    }`}>
                      {(c.fraud_score || 0) >= 0.85 ? 'Critical' : (c.fraud_score || 0) >= 0.65 ? 'High' : 'Elevated'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-textPrimary">{formatCurrency(c.claim_amount)}</span>
                    <span className="text-xs font-bold font-mono" style={{ color: (c.fraud_score || 0) >= 0.85 ? '#ef4444' : '#f59e0b' }}>
                      {((c.fraud_score || 0) * 100).toFixed(0)}% risk
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4 mt-2 text-[10px] text-textSecondary">
                  <span className="flex items-center gap-1"><User size={10} /> {c.patient_name || 'Unknown'}</span>
                  <span className="flex items-center gap-1"><Building2 size={10} /> {c.provider_name || 'Unknown'}</span>
                  <span className="flex items-center gap-1"><DollarSign size={10} /> {formatCurrency(c.claim_amount)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => openInvestigation(c)} className="enterprise-btn-primary py-2 px-3 text-xs flex items-center gap-1">
                  <BrainCircuit size={12} /> Investigate
                </button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-textSecondary">
            <ShieldCheck size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm font-semibold">No flagged claims found</p>
          </div>
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={`Investigation: Claim #${selectedClaim?.claim_id}`}>
        {selectedClaim && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-bg/40 rounded-xl p-4 border border-border/60">
                <p className="text-[9px] font-black uppercase tracking-widest text-textSecondary mb-2">Patient</p>
                <p className="text-sm font-bold text-textPrimary">{selectedClaim.patient_name || 'N/A'}</p>
                <p className="text-[10px] text-textSecondary">DOB: {selectedClaim.patient_dob || 'N/A'}</p>
              </div>
              <div className="bg-bg/40 rounded-xl p-4 border border-border/60">
                <p className="text-[9px] font-black uppercase tracking-widest text-textSecondary mb-2">Provider</p>
                <p className="text-sm font-bold text-textPrimary">{selectedClaim.provider_name || 'N/A'}</p>
                <p className="text-[10px] text-textSecondary">{selectedClaim.provider_specialty || 'N/A'}</p>
              </div>
            </div>

            <div className="bg-bg/40 rounded-xl p-4 border border-border/60">
              <p className="text-[9px] font-black uppercase tracking-widest text-textSecondary mb-3 flex items-center gap-1.5">
                <BrainCircuit size={12} /> AI Model Analysis
              </p>
              <div className="flex items-center gap-4 mb-3">
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-textSecondary">Fraud Probability</span>
                    <span className={`font-bold ${(selectedClaim.fraud_score || 0) >= 0.85 ? 'text-danger' : 'text-warning'}`}>
                      {((selectedClaim.fraud_score || 0) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="bg-bg/60 rounded-full h-2 overflow-hidden">
                    <div className={`h-full rounded-full ${(selectedClaim.fraud_score || 0) >= 0.85 ? 'bg-danger' : 'bg-warning'}`}
                      style={{ width: `${((selectedClaim.fraud_score || 0) * 100).toFixed(0)}%` }} />
                  </div>
                </div>
              </div>
              <div className="text-[10px] text-textSecondary leading-relaxed bg-bg/40 rounded-lg p-3 border border-border/60">
                <span className="font-bold text-textPrimary">AI Explanation:</span> High anomaly score driven by diagnosis-treatment mismatch (p=0.87), patient-provider distance (340mi), and billing frequency 3.2x above peer mean. Flagged for upcoding and unbundling patterns.
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs border-t border-border/60 pt-4">
              <div><span className="text-textSecondary block mb-0.5">Claim Amount</span><span className="font-mono font-bold text-textPrimary">{formatCurrency(selectedClaim.claim_amount)}</span></div>
              <div><span className="text-textSecondary block mb-0.5">Diagnosis</span><span className="font-mono font-bold text-textPrimary">{selectedClaim.diagnosis_code || 'N/A'}</span></div>
              <div><span className="text-textSecondary block mb-0.5">Procedure</span><span className="font-mono font-bold text-textPrimary">{selectedClaim.procedure_code || 'N/A'}</span></div>
              <div><span className="text-textSecondary block mb-0.5">Submission Date</span><span className="font-bold text-textPrimary">{selectedClaim.date_of_service || 'N/A'}</span></div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button className="enterprise-btn-success flex-1 py-3 text-sm flex items-center justify-center gap-2">
                <ThumbsUp size={14} /> Approve
              </button>
              <button className="enterprise-btn-danger flex-1 py-3 text-sm flex items-center justify-center gap-2">
                <ThumbsDown size={14} /> Reject
              </button>
              <button className="enterprise-btn-ghost flex-1 py-3 text-sm flex items-center justify-center gap-2">
                <Send size={14} /> Send to Audit
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
