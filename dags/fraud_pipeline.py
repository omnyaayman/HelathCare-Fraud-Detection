from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime
from fraud_alert import detect_fraud
import pandas as pd


def load_data():
    print("Loading data...")

    data = pd.DataFrame({
        "amount": [100, 5000, 200, 7000],
        "is_fraud": [0, 1, 0, 1]
    })
    data.to_csv("/opt/airflow/dags/data.csv", index=False)


def preprocess_data():
    print("Preprocessing data...")
    df = pd.read_csv("/opt/airflow/dags/data.csv")
    df["amount_scaled"] = df["amount"] / df["amount"].max()
    df.to_csv("/opt/airflow/dags/processed.csv", index=False)


def predict():
    print("Running model...")
    df = pd.read_csv("/opt/airflow/dags/processed.csv")
    df["prediction"] = df["amount_scaled"].apply(lambda x: 1 if x > 0.5 else 0)
    df.to_csv("/opt/airflow/dags/predictions.csv", index=False)



def fraud_alert_task():

    print("Checking fraud alerts...")

    df = pd.read_csv("/opt/airflow/dags/predictions.csv")

    for index, row in df.iterrows():

        transaction_id = f"TXN_{index+1}"

        fraud_score = row["amount_scaled"]

        detect_fraud(transaction_id, fraud_score)


# 4️⃣ حفظ النتيجة
def save_results():
    print("Saving results...")
    df = pd.read_csv("/opt/airflow/dags/predictions.csv")
    print(df.head())

# DAG
with DAG(
    dag_id="fraud_pipeline",
    start_date=datetime(2024, 1, 1),
    schedule_interval="@daily",
    catchup=False
) as dag:

    t1 = PythonOperator(
        task_id="load_data",
        python_callable=load_data
    )

    t2 = PythonOperator(
        task_id="preprocess",
        python_callable=preprocess_data
    )

    t3 = PythonOperator(
        task_id="predict",
        python_callable=predict
    )

    t4 = PythonOperator(
        task_id="save_results",
        python_callable=save_results
    )

    t5 = PythonOperator(
    task_id="fraud_alerts",
    python_callable=fraud_alert_task
   )
    
 
t1 >> t2 >> t3 >> t4 >> t5 
    



