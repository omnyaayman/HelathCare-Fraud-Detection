import joblib
import pandas as pd
import os
import sys
from core.constants import *

# 1. لازم الكلاس ده يكون موجود هنا بالظبط عشان joblib يعرف يقرأ الملف
class FraudInferenceSystem:
    def __init__(self):
        self.model = None

# خدعة برمجية لإقناع joblib إن الكلاس موجود في الموديول الرئيسي
import __main__
__main__.FraudInferenceSystem = FraudInferenceSystem

class FraudPredictor:
    def __init__(self):
        # تحميل الموديلات مع معالجة الأخطاء
        self.model_xgb = self._load(MODEL_PATH)
        self.model_clf = self._load(CLASSIFIER_PATH)
        # تحميل النظام الكامل
        self.model_complete = self._load(COMPLETE_SYSTEM_PATH)
        self.encoders = self._load(ENCODERS_PATH)

    def _load(self, path):
        full_path = os.path.join(os.getcwd(), path)
        if not os.path.exists(full_path):
            print(f"⚠️ Warning: File not found at {full_path}")
            return None
        try:
            # تحميل الموديل
            return joblib.load(full_path)
        except Exception as e:
            print(f"❌ Error loading {path}: {e}")
            return None

    def predict(self, raw_data):
        # لو الموديل الكبير (Complete System) متحملش، هنستخدم الـ XGBoost كبديل
        try:
            # هنا كود الـ Feature Engineering اللي كتبناه قبل كدا
            # ...
            score = 0.5 # قيمة افتراضية
            if self.model_xgb:
                # افتراض أننا جهزنا الـ DataFrame بـ 28 عمود
                # score = self.model_xgb.predict_proba(df)[0][1]
                pass
                
            return {
                "fraud_score": round(float(score), 4),
                "prediction": "Fraud" if score > 0.5 else "Normal"
            }
        except Exception as e:
            return {"error": str(e), "fraud_score": 0.5, "prediction": "Normal"}

predictor = FraudPredictor()