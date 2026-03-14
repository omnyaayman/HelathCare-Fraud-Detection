import joblib
import pandas as pd
import numpy as np
import os
from core.constants import *

# --- [هنا العيب الأول] ---
# لازم الكلاس ده يكون موجود هنا عشان الـ joblib يعرف يفتح الموديل الجديد
class FraudInferenceSystem:
    def __init__(self):
        self.model = None

class FraudPredictor:
    def __init__(self):
        self.model_xgb = self._load(MODEL_PATH)
        self.model_clf = self._load(CLASSIFIER_PATH)
        self.model_complete = self._load(COMPLETE_SYSTEM_PATH) # الموديل اللي بعته
        self.encoders = self._load(ENCODERS_PATH)

    def _load(self, path):
        full_path = os.path.join(os.getcwd(), path)
        try:
            if not os.path.exists(full_path): return None
            obj = joblib.load(full_path)
            # استخراج الموديل لو كان جوه الكلاس الجديد
            if hasattr(obj, 'model'): return obj.model
            if isinstance(obj, dict):
                for k in ['model', 'ensemble_model', 'clf']:
                    if k in obj: return obj[k]
            return obj
        except Exception as e:
            print(f"❌ Error loading {path}: {e}")
            return None

    def _feature_engineering(self, raw_data):
        df = pd.DataFrame([raw_data])
        
        # --- [هنا العيب الثاني: ضبط الحساسية] ---
        # هنخلي المسافة "مشبوهة" لو زادت عن 100 ميل بدل 500
        df['is_far_provider'] = (df['Provider_Patient_Distance_Miles'] > 100).astype(int)
        
        # حساب باقي الـ 28 feature (المنطق)
        df['amount_per_procedure'] = df['Claim_Amount'] / (df['Number_of_Procedures'] + 1)
        df['claim_to_deductible_ratio'] = df['Claim_Amount'] / (df['Deductible_Amount'] + 1)
        df['logic_expired_policy'] = (df.get('Days_to_Expiration', 0) < 0).astype(int)
        df['logic_red_flag_score'] = df['is_far_provider'] + df['logic_expired_policy'] + df.get('Claim_Submitted_Late', 0)
        
        # Encoding
        for col in ['Gender', 'Provider_Type', 'Provider_Specialty', 'Diagnosis_Code', 'Admission_Type', 'Discharge_Type', 'Service_Type']:
            val = str(raw_data.get(col, ""))
            # بنعمل encode للاسم العادي والاسم بـ _encoded عشان نرضي الـ 3 موديلات
            try:
                le = self.encoders.get(f"Patient_{col}" if col=='Gender' else col)
                enc_val = int(le.transform([val])[0]) if val in le.classes_ else 0
                df[col] = enc_val
                df[f"{col}_encoded"] = enc_val
            except:
                df[col] = df[f"{col}_encoded"] = 0

        # تأمين وجود الـ 28 عمود
        all_cols = list(set(XGB_FEATURES + CLF_FEATURES))
        for c in all_cols:
            if c not in df.columns: df[c] = 0
            
        return df

    def predict(self, raw_data):
        try:
            full_df = self._feature_engineering(raw_data)
            res = {"status": "Success"}
            
            # توقعات الموديلات الثلاثة
            if self.model_xgb:
                res["xgb"] = round(float(self.model_xgb.predict_proba(full_df[XGB_FEATURES].astype(float))[0][1])*100, 2)
            if self.model_clf:
                res["clf"] = round(float(self.model_clf.predict_proba(full_df[CLF_FEATURES].astype(float))[0][1])*100, 2)
            if self.model_complete:
                res["complete"] = round(float(self.model_complete.predict_proba(full_df[CLF_FEATURES].astype(float))[0][1])*100, 2)
                
            return res
        except Exception as e:
            return {"status": "Error", "message": str(e)}

predictor = FraudPredictor()