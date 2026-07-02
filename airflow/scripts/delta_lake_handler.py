#!/usr/bin/env python3
import os
import sys
from pyspark.sql import SparkSession
from pyspark.sql.functions import col, from_json, current_timestamp, to_timestamp, when
from pyspark.sql.types import StructType, StructField, StringType, DoubleType, BooleanType, TimestampType
from delta import configure_spark_with_delta_pip
from delta.tables import DeltaTable

os.environ['PYSPARK_PYTHON'] = sys.executable
os.environ['PYSPARK_DRIVER_PYTHON'] = sys.executable

def run_bronze():
    print("="*60)
    print("🚀 BRONZE LAYER - Raw Data Ingestion from Kafka")
    print("="*60)

    spark = configure_spark_with_delta_pip(
        SparkSession.builder
        .appName("BronzeLayer")
        .master("spark://spark-master:7077")
        .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension")
        .config("spark.sql.catalog.spark_catalog", "org.apache.spark.sql.delta.catalog.DeltaCatalog")
        .getOrCreate()
    )

    BRONZE_DIR = "/opt/airflow/data/1_bronze"
    os.makedirs(BRONZE_DIR, exist_ok=True)

    schema = StructType([
        StructField("claim_id", StringType(), True),
        StructField("policy_number", StringType(), True),
        StructField("claim_amount", DoubleType(), True),
        StructField("provider_id", StringType(), True),
        StructField("fraud_score", DoubleType(), True),
        StructField("is_fraud", BooleanType(), True),
        StructField("risk_level", StringType(), True),
        StructField("timestamp", StringType(), True)
    ])

    # ✅ استخدام startingOffsets = latest لتجنب إعادة معالجة القديم
    kafka_df = spark.read.format("kafka") \
        .option("kafka.bootstrap.servers", "kafka:29092") \
        .option("subscribe", "evaluated_claims") \
        .option("startingOffsets", "latest") \
        .option("failOnDataLoss", "false") \
        .load()

    if kafka_df.rdd.isEmpty():
        print("⚠️ No new messages in Kafka")
        spark.stop()
        return

    parsed_df = kafka_df.selectExpr("CAST(value AS STRING) as json") \
        .withColumn("data", from_json(col("json"), schema)) \
        .select(
            col("data.claim_id"),
            col("data.policy_number"),
            col("data.claim_amount"),
            col("data.provider_id"),
            col("data.fraud_score"),
            col("data.is_fraud"),
            col("data.risk_level"),
            col("data.timestamp"),
            current_timestamp().alias("ingested_at")
        ) \
        .withColumn("claim_date", to_timestamp(col("timestamp"))) \
        .drop("timestamp") \
        .filter(col("claim_id").isNotNull())

    if parsed_df.rdd.isEmpty():
        print("⚠️ No valid data after parsing")
        spark.stop()
        return

    output_path = f"{BRONZE_DIR}/claims_delta"

    # ✅ استخدام append مع إزالة المكررات
    if DeltaTable.isDeltaTable(spark, output_path):
        DeltaTable.forPath(spark, output_path) \
            .alias("t") \
            .merge(parsed_df.alias("s"), "t.claim_id = s.claim_id") \
            .whenMatchedUpdateAll() \
            .whenNotMatchedInsertAll() \
            .execute()
    else:
        parsed_df.write.format("delta") \
            .mode("append") \
            .save(output_path)

    print(f"✅ Bronze Layer updated: {output_path}")
    spark.stop()

if __name__ == "__main__":
    run_bronze()