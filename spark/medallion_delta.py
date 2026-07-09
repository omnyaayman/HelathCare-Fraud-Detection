from pyspark.sql import SparkSession
from delta import configure_spark_with_delta_pip

builder = SparkSession.builder \
    .appName("Medallion Architecture")

spark = configure_spark_with_delta_pip(builder).getOrCreate()

# =========================
# Create Spark Session
# =========================
builder = SparkSession.builder \
    .appName("Healthcare Fraud Medallion") \
    .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension") \
    .config("spark.sql.catalog.spark_catalog", "org.apache.spark.sql.delta.catalog.DeltaCatalog")

spark = configure_spark_with_delta_pip(builder).getOrCreate()

# =========================
# Bronze Layer (Raw Data)
# =========================
bronze_df = spark.read \
    .option("header", True) \
    .option("inferSchema", True) \
    .option("sep", ",") \
    .csv("data/gold/claims_per_patient.csv")

print("Columns:", bronze_df.columns)

bronze_df.write.format("delta").mode("overwrite").save("data/delta/bronze")

# =========================
# Silver Layer (Clean Data)
# =========================
silver_df = bronze_df.dropna()

silver_df.write.format("delta").mode("overwrite").save("data/delta/silver")

# =========================
# Gold Layer (Aggregated)
# =========================

gold_df = silver_df.groupBy("Patient_ID").count()

gold_df.write.format("delta").mode("overwrite").save("data/delta/gold")

print("🔥 Medallion Architecture Done Successfully!")  