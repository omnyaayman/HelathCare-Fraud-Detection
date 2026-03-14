# Model Paths
MODEL_PATH = "ML/xgb_fraud_model.pkl"
CLASSIFIER_PATH = "ML/classifier.pkl"
COMPLETE_SYSTEM_PATH = "ML/complete_fraud_system.joblib" # الموديل الجديد
ENCODERS_PATH = "ML/label_encoders.pkl"

# Features for XGBoost (24 features with _encoded suffix)
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

# Features for Classifier (28 features - some use raw names but need numeric values)
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

# 3. أسماء الجداول في قاعدة بيانات Azure (اختياري بس هينفعنا في الـ Query)
TABLE_CLAIMS = "Claims"
TABLE_PATIENT = "Patient"
TABLE_PROVIDER = "Provider"

# 4. اسم العمود المستهدف
TARGET_COLUMN = "Is_Fraudulent"