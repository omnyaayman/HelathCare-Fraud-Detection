"""
Fraud prediction pipeline.

This module reproduces, at inference time, EXACTLY the feature engineering
and encoding that happens in ML/fraud_fixed.ipynb (Step 5: Feature
Engineering) so that the live XGBoost model (ML/xgb_fraud_model.pkl) sees
the same 24 columns, in the same order, computed the same way, as it did
during training.

Where this file previously hardcoded ``score = 0.5`` and never touched the
model, it now:
  1. Normalizes whatever raw claim data it is given (the API route merges
     the submitted claim dict with a couple of DB-looked-up fields) into
     the canonical training column names.
  2. Recomputes the same engineered features the notebook computes
     (date deltas, ratios, boolean flags).
  3. Encodes categoricals with the *exact* fitted LabelEncoders that were
     saved during training (ML/label_encoders.pkl), falling back to the
     same "unseen category -> 0" rule the notebook itself uses in its own
     test cell (Step 12) when a category was never seen in training.
  4. Assembles the feature row in the exact column order recorded in
     ML/features_list.pkl (the ground-truth order XGBoost was fit on).
  5. Calls model.predict_proba and returns the real fraud probability.

Notes on the other artifacts in ML/:
  - ML/classifier.pkl and ML/complete_fraud_system.joblib are NOT produced
    by fraud_fixed.ipynb and reference features (e.g. 'logic_red_flag_score',
    'anomaly_flag', CLF_FEATURES in core/constants.py) that have no
    corresponding feature-engineering code anywhere in this repository.
    There is nothing to reverse-engineer them from, so this predictor does
    not depend on them. They are left on disk untouched in case a future
    training run documents how to reproduce them.
"""

import datetime
import logging
import os

import joblib
import pandas as pd

from core.constants import (
    MODEL_PATH,
    ENCODERS_PATH,
    FEATURES_LIST_PATH,
    FRAUD_THRESHOLD,
)

logger = logging.getLogger(__name__)

# Categorical columns the model was trained on, and the encoder key each
# one is stored under in label_encoders.pkl (same names, see notebook
# Step 5: categorical_columns list).
CATEGORICAL_COLUMNS = [
    "Patient_Gender",
    "Provider_Type",
    "Provider_Specialty",
    "Diagnosis_Code",
    "Admission_Type",
    "Discharge_Type",
    "Service_Type",
]

# Accepts multiple spellings/casings of each training column so this works
# whether it's fed notebook-style keys (Title_Case, matching the CSV the
# model was trained on) or the lower_snake_case keys the FastAPI route
# happens to send today. First alias found wins.
FIELD_ALIASES = {
    "Claim_Amount": ["Claim_Amount", "claim_amount"],
    "Deductible_Amount": ["Deductible_Amount", "deductible_amount", "annual_deductible"],
    "CoPay_Amount": ["CoPay_Amount", "copay_amount", "copay"],
    "Patient_Age": ["Patient_Age", "age", "patient_age"],
    "Patient_Gender": ["Patient_Gender", "gender", "patient_gender"],
    "Number_of_Previous_Claims_Patient": [
        "Number_of_Previous_Claims_Patient", "previous_claims_patient",
    ],
    "Provider_Type": ["Provider_Type", "provider_type"],
    "Provider_Specialty": ["Provider_Specialty", "provider_specialty", "specialty"],
    "Number_of_Previous_Claims_Provider": [
        "Number_of_Previous_Claims_Provider", "previous_claims_provider",
    ],
    "Diagnosis_Code": ["Diagnosis_Code", "diagnosis_code"],
    "Number_of_Procedures": ["Number_of_Procedures", "num_procedures", "procedures"],
    "Admission_Type": ["Admission_Type", "admission_type"],
    "Discharge_Type": ["Discharge_Type", "discharge_type"],
    "Length_of_Stay_Days": ["Length_of_Stay_Days", "length_of_stay_days", "length_of_stay"],
    "Service_Type": ["Service_Type", "service_type"],
    "Provider_Patient_Distance_Miles": [
        "Provider_Patient_Distance_Miles", "distance_miles", "distance",
    ],
    "Claim_Date": ["Claim_Date", "claim_date"],
    "Service_Date": ["Service_Date", "service_date"],
    "Policy_Expiration_Date": [
        "Policy_Expiration_Date", "policy_expiration_date", "policy_end", "policy_end_date",
    ],
    "Claim_Submitted_Late": ["Claim_Submitted_Late", "claim_submitted_late", "submitted_late"],
}

# Sensible defaults used only when a field genuinely wasn't supplied, so a
# partial claim payload (e.g. today's /process-claim route, which doesn't
# yet collect every training field) still produces a real prediction
# instead of throwing. These mirror "nothing unusual happened" so a missing
# field nudges the score toward neutral rather than toward fraud.
DEFAULTS = {
    "Deductible_Amount": 0.0,
    "CoPay_Amount": 0.0,
    "Patient_Age": 40,
    "Patient_Gender": "Unknown",
    "Number_of_Previous_Claims_Patient": 0,
    "Provider_Type": "Unknown",
    "Provider_Specialty": "Unknown",
    "Number_of_Previous_Claims_Provider": 0,
    "Diagnosis_Code": "Unknown",
    "Number_of_Procedures": 1,
    "Admission_Type": "Unknown",
    "Discharge_Type": "Unknown",
    "Length_of_Stay_Days": 0,
    "Service_Type": "Unknown",
    "Provider_Patient_Distance_Miles": 0.0,
    "Claim_Submitted_Late": 0,
}


def _first_present(raw_data, aliases):
    for key in aliases:
        if key in raw_data and raw_data[key] is not None:
            return raw_data[key]
    return None


def _normalize(raw_data):
    """Map whatever keys we were given onto the canonical training names,
    filling in defaults where a field is genuinely absent."""
    row = {}
    for canonical, aliases in FIELD_ALIASES.items():
        value = _first_present(raw_data, aliases)
        if value is None:
            value = DEFAULTS.get(canonical)
        row[canonical] = value
    return row


def _to_date(value, fallback):
    if value is None:
        return fallback
    try:
        return pd.to_datetime(value)
    except (ValueError, TypeError):
        return fallback


class FraudPredictor:
    def __init__(self):
        self.model = self._load(MODEL_PATH)
        self.encoders = self._load(ENCODERS_PATH)
        self.feature_order = self._load(FEATURES_LIST_PATH)

    def _load(self, path):
        full_path = os.path.join(os.getcwd(), path) if not os.path.isabs(path) else path
        if not os.path.exists(full_path):
            logger.warning("Model artifact not found at %s", full_path)
            return None
        try:
            return joblib.load(full_path)
        except Exception:
            logger.exception("Failed to load model artifact %s", path)
            return None

    def _build_feature_row(self, raw_data):
        row = _normalize(raw_data)

        # --- Date-derived features (notebook Step 5) ---
        today = pd.Timestamp(datetime.date.today())
        claim_date = _to_date(row.get("Claim_Date"), today)
        service_date = _to_date(row.get("Service_Date"), claim_date)
        policy_expiration = _to_date(row.get("Policy_Expiration_Date"), claim_date + pd.Timedelta(days=365))

        claim_amount = float(row["Claim_Amount"])
        deductible_amount = float(row["Deductible_Amount"])
        num_procedures = float(row["Number_of_Procedures"])
        distance_miles = float(row["Provider_Patient_Distance_Miles"])
        prev_claims_patient = float(row["Number_of_Previous_Claims_Patient"])
        prev_claims_provider = float(row["Number_of_Previous_Claims_Provider"])

        features = {
            "Claim_Amount": claim_amount,
            "Deductible_Amount": deductible_amount,
            "CoPay_Amount": float(row["CoPay_Amount"]),
            "Patient_Age": float(row["Patient_Age"]),
            "Number_of_Previous_Claims_Patient": prev_claims_patient,
            "Number_of_Previous_Claims_Provider": prev_claims_provider,
            "Number_of_Procedures": num_procedures,
            "Length_of_Stay_Days": float(row["Length_of_Stay_Days"]),
            "Provider_Patient_Distance_Miles": distance_miles,
            "days_claim_to_service": (claim_date - service_date).days,
            "days_to_policy_expiry": (policy_expiration - claim_date).days,
            "amount_per_procedure": claim_amount / (num_procedures + 1),
            "claim_to_deductible_ratio": claim_amount / (deductible_amount + 1),
            "is_far_provider": int(distance_miles > 500),
            "high_claim_patient": int(prev_claims_patient > 5),
            "high_claim_provider": int(prev_claims_provider > 20),
            "Claim_Submitted_Late": int(bool(row["Claim_Submitted_Late"])),
        }

        # --- Categorical encoding, using the exact fitted encoders ---
        for col in CATEGORICAL_COLUMNS:
            value = str(row[col])
            encoded = 0  # same "unseen category" fallback the notebook uses
            if self.encoders and col in self.encoders:
                le = self.encoders[col]
                if value in le.classes_:
                    encoded = int(le.transform([value])[0])
            features[f"{col}_encoded"] = encoded

        return features

    def predict(self, raw_data):
        if self.model is None:
            logger.error("Prediction requested but model is not loaded; returning neutral score")
            return {
                "fraud_score": 0.5,
                "prediction": "Normal",
                "error": "Model not loaded; falling back to neutral score.",
            }

        try:
            features = self._build_feature_row(raw_data)
            column_order = self.feature_order or list(features.keys())
            df = pd.DataFrame([features])[column_order]

            score = float(self.model.predict_proba(df)[0][1])

            return {
                "fraud_score": round(score, 4),
                "prediction": "Fraud" if score > FRAUD_THRESHOLD else "Normal",
            }
        except Exception as e:
            logger.exception("Fraud prediction failed; returning neutral fallback score")
            return {"error": str(e), "fraud_score": 0.5, "prediction": "Normal"}


predictor = FraudPredictor()
