-- ============================================================
-- DASHBOARD METRICS (All-in-One View)
-- جميع المقاييس في جدول واحد للـ Dashboard
-- ============================================================

{{
  config(
    materialized='table',
    alias='dashboard_metrics',
    schema='public'
  )
}}

WITH summary AS (
  SELECT * FROM {{ ref('fraud_summary') }}
),

top_providers AS (
  SELECT 
    provider_id,
    fraud_rate,
    risk_rank
  FROM {{ ref('provider_ranking') }}
  WHERE risk_rank <= 5
),

monthly AS (
  SELECT
    claim_year,
    claim_month,
    total_claims,
    fraud_claims,
    fraud_percentage
  FROM {{ ref('monthly_trends') }}
  WHERE claim_year >= EXTRACT(YEAR FROM CURRENT_DATE)::int - 1
),

risk_dist AS (
  SELECT
    risk_level,
    claim_count,
    percentage_of_total
  FROM {{ ref('risk_distribution') }}
)

SELECT
  -- ملخص الاحتيال
  (SELECT total_claims FROM summary) AS total_claims,
  (SELECT fraud_claims FROM summary) AS fraud_claims,
  (SELECT fraud_percentage FROM summary) AS fraud_percentage,
  (SELECT avg_fraud_score FROM summary) AS avg_fraud_score,
  (SELECT total_amount FROM summary) AS total_amount,
  
  -- أعلى 5 مقدمين خطر
  (SELECT STRING_AGG(provider_id, ', ') FROM top_providers) AS top_risk_providers,
  (SELECT AVG(fraud_rate) FROM top_providers) AS top_providers_avg_fraud,
  
  -- الشهر الحالي
  (SELECT total_claims FROM monthly WHERE claim_year = EXTRACT(YEAR FROM CURRENT_DATE)::int AND claim_month = EXTRACT(MONTH FROM CURRENT_DATE)::int) AS current_month_claims,
  (SELECT fraud_percentage FROM monthly WHERE claim_year = EXTRACT(YEAR FROM CURRENT_DATE)::int AND claim_month = EXTRACT(MONTH FROM CURRENT_DATE)::int) AS current_month_fraud,
  
  -- توزيع المخاطر
  (SELECT claim_count FROM risk_dist WHERE risk_level = 'CRITICAL') AS critical_risk_count,
  (SELECT claim_count FROM risk_dist WHERE risk_level = 'HIGH') AS high_risk_count,
  (SELECT claim_count FROM risk_dist WHERE risk_level = 'LOW') AS low_risk_count,
  
  CURRENT_TIMESTAMP AS generated_at