from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.operators.dummy import DummyOperator
from datetime import datetime, timedelta
import pandas as pd
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "healthcare_fraud.db")

default_args = {
    "owner": "fraud_team",
    "depends_on_past": False,
    "email_on_failure": True,
    "email_on_retry": False,
    "retries": 2,
    "retry_delay": timedelta(minutes=5),
}

def bronze_layer():
    """Extract raw claims from SQLite (bronze ingestion)"""
    conn = sqlite3.connect(DB_PATH)
    df = pd.read_sql_query("SELECT * FROM Claims LIMIT 1000", conn)
    conn.close()
    os.makedirs("/tmp/fraud_pipeline", exist_ok=True)
    df.to_parquet("/tmp/fraud_pipeline/bronze_claims.parquet")
    print(f"Bronze layer: ingested {len(df)} raw claims")

def silver_layer():
    """Clean and validate data (silver transformation)"""
    df = pd.read_parquet("/tmp/fraud_pipeline/bronze_claims.parquet")
    df = df.dropna(subset=["Claim_Amount", "Fraud_Score"])
    df["Claim_Date"] = pd.to_datetime(df["Claim_Date"], errors="coerce")
    df = df[(df["Claim_Amount"] > 0) & (df["Fraud_Score"] >= 0) & (df["Fraud_Score"] <= 1)]
    df.to_parquet("/tmp/fraud_pipeline/silver_claims.parquet")
    print(f"Silver layer: cleaned to {len(df)} valid records")

def gold_layer():
    """Aggregate and compute business metrics (gold analytics)"""
    df = pd.read_parquet("/tmp/fraud_pipeline/silver_claims.parquet")
    metrics = {
        "total_claims": len(df),
        "fraud_claims": int(df["Is_Fraudulent"].sum()),
        "avg_claim_amount": float(df["Claim_Amount"].mean()),
        "avg_fraud_score": float(df["Fraud_Score"].mean()),
    }
    pd.DataFrame([metrics]).to_parquet("/tmp/fraud_pipeline/gold_metrics.parquet")
    print(f"Gold layer: {metrics}")

def data_validation():
    """Validate data quality before training"""
    df = pd.read_parquet("/tmp/fraud_pipeline/silver_claims.parquet")
    assert len(df) > 0, "No data to validate"
    assert df["Claim_Amount"].min() > 0, "Negative claim amounts found"
    print(f"Data validation passed: {len(df)} records OK")

def data_cleaning():
    """Remove outliers and standardize formats"""
    df = pd.read_parquet("/tmp/fraud_pipeline/silver_claims.parquet")
    q99 = df["Claim_Amount"].quantile(0.99)
    df = df[df["Claim_Amount"] <= q99]
    df.to_parquet("/tmp/fraud_pipeline/clean_claims.parquet")
    print(f"Data cleaning: removed outliers, {len(df)} remaining")

def feature_engineering():
    """Create model features from clean data"""
    df = pd.read_parquet("/tmp/fraud_pipeline/clean_claims.parquet")
    df["amount_per_procedure"] = df["Claim_Amount"] / (df["Number_of_Procedures"] + 1)
    df["claim_to_deductible_ratio"] = df["Claim_Amount"] / (df["Deductible_Amount"] + 1)
    df["is_far_provider"] = (df["Provider_Patient_Distance_Miles"] > 300).astype(int)
    df.to_parquet("/tmp/fraud_pipeline/features.parquet")
    print(f"Feature engineering: {len(df.columns)} features created")

def model_training():
    """Train XGBoost model on engineered features"""
    from xgboost import XGBClassifier
    df = pd.read_parquet("/tmp/fraud_pipeline/features.parquet")
    feature_cols = ["Claim_Amount", "Number_of_Procedures", "amount_per_procedure",
                    "claim_to_deductible_ratio", "is_far_provider",
                    "Length_of_Stay_Days", "Provider_Patient_Distance_Miles"]
    df = df.dropna(subset=feature_cols + ["Is_Fraudulent"])
    X = df[feature_cols]
    y = df["Is_Fraudulent"]
    model = XGBClassifier(n_estimators=50, max_depth=3, random_state=42)
    model.fit(X, y)
    import joblib
    os.makedirs("/tmp/fraud_pipeline/model", exist_ok=True)
    joblib.dump(model, "/tmp/fraud_pipeline/model/xgb_model.pkl")
    joblib.dump(feature_cols, "/tmp/fraud_pipeline/model/feature_cols.pkl")
    accuracy = float((model.predict(X) == y).mean())
    print(f"Model trained: accuracy={accuracy:.4f} on {len(X)} samples")

def model_evaluation():
    """Evaluate trained model and log metrics"""
    import joblib
    from sklearn.metrics import precision_score, recall_score, f1_score, roc_auc_score
    from xgboost import XGBClassifier
    df = pd.read_parquet("/tmp/fraud_pipeline/features.parquet")
    model = joblib.load("/tmp/fraud_pipeline/model/xgb_model.pkl")
    feature_cols = joblib.load("/tmp/fraud_pipeline/model/feature_cols.pkl")
    df = df.dropna(subset=feature_cols + ["Is_Fraudulent"])
    X = df[feature_cols]
    y = df["Is_Fraudulent"]
    preds = model.predict(X)
    probs = model.predict_proba(X)[:, 1]
    metrics = {
        "accuracy": float((preds == y).mean()),
        "precision": float(precision_score(y, preds, zero_division=0)),
        "recall": float(recall_score(y, preds, zero_division=0)),
        "f1_score": float(f1_score(y, preds, zero_division=0)),
        "roc_auc": float(roc_auc_score(y, probs) if len(set(y)) > 1 else 0.5)
    }
    pd.DataFrame([metrics]).to_parquet("/tmp/fraud_pipeline/eval_metrics.parquet")
    print(f"Model evaluation: {metrics}")

def prediction_pipeline():
    """Run predictions on all claims and update database"""
    import joblib
    conn = sqlite3.connect(DB_PATH)
    df = pd.read_sql_query("SELECT * FROM Claims", conn)
    model = joblib.load("/tmp/fraud_pipeline/model/xgb_model.pkl")
    feature_cols = joblib.load("/tmp/fraud_pipeline/model/feature_cols.pkl")
    if len(df) > 0:
        df["amount_per_procedure"] = df["Claim_Amount"] / (df["Number_of_Procedures"] + 1)
        df["claim_to_deductible_ratio"] = df["Claim_Amount"] / (df["Deductible_Amount"] + 1)
        df["is_far_provider"] = (df["Provider_Patient_Distance_Miles"] > 300).astype(int)
        X = df[feature_cols].fillna(0)
        scores = model.predict_proba(X)[:, 1]
        cursor = conn.cursor()
        for i, row in df.iterrows():
            cursor.execute("UPDATE Claims SET Fraud_Score = ? WHERE Claim_ID = ?",
                          (float(scores[i]), int(row["Claim_ID"])))
        conn.commit()
    conn.close()
    print(f"Predictions updated for {len(df)} claims")

def report_generation():
    """Generate summary report"""
    conn = sqlite3.connect(DB_PATH)
    total = pd.read_sql_query("SELECT COUNT(*) as c FROM Claims", conn).iloc[0]["c"]
    fraud = pd.read_sql_query("SELECT COUNT(*) as c FROM Claims WHERE Is_Fraudulent=1", conn).iloc[0]["c"]
    conn.close()
    report = {"total_claims": int(total), "fraud_claims": int(fraud), "generated_at": datetime.now().isoformat()}
    pd.DataFrame([report]).to_parquet("/tmp/fraud_pipeline/report.parquet")
    print(f"Report generated: {report}")

def notification_trigger():
    """Create notification if pipeline completed"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""INSERT INTO Notifications (title, message, type, created_at)
        VALUES (?, ?, ?, ?)""",
        ("Airflow Pipeline Complete", "Daily fraud pipeline ran successfully. Model updated.", "success",
         datetime.now().isoformat()))
    conn.commit()
    conn.close()
    print("Pipeline completion notification created")

with DAG(
    dag_id="fraud_pipeline",
    default_args=default_args,
    start_date=datetime(2024, 1, 1),
    schedule_interval="@daily",
    catchup=False,
    description="Enterprise fraud detection ETL + ML pipeline (Bronze/Silver/Gold)",
    tags=["fraud", "ml", "etl"],
) as dag:

    start = DummyOperator(task_id="start")

    bronze = PythonOperator(task_id="bronze_layer", python_callable=bronze_layer)
    silver = PythonOperator(task_id="silver_layer", python_callable=silver_layer)
    gold = PythonOperator(task_id="gold_layer", python_callable=gold_layer)

    validate = PythonOperator(task_id="data_validation", python_callable=data_validation)
    clean = PythonOperator(task_id="data_cleaning", python_callable=data_cleaning)
    features = PythonOperator(task_id="feature_engineering", python_callable=feature_engineering)

    train = PythonOperator(task_id="model_training", python_callable=model_training)
    evaluate = PythonOperator(task_id="model_evaluation", python_callable=model_evaluation)

    predict = PythonOperator(task_id="prediction_pipeline", python_callable=prediction_pipeline)
    report = PythonOperator(task_id="report_generation", python_callable=report_generation)
    notify = PythonOperator(task_id="notification_trigger", python_callable=notification_trigger)

    end = DummyOperator(task_id="end")

    start >> bronze >> silver >> gold >> validate >> clean >> features >> train >> evaluate >> predict >> report >> notify >> end
