import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import { 
  ADMISSION_TYPES, 
  DIAGNOSES, 
  PROCEDURES, 
  SERVICES, 
  DISCHARGE_TYPES 
} from '../../constants';
import { Loader, CheckCircle, AlertTriangle, Send } from 'lucide-react';

export default function SubmitClaim() {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  
  // الحالة الابتدائية للفورم (تتوافق مع أعمدة الداتا بيز في Azure)
  const [formData, setFormData] = useState({
    policy_number: '',
    claim_amount: '',
    admission_type: '1',
    diagnosis_code: 'I10',
    procedure_code: '99213',
    service_type: '3',
    discharge_type: '3'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);

    try {
      // إرسال البيانات للباك إند (FastAPI)
      const data = await api.submitClaim({
        ...formData,
        claim_amount: parseFloat(formData.claim_amount),
        hospital_id: user.id // اليوزر نيم اللي دخلنا بيه
      });

      setResult(data);
    } catch (error) {
      alert(error.message || "فشل في معالجة المطالبة");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6 text-textPrimary">Submit New Healthcare Claim</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Form Section */}
        <div className="md:col-span-2 bg-surface p-6 rounded-lg border border-border">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-textSecondary mb-1">Policy Number (from Azure DB)</label>
              <input
                type="text"
                required
                className="w-full p-2 bg-bg border border-border rounded text-textPrimary"
                placeholder="e.g. XAI215993963"
                value={formData.policy_number}
                onChange={(e) => setFormData({...formData, policy_number: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-textSecondary mb-1">Claim Amount ($)</label>
                <input
                  type="number"
                  required
                  className="w-full p-2 bg-bg border border-border rounded text-textPrimary"
                  value={formData.claim_amount}
                  onChange={(e) => setFormData({...formData, claim_amount: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-textSecondary mb-1">Service Type</label>
                <select 
                  className="w-full p-2 bg-bg border border-border rounded text-textPrimary"
                  value={formData.service_type}
                  onChange={(e) => setFormData({...formData, service_type: e.target.value})}
                >
                  {SERVICES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-textSecondary mb-1">Diagnosis</label>
                <select 
                  className="w-full p-2 bg-bg border border-border rounded text-textPrimary text-xs"
                  value={formData.diagnosis_code}
                  onChange={(e) => setFormData({...formData, diagnosis_code: e.target.value})}
                >
                  {DIAGNOSES.map(d => <option key={d.code} value={d.code}>{d.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-textSecondary mb-1">Procedure</label>
                <select 
                  className="w-full p-2 bg-bg border border-border rounded text-textPrimary text-xs"
                  value={formData.procedure_code}
                  onChange={(e) => setFormData({...formData, procedure_code: e.target.value})}
                >
                  {PROCEDURES.map(p => <option key={p.code} value={p.code}>{p.label}</option>)}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-primary text-white py-3 rounded-md font-bold flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? <Loader className="animate-spin" /> : <Send size={18} />}
              {submitting ? 'Analyzing Claim...' : 'Submit to AI Engine'}
            </button>
          </form>
        </div>

        {/* Result Section */}
        <div className="bg-surface p-6 rounded-lg border border-border flex flex-col items-center justify-center text-center">
          {!result && !submitting && (
            <div className="text-textSecondary italic">Results will appear here after AI analysis</div>
          )}
          
          {submitting && (
            <div className="space-y-4">
              <Loader size={48} className="animate-spin text-primary mx-auto" />
              <p className="text-sm text-textSecondary">Scanning claim history and patterns...</p>
            </div>
          )}

          {result && (
            <div className={`w-full p-4 rounded-lg ${result.prediction === 'Fraud' ? 'bg-danger/10 border-danger/20' : 'bg-success/10 border-success/20'} border`}>
              {result.prediction === 'Fraud' ? 
                <AlertTriangle size={48} className="text-danger mx-auto mb-2" /> : 
                <CheckCircle size={48} className="text-success mx-auto mb-2" />
              }
              <h3 className={`text-lg font-bold ${result.prediction === 'Fraud' ? 'text-danger' : 'text-success'}`}>
                {result.prediction === 'Fraud' ? 'Fraud Detected' : 'Claim Verified'}
              </h3>
              <div className="mt-4 space-y-2 text-sm text-textPrimary">
                <p><strong>Patient:</strong> {result.patient_name}</p>
                <p><strong>Status:</strong> {result.policy_status}</p>
                <p><strong>Score:</strong> {(result.fraud_score * 100).toFixed(1)}%</p>
              </div>
              <p className="mt-4 text-xs text-textSecondary italic">{result.message}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}