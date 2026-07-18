import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  HeartPulse, ShieldAlert, ArrowLeft, User, Building2, Calendar, FileText, 
  DollarSign, CheckCircle2, XCircle, Clock, AlertTriangle, TrendingUp, TrendingDown 
} from 'lucide-react';
import api from '../../api';
import Skeleton from '../../components/Skeleton';
import PlotlyChart from '../../components/PlotlyChart';

const formatCurrency = (val) => {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
};

export default function ClaimDetails() {
  const { claimId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(null);

  const fetchDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.request('GET', `/api/claims/${claimId}`);
      setData(res);
    } catch (err) {
      console.error(err);
      setError('Failed to load claim details. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [claimId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const handleStatusUpdate = async (status) => {
    setUpdating(true);
    try {
      await api.updateClaimStatus(claimId, status);
      await fetchDetails();
    } catch (err) {
      alert('Failed to update claim status: ' + err.message);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <div className="p-6"><Skeleton rows={10} /></div>;
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-surface border border-border rounded-xl">
        <AlertTriangle className="text-danger mb-3" size={36} />
        <h3 className="text-lg font-bold text-textPrimary">Error Loading Details</h3>
        <p className="text-sm text-textSecondary mb-4">{error || 'Claim details not found.'}</p>
        <button onClick={() => navigate(-1)} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold">
          Go Back
        </button>
      </div>
    );
  }

  const { claim, patient_history, shap_contributions, base_value } = data;
  const isHighRisk = claim.fraud_score >= 0.7;

  // Render SHAP Plotly Horizontal Bar Chart
  // positive contribution = red, negative = blue/green
  const sortedShap = [...(shap_contributions || [])]
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .slice(0, 10); // Show top 10 contributing features

  const shapPlotData = [
    {
      x: sortedShap.map(s => s.contribution),
      y: sortedShap.map(s => s.feature.replace(/_/g, ' ').toUpperCase()),
      type: 'bar',
      orientation: 'h',
      marker: {
        color: sortedShap.map(s => s.contribution > 0 ? '#ef4444' : '#10b981'),
      },
      text: sortedShap.map(s => `${s.contribution > 0 ? '+' : ''}${(s.contribution * 100).toFixed(1)}%`),
      textposition: 'auto',
    }
  ];

  const shapPlotLayout = {
    margin: { t: 10, r: 20, l: 200, b: 30 },
    xaxis: { title: 'Risk Contribution (%)', gridcolor: 'rgba(226, 232, 240, 0.5)' },
    yaxis: { automargin: true },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    height: 350
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Back Header */}
      <div className="flex items-center gap-3">
        <button 
          onClick={() => navigate(-1)} 
          className="rounded-xl border border-border bg-surface p-2 text-textSecondary hover:border-primary/40 hover:text-primary transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-black text-textPrimary flex items-center gap-2">
            Claim Audit Workspace: #{claim.claim_id}
          </h1>
          <p className="text-xs text-textSecondary">
            Submitted {new Date(claim.claim_date).toLocaleDateString()} &bull; Service Date: {new Date(claim.service_date).toLocaleDateString()}
          </p>
        </div>

        <div className="ml-auto">
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider ${
            claim.status === 'Approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' :
            claim.status === 'Rejected' || claim.status === 'Fraud Confirmed' ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400' :
            'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
          }`}>
            {claim.status}
          </span>
        </div>
      </div>

      {/* Main Grid: Info + Risk assessment */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Details & Medical History & Timeline */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Patient and Provider Split Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Patient Card */}
            <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2 mb-4 border-b border-border pb-3">
                <User size={18} className="text-primary" />
                Patient Profile
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-textSecondary">Full Name</span>
                  <span className="font-bold text-textPrimary">{claim.patient_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-textSecondary">Age / Gender</span>
                  <span className="font-semibold text-textPrimary">{claim.patient_age} yrs / {claim.patient_gender}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-textSecondary">Location</span>
                  <span className="text-textPrimary">{claim.patient_city}, {claim.patient_state}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-textSecondary">Historical Claims Count</span>
                  <span className="font-mono text-textPrimary font-bold">{claim.number_of_previous_claims_patient} claims</span>
                </div>
              </div>
            </div>

            {/* Provider Card */}
            <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2 mb-4 border-b border-border pb-3">
                <Building2 size={18} className="text-primary" />
                Provider Details
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-textSecondary">Name</span>
                  <span className="font-bold text-textPrimary">{claim.provider_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-textSecondary">Facility Type / Specialty</span>
                  <span className="font-semibold text-textPrimary">{claim.provider_type} / {claim.provider_specialty}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-textSecondary">Geographic Distance</span>
                  <span className="text-textPrimary">{claim.provider_patient_distance_miles?.toFixed(1)} miles</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-textSecondary">Provider Total Claims</span>
                  <span className="font-mono text-textPrimary font-bold">{claim.number_of_previous_claims_provider} submissions</span>
                </div>
              </div>
            </div>
          </div>

          {/* Treatment & Financial limits */}
          <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2 mb-4 border-b border-border pb-3">
              <FileText size={18} className="text-primary" />
              Treatment Details & Financial Breakdown
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-[10px] font-black uppercase text-textSecondary">Service Name</p>
                <p className="mt-1 text-sm font-bold text-textPrimary">{claim.service_name || 'General'}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-textSecondary">Diagnosis Code</p>
                <p className="mt-1 text-sm font-mono font-semibold text-textPrimary">{claim.diagnosis_code || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-textSecondary">Procedure Code</p>
                <p className="mt-1 text-sm font-mono font-semibold text-textPrimary">{claim.procedure_code || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-textSecondary">Length of Stay</p>
                <p className="mt-1 text-sm font-semibold text-textPrimary">{claim.length_of_stay_days || 0} days</p>
              </div>
            </div>

            <hr className="my-5 border-border" />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-[10px] font-black uppercase text-textSecondary">Billed Amount</p>
                <p className="mt-1 text-lg font-black text-textPrimary">{formatCurrency(claim.claim_amount)}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-textSecondary">Deductible Limit</p>
                <p className="mt-1 text-lg font-bold text-textPrimary">{formatCurrency(claim.deductible_amount)}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-textSecondary">Copay Amount</p>
                <p className="mt-1 text-lg font-bold text-textSecondary">{formatCurrency(claim.claim_copay)}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-textSecondary">Late submission</p>
                <span className={`mt-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                  claim.claim_submitted_late ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'
                }`}>
                  {claim.claim_submitted_late ? 'LATE' : 'ON TIME'}
                </span>
              </div>
            </div>
          </div>

          {/* Patient History Table */}
          <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2 mb-4 border-b border-border pb-3">
              <Calendar size={18} className="text-primary" />
              Patient Historical Record (Previous Claims)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-bg/50 text-textSecondary font-black uppercase tracking-wider">
                    <th className="p-3">Claim ID</th>
                    <th className="p-3">Service Date</th>
                    <th className="p-3">Diagnosis</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Risk Score</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {patient_history.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-5 text-center text-textSecondary italic">No historical claims available.</td>
                    </tr>
                  ) : (
                    patient_history.map(h => (
                      <tr key={h.claim_id} className="hover:bg-bg/40">
                        <td className="p-3 font-mono font-bold">#{h.claim_id}</td>
                        <td className="p-3">{new Date(h.service_date).toLocaleDateString()}</td>
                        <td className="p-3 font-mono">{h.diagnosis_code || 'N/A'}</td>
                        <td className="p-3 font-bold text-textPrimary">{formatCurrency(h.claim_amount)}</td>
                        <td className="p-3 font-mono">{(h.fraud_score * 100).toFixed(0)}%</td>
                        <td className="p-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            h.status === 'Approved' ? 'bg-green-100 text-green-700' :
                            h.status === 'Rejected' || h.status === 'Fraud Confirmed' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>{h.status}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right 1 Col: AI Analysis & override actions */}
        <div className="space-y-6">
          
          {/* Risk Dial Card */}
          <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm flex flex-col items-center text-center">
            <h3 className="text-[10px] font-black uppercase tracking-wider text-textSecondary mb-4 w-full text-left">
              AI Risk Probability
            </h3>
            
            <div className="relative flex items-center justify-center h-32 w-32 rounded-full border-4" style={{
              borderColor: isHighRisk ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
              borderTopColor: isHighRisk ? '#ef4444' : '#10b981'
            }}>
              <div>
                <p className="text-3xl font-black text-textPrimary font-mono">
                  {(claim.fraud_score * 100).toFixed(0)}%
                </p>
                <p className="text-[10px] text-textSecondary uppercase font-bold mt-1">probability</p>
              </div>
            </div>

            <div className="mt-4">
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider ${
                isHighRisk ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'
              }`}>
                {isHighRisk ? 'High Risk Threat' : 'Low Risk / Stable'}
              </span>
            </div>

            <p className="mt-3 text-xs text-textSecondary leading-relaxed">
              Model output suggests {isHighRisk ? 'elevated suspicious triggers' : 'low risk metrics'}. Review explainable AI feature weights below.
            </p>
          </div>

          {/* Override Action Board */}
          <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm border-t-4 border-t-primary">
            <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2 mb-3">
              <ShieldAlert size={16} className="text-primary" />
              Auditor Override Console
            </h3>
            <p className="text-xs text-textSecondary leading-relaxed mb-5">
              Force an override to cleared or fraud status. Blacklist claims will immediately train the ML engine.
            </p>

            <div className="space-y-3">
              <button 
                onClick={() => handleStatusUpdate('Approved')}
                disabled={updating || claim.status === 'Approved'}
                className="w-full py-2.5 bg-success text-white rounded-xl text-xs font-bold hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
              >
                <CheckCircle2 size={16} />
                Approve & Clear Claim
              </button>
              
              <button 
                onClick={() => handleStatusUpdate('Rejected')}
                disabled={updating || claim.status === 'Rejected'}
                className="w-full py-2.5 bg-danger text-white rounded-xl text-xs font-bold hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
              >
                <XCircle size={16} />
                Reject & Flag Suspicious
              </button>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2 mb-4 border-b border-border pb-3">
              <Clock size={16} className="text-primary" />
              Claim Pipeline Timeline
            </h3>
            <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
              
              <div className="flex gap-4 relative">
                <div className="w-6 h-6 rounded-full bg-success/20 text-success flex items-center justify-center shrink-0 z-10">
                  <CheckCircle2 size={14} />
                </div>
                <div>
                  <p className="text-xs font-bold text-textPrimary">Claim Submitted</p>
                  <p className="text-[10px] text-textSecondary">{new Date(claim.claim_date).toLocaleDateString()} by Provider</p>
                </div>
              </div>

              <div className="flex gap-4 relative">
                <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 z-10">
                  <HeartPulse size={14} />
                </div>
                <div>
                  <p className="text-xs font-bold text-textPrimary">AI ML Scoring Engine</p>
                  <p className="text-[10px] text-textSecondary">Evaluated risk at {(claim.fraud_score * 100).toFixed(0)}%</p>
                </div>
              </div>

              <div className="flex gap-4 relative">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 ${
                  claim.status !== 'Submitted' && claim.status !== 'AI Scored' ? 'bg-success/20 text-success' : 'bg-amber-500/20 text-warning'
                }`}>
                  <Clock size={14} />
                </div>
                <div>
                  <p className="text-xs font-bold text-textPrimary">Human Auditor Review</p>
                  <p className="text-[10px] text-textSecondary">{claim.status === 'Approved' || claim.status === 'Rejected' ? 'Completed override' : 'Awaiting override'}</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* SHAP Feature Contribution Section */}
      <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
        <div className="flex items-start justify-between border-b border-border pb-3 mb-6">
          <div>
            <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2">
              <ShieldAlert size={18} className="text-primary" />
              Explainable AI (SHAP Feature Contributions)
            </h3>
            <p className="text-xs text-textSecondary mt-1">
              Top features driving the prediction model. Red bars raise the risk score, while green bars lower the risk.
            </p>
          </div>
          <div className="text-[10px] font-mono text-textSecondary bg-bg px-2 py-1 rounded">
            Base Model Output Value: {(base_value * 100).toFixed(1)}%
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-surface rounded-xl border border-border p-2">
            {shap_contributions && shap_contributions.length > 0 ? (
              <PlotlyChart data={shapPlotData} layout={shapPlotLayout} />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-textSecondary text-xs">
                No XGBoost model feature contributions calculated for this record.
              </div>
            )}
          </div>
          
          <div className="bg-bg/40 border border-border rounded-xl p-5 space-y-4">
            <h4 className="text-xs font-black uppercase text-textPrimary">Threat Risk Factor Analysis</h4>
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {sortedShap.map((s, idx) => {
                const isPos = s.contribution > 0;
                return (
                  <div key={idx} className="flex items-start justify-between gap-3 text-xs border-b border-border/50 pb-2">
                    <div>
                      <p className="font-bold text-textPrimary">{s.feature.replace(/_/g, ' ').toUpperCase()}</p>
                      <p className="text-[10px] text-textSecondary mt-0.5">Value: {s.value?.toString() || 'N/A'}</p>
                    </div>
                    <div className="text-right">
                      <span className={`font-bold ${isPos ? 'text-danger' : 'text-success'}`}>
                        {isPos ? '+' : ''}{(s.contribution * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
