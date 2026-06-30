import os

# 1️⃣ مسارات الموديلات (ML Model Paths)
BASE_DIR = os.getcwd()
MODEL_PATH = os.path.join(BASE_DIR, "ML/xgb_fraud_model.pkl")
CLASSIFIER_PATH = os.path.join(BASE_DIR, "ML/classifier.pkl")
COMPLETE_SYSTEM_PATH = os.path.join(BASE_DIR, "ML/complete_fraud_system.joblib")
ENCODERS_PATH = os.path.join(BASE_DIR, "ML/label_encoders.pkl")

# 2️⃣ قائمة الـ Features لموديل XGBoost (24 عمود)
# دي الأعمدة اللي الموديل اتدرب عليها ومستنيها بالظبط
XGB_FEATURES = [
    'Claim_Amount', 'Deductible_Amount', 'CoPay_Amount', 'Patient_Age', 
    'Patient_Gender_encoded', 'Number_of_Previous_Claims_Patient', 
    'Provider_Type_encoded', 'Provider_Specialty_encoded', 
    'Number_of_Previous_Claims_Provider', 'Diagnosis_Code_encoded', 
    'Number_of_Procedures', 'Admission_Type_encoded', 'Discharge_Type_encoded', 
    'Length_of_Stay_Days', 'Service_Type_encoded', 'Provider_Patient_Distance_Miles', 
    'days_claim_to_service', 'days_to_policy_expiry', 'amount_per_procedure', 
    'claim_to_deductible_ratio', 'is_far_provider', 'high_claim_patient', 
    'high_claim_provider', 'Claim_Submitted_Late'
]

# 3️⃣ قائمة الـ Features للمصنف (Classifier - 28 عمود)
# دي بتشمل الـ Logic Features اللي بنحسبها برمجياً
CLF_FEATURES = [
    'Claim_Amount', 'Patient_Age', 'Provider_Type', 'Provider_Specialty', 
    'Number_of_Procedures', 'Admission_Type', 'Discharge_Type', 
    'Length_of_Stay_Days', 'Service_Type', 'Deductible_Amount', 'CoPay_Amount', 
    'Number_of_Previous_Claims_Patient', 'Number_of_Previous_Claims_Provider', 
    'Provider_Patient_Distance_Miles', 'Claim_Submitted_Late', 'Days_to_Claim', 
    'logic_time_travel', 'Days_to_Expiration', 'logic_expired_policy', 
    'logic_claims_per_year_age', 'logic_impossible_history', 
    'logic_financial_mismatch', 'Financial_Burden_Ratio', 'logic_proc_intensity', 
    'logic_pediatric_mismatch', 'logic_extreme_distance', 'logic_red_flag_score', 
    'anomaly_flag'
]

# 4️⃣ إعدادات قاعدة بيانات Azure SQL (مهمة جداً للـ Routes)
# استخدمنا الأسماء اللي اشتغلت في الاستعلامات الأخيرة (بدون Underscores)
DB_SCHEMA = "dbo"
TABLE_CLAIMS = "Claims"
TABLE_PATIENT = "Patient"
TABLE_POLICY = "Policy"
TABLE_PROVIDER = "Provider"

# أسماء الأعمدة الأساسية لتجنب الـ Typing Errors
COL_POLICY_ID = "PolicyID"
COL_PATIENT_ID = "PatientID"
COL_FRAUD_SCORE = "FraudScore"
COL_STATUS = "Status"

# 5️⃣ إعدادات الاحتيال (Fraud Logic)
FRAUD_THRESHOLD = 0.5  # أي Score أعلى من 0.5 يعتبر Flagged
HIGH_RISK_THRESHOLD = 0.85 # خطر جداً