-- ============================================================
-- RISK DISTRIBUTION DASHBOARD
-- توزيع المخاطر حسب الفئات المختلفة
-- ============================================================

{{
  config(
    materialized='table',
    alias='risk_distribution',
    schema='public'
  )
}}

WITH risk_metrics AS (
  SELECT
    risk_level,
    claim_category,
    COUNT(claim_id) AS claim_count,
    SUM(claim_amount) AS total_amount,
    AVG(claim_amount) AS avg_amount,
    SUM(CASE WHEN is_fraud = true THEN 1 ELSE 0 END) AS fraud_in_risk,
    AVG(fraud_score) AS avg_fraud_score_in_risk
  FROM {{ ref('stg_claims') }}
  WHERE risk_level IS NOT NULL
  GROUP BY risk_level, claim_category
),

total_claims AS (
  SELECT COUNT(claim_id) AS total_count 
  FROM {{ ref('stg_claims') }}
)

SELECT
  risk_level,
  claim_category,
  claim_count,
  total_amount,
  ROUND(avg_amount::numeric, 2) AS avg_amount,
  fraud_in_risk,
  ROUND(avg_fraud_score_in_risk::numeric, 4) AS avg_fraud_score_in_risk,
  ROUND(
    (claim_count * 100.0) / NULLIF((SELECT total_count FROM total_claims), 0), 
    2
  ) AS percentage_of_total,
  ROUND(
    (fraud_in_risk * 100.0) / NULLIF(claim_count, 0), 
    2
  ) AS fraud_density,
  ROUND(total_amount / NULLIF(claim_count, 0), 2) AS avg_risk_amount,
  CURRENT_TIMESTAMP AS updated_at
FROM risk_metrics
ORDER BY risk_level, claim_category