-- ============================================================
-- PROVIDER RISK DASHBOARD
-- ============================================================

{{
  config(
    materialized='table',
    alias='provider_risk',
    schema='public'
  )
}}

WITH provider_metrics AS (
  SELECT
    provider_id,
    COUNT(claim_id) AS total_claims,
    SUM(claim_amount) AS total_amount,
    AVG(claim_amount) AS avg_claim_amount,
    MAX(claim_amount) AS max_claim_amount,
    MIN(claim_amount) AS min_claim_amount,
    SUM(CASE WHEN is_fraud = true THEN 1 ELSE 0 END) AS fraud_claims,
    AVG(fraud_score) AS avg_fraud_score,
    COUNT(DISTINCT policy_number) AS unique_policies,
    ROUND(
      (SUM(CASE WHEN is_fraud = true THEN 1 ELSE 0 END) * 100.0) / NULLIF(COUNT(claim_id), 0), 
      2
    ) AS fraud_rate,
    AVG(CASE WHEN is_fraud = true THEN claim_amount ELSE NULL END) AS avg_fraud_amount
  FROM {{ ref('stg_claims') }}
  WHERE provider_id IS NOT NULL
  GROUP BY provider_id
)

SELECT
  provider_id,
  total_claims,
  total_amount,
  ROUND(avg_claim_amount::numeric, 2) AS avg_claim_amount,
  max_claim_amount,
  min_claim_amount,
  fraud_claims,
  ROUND(avg_fraud_score::numeric, 4) AS avg_fraud_score,
  unique_policies,
  fraud_rate,
  ROUND(avg_fraud_amount::numeric, 2) AS avg_fraud_amount,
  CASE 
    WHEN fraud_rate > 50 THEN 'Critical Risk Provider'
    WHEN fraud_rate > 20 THEN 'High Risk Provider'
    WHEN fraud_rate > 5 THEN 'Medium Risk Provider'
    ELSE 'Low Risk Provider'
  END AS risk_level_summary,
  ROUND(fraud_rate * total_amount / 100, 2) AS financial_risk_amount,
  CASE 
    WHEN total_claims >= 100 THEN 'High Volume'
    WHEN total_claims >= 50 THEN 'Medium Volume'
    ELSE 'Low Volume'
  END AS volume_category,
  CURRENT_TIMESTAMP AS updated_at
FROM provider_metrics
ORDER BY fraud_rate DESC