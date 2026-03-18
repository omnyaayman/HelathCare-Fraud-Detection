import { useState } from 'react';
import { CheckCircle, Loader, Search, AlertCircle, AlertTriangle, ArrowRight, UserCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import { ADMISSION_TYPES, DIAGNOSES, PROCEDURES, SERVICES, DISCHARGE_TYPES } from '../../constants';
import StatusBadge from '../../components/StatusBadge';

const initialForm = {
  policy_id: '',
  service_date: '',
  claim_date: new Date().toISOString().slice(0, 10),
  admission_type: 'Emergency',
  diagnosis_code: '',
  procedure_code: '',
  service_type: '',
  discharge_type: 'Home',
};

const steps = ["Policy Check", "Claim Details", "AI Result"];

export default function SubmitClaim() {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [policyInput, setPolicyInput] = useState('');
  const [policyError, setPolicyError] = useState('');
  const [resolvedPatient, setResolvedPatient] = useState(null);

  // 1. التحقق من البوليصة (Step 0)
  const lookupPolicy = async () => {
    const trimmed = policyInput.trim();
    if (!trimmed) { setPolicyError('Please enter a policy ID'); return; }
    
    setSubmitting(true);
    try {
      // إرسال طلب للباك إند لفحص البوليصة في Azure SQL
      const data = await api.submitClaim({ policy_number: trimmed, check_only: true });
      
      if (data.policy_status === 'Active') {
        setPolicyError('');
        setResolvedPatient(data);
        setForm(prev => ({ ...prev, policy_id: trimmed }));
      } else {
        setPolicyError('This policy is expired or inactive.');
        setResolvedPatient(null);
      }
    } catch (err) {
      setPolicyError('Policy not found in Azure Database.');
    } finally {
      setSubmitting(false);
    }
  };

  // 2. إرسال المطالبة للموديل (Step 1)
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const selectedService = SERVICES.find(s => String(s.id) === String(form.service_type));
      
      const payload = {
        policy_number: form.policy_id,
        claim_amount: selectedService?.cost || 500,
        service_type: selectedService?.label || 'General',
        diagnosis_code: form.diagnosis_code,
        procedure_code: form.procedure_code,
        admission_type: form.admission_type,
        hospital_id: user?.id || 'HOSP_001'
      };

      const response = await api.submitClaim(payload);
      setResult(response);
      setStep(2);
    } catch (err) {
      setPolicyError('AI Engine is currently busy. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "w-full px-4 py-2.5 bg-bg border border-border rounded-lg text-sm text-textPrimary focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all";

  return (
    <div className="max-w-2xl mx-auto py-4">
      {/* Stepper Header */}
      <div className="flex justify-between mb-10 relative">
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-border -translate-y-1/2 -z-10"></div>
        {steps.map((label, i) => (
          <div key={label} className="flex flex-col items-center bg-bg px-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mb-2 border-2 transition-all ${
              i < step ? 'bg-success border-success text-white' : i === step ? 'bg-primary border-primary text-white shadow-lg shadow-primary/30' : 'bg-bg border-border text-textSecondary'
            }`}>
              {i < step ? <CheckCircle size={16} /> : i + 1}
            </div>
            <span className={`text-[10px] uppercase tracking-wider font-bold ${i === step ? 'text-primary' : 'text-textSecondary'}`}>{label}</span>
          </div>
        ))}
      </div>

      {/* Step 0: Verification */}
      {step === 0 && (
        <div className="bg-surface border border-border rounded-xl p-8 shadow-sm animate-in fade-in slide-in-from-bottom-4">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-textPrimary"><UserCheck className="text-primary"/> Policy Verification</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
              <input type="text" value={policyInput} onChange={(e) => setPolicyInput(e.target.value)} placeholder="Enter Patient Policy ID..." className={inputClass + " pl-10"} />
            </div>
            <button onClick={lookupPolicy} disabled={submitting} className="bg-primary text-white px-8 py-2.5 rounded-lg font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2">
              {submitting ? <Loader className="animate-spin" size={18} /> : 'Verify Now'}
            </button>
          </div>

          {policyError && <div className="mt-4 p-3 bg-danger/10 text-danger text-xs rounded-lg border border-danger/20 flex items-center gap-2"><AlertCircle size={14}/> {policyError}</div>}

          {resolvedPatient && (
            <div className="mt-8 p-6 bg-success/5 border border-success/20 rounded-xl">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-[10px] text-success uppercase font-bold mb-1 tracking-widest">Verified Patient</p>
                  <h4 className="text-xl font-bold text-textPrimary">{resolvedPatient.patient_name}</h4>
                </div>
                <StatusBadge status="Active" />
              </div>
              <button onClick={() => setStep(1)} className="w-full py-3 bg-textPrimary text-white rounded-lg font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all">
                Proceed to Claim Form <ArrowRight size={18} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 1: Claim Form */}
      {step === 1 && (
        <div className="bg-surface border border-border rounded-xl p-8 shadow-sm animate-in fade-in slide-in-from-right-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="sm:col-span-2 bg-bg/50 p-3 rounded border border-border flex justify-between">
              <span className="text-xs text-textSecondary">Patient: <b className="text-textPrimary">{resolvedPatient?.patient_name}</b></span>
              <span className="text-xs text-textSecondary">Policy: <b className="text-primary font-mono">{form.policy_id}</b></span>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-textSecondary mb-2">Service Date</label>
              <input type="date" value={form.service_date} onChange={(e) => setForm({...form, service_date: e.target.value})} className={inputClass} />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-textSecondary mb-2">Service Type</label>
              <select value={form.service_type} onChange={(e) => setForm({...form, service_type: e.target.value})} className={inputClass}>
                <option value="">Select Service...</option>
                {SERVICES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-textSecondary mb-2">Diagnosis Code</label>
              <select value={form.diagnosis_code} onChange={(e) => setForm({...form, diagnosis_code: e.target.value})} className={inputClass}>
                <option value="">Select ICD-10...</option>
                {DIAGNOSES.map(d => <option key={d.code} value={d.code}>{d.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-textSecondary mb-2">Procedure Code</label>
              <select value={form.procedure_code} onChange={(e) => setForm({...form, procedure_code: e.target.value})} className={inputClass}>
                <option value="">Select CPT...</option>
                {PROCEDURES.map(p => <option key={p.code} value={p.code}>{p.label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-4 mt-10">
            <button onClick={() => setStep(0)} className="flex-1 py-3 border border-border rounded-lg text-sm font-bold text-textSecondary hover:bg-bg transition-all">Go Back</button>
            <button onClick={handleSubmit} disabled={submitting || !form.service_type} className="flex-[2] py-3 bg-primary text-white rounded-lg font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2">
              {submitting ? <><Loader className="animate-spin" size={18}/> Analyzing...</> : 'Analyze Risk & Submit'}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: AI Result */}
      {step === 2 && result && (
        <div className={`p-10 rounded-2xl border-2 text-center animate-in zoom-in duration-500 shadow-2xl ${result.prediction === 'Fraud' ? 'bg-danger/5 border-danger/30' : 'bg-success/5 border-success/30'}`}>
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${result.prediction === 'Fraud' ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'}`}>
            {result.prediction === 'Fraud' ? <AlertTriangle size={48} /> : <CheckCircle size={48} />}
          </div>
          
          <h2 className={`text-3xl font-black mb-2 tracking-tight ${result.prediction === 'Fraud' ? 'text-danger' : 'text-success'}`}>
            {result.prediction === 'Fraud' ? 'High Risk Detected' : 'No Risk Detected'}
          </h2>
          
          <div className="bg-surface/50 p-6 rounded-2xl inline-block border border-border my-6 min-w-[200px]">
            <p className="text-xs text-textSecondary uppercase font-bold mb-2">AI Probability Score</p>
            <p className={`text-5xl font-mono font-black ${result.fraud_score > 0.7 ? 'text-danger' : 'text-primary'}`}>
              {(result.fraud_score * 100).toFixed(1)}%
            </p>
          </div>
          
          <p className="text-textSecondary text-sm mb-10 max-w-sm mx-auto leading-relaxed italic">
            {result.prediction === 'Fraud' 
              ? "This claim has been flagged by XGBoost model for manual audit. Payment will be held."
              : "Claim verified successfully and queued for payment processing."}
          </p>
          
          <button onClick={() => {setStep(0); setResolvedPatient(null); setPolicyInput('');}} className="px-10 py-4 bg-textPrimary text-white rounded-full font-bold hover:scale-105 transition-all shadow-xl">
            Submit New Claim
          </button>
        </div>
      )}
    </div>
  );
}