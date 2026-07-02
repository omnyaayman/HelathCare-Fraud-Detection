-- ============================================================
-- PROVIDER RANKING DASHBOARD
-- ترتيب مقدمي الخدمات حسب معدل الاحتيال
-- ============================================================

{{
  config(
    materialized='table',
    alias='provider_ranking',
    schema='public'
  )
}}

WITH provider_metrics AS (
  SELECT
    provider_id,
    COUNT(claim_id) AS total_claims,
    SUM(CASE WHEN is_fraud = true THEN 1 ELSE 0 END) AS fraud_claims,
    AVG(fraud_score) AS avg_fraud_score,
    SUM(claim_amount) AS total_amount,
    SUM(CASE WHEN is_fraud = true THEN claim_amount ELSE 0 END) AS fraud_amount,
    ROUND(
      (SUM(CASE WHEN is_fraud = true THEN 1 ELSE 0 END) * 100.0) / NULLIF(COUNT(claim_id), 0), 
      2
    ) AS fraud_rate
  FROM {{ ref('stg_claims') }}
  WHERE provider_id IS NOT NULL
  GROUP BY provider_id
)

SELECT
  provider_id,
  total_claims,
  fraud_claims,
  ROUND(avg_fraud_score::numeric, 4) AS avg_fraud_score,
  total_amount,
  fraud_amount,
  fraud_rate,
  RANK() OVER (ORDER BY fraud_rate DESC) AS risk_rank,
  DENSE_RANK() OVER (ORDER BY fraud_rate DESC) AS risk_dense_rank,
  CASE 
    WHEN fraud_rate > 50 THEN 'High Risk'
    WHEN fraud_rate > 20 THEN 'Medium Risk'
    ELSE 'Low Risk'
  END AS provider_risk_category,
  ROUND(fraud_rate * total_amount / 100, 2) AS estimated_financial_loss,
  CURRENT_TIMESTAMP AS updated_at
FROM provider_metrics
WHERE total_claims >= 10
ORDER BY fraud_rate DESC
LIMIT 100