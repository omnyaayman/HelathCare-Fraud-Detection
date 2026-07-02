#!/usr/bin/env python3
import os
import sys
from pyspark.sql import SparkSession
from pyspark.sql.functions import (
    col, sum, round, avg, max, min, count, 
    countDistinct, lit, when, desc, row_number,
    collect_list, struct, to_json, current_date, coalesce
)
from pyspark.sql.window import Window
from delta import configure_spark_with_delta_pip

DATA_BASE_DIR = "/opt/airflow/data"
os.environ['PYSPARK_PYTHON'] = sys.executable
os.environ['PYSPARK_DRIVER_PYTHON'] = sys.executable

def run_gold():
    print("="*60)
    print("⭐ GOLD LAYER - Business Intelligence & Dashboard Aggregations")
    print("="*60)

    spark = configure_spark_with_delta_pip(
        SparkSession.builder
        .appName("GoldLayer")
        .master("spark://spark-master:7077")
        .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension")
        .config("spark.sql.catalog.spark_catalog", "org.apache.spark.sql.delta.catalog.DeltaCatalog")
        .getOrCreate()
    )

    SILVER_INPUT = f"{DATA_BASE_DIR}/2_silver/master_claims_delta"
    GOLD_OUTPUT = f"{DATA_BASE_DIR}/gold"
    os.makedirs(GOLD_OUTPUT, exist_ok=True)

    if not os.path.exists(SILVER_INPUT):
        print("❌ Silver layer not found! Run silver_layer.py first.")
        spark.stop()
        return

    print("📖 Reading from Silver layer...")
    df = spark.read.format("delta").load(SILVER_INPUT)
    print(f"✅ Silver rows: {df.count()}")

    df_clean = df.fillna({
        "provider_id": "UNKNOWN",
        "policy_number": "UNKNOWN",
        "risk_level": "UNKNOWN",
        "claim_category": "Unknown",
        "fraud_score": 0.0,
        "claim_amount": 0.0,
        "claim_year": 2024,
        "claim_month": 1
    })

    total_count = df_clean.count()
    if total_count == 0:
        print("⚠️ No data available for Gold layer")
        spark.stop()
        return

    # ============================================================
    # 0. كتابة البيانات المحسَّنة (للـ dbt و Metabase)
    # ============================================================
    enriched_path = f"{GOLD_OUTPUT}/claims_enriched"
    df_clean.write.mode("overwrite").parquet(enriched_path)
    print(f"✅ Enriched claims saved to {enriched_path}")

    # ============================================================
    # 1. PROVIDER RISK DASHBOARD
    # ============================================================
    print("\n📊 1. Building Provider Risk Dashboard...")
    
    provider_risk = df_clean.groupBy("provider_id") \
        .agg(
            count("claim_id").alias("total_claims"),
            sum("claim_amount").alias("total_amount"),
            avg("claim_amount").alias("avg_claim_amount"),
            max("claim_amount").alias("max_claim_amount"),
            min("claim_amount").alias("min_claim_amount"),
            sum(when(col("is_fraud") == True, 1).otherwise(0)).alias("fraud_claims"),
            avg("fraud_score").alias("avg_fraud_score"),
            countDistinct("policy_number").alias("unique_policies")
        ) \
        .withColumn(
            "fraud_rate",
            round((col("fraud_claims") / col("total_claims")) * 100, 2)
        ) \
        .withColumn(
            "risk_level_summary",
            when(col("fraud_rate") > 50, "High Risk Provider")
            .when(col("fraud_rate") > 20, "Medium Risk Provider")
            .otherwise("Low Risk Provider")
        )

    provider_risk.write.mode("overwrite").parquet(f"{GOLD_OUTPUT}/provider_risk_dashboard")
    print(f"✅ Provider risk saved: {GOLD_OUTPUT}/provider_risk_dashboard")

    # ============================================================
    # 2. MONTHLY TRENDS DASHBOARD
    # ============================================================
    print("\n📊 2. Building Monthly Trends Dashboard...")
    
    monthly_trends = df_clean.groupBy("claim_year", "claim_month") \
        .agg(
            count("claim_id").alias("total_claims"),
            sum("claim_amount").alias("total_amount"),
            avg("claim_amount").alias("avg_claim"),
            sum(when(col("is_fraud") == True, 1).otherwise(0)).alias("fraud_claims"),
            avg("fraud_score").alias("avg_fraud_score")
        ) \
        .withColumn(
            "fraud_percentage",
            round((col("fraud_claims") / col("total_claims")) * 100, 2)
        ) \
        .withColumn(
            "month_label",
            when(col("claim_month") == 1, "Jan")
            .when(col("claim_month") == 2, "Feb")
            .when(col("claim_month") == 3, "Mar")
            .when(col("claim_month") == 4, "Apr")
            .when(col("claim_month") == 5, "May")
            .when(col("claim_month") == 6, "Jun")
            .when(col("claim_month") == 7, "Jul")
            .when(col("claim_month") == 8, "Aug")
            .when(col("claim_month") == 9, "Sep")
            .when(col("claim_month") == 10, "Oct")
            .when(col("claim_month") == 11, "Nov")
            .otherwise("Dec")
        ) \
        .orderBy("claim_year", "claim_month")

    monthly_trends.write.mode("overwrite").parquet(f"{GOLD_OUTPUT}/monthly_trends")
    print(f"✅ Monthly trends saved: {GOLD_OUTPUT}/monthly_trends")

    # ============================================================
    # 3. RISK DISTRIBUTION DASHBOARD
    # ============================================================
    print("\n📊 3. Building Risk Distribution Dashboard...")
    
    risk_distribution = df_clean.groupBy("risk_level", "claim_category") \
        .agg(
            count("claim_id").alias("claim_count"),
            sum("claim_amount").alias("total_amount"),
            avg("claim_amount").alias("avg_amount")
        ) \
        .withColumn(
            "percentage",
            round((col("claim_count") / total_count) * 100, 2)
        )

    risk_distribution.write.mode("overwrite").parquet(f"{GOLD_OUTPUT}/risk_distribution")
    print(f"✅ Risk distribution saved: {GOLD_OUTPUT}/risk_distribution")

    # ============================================================
    # 4. FRAUD SUMMARY DASHBOARD
    # ============================================================
    print("\n📊 4. Building Fraud Summary Dashboard...")
    
    fraud_summary = df_clean.agg(
        count("claim_id").alias("total_claims"),
        sum(when(col("is_fraud") == True, 1).otherwise(0)).alias("fraud_claims"),
        sum(when(col("is_fraud") == False, 1).otherwise(0)).alias("clean_claims"),
        round(avg("fraud_score"), 4).alias("avg_fraud_score"),
        max("fraud_score").alias("max_fraud_score"),
        min("fraud_score").alias("min_fraud_score"),
        sum("claim_amount").alias("total_amount")
    ).withColumn(
        "fraud_percentage",
        round((col("fraud_claims") / col("total_claims")) * 100, 2)
    ).withColumn(
        "summary_date",
        current_date()
    )

    fraud_summary.write.mode("overwrite").parquet(f"{GOLD_OUTPUT}/fraud_summary")
    print(f"✅ Fraud summary saved: {GOLD_OUTPUT}/fraud_summary")

    # ============================================================
    # 5. PROVIDER FRAUD RANKING (Top 10)
    # ============================================================
    print("\n📊 5. Building Provider Fraud Ranking...")
    
    provider_risk_clean = provider_risk.filter(col("total_claims") >= 5)
    
    window_spec = Window.orderBy(desc("fraud_rate"))
    
    provider_ranking = provider_risk_clean \
        .withColumn("rank", row_number().over(window_spec)) \
        .filter(col("rank") <= 10) \
        .select(
            "provider_id",
            "total_claims",
            "fraud_claims",
            "fraud_rate",
            "risk_level_summary",
            "rank"
        )

    provider_ranking.write.mode("overwrite").parquet(f"{GOLD_OUTPUT}/provider_ranking")
    print(f"✅ Provider ranking saved: {GOLD_OUTPUT}/provider_ranking")

    # ============================================================
    # 6. JSON SUMMARY
    # ============================================================
    print("\n📊 6. Building JSON Summary for API...")
    
    import json
    
    summary_data = {
        "fraud_summary": fraud_summary.toPandas().fillna(0).to_dict(orient="records")[0],
        "top_providers": provider_ranking.toPandas().fillna("N/A").to_dict(orient="records"),
        "risk_distribution": risk_distribution.toPandas().fillna(0).to_dict(orient="records"),
        "monthly_trends": monthly_trends.toPandas().fillna(0).to_dict(orient="records")
    }
    
    json_path = f"{GOLD_OUTPUT}/dashboard_summary.json"
    with open(json_path, "w") as f:
        json.dump(summary_data, f, indent=2, default=str)
    
    print(f"✅ JSON summary saved: {json_path}")

    print("\n" + "="*60)
    print("⭐ GOLD LAYER COMPLETED SUCCESSFULLY")
    print("="*60)
    print(f"📁 Output directory: {GOLD_OUTPUT}")
    print("📊 Created dashboards:")
    print(f"   - claims_enriched/ (للـ dbt و Metabase)")
    print(f"   - provider_risk_dashboard/")
    print(f"   - monthly_trends/")
    print(f"   - risk_distribution/")
    print(f"   - fraud_summary/")
    print(f"   - provider_ranking/")
    print(f"   - dashboard_summary.json")
    print("="*60)

    spark.stop()

if __name__ == "__main__":
    run_gold()