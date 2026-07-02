-- ============================================================
-- MONTHLY TRENDS DASHBOARD
-- الاتجاهات الشهرية للمطالبات والاحتيال
-- ============================================================

{{
  config(
    materialized='table',
    alias='monthly_trends',
    schema='public'
  )
}}

WITH monthly_metrics AS (
  SELECT
    claim_year,
    claim_month,
    COUNT(claim_id) AS total_claims,
    SUM(claim_amount) AS total_amount,
    AVG(claim_amount) AS avg_claim,
    SUM(CASE WHEN is_fraud = true THEN 1 ELSE 0 END) AS fraud_claims,
    AVG(fraud_score) AS avg_fraud_score,
    SUM(CASE WHEN is_fraud = true THEN claim_amount ELSE 0 END) AS fraud_amount,
    SUM(CASE WHEN claim_amount > 10000 THEN 1 ELSE 0 END) AS high_value_claims,
    AVG(EXTRACT(DAY FROM (ingested_at - claim_date))) AS avg_processing_days
  FROM {{ ref('stg_claims') }}
  WHERE claim_year IS NOT NULL
  GROUP BY claim_year, claim_month
)

SELECT
  claim_year,
  claim_month,
  total_claims,
  total_amount,
  avg_claim,
  fraud_claims,
  avg_fraud_score,
  fraud_amount,
  high_value_claims,
  ROUND(avg_processing_days::numeric, 2) AS avg_processing_days,
  ROUND(
    (fraud_claims * 100.0) / NULLIF(total_claims, 0), 
    2
  ) AS fraud_percentage,
  ROUND(
    (high_value_claims * 100.0) / NULLIF(total_claims, 0), 
    2
  ) AS high_value_percentage,
  CASE 
    WHEN claim_month = 1 THEN 'January'
    WHEN claim_month = 2 THEN 'February'
    WHEN claim_month = 3 THEN 'March'
    WHEN claim_month = 4 THEN 'April'
    WHEN claim_month = 5 THEN 'May'
    WHEN claim_month = 6 THEN 'June'
    WHEN claim_month = 7 THEN 'July'
    WHEN claim_month = 8 THEN 'August'
    WHEN claim_month = 9 THEN 'September'
    WHEN claim_month = 10 THEN 'October'
    WHEN claim_month = 11 THEN 'November'
    ELSE 'December'
  END AS month_name,
  MAKE_DATE(claim_year::int, claim_month::int, 1) AS month_date,
  CURRENT_TIMESTAMP AS updated_at
FROM monthly_metrics
ORDER BY claim_year DESC, claim_month DESC