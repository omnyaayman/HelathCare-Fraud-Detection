import { useState } from 'react';
import {
  CheckCircle,
  AlertTriangle,
  Loader
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import { SERVICES } from '../../constants';

const initialForm = {
  policy_number: '',
  service_type: '',
  claim_amount: ''
};

export default function SubmitClaim() {
  const { user } = useAuth();

  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const inputClass =
    "w-full px-4 py-2.5 bg-bg border border-border rounded-lg text-sm text-textPrimary focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all";

  const handleChange = (field, value) => {
    setForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    setError('');

    if (!form.policy_number.trim()) {
      setError('Please enter a policy number.');
      return;
    }

    if (!form.service_type) {
      setError('Please select a service.');
      return;
    }

    if (
      !form.claim_amount ||
      Number(form.claim_amount) <= 0
    ) {
      setError('Claim amount must be greater than zero.');
      return;
    }

    setSubmitting(true);

    try {
      const selectedService = SERVICES.find(
        s => String(s.id) === String(form.service_type)
      );

      const payload = {
        policy_number: form.policy_number.trim(),
        claim_amount: Number(form.claim_amount),
        service_type:
          selectedService?.label || "General",
        provider_id: String(user?.id || "1")
      };

      console.log("Submitting Claim");
      console.log(payload);

      const response = await api.submitClaim(payload);

      setResult(response);

    } catch (err) {
      console.error(err);

      if (err.detail) {
        setError(
          JSON.stringify(err.detail, null, 2)
        );
      } else {
        setError(err.message || "Submission failed.");
      }

    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    const fraud =
      result.prediction === "Fraud";

    return (
      <div className="max-w-2xl mx-auto py-6">

        <div
          className={`p-10 rounded-2xl border-2 shadow-2xl text-center transition-all ${
            fraud
              ? "bg-danger/5 border-danger/30"
              : "bg-success/5 border-success/30"
          }`}
        >

          <div
            className={`w-24 h-24 rounded-full mx-auto mb-8 flex items-center justify-center ${
              fraud
                ? "bg-danger/10 text-danger"
                : "bg-success/10 text-success"
            }`}
          >
            {fraud ? (
              <AlertTriangle size={52} />
            ) : (
              <CheckCircle size={52} />
            )}
          </div>

          <h1
            className={`text-4xl font-black mb-3 ${
              fraud
                ? "text-danger"
                : "text-success"
            }`}
          >
            {fraud
              ? "Fraud Detected"
              : "Claim Accepted"}
          </h1>

          <p className="text-textSecondary mb-8">
            {result.message}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">

            <div className="bg-surface border border-border rounded-xl p-5">
              <p className="text-xs uppercase font-bold text-textSecondary mb-2">
                Prediction
              </p>

              <p className="text-lg font-bold">
                {result.prediction}
              </p>
            </div>

            <div className="bg-surface border border-border rounded-xl p-5">
              <p className="text-xs uppercase font-bold text-textSecondary mb-2">
                Risk Level
              </p>

              <p className="text-lg font-bold">
                {result.risk_level}
              </p>
            </div>

            <div className="bg-surface border border-border rounded-xl p-5">
              <p className="text-xs uppercase font-bold text-textSecondary mb-2">
                Fraud Score
              </p>

              <p
                className={`text-2xl font-black ${
                  result.fraud_score >= 0.7
                    ? "text-danger"
                    : "text-primary"
                }`}
              >
                {(result.fraud_score * 100).toFixed(1)}%
              </p>
            </div>

          </div>

          <button
            onClick={() => {
              setResult(null);
              setError('');
              setForm(initialForm);
            }}
            className="px-10 py-4 bg-textPrimary text-white rounded-full font-bold hover:scale-105 transition-all shadow-xl"
          >
            Submit Another Claim
          </button>

        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-6">

      <div className="bg-surface border border-border rounded-2xl p-8 shadow-sm">

        <h1 className="text-3xl font-black mb-2 text-textPrimary">
          Submit Insurance Claim
        </h1>

        <p className="text-textSecondary mb-8">
          Fill in the claim information below and submit it for AI fraud analysis.
        </p>

        {error && (
          <div className="mb-6 p-4 rounded-lg border border-danger/20 bg-danger/10 text-danger text-sm whitespace-pre-wrap">
            {error}
          </div>
        )}

        <div className="space-y-6">

          <div>
            <label className="block text-xs uppercase font-bold text-textSecondary mb-2">
              Policy Number
            </label>

            <input
              className={inputClass}
              value={form.policy_number}
              onChange={(e) =>
                handleChange(
                  "policy_number",
                  e.target.value
                )
              }
              placeholder="Enter Policy Number"
            />
          </div>
                    <div>
            <label className="block text-xs uppercase font-bold text-textSecondary mb-2">
              Service Type
            </label>

            <select
              className={inputClass}
              value={form.service_type}
              onChange={(e) =>
                handleChange(
                  "service_type",
                  e.target.value
                )
              }
            >
              <option value="">
                Select Service...
              </option>

              {SERVICES.map(service => (
                <option
                  key={service.id}
                  value={service.id}
                >
                  {service.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs uppercase font-bold text-textSecondary mb-2">
              Claim Amount ($)
            </label>

            <input
              type="number"
              min="0"
              step="0.01"
              className={inputClass}
              value={form.claim_amount}
              onChange={(e) =>
                handleChange(
                  "claim_amount",
                  e.target.value
                )
              }
              placeholder="Enter Claim Amount"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={
              submitting ||
              !form.policy_number ||
              !form.service_type ||
              !form.claim_amount
            }
            className="w-full py-4 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader
                  size={20}
                  className="animate-spin"
                />
                Processing Claim...
              </>
            ) : (
              "Analyze Risk & Submit Claim"
            )}
          </button>

        </div>

      </div>

      <div className="mt-8 bg-surface border border-border rounded-xl p-6">

        <h2 className="font-bold text-lg mb-3">
          What happens after submission?
        </h2>

        <div className="space-y-3 text-sm text-textSecondary">

          <div className="flex gap-3">
            <span className="font-bold text-primary">
              1.
            </span>

            <span>
              Your claim is sent securely to the fraud
              detection backend.
            </span>
          </div>

          <div className="flex gap-3">
            <span className="font-bold text-primary">
              2.
            </span>

            <span>
              The AI calculates a fraud probability
              score.
            </span>
          </div>

          <div className="flex gap-3">
            <span className="font-bold text-primary">
              3.
            </span>

            <span>
              The claim is queued and you'll receive
              the fraud prediction immediately.
            </span>
          </div>

        </div>

      </div>

    </div>
  );
}