"""
DAG لإعادة تدريب نموذج XGBoost للكشف عن الاحتيال
- يعمل شهرياً
- يقرأ البيانات من Silver Layer
- يدرب نموذج جديد
- يقارن الأداء مع النموذج الحالي
- يرفع النموذج الجديد لو كان أفضل
"""
from airflow import DAG
from airflow.decorators import task
from airflow.operators.python import PythonOperator
from airflow.operators.bash import BashOperator
from datetime import datetime, timedelta
import subprocess
import os
import sys
import json
import logging

# إعداد التسجيل
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

default_args = {
    "owner": "mlops",
    "depends_on_past": False,
    "start_date": datetime(2026, 1, 1),
    "retries": 2,
    "retry_delay": timedelta(minutes=5),
    "execution_timeout": timedelta(minutes=30),
    "email_on_failure": True,
    "email_on_retry": False,
    "email": ["admin@fraud-detection.com"]
}

with DAG(
    "healthcare_model_retraining_pipeline",
    default_args=default_args,
    description="إعادة تدريب نموذج XGBoost للكشف عن الاحتيال",
    schedule="@monthly",  # كل شهر
    catchup=False,
    tags=["mlops", "xgboost", "retraining", "fraud-detection"],
    doc_md="""
    ### 🧠 Model Retraining Pipeline
    
    يقوم هذا الـ DAG بـ:
    1. التحقق من وجود بيانات Silver Layer
    2. تشغيل سكربت retrain_model.py
    3. تقييم النموذج الجديد
    4. ترقية النموذج لو كان أفضل
    5. تسجيل المقاييس في ملف JSON
    """
) as dag:

    # ============================================================
    # TASK 1: التحقق من وجود بيانات Silver Layer
    # ============================================================
    @task
    def check_silver_layer():
        """التحقق من وجود بيانات Silver Layer"""
        silver_path = "/opt/airflow/data/2_silver/master_claims_delta"
        
        logger.info(f"🔍 Checking Silver Layer at: {silver_path}")
        
        if not os.path.exists(silver_path):
            raise FileNotFoundError(f"❌ Silver Layer not found at: {silver_path}")
        
        # التحقق من وجود ملفات داخل المجلد
        files = os.listdir(silver_path)
        if not files:
            raise ValueError("❌ Silver Layer is empty!")
        
        logger.info(f"✅ Silver Layer found with {len(files)} files")
        
        # عرض حجم البيانات
        total_size = 0
        for file in files:
            file_path = os.path.join(silver_path, file)
            if os.path.isfile(file_path):
                total_size += os.path.getsize(file_path)
        
        logger.info(f"📊 Silver Layer size: {total_size / (1024*1024):.2f} MB")
        
        return {
            "status": "success",
            "path": silver_path,
            "files_count": len(files),
            "size_mb": round(total_size / (1024*1024), 2)
        }

    # ============================================================
    # TASK 2: تشغيل سكربت إعادة التدريب
    # ============================================================
    @task
    def run_retraining():
        """تشغيل سكربت retrain_model.py"""
        script_path = "/opt/airflow/ML/retrain_model.py"
        
        logger.info(f"🚀 Running retraining script: {script_path}")
        
        if not os.path.exists(script_path):
            raise FileNotFoundError(f"❌ Script not found: {script_path}")
        
        # تشغيل السكربت
        result = subprocess.run(
            [sys.executable, script_path],
            capture_output=True,
            text=True,
            timeout=600  # 10 دقائق
        )
        
        # تسجيل المخرجات
        logger.info(f"📤 STDOUT:\n{result.stdout}")
        
        if result.returncode != 0:
            logger.error(f"❌ STDERR:\n{result.stderr}")
            raise subprocess.CalledProcessError(result.returncode, script_path)
        
        # قراءة المقاييس من ملف JSON
        metrics_path = "/opt/airflow/ML/retraining_metrics_history.json"
        if os.path.exists(metrics_path):
            with open(metrics_path, 'r') as f:
                metrics = json.load(f)
                logger.info(f"📊 Training Metrics: {json.dumps(metrics[-1], indent=2)}")
                return {
                    "status": "success",
                    "metrics": metrics[-1] if metrics else {}
                }
        else:
            return {
                "status": "success",
                "metrics": {}
            }

    # ============================================================
    # TASK 3: التحقق من النموذج الجديد
    # ============================================================
    @task
    def validate_new_model():
        """التحقق من وجود النموذج الجديد وصحة الملفات"""
        model_path = "/opt/airflow/ML/xgb_fraud_model.pkl"
        encoders_path = "/opt/airflow/ML/label_encoders.pkl"
        
        logger.info(f"🔍 Validating new model at: {model_path}")
        
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"❌ Model file not found: {model_path}")
        
        if not os.path.exists(encoders_path):
            raise FileNotFoundError(f"❌ Encoders file not found: {encoders_path}")
        
        # التحقق من حجم الملف
        model_size = os.path.getsize(model_path)
        if model_size < 1000:  # أقل من 1KB
            raise ValueError(f"❌ Model file is too small: {model_size} bytes")
        
        logger.info(f"✅ Model validated: {model_size / (1024):.2f} KB")
        
        return {
            "status": "success",
            "model_path": model_path,
            "model_size_kb": round(model_size / 1024, 2)
        }

    # ============================================================
    # TASK 4: تسجيل التقرير النهائي
    # ============================================================
    @task
    def final_report(check_result: dict, train_result: dict, validate_result: dict):
        """تسجيل التقرير النهائي للتدريب"""
        report_path = "/opt/airflow/ML/training_report.txt"
        
        logger.info("📝 Generating final training report...")
        
        report = f"""
        ============================================================
        🧠 MODEL RETRAINING REPORT
        ============================================================
        Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
        
        📊 Data Check:
        - Path: {check_result.get('path', 'N/A')}
        - Files: {check_result.get('files_count', 0)}
        - Size: {check_result.get('size_mb', 0)} MB
        
        📈 Training Results:
        - Status: {train_result.get('status', 'Unknown')}
        - New AUC: {train_result.get('metrics', {}).get('new_auc', 'N/A')}
        - Old AUC: {train_result.get('metrics', {}).get('old_auc', 'N/A')}
        - Accuracy: {train_result.get('metrics', {}).get('acc', 'N/A')}
        - Status: {train_result.get('metrics', {}).get('status', 'N/A')}
        
        🔍 Model Validation:
        - Path: {validate_result.get('model_path', 'N/A')}
        - Size: {validate_result.get('model_size_kb', 0)} KB
        - Status: {validate_result.get('status', 'Unknown')}
        
        ============================================================
        ✅ Model retraining completed successfully!
        ============================================================
        """
        
        # حفظ التقرير
        with open(report_path, 'w') as f:
            f.write(report)
        
        logger.info(f"✅ Report saved to: {report_path}")
        logger.info(report)
        
        return {
            "status": "success",
            "report_path": report_path
        }

    # ============================================================
    # DEFINITION OF TASKS
    # ============================================================
    check_task = check_silver_layer()
    train_task = run_retraining()
    validate_task = validate_new_model()
    report_task = final_report(check_task, train_task, validate_task)

    # ============================================================
    # TASK DEPENDENCIES
    # ============================================================
    check_task >> train_task >> validate_task >> report_task