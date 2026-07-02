-- ============================================================
-- FRAUD SUMMARY DASHBOARD
-- ملخص إحصائيات الاحتيال الكلية
-- ============================================================

{{
  config(
    materialized='table',
    alias='fraud_summary',
    schema='public'
  )
}}

WITH fraud_metrics AS (
  SELECT
    COUNT(claim_id) AS total_claims,
    SUM(CASE WHEN is_fraud = true THEN 1 ELSE 0 END) AS fraud_claims,
    SUM(CASE WHEN is_fraud = false THEN 1 ELSE 0 END) AS clean_claims,
    ROUND(AVG(fraud_score)::numeric, 4) AS avg_fraud_score,
    MAX(fraud_score) AS max_fraud_score,
    MIN(fraud_score) AS min_fraud_score,
    SUM(claim_amount) AS total_amount,
    SUM(CASE WHEN is_fraud = true THEN claim_amount ELSE 0 END) AS fraud_amount,
    SUM(CASE WHEN is_fraud = false THEN claim_amount ELSE 0 END) AS clean_amount,
    SUM(CASE WHEN risk_level = 'CRITICAL' THEN 1 ELSE 0 END) AS critical_claims,
    SUM(CASE WHEN risk_level = 'HIGH' THEN 1 ELSE 0 END) AS high_risk_claims,
    SUM(CASE WHEN risk_level = 'LOW' THEN 1 ELSE 0 END) AS low_risk_claims
  FROM {{ ref('stg_claims') }}
)

SELECT
  total_claims,
  fraud_claims,
  clean_claims,
  avg_fraud_score,
  max_fraud_score,
  min_fraud_score,
  total_amount,
  fraud_amount,
  clean_amount,
  critical_claims,
  high_risk_claims,
  low_risk_claims,
  ROUND((fraud_claims * 100.0) / NULLIF(total_claims, 0), 2) AS fraud_percentage,
  ROUND((fraud_amount * 100.0) / NULLIF(total_amount, 0), 2) AS fraud_amount_percentage,
  ROUND((critical_claims * 100.0) / NULLIF(total_claims, 0), 2) AS critical_percentage,
  ROUND((high_risk_claims * 100.0) / NULLIF(total_claims, 0), 2) AS high_risk_percentage,
  ROUND(fraud_amount / NULLIF(fraud_claims, 0), 2) AS avg_fraud_amount,
  ROUND(total_amount / NULLIF(total_claims, 0), 2) AS avg_claim_amount,
  CURRENT_TIMESTAMP AS summary_date
FROM fraud_metrics