#!/usr/bin/env python3
"""
إعادة تدريب نموذج XGBoost للكشف عن الاحتيال
- يقرأ البيانات من Silver Layer (Delta Lake)
- يدرب نموذج جديد
- يقارن الأداء مع النموذج الحالي
- يرفع النموذج الجديد لو كان أفضل
"""
import os
import sys
import json
import joblib
import pandas as pd
import numpy as np
from datetime import datetime
from xgboost import XGBClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import (
    roc_auc_score, 
    accuracy_score, 
    classification_report,
    confusion_matrix,
    precision_score,
    recall_score,
    f1_score
)
import logging

# إعداد التسجيل
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# ============================================================
# PATHS
# ============================================================
SILVER_PATH = "/opt/airflow/data/2_silver/master_claims_delta"
MODEL_DIR = "/opt/airflow/ML"
MODEL_PATH = os.path.join(MODEL_DIR, "xgb_fraud_model.pkl")
ENCODERS_PATH = os.path.join(MODEL_DIR, "label_encoders.pkl")
FEATURES_PATH = os.path.join(MODEL_DIR, "features_list.pkl")
METRICS_PATH = os.path.join(MODEL_DIR, "retraining_metrics_history.json")

# ============================================================
# FEATURES (ثابتة)
# ============================================================
XGB_FEATURES = [
    'Claim_Amount', 'Deductible_Amount', 'CoPay_Amount', 'Patient_Age',
    'Patient_Gender_encoded', 'Number_of_Previous_Claims_Patient',
    'Provider_Type_encoded', 'Provider_Specialty_encoded',
    'Number_of_Previous_Claims_Provider', 'Diagnosis_Code_encoded',
    'Number_of_Procedures', 'Admission_Type_encoded', 'Discharge_Type_encoded',
    'Length_of_Stay_Days', 'Service_Type_encoded',
    'Provider_Patient_Distance_Miles',
    'days_claim_to_service', 'days_to_policy_expiry',
    'amount_per_procedure', 'claim_to_deductible_ratio',
    'is_far_provider', 'high_claim_patient', 'high_claim_provider',
    'Claim_Submitted_Late'
]

# ============================================================
# CLASS
# ============================================================
class ModelRetrainer:
    """فئة لإعادة تدريب النموذج"""
    
    def __init__(self):
        self.model = None
        self.encoders = None
        self.features = XGB_FEATURES
        self.metrics_history = []
        
    def load_data(self) -> pd.DataFrame:
        """تحميل البيانات من Silver Layer"""
        logger.info(f"📖 Loading data from: {SILVER_PATH}")
        
        if not os.path.exists(SILVER_PATH):
            raise FileNotFoundError(f"❌ Silver Layer not found: {SILVER_PATH}")
        
        try:
            # قراءة بيانات Delta Lake
            df = pd.read_parquet(SILVER_PATH)
            logger.info(f"✅ Loaded {len(df)} rows with {len(df.columns)} columns")
            
            # عرض عينة من البيانات
            logger.info(f"📊 Sample data:\n{df.head(2).to_string()}")
            
            # إحصائيات البيانات
            logger.info(f"📊 Data stats:")
            logger.info(f"  - Null values: {df.isnull().sum().sum()}")
            logger.info(f"  - Fraud cases: {df['is_fraud'].sum()}")
            logger.info(f"  - Fraud rate: {df['is_fraud'].mean() * 100:.2f}%")
            
            return df
            
        except Exception as e:
            logger.error(f"❌ Error loading data: {e}")
            raise
    
    def preprocess_data(self, df: pd.DataFrame) -> tuple:
        """تجهيز البيانات للتدريب"""
        logger.info("🔄 Preprocessing data...")
        
        # 1. التأكد من وجود العمود المستهدف
        if "is_fraud" not in df.columns:
            raise KeyError("❌ 'is_fraud' column not found!")
        
        # 2. استخراج الـ target
        y = df["is_fraud"].astype(int)
        logger.info(f"🎯 Target distribution: {y.value_counts().to_dict()}")
        
        # 3. إزالة الأعمدة غير المطلوبة
        drop_cols = [
            "is_fraud", "claim_id", "patient_id", "provider_id", 
            "policy_id", "claim_date", "service_date", "ingested_at",
            "claim_year", "claim_month", "claim_day_of_week", "is_weekend",
            "claim_category", "high_claim_flag", "fraud_risk_score",
            "amount_scaled", "fraud_flag", "risk_category"
        ]
        
        # إزالة الأعمدة الموجودة فقط
        existing_cols = [col for col in drop_cols if col in df.columns]
        X_raw = df.drop(columns=existing_cols, errors="ignore")
        
        logger.info(f"📋 Features after dropping: {len(X_raw.columns)} columns")
        
        # 4. معالجة القيم الناقصة
        for col in X_raw.columns:
            if X_raw[col].dtype == 'object':
                X_raw[col] = X_raw[col].fillna('UNKNOWN')
            else:
                X_raw[col] = X_raw[col].fillna(0)
        
        # 5. تحويل الأعمدة النصية (One-Hot Encoding)
        categorical_cols = X_raw.select_dtypes(include=['object']).columns
        if len(categorical_cols) > 0:
            logger.info(f"🔤 Encoding categorical columns: {list(categorical_cols)}")
            X = pd.get_dummies(X_raw, columns=categorical_cols, drop_first=True)
        else:
            X = X_raw
        
        # 6. التأكد من أن كل الأعمدة رقمية
        X = X.astype(float)
        
        logger.info(f"✅ Preprocessed: {len(X)} rows, {len(X.columns)} features")
        
        return X, y
    
    def train_model(self, X: pd.DataFrame, y: pd.Series) -> dict:
        """تدريب نموذج XGBoost"""
        logger.info("🧠 Training XGBoost model...")
        
        # تقسيم البيانات
        X_train, X_test, y_train, y_test = train_test_split(
            X, y,
            test_size=0.2,
            random_state=42,
            stratify=y
        )
        
        logger.info(f"📊 Train size: {len(X_train)}, Test size: {len(X_test)}")
        
        # إنشاء النموذج
        model = XGBClassifier(
            n_estimators=200,
            max_depth=8,
            learning_rate=0.1,
            subsample=0.8,
            colsample_bytree=0.8,
            eval_metric="logloss",
            random_state=42,
            n_jobs=-1,
            use_label_encoder=False
        )
        
        # تدريب النموذج
        model.fit(
            X_train, y_train,
            eval_set=[(X_test, y_test)],
            verbose=False
        )
        
        self.model = model
        
        # تقييم النموذج
        preds = model.predict(X_test)
        preds_proba = model.predict_proba(X_test)[:, 1]
        
        metrics = {
            "auc": roc_auc_score(y_test, preds_proba),
            "accuracy": accuracy_score(y_test, preds),
            "precision": precision_score(y_test, preds),
            "recall": recall_score(y_test, preds),
            "f1": f1_score(y_test, preds),
            "confusion_matrix": confusion_matrix(y_test, preds).tolist()
        }
        
        logger.info(f"📊 Training Metrics: {json.dumps(metrics, indent=2)}")
        logger.info(f"\n{classification_report(y_test, preds)}")
        
        return metrics
    
    def compare_with_old_model(self, new_metrics: dict, X_test: pd.DataFrame, y_test: pd.Series) -> str:
        """مقارنة النموذج الجديد مع القديم"""
        logger.info("🔍 Comparing with old model...")
        
        if not os.path.exists(MODEL_PATH):
            logger.info("ℹ️ No old model found. Promoting new model.")
            return "PROMOTED"
        
        try:
            old_model = joblib.load(MODEL_PATH)
            old_metrics = {
                "auc": roc_auc_score(y_test, old_model.predict_proba(X_test)[:, 1]),
                "accuracy": accuracy_score(y_test, old_model.predict(X_test))
            }
            
            logger.info(f"📊 Old Model: AUC={old_metrics['auc']:.4f}, Acc={old_metrics['accuracy']:.4f}")
            logger.info(f"📊 New Model: AUC={new_metrics['auc']:.4f}, Acc={new_metrics['accuracy']:.4f}")
            
            # القرار: الترقية لو النموذج الجديد أفضل
            improvement = new_metrics['auc'] - old_metrics['auc']
            logger.info(f"📈 Improvement: {improvement:.4f}")
            
            if improvement > 0.005:  # تحسن 0.5%
                logger.info("✅ New model is better. Promoting...")
                return "PROMOTED"
            else:
                logger.info("⏸️ New model is not significantly better. Keeping old model.")
                return "REJECTED"
                
        except Exception as e:
            logger.error(f"❌ Error comparing models: {e}")
            return "PROMOTED"  # لو حصل خطأ، نرفع النموذج الجديد
    
    def save_model(self, X: pd.DataFrame, metrics: dict, status: str):
        """حفظ النموذج والمقاييس"""
        logger.info("💾 Saving model and artifacts...")
        
        os.makedirs(MODEL_DIR, exist_ok=True)
        
        # 1. حفظ النموذج
        if status == "PROMOTED":
            joblib.dump(self.model, MODEL_PATH)
            logger.info(f"✅ Model saved to: {MODEL_PATH}")
            
            # حفظ الميزات
            joblib.dump(list(X.columns), FEATURES_PATH)
            logger.info(f"✅ Features saved to: {FEATURES_PATH}")
        
        # 2. حفظ المقاييس
        log = {
            "timestamp": datetime.now().isoformat(),
            "rows": len(X),
            "features": len(X.columns),
            "new_auc": float(metrics["auc"]),
            "new_acc": float(metrics["accuracy"]),
            "new_precision": float(metrics["precision"]),
            "new_recall": float(metrics["recall"]),
            "new_f1": float(metrics["f1"]),
            "status": status,
            "model_saved": status == "PROMOTED"
        }
        
        # تحميل التاريخ السابق
        history = []
        if os.path.exists(METRICS_PATH):
            try:
                with open(METRICS_PATH, 'r') as f:
                    history = json.load(f)
            except:
                history = []
        
        history.append(log)
        
        with open(METRICS_PATH, 'w') as f:
            json.dump(history, f, indent=2)
        
        logger.info(f"✅ Metrics saved to: {METRICS_PATH}")
        logger.info(f"📊 {json.dumps(log, indent=2)}")
    
    def run(self):
        """تشغيل عملية إعادة التدريب"""
        logger.info("=" * 70)
        logger.info("🚀 STARTING MODEL RETRAINING")
        logger.info("=" * 70)
        
        try:
            # 1. تحميل البيانات
            df = self.load_data()
            
            # 2. تجهيز البيانات
            X, y = self.preprocess_data(df)
            
            # 3. تدريب النموذج
            metrics = self.train_model(X, y)
            
            # 4. مقارنة مع النموذج القديم
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42, stratify=y
            )
            status = self.compare_with_old_model(metrics, X_test, y_test)
            
            # 5. حفظ النموذج
            self.save_model(X, metrics, status)
            
            logger.info("=" * 70)
            logger.info(f"✅ RETRAINING COMPLETED - Status: {status}")
            logger.info("=" * 70)
            
            return {
                "status": status,
                "metrics": metrics,
                "model_saved": status == "PROMOTED"
            }
            
        except Exception as e:
            logger.error(f"❌ Retraining failed: {e}")
            raise

# ============================================================
# MAIN
# ============================================================
def start_retraining():
    """الدالة الرئيسية"""
    retrainer = ModelRetrainer()
    return retrainer.run()

if __name__ == "__main__":
    result = start_retraining()
    sys.exit(0 if result["status"] == "PROMOTED" else 1)