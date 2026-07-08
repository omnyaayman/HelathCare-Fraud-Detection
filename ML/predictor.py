import joblib
import pandas as pd
import os
import logging
from dotenv import load_dotenv

BASE_DIR_ENV = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(BASE_DIR_ENV, ".env"))

from app.core.constants import (
    MODEL_PATH,
    ENCODERS_PATH,
    XGB_FEATURES,
    FRAUD_THRESHOLD,
    HIGH_RISK_THRESHOLD
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


FIELD_MAP = {
    "claim_amount": "Claim_Amount",
    "deductible_amount": "Deductible_Amount",
    "copay_amount": "CoPay_Amount",
    "patient_age": "Patient_Age",
    "gender": "Patient_Gender",
    "provider_type": "Provider_Type",
    "provider_specialty": "Provider_Specialty",
    "diagnosis_code": "Diagnosis_Code",
    "number_of_procedures": "Number_of_Procedures",
    "admission_type": "Admission_Type",
    "discharge_type": "Discharge_Type",
    "service_type": "Service_Type",
    "distance_miles": "Provider_Patient_Distance_Miles",
    "claim_date": "Claim_Date",
    "service_date": "Service_Date",
    "policy_expiration_date": "Policy_Expiration_Date",
    "claim_submitted_late": "Claim_Submitted_Late",
}


class FraudPredictor:

    def __init__(self):
        self.model = None
        self.encoders = None
        self.features = XGB_FEATURES
        self.is_loaded = False
        self._load()

    def _load(self):
        if os.path.exists(MODEL_PATH):
            self.model = joblib.load(MODEL_PATH)

        if os.path.exists(ENCODERS_PATH):
            self.encoders = joblib.load(ENCODERS_PATH)

        self.is_loaded = self.model is not None

    def predict(self, claim_data: dict) -> dict:

        if not self.is_loaded:
            return {"fraud_score": 0, "is_fraud": False, "risk_level": "UNKNOWN"}

        mapped = {FIELD_MAP.get(k.lower(), k): v for k, v in claim_data.items()}
        df = pd.DataFrame([mapped])

        for col in self.features:
            if col not in df.columns:
                df[col] = 0

        X = df[self.features]

        prob = float(self.model.predict_proba(X)[0][1])

        if prob >= HIGH_RISK_THRESHOLD:
            risk = "CRITICAL"
        elif prob >= FRAUD_THRESHOLD:
            risk = "HIGH"
        else:
            risk = "LOW"

        return {
            "fraud_score": round(prob, 4),
            "is_fraud": prob >= FRAUD_THRESHOLD,
            "risk_level": risk
        }


predictor = FraudPredictor()