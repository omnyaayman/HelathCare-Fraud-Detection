import os
from core.config import settings

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

MODEL_PATH = os.path.join(BASE_DIR, "ML", "xgb_fraud_model.pkl")
CLASSIFIER_PATH = os.path.join(BASE_DIR, "ML", "classifier.pkl")
COMPLETE_SYSTEM_PATH = os.path.join(BASE_DIR, "ML", "complete_fraud_system.joblib")
ENCODERS_PATH = os.path.join(BASE_DIR, "ML", "label_encoders.pkl")

XGB_FEATURES = [ ... ]  # نفس القائمة

CLF_FEATURES = [ ... ]  # نفس القائمة

DB_SCHEMA = settings.DB_SCHEMA

TABLE_CLAIMS = settings.TABLE_CLAIMS
TABLE_PATIENT = settings.TABLE_PATIENT
TABLE_POLICY = settings.TABLE_POLICY
TABLE_PROVIDER = settings.TABLE_PROVIDER

COL_CLAIM_ID = "claim_id"
COL_POLICY_NUMBER = "policy_number"
COL_PATIENT_ID = "Patient_ID"
COL_PROVIDER_ID = "Provider_ID"
COL_FRAUD_SCORE = "fraud_score"
COL_IS_FRAUD = "is_fraud"
COL_RISK_LEVEL = "risk_level"

FRAUD_THRESHOLD = 0.5
HIGH_RISK_THRESHOLD = 0.85