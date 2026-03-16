import { useState } from 'react';
import { CheckCircle, Loader, Search, AlertCircle } from 'lucide-react';
import { MOCK_PATIENTS, MOCK_PROVIDERS, ADMISSION_TYPES, DIAGNOSES, PROCEDURES, SERVICES, DISCHARGE_TYPES } from '../../mockData';

const initialForm = {
  policy_id: '',
  patient_id: '',
  patient_name: '',
  provider_id: '',
  provider_name: '',
  service_date: '',
  claim_date: new Date().toISOString().slice(0, 10),
  admission_type: '',
  diagnosis_code: '',
  procedure_code: '',
  service_type: '',
  discharge_type: '',
  notes: '',
};

const steps = [
  { label: 'Policy', fields: ['policy_id'] },
  { label: 'Claim Details', fields: ['service_date', 'admission_type', 'diagnosis_code', 'procedure_code', 'service_type', 'discharge_type'] },
  { label: 'Review & Submit', fields: [] },
];

export default function SubmitClaim() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [policyInput, setPolicyInput] = useState('');
  const [policyError, setPolicyError] = useState('');
  const [resolvedPatient, setResolvedPatient] = useState(null);
  const [error, setError] = useState('');

  // Editable lists
  const [admissionTypes, setAdmissionTypes] = useState(ADMISSION_TYPES);
  const [diagnoses, setDiagnoses] = useState(DIAGNOSES);
  const [procedures, setProcedures] = useState(PROCEDURES);
  const [services, setServices] = useState(SERVICES);
  const [dischargeTypes, setDischargeTypes] = useState(DISCHARGE_TYPES);

  // Generic add-new state
  const [addingField, setAddingField] = useState(null); // 'admission' | 'diagnosis' | 'procedure' | 'service' | 'discharge'
  const [newItemId, setNewItemId] = useState('');
  const [newItemLabel, setNewItemLabel] = useState('');
  const [newItemCost, setNewItemCost] = useState('');

  const resetAdding = () => { setAddingField(null); setNewItemId(''); setNewItemLabel(''); setNewItemCost(''); };

  const addNewItem = () => {
    const label = newItemLabel.trim();
    if (!label) return;
    switch (addingField) {
      case 'admission': {
        const id = admissionTypes.length + 1;
        setAdmissionTypes((prev) => [...prev, { id, label }]);
        setForm((f) => ({ ...f, admission_type: String(id) }));
        break;
      }
      case 'diagnosis': {
        const code = newItemId.trim();
        if (!code) return;
        setDiagnoses((prev) => [...prev, { code, label }]);
        setForm((f) => ({ ...f, diagnosis_code: code }));
        break;
      }
      case 'procedure': {
        const code = newItemId.trim();
        if (!code) return;
        setProcedures((prev) => [...prev, { code, label }]);
        setForm((f) => ({ ...f, procedure_code: code }));
        break;
      }
      case 'service': {
        const id = services.length + 1;
        const cost = Number(newItemCost) || 0;
        setServices((prev) => [...prev, { id, label, cost }]);
        setForm((f) => ({ ...f, service_type: String(id) }));
        break;
      }
      case 'discharge': {
        const id = dischargeTypes.length + 1;
        setDischargeTypes((prev) => [...prev, { id, label }]);
        setForm((f) => ({ ...f, discharge_type: String(id) }));
        break;
      }
    }
    resetAdding();
  };

  const today = new Date().toISOString().slice(0, 10);

  const lookupPolicy = () => {
    const trimmed = policyInput.trim();
    if (!trimmed) { setPolicyError('Enter a policy ID'); return; }
    const patient = MOCK_PATIENTS.find((p) => p.policy_id.toLowerCase() === trimmed.toLowerCase());
    if (!patient) { setPolicyError('Policy not found in insurance records'); setResolvedPatient(null); return; }
    if (patient.policy_end < today) { setPolicyError(`Policy expired on ${patient.policy_end}`); setResolvedPatient(null); return; }
    setPolicyError('');
    setResolvedPatient(patient);
    setForm((prev) => ({ ...prev, policy_id: patient.policy_id, patient_id: patient.patient_id, patient_name: patient.name }));
  };

  const clearPolicy = () => {
    setPolicyInput('');
    setPolicyError('');
    setResolvedPatient(null);
    setForm((prev) => ({ ...prev, policy_id: '', patient_id: '', patient_name: '' }));
  };

  const canAdvance = () => {
    if (step === 0) return !!form.policy_id && !!resolvedPatient;
    if (step === 1) return form.service_date && form.admission_type && form.diagnosis_code && form.procedure_code && form.service_type && form.discharge_type;
    return true;
  };

  const selectedService = services.find((s) => String(s.id) === String(form.service_type));

  const addBtn = (field) => (
    <button type="button" onClick={() => { resetAdding(); setAddingField(field); }} className="px-3 py-2 text-xs bg-surface border border-border rounded-md text-textSecondary hover:text-textPrimary whitespace-nowrap transition-colors">+ New</button>
  );

  const addForm = (field) => {
    if (addingField !== field) return null;
    const needsCode = field === 'diagnosis' || field === 'procedure';
    const needsCost = field === 'service';
    return (
      <div className="space-y-2 mt-2">
        {needsCode && <input type="text" value={newItemId} onChange={(e) => setNewItemId(e.target.value)} placeholder={field === 'diagnosis' ? 'Code (e.g. Z99.0)' : 'Code (e.g. 99999)'} className={selectClass} />}
        <input type="text" value={newItemLabel} onChange={(e) => setNewItemLabel(e.target.value)} placeholder="Description..." className={selectClass} />
        {needsCost && <input type="number" step="0.01" value={newItemCost} onChange={(e) => setNewItemCost(e.target.value)} placeholder="Cost (e.g. 500.00)" className={selectClass} />}
        <div className="flex gap-2">
          <button type="button" onClick={addNewItem} className="px-3 py-1.5 text-xs bg-primary/10 border border-primary/30 rounded-md text-primary hover:bg-primary/20 transition-colors">Add</button>
          <button type="button" onClick={resetAdding} className="px-3 py-1.5 text-xs bg-surface border border-border rounded-md text-textSecondary hover:text-textPrimary transition-colors">Cancel</button>
        </div>
      </div>
    );
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 1500));
    setSubmitting(false);
    setSubmitted(true);
  };

  const reset = () => {
    setForm(initialForm);
    setStep(0);
    setSubmitted(false);
    setPolicyInput('');
    setPolicyError('');
    setResolvedPatient(null);
    setError('');
  };


  if (submitted) {
    return (
      <div className="max-w-2xl">
        <div className="flex items-center gap-3 mb-4">
          <CheckCircle size={18} className="text-success" />
          <span className="text-sm text-textPrimary">Claim submitted successfully</span>
        </div>
        <p className="text-xs text-textSecondary mb-4">Your claim has been queued for processing.</p>
        <button onClick={reset} className="px-4 py-2 text-sm bg-surface border border-border rounded-md text-textPrimary hover:border-textSecondary transition-colors duration-150">
          Submit another claim
        </button>
      </div>
    );
  }

  const selectClass = "w-full px-3 py-2 bg-surface border border-border rounded-md text-sm text-textPrimary focus:outline-none focus:border-primary transition-colors duration-150";

  return (
    <div className="max-w-2xl">
      <div className="flex gap-4 mb-6">
        {steps.map((s, i) => (
          <button
            key={s.label}
            onClick={() => i < step && setStep(i)}
            className={`text-xs pb-1 border-b-2 transition-colors duration-150 ${
              i === step ? 'border-primary text-primary'
              : i < step ? 'border-transparent text-textSecondary hover:text-textPrimary cursor-pointer'
              : 'border-transparent text-textSecondary/50 cursor-default'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 px-3 py-2.5 mb-4 bg-danger/10 border border-danger/20 rounded-md text-danger text-sm">
          <AlertCircle size={14} className="shrink-0" />{error}
        </div>
      )}

      {/* Step 0: Policy Lookup */}
      {step === 0 && (
        <div className="space-y-4">
          <p className="text-xs text-textSecondary">Enter the patient's insurance policy ID to verify coverage before filing a claim.</p>
          {resolvedPatient ? (
            <div className="p-3 bg-surface border border-primary/30 rounded-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-primary font-medium">Policy verified</span>
                <button type="button" onClick={clearPolicy} className="text-xs text-textSecondary hover:text-danger transition-colors">Change</button>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm"><span className="text-textSecondary">Policy ID</span><span className="text-textPrimary font-mono">{resolvedPatient.policy_id}</span></div>
                <div className="flex justify-between text-sm"><span className="text-textSecondary">Patient</span><span className="text-textPrimary">{resolvedPatient.name} ({resolvedPatient.patient_id})</span></div>
                <div className="flex justify-between text-sm"><span className="text-textSecondary">Member ID</span><span className="text-textPrimary font-mono">{resolvedPatient.member_id}</span></div>
                <div className="flex justify-between text-sm"><span className="text-textSecondary">Age / Gender</span><span className="text-textPrimary">{resolvedPatient.age} / {resolvedPatient.gender}</span></div>
                <div className="flex justify-between text-sm"><span className="text-textSecondary">Location</span><span className="text-textPrimary">{resolvedPatient.city}, {resolvedPatient.state}</span></div>
                <div className="flex justify-between text-sm"><span className="text-textSecondary">Coverage</span><span className="text-textPrimary">{resolvedPatient.policy_start} to {resolvedPatient.policy_end}</span></div>
                <div className="flex justify-between text-sm"><span className="text-textSecondary">Deductible</span><span className="text-textPrimary">${resolvedPatient.annual_deductible.toLocaleString()}</span></div>
                <div className="flex justify-between text-sm"><span className="text-textSecondary">Copay</span><span className="text-textPrimary">${resolvedPatient.copay}</span></div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
                  <input
                    type="text"
                    value={policyInput}
                    onChange={(e) => { setPolicyInput(e.target.value); setPolicyError(''); }}
                    onKeyDown={(e) => e.key === 'Enter' && lookupPolicy()}
                    placeholder="Enter policy ID (e.g. XAI000137254)"
                    className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded-md text-sm text-textPrimary placeholder-textSecondary/50 focus:outline-none focus:border-primary transition-colors duration-150"
                  />
                </div>
                <button type="button" onClick={lookupPolicy} className="px-4 py-2 text-sm bg-primary/10 border border-primary/30 rounded-md text-primary hover:bg-primary/20 transition-colors duration-150">
                  Verify
                </button>
              </div>
              {policyError && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-danger/10 border border-danger/20 rounded-md text-danger text-sm">
                  <AlertCircle size={14} className="shrink-0" />{policyError}
                </div>
              )}
              <div className="text-xs text-textSecondary/60 mt-1">Only patients registered with the insurance company can have claims filed. The policy must be active.</div>
            </>
          )}
        </div>
      )}

      {/* Step 1: Claim Details */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-textSecondary mb-1.5">Service Date</label>
              <input type="date" value={form.service_date} onChange={(e) => setForm((f) => ({ ...f, service_date: e.target.value }))} className={selectClass} />
            </div>
            <div>
              <label className="block text-xs text-textSecondary mb-1.5">Claim Date</label>
              <input type="date" value={form.claim_date} onChange={(e) => setForm((f) => ({ ...f, claim_date: e.target.value }))} className={selectClass} />
            </div>
          </div>

          <div>
            <label className="block text-xs text-textSecondary mb-1.5">Admission Type</label>
            <div className="flex gap-2">
              <select value={form.admission_type} onChange={(e) => setForm((f) => ({ ...f, admission_type: e.target.value }))} className={`flex-1 ${selectClass}`}>
                <option value="">Select admission type...</option>
                {admissionTypes.map((a) => <option key={a.id} value={a.id}>{a.id} - {a.label}</option>)}
              </select>
              {addBtn('admission')}
            </div>
            {addForm('admission')}
          </div>

          <div>
            <label className="block text-xs text-textSecondary mb-1.5">Diagnosis</label>
            <div className="flex gap-2">
              <select value={form.diagnosis_code} onChange={(e) => setForm((f) => ({ ...f, diagnosis_code: e.target.value }))} className={`flex-1 ${selectClass}`}>
                <option value="">Select diagnosis...</option>
                {diagnoses.map((d) => <option key={d.code} value={d.code}>{d.code} - {d.label}</option>)}
              </select>
              {addBtn('diagnosis')}
            </div>
            {addForm('diagnosis')}
          </div>

          <div>
            <label className="block text-xs text-textSecondary mb-1.5">Procedure</label>
            <div className="flex gap-2">
              <select value={form.procedure_code} onChange={(e) => setForm((f) => ({ ...f, procedure_code: e.target.value }))} className={`flex-1 ${selectClass}`}>
                <option value="">Select procedure...</option>
                {procedures.map((p) => <option key={p.code} value={p.code}>{p.code} - {p.label}</option>)}
              </select>
              {addBtn('procedure')}
            </div>
            {addForm('procedure')}
          </div>

          <div>
            <label className="block text-xs text-textSecondary mb-1.5">Service Type</label>
            <div className="flex gap-2">
              <select value={form.service_type} onChange={(e) => setForm((f) => ({ ...f, service_type: e.target.value }))} className={`flex-1 ${selectClass}`}>
                <option value="">Select service...</option>
                {services.map((s) => <option key={s.id} value={s.id}>{s.id} - {s.label} (${s.cost.toFixed(2)})</option>)}
              </select>
              {addBtn('service')}
            </div>
            {addForm('service')}
          </div>

          <div>
            <label className="block text-xs text-textSecondary mb-1.5">Discharge Status</label>
            <div className="flex gap-2">
              <select value={form.discharge_type} onChange={(e) => setForm((f) => ({ ...f, discharge_type: e.target.value }))} className={`flex-1 ${selectClass}`}>
                <option value="">Select discharge status...</option>
                {dischargeTypes.map((d) => <option key={d.id} value={d.id}>{d.id} - {d.label}</option>)}
              </select>
              {addBtn('discharge')}
            </div>
            {addForm('discharge')}
          </div>

          <div>
            <label className="block text-xs text-textSecondary mb-1.5">Additional Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Optional notes..." className={`${selectClass} resize-none`} />
          </div>
        </div>
      )}

      {/* Step 2: Review */}
      {step === 2 && (
        <div className="space-y-3">
          {[
            ['Policy', form.policy_id],
            ['Patient', `${form.patient_name} (${form.patient_id})`],
            ['Service Date', form.service_date],
            ['Claim Date', form.claim_date],
            ['Admission', admissionTypes.find((a) => String(a.id) === String(form.admission_type))?.label || form.admission_type],
            ['Diagnosis', (() => { const d = diagnoses.find((x) => x.code === form.diagnosis_code); return d ? `${d.code} - ${d.label}` : form.diagnosis_code; })()],
            ['Procedure', (() => { const p = procedures.find((x) => x.code === form.procedure_code); return p ? `${p.code} - ${p.label}` : form.procedure_code; })()],
            ['Service', selectedService ? `${selectedService.label} ($${selectedService.cost.toFixed(2)})` : form.service_type],
            ['Discharge', dischargeTypes.find((d) => String(d.id) === String(form.discharge_type))?.label || form.discharge_type],
          ].filter(([, v]) => v).map(([label, value]) => (
            <div key={label} className="flex justify-between text-sm border-b border-border pb-2">
              <span className="text-textSecondary">{label}</span>
              <span className="text-textPrimary text-right max-w-[60%]">{value}</span>
            </div>
          ))}
          {form.notes && (
            <div className="text-sm border-b border-border pb-2">
              <span className="text-textSecondary">Notes: </span>
              <span className="text-textPrimary">{form.notes}</span>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3 mt-6">
        {step > 0 && (
          <button onClick={() => setStep(step - 1)} className="px-4 py-2 text-sm bg-surface border border-border rounded-md text-textSecondary hover:text-textPrimary transition-colors duration-150">Back</button>
        )}
        {step < 2 ? (
          <button onClick={() => canAdvance() && setStep(step + 1)} disabled={!canAdvance()} className="px-4 py-2 text-sm bg-primary/10 border border-primary/30 rounded-md text-primary hover:bg-primary/20 transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed">
            Continue
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={submitting} className="px-4 py-2 text-sm bg-primary/10 border border-primary/30 rounded-md text-primary hover:bg-primary/20 transition-colors duration-150 disabled:opacity-60 flex items-center gap-2">
            {submitting && <Loader size={14} className="animate-spin" />}
            {submitting ? 'Submitting...' : 'Submit Claim'}
          </button>
        )}
      </div>
    </div>
  );
}
