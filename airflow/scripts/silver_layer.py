#!/usr/bin/env python3
import os
import sys
from pyspark.sql import SparkSession
from pyspark.sql.functions import (
    col, when, lit, round, current_date, 
    month, year, dayofweek, to_date, 
    coalesce, datediff, regexp_replace,
    trim, upper, lower, date_format
)
from delta import configure_spark_with_delta_pip

DATA_BASE_DIR = "/opt/airflow/data"
os.environ['PYSPARK_PYTHON'] = sys.executable
os.environ['PYSPARK_DRIVER_PYTHON'] = sys.executable

def run_silver():
    print("="*60)
    print("🔄 SILVER LAYER - Cleaning, Enriching & Feature Engineering")
    print("="*60)

    spark = configure_spark_with_delta_pip(
        SparkSession.builder
        .appName("SilverLayer")
        .master("spark://spark-master:7077")
        .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension")
        .config("spark.sql.catalog.spark_catalog", "org.apache.spark.sql.delta.catalog.DeltaCatalog")
        .getOrCreate()
    )

    BRONZE_DIR = f"{DATA_BASE_DIR}/1_bronze"
    SILVER_DIR = f"{DATA_BASE_DIR}/2_silver"
    os.makedirs(SILVER_DIR, exist_ok=True)

    print("📖 Reading from Bronze layer...")
    bronze_df = spark.read.format("delta").load(f"{BRONZE_DIR}/claims_delta")
    print(f"✅ Bronze rows: {bronze_df.count()}")

    # ✅ استخدام claim_date من البيانات بدلاً من current_date()
    clean_df = bronze_df.dropDuplicates(["claim_id"])
    
    clean_df = clean_df.fillna({
        "provider_id": "UNKNOWN",
        "risk_level": "UNKNOWN",
        "fraud_score": 0.0,
        "claim_date": current_date()
    })

    # ✅ إضافة ميزات جديدة باستخدام claim_date الفعلي
    enriched_df = clean_df \
        .withColumn("claim_year", year("claim_date")) \
        .withColumn("claim_month", month("claim_date")) \
        .withColumn("claim_day_of_week", dayofweek("claim_date")) \
        .withColumn(
            "is_weekend",
            when(dayofweek("claim_date").isin([1, 7]), 1).otherwise(0)
        ) \
        .withColumn(
            "claim_category",
            when(col("claim_amount") < 1000, "Low")
            .when(col("claim_amount") < 5000, "Medium")
            .when(col("claim_amount") < 10000, "High")
            .otherwise("Very High")
        ) \
        .withColumn(
            "high_claim_flag",
            when(col("claim_amount") > 10000, 1).otherwise(0)
        ) \
        .withColumn(
            "fraud_risk_score",
            when(col("risk_level") == "CRITICAL", 100)
            .when(col("risk_level") == "HIGH", 75)
            .when(col("risk_level") == "LOW", 25)
            .otherwise(0)
        ) \
        .withColumn(
            "amount_scaled",
            round(col("claim_amount") / 1000, 2)
        ) \
        .withColumn(
            "fraud_flag",
            when(col("is_fraud") == True, "Fraud")
            .otherwise("Clean")
        ) \
        .withColumn(
            "risk_category",
            when(col("risk_level") == "CRITICAL", "Critical Risk")
            .when(col("risk_level") == "HIGH", "High Risk")
            .when(col("risk_level") == "LOW", "Low Risk")
            .otherwise("Unknown")
        )

    output_path = f"{SILVER_DIR}/master_claims_delta"
    
    enriched_df.write.format("delta") \
        .mode("overwrite") \
        .partitionBy("is_fraud", "claim_year") \
        .option("overwriteSchema", "true") \
        .save(output_path)

    print(f"✅ Silver Layer saved to: {output_path}")
    print(f"📊 Total rows: {enriched_df.count()}")
    print(f"🔢 Columns: {len(enriched_df.columns)}")
    
    print("\n📋 Sample Data:")
    enriched_df.show(5, truncate=False)

    spark.stop()

if __name__ == "__main__":
    run_silver()