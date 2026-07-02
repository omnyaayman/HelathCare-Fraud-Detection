import sys
import os
import subprocess
from airflow import DAG
from airflow.decorators import task
from datetime import datetime, timedelta

default_args = {
    "owner": "airflow",
    "depends_on_past": False,
    "start_date": datetime(2026, 1, 1),
    "retries": 2,
    "retry_delay": timedelta(seconds=30),
    "execution_timeout": timedelta(minutes=15),
}

with DAG(
    "healthcare_medallion_spark_pipeline",
    default_args=default_args,
    schedule="*/10 * * * *",
    catchup=False,
    tags=["spark", "delta", "fraud", "medallion"],
) as dag:

    def run_spark_script(script_name: str):
        path = f"/opt/airflow/scripts/{script_name}"
        
        if not os.path.exists(path):
            raise FileNotFoundError(f"Script not found: {path}")

        print(f"🚀 Running: {script_name}")
        
        result = subprocess.run(
            [
                "spark-submit",
                "--master", "spark://spark-master:7077",
                "--conf", "spark.sql.extensions=io.delta.sql.DeltaSparkSessionExtension",
                "--conf", "spark.sql.catalog.spark_catalog=org.apache.spark.sql.delta.catalog.DeltaCatalog",
                "--packages", "io.delta:delta-spark_2.12:3.0.0,org.apache.spark:spark-sql-kafka-0-10_2.12:3.5.0",
                path
            ],
            capture_output=True,
            text=True,
            timeout=600
        )
        
        print(f"📤 STDOUT:\n{result.stdout}")
        
        if result.returncode != 0:
            print(f"❌ STDERR:\n{result.stderr}")
            raise subprocess.CalledProcessError(result.returncode, path)
        
        return f"✅ {script_name} completed successfully"

    @task
    def bronze():
        return run_spark_script("bronze_layer.py")

    @task
    def silver():
        return run_spark_script("silver_layer.py")

    @task
    def gold():
        return run_spark_script("gold_layer.py")

    bronze_task = bronze()
    silver_task = silver()
    gold_task = gold()

    bronze_task >> silver_task >> gold_task