
  
  create view "dashboard"."main"."stg_claims__dbt_tmp" as (
    -- ============================================================
-- STAGING: قراءة البيانات من Gold Layer (Parquet) باستخدام DuckDB
-- ============================================================



SELECT
    claim_id,
    policy_number,
    provider_id,
    claim_amount,
    fraud_score,
    is_fraud,
    risk_level,
    claim_date,
    claim_year,
    claim_month,
    claim_day_of_week,
    is_weekend,
    claim_category,
    high_claim_flag,
    fraud_risk_score,
    amount_scaled,
    fraud_flag,
    risk_category,
    ingested_at,
    CASE 
        WHEN claim_amount > 10000 THEN 'High Value'
        WHEN claim_amount > 5000 THEN 'Medium Value'
        ELSE 'Low Value'
    END AS claim_value_category,
    ROUND(fraud_score * claim_amount / 1000, 2) AS fraud_impact_score
FROM read_parquet('/opt/airflow/data/gold/claims_enriched/*.parquet')
WHERE claim_id IS NOT NULL
  );
