<p align="center">
  <img src="https://svg-banners.vercel.app/api?type=origin&text1=Healthcare%20Fraud&text2=Detection%20System%20🚀&width=900&height=200&color=0078D4"/>
</p>

<h1 align="center">🏥 Healthcare Fraud Detection System</h1>

<p align="center">
  <strong>End-to-end AI-powered platform for detecting fraudulent healthcare insurance claims in real-time</strong>
</p>

<p align="center">
  <a href="https://helath-care-fraud-detection.vercel.app/">
    <img src="https://img.shields.io/badge/LIVE_APP-Click_to_Open-00C853?style=for-the-badge&logo=vercel&logoColor=white&labelColor=00C853" alt="Live App"/>
  </a>
</p>

https://github.com/omnyaayman/HelathCare-Fraud-Detection/releases/download/v1.0/dashboard-demo.mp4

<p align="center">
  <img src="https://img.shields.io/badge/FastAPI-05998B?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI"/>
  <img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React"/>
  <img src="https://img.shields.io/badge/XGBoost-FF6F00?style=for-the-badge&logo=xgboost&logoColor=white" alt="XGBoost"/>
  <img src="https://img.shields.io/badge/PySpark-E25A1C?style=for-the-badge&logo=apachespark&logoColor=white" alt="PySpark"/>
  <img src="https://img.shields.io/badge/Delta_Lake-00ADD8?style=for-the-badge&logo=deltalake&logoColor=white" alt="Delta Lake"/>
  <img src="https://img.shields.io/badge/Azure_SQL-0089D6?style=for-the-badge&logo=microsoftazure&logoColor=white" alt="Azure"/>
  <img src="https://img.shields.io/badge/Kafka-231F20?style=for-the-badge&logo=apachekafka&logoColor=white" alt="Kafka"/>
  <img src="https://img.shields.io/badge/Airflow-017CEE?style=for-the-badge&logo=apacheairflow&logoColor=white" alt="Airflow"/>
</p>

<p align="center">
  <a href="#-live-demo">Live Demo</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-features">Features</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-api-reference">API</a> •
  <a href="#-machine-learning">ML Model</a>
</p>

---

## 📌 Overview

A production-grade healthcare fraud detection system that combines **real-time ML inference**, **big data processing**, and an **enterprise dashboard** to identify and prevent fraudulent medical claims. The system uses an **XGBoost** model trained on 20K+ synthetic claims, processes data through a **Medallion Architecture** (Bronze → Silver → Gold), and provides explainable AI insights via **SHAP** feature contributions.

### 🎯 Key Numbers

| Metric | Value |
|--------|-------|
| Model Accuracy | **92.5%** |
| ROC AUC | **94.8%** |
| API Endpoints | **44+** |
| Frontend Pages | **27** |
| Database Tables | **10** |
| Engineered Features | **24** |

---

## 🎥 Dashboard Demo

https://github.com/user-attachments/assets/d86148c4-3cc5-4e3f-9a50-2120e75b60fa

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                           │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  React 19 + Vite + Tailwind CSS Dashboard (27 Pages)       │    │
│  │  • Executive Dashboard  • AI Insights  • Fraud Heatmap     │    │
│  │  • Claims Management   • Model Mgmt   • System Monitoring  │    │
│  └─────────────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────────────┤
│                         API LAYER (44+ Endpoints)                   │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  FastAPI + Uvicorn  │  HTTP Basic Auth  │  CORS Enabled    │    │
│  └─────────────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────────────┤
│                      ML INFERENCE LAYER                             │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  XGBoost Classifier (24 Features)                          │    │
│  │  • Real-time prediction on claim submission                │    │
│  │  • SHAP explainability for each flagged claim              │    │
│  │  • Feature importance (gain-based) extraction              │    │
│  └─────────────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────────────┤
│                    DATA PROCESSING LAYER                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐     │
│  │  PySpark     │  │  Delta Lake  │  │  Apache Airflow      │     │
│  │  Medallion   │→ │  Bronze/     │→ │  Daily ETL Pipeline  │     │
│  │  Processing  │  │  Silver/Gold │  │  (13 tasks)          │     │
│  └──────────────┘  └──────────────┘  └──────────────────────┘     │
├─────────────────────────────────────────────────────────────────────┤
│                     DATA & STORAGE LAYER                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐     │
│  │  SQLite /     │  │  Azure SQL   │  │  Apache Kafka        │     │
│  │  Local DB     │  │  (Production)│  │  Event Streaming     │     │
│  └──────────────┘  └──────────────┘  └──────────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘
```

### Medallion Architecture

```
data/
├── bronze/          ← Raw synthetic health claims CSV
│   └── synthetic_health_claims.csv
├── silver/          ← Cleaned & deduplicated data
│   ├── clean_data.py
│   └── cleaned_data.csv
└── gold/            ← Aggregated business metrics
    ├── claims_per_patient.csv
    ├── avg_cost.csv
    ├── fraud_cases.csv
    └── generate_gold.py
```

---

## 🎯 Features

### 🖥️ Frontend Dashboard (27 Pages)

<details>
<summary><strong>Insurance Role Pages (22 pages)</strong></summary>

| Page | Description |
|------|-------------|
| 📊 **Executive Dashboard** | High-level KPIs, trends, and financial summary |
| 🏠 **Insurance Dashboard** | Operational overview with real-time metrics |
| 🤖 **AI Insights** | Model-driven fraud analysis with confidence scores & severity levels |
| 📋 **All Claims** | Paginated, filterable, searchable claims list |
| 🔍 **Claim Details** | Full claim view with real-time SHAP explanations |
| ⚠️ **Flagged Claims** | AI-flagged suspicious claims for review |
| 🔎 **Review Claims** | Claims under investigation |
| 📈 **Analytics** | Interactive charts and data visualizations |
| 🗺️ **Fraud Heatmap** | Geographic fraud distribution (Leaflet maps) |
| 🏥 **Provider Management** | Provider directory with fraud statistics |
| 👤 **Provider Detail** | Individual provider deep-dive |
| 👥 **Patient Management** | Patient directory with risk profiles |
| 📜 **Policies** | Insurance policy management |
| 📄 **Policy Detail** | Individual policy breakdown |
| 🤖 **Model Management** | Model metrics, version history, retrain triggers |
| 🏷️ **Labeled Data** | Auditor-labeled training data management |
| 💰 **Copay Management** | Copay and deductible administration |
| 📑 **Reports** | Filterable reports with CSV export |
| 🔔 **Alert Center** | Fraud alert management |
| 📬 **Notification Center** | System notifications with read/unread |
| 📝 **Audit Logs** | Complete system audit trail |
| ⚙️ **Settings** | Application configuration |
| 🖥️ **System Monitoring** | API health, CPU, memory, response times |

</details>

<details>
<summary><strong>Provider Role Pages (3 pages)</strong></summary>

| Page | Description |
|------|-------------|
| 🏠 **Provider Dashboard** | Provider-specific analytics and overview |
| 📝 **Submit Claim** | Submit new claims with instant ML scoring |
| 📋 **Track Claims** | Track submitted claim statuses |

</details>

### 🤖 Machine Learning

<details>
<summary><strong>Model Details</strong></summary>

#### XGBoost Classifier

| Metric | Value |
|--------|-------|
| **Accuracy** | 92.5% |
| **Precision** | 89.2% |
| **Recall** | 85.4% |
| **F1 Score** | 87.3% |
| **ROC AUC** | 94.8% |
| **Fraud Threshold** | 0.5 |
| **High Risk Threshold** | 0.85 |

#### 24 Engineered Features

**Numerical (9):**
`Claim_Amount` · `Deductible_Amount` · `CoPay_Amount` · `Patient_Age` · `Number_of_Previous_Claims_Patient` · `Number_of_Previous_Claims_Provider` · `Number_of_Procedures` · `Length_of_Stay_Days` · `Provider_Patient_Distance_Miles`

**Engineered (8):**
`days_claim_to_service` · `days_to_policy_expiry` · `amount_per_procedure` · `claim_to_deductible_ratio` · `is_far_provider` · `high_claim_patient` · `high_claim_provider` · `Claim_Submitted_Late`

**Encoded Categorical (7):**
`Patient_Gender_encoded` · `Provider_Type_encoded` · `Provider_Specialty_encoded` · `Diagnosis_Code_encoded` · `Admission_Type_encoded` · `Discharge_Type_encoded` · `Service_Type_encoded`

#### Top Feature Importance (by Gain)

| Rank | Feature | Importance |
|------|---------|-----------|
| 1 | Claim Amount | 23.4% |
| 2 | Provider Fraud History | 18.9% |
| 3 | Diagnosis Code | 15.6% |
| 4 | Provider Distance | 13.4% |
| 5 | Num Procedures | 9.8% |

#### Explainability

- **SHAP Values**: Real-time feature contributions via XGBoost's `pred_contribs=True` on every claim detail view
- **Feature Importance**: Gain-based ranking extracted from the trained booster
- **AI Insights**: Auto-generated analysis covering admission patterns, geographic trends, financial risk, and fraud trends

</details>

### 🔄 Data Pipeline

<details>
<summary><strong>Airflow DAG: fraud_pipeline (13 Tasks)</strong></summary>

```
start → bronze_layer → silver_layer → gold_layer → data_validation
→ data_cleaning → feature_engineering → model_training
→ model_evaluation → prediction_pipeline → report_generation
→ notification_trigger → end
```

| Task | Description |
|------|-------------|
| `bronze_layer` | Extract raw claims from SQLite → Parquet |
| `silver_layer` | Clean: drop NAs, validate amounts & scores |
| `gold_layer` | Aggregate business metrics |
| `data_validation` | Assert data quality before training |
| `data_cleaning` | Remove outliers (99th percentile) |
| `feature_engineering` | Create model features |
| `model_training` | Train XGBClassifier (50 estimators) |
| `model_evaluation` | Compute accuracy, precision, recall, F1, AUC |
| `prediction_pipeline` | Score all claims, update DB |
| `report_generation` | Generate summary report |

</details>

---

## 📡 API Reference

### Quick Reference (44+ Endpoints)

<details>
<summary><strong>Dashboard & Analytics (12 endpoints)</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/stats` | Full dashboard statistics |
| `GET` | `/api/stats/trends` | 30-day trend comparisons |
| `GET` | `/api/charts/claims-over-time` | Daily claims (30 days) |
| `GET` | `/api/charts/fraud-by-provider` | Top 10 providers by fraud |
| `GET` | `/api/charts/fraud-by-region` | Fraud by state |
| `GET` | `/api/charts/fraud-by-diagnosis` | Top 10 diagnosis codes |
| `GET` | `/api/charts/fraud-by-city` | Top 10 cities by fraud |
| `GET` | `/api/charts/fraud-score-distribution` | Score histogram |
| `GET` | `/api/charts/claim-status-distribution` | Status distribution |
| `GET` | `/api/charts/monthly-claims` | Monthly aggregation |
| `GET` | `/api/charts/average-claim-cost` | Avg cost by service |
| `GET` | `/api/charts/fraud-categories` | Fraud category breakdown |

</details>

<details>
<summary><strong>Claims Management (7 endpoints)</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/claims` | Paginated claims with filters |
| `GET` | `/api/claims/{id}` | Claim detail + SHAP values |
| `POST` | `/api/claims` | Submit claim (triggers ML prediction) |
| `PATCH` | `/api/claims/{id}/status` | Update claim status |
| `GET` | `/api/claims/{id}/investigation` | Investigation data |
| `PATCH` | `/api/claims/{id}/investigation` | Update investigation |
| `POST` | `/api/claims/{id}/investigation/notes` | Add investigation note |

</details>

<details>
<summary><strong>AI & ML (4 endpoints)</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/ai-insights` | Summary AI insights |
| `GET` | `/api/ai-insights/detailed` | Full AI insights + feature importance |
| `GET` | `/api/model/metrics` | Model metrics + version history |
| `POST` | `/api/model/retrain` | Simulate model retraining |

</details>

<details>
<summary><strong>Entities & Management (10 endpoints)</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/patients` | All patients with stats |
| `GET` | `/api/providers` | All providers with stats |
| `GET` | `/api/policies` | All policies with billing |
| `GET` | `/api/services` | List services |
| `POST` | `/api/services` | Create service |
| `PATCH` | `/api/services/{id}` | Update service |
| `DELETE` | `/api/services/{id}` | Delete service |
| `GET` | `/api/analytics/top-providers` | Top providers by fraud |
| `GET` | `/api/analytics/top-patients` | Top patients by fraud |
| `GET` | `/api/analytics/top-diagnoses` | Top diagnoses by fraud |

</details>

<details>
<summary><strong>System & Notifications (11 endpoints)</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/notifications` | All notifications |
| `GET` | `/api/notifications/{id}` | Notification detail |
| `PATCH` | `/api/notifications/{id}/read` | Mark read |
| `PATCH` | `/api/notifications/read-all` | Mark all read |
| `POST` | `/api/notifications/generate` | Auto-generate alerts |
| `GET` | `/api/audit-logs` | Paginated audit logs |
| `GET` | `/api/system/health` | System health status |
| `GET` | `/api/heatmap/providers` | Provider geo data |
| `GET` | `/api/search` | Global search |
| `GET` | `/api/reports/data` | Report data |
| `GET` | `/api/reports/export` | Export report |

</details>

---

## 🗄️ Database Schema

### 10 Tables

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Provider   │────▶│    Claims    │◀────│   Patient    │
│──────────────│     │──────────────│     │──────────────│
│ Provider_ID  │     │ Claim_ID     │     │ Patient_ID   │
│ Name         │     │ Patient_ID   │     │ Name         │
│ Type         │     │ Provider_ID  │     │ Age          │
│ Specialty    │     │ Policy_ID    │     │ Gender       │
│ City, State  │     │ Service_ID   │     │ City, State  │
│ Lat, Lng     │     │ Claim_Amount │     │ Total_Claims │
│ Fraud_Claims │     │ Fraud_Score  │     └──────────────┘
└──────────────┘     │ Is_Fraudulent│
                     │ Status       │     ┌──────────────┐
                     └──────────────┘     │  ModelMetrics │
                                          │──────────────│
┌──────────────┐     ┌──────────────┐     │ Accuracy     │
│    Policy    │     │   Service    │     │ Precision    │
│──────────────│     │──────────────│     │ Recall, F1   │
│ Policy_ID    │     │ Service_ID   │     │ ROC_AUC      │
│ Patient_ID   │     │ Name         │     │ Version      │
│ Deductible   │     │ Copay        │     └──────────────┘
│ Copay_Amount │     │ Avg_Cost     │
└──────────────┘     └──────────────┘     ┌──────────────┐
                                          │Notifications │
┌──────────────┐     ┌──────────────┐     │──────────────│
│ LabeledData  │     │  AuditLogs   │     │ Title        │
│──────────────│     │──────────────│     │ Type         │
│ Claim_ID     │     │ Timestamp    │     │ Severity     │
│ Label        │     │ User         │     │ Read status  │
│ Is_Fraudulent│     │ Action       │     └──────────────┘
│ Auditor      │     │ IP Address   │
└──────────────┘     └──────────────┘
```

---

## 🛠️ Tech Stack

### Backend

| Technology | Purpose |
|------------|---------|
| **FastAPI** | REST API framework |
| **Uvicorn** | ASGI server |
| **SQLAlchemy** | Database ORM |
| **XGBoost** | Fraud prediction model |
| **scikit-learn** | Label encoding, metrics |
| **SHAP** | Model explainability |
| **Pandas** | Data manipulation |
| **PyODBC** | Azure SQL connectivity |

### Frontend

| Technology | Purpose |
|------------|---------|
| **React 19** | UI framework |
| **Vite 7** | Build tool & dev server |
| **Tailwind CSS 3** | Utility-first styling |
| **React Router 7** | Client-side routing |
| **Plotly.js** | Interactive charts |
| **Chart.js** | Data visualizations |
| **Leaflet** | Geographic maps |
| **Lucide React** | Icon library |

### Data Engineering

| Technology | Purpose |
|------------|---------|
| **Apache Spark** | Big data processing |
| **Delta Lake** | Medallion architecture storage |
| **Apache Airflow** | Workflow orchestration |
| **Apache Kafka** | Event streaming |
| **Azure Event Hub** | Cloud event ingestion |

### Infrastructure

| Technology | Purpose |
|------------|---------|
| **Docker** | Containerization |
| **Azure SQL** | Production database |
| **Vercel** | Frontend deployment |
| **SQLite** | Local development DB |

---

## 📁 Project Structure

```
HelathCare-Fraud-Detection/
│
├── app/                        # FastAPI Application
│   ├── main.py                 # App entrypoint + CORS config
│   ├── routes.py               # 44+ API endpoints
│   └── schemas.py              # Pydantic models
│
├── core/                       # Configuration
│   ├── config.py               # Settings from .env
│   └── constants.py            # Model paths, feature list, thresholds
│
├── ML/                         # Machine Learning
│   ├── predictor.py            # Inference pipeline (24 features)
│   ├── xgb_fraud_model.pkl     # Trained XGBoost model (4.5 MB)
│   ├── label_encoders.pkl      # Fitted LabelEncoders
│   ├── features_list.pkl       # Feature column order
│   └── fraud_fixed.ipynb       # Training notebook
│
├── services/                   # External Services
│   ├── azure_db.py             # SQLAlchemy engine
│   ├── email_service.py        # SMTP notifications
│   ├── kafka_producer.py       # Kafka claim producer
│   └── kafka_consumer.py       # Kafka claim consumer
│
├── data/                       # Medallion Architecture
│   ├── bronze/                 # Raw data
│   ├── silver/                 # Cleaned data
│   └── gold/                   # Aggregated analytics
│
├── dags/                       # Airflow Pipelines
│   ├── fraud_pipeline.py       # Daily ETL + ML retrain (13 tasks)
│   └── fraud_alert.py          # Fraud alert detection
│
├── spark/                      # Big Data Processing
│   ├── medallion_delta.py      # PySpark Medallion implementation
│   └── delta_lake_handler.py   # Delta Lake operations
│
├── frontend/                   # React Dashboard
│   ├── src/
│   │   ├── pages/              # 27 page components
│   │   ├── components/         # 11 reusable components
│   │   ├── context/            # Auth context
│   │   ├── data/               # Canonical data + utilities
│   │   ├── api.js              # API client (real + mock fallback)
│   │   └── App.jsx             # Router configuration
│   └── package.json
│
├── docker-compose.yml          # Multi-service orchestration
├── Dockerfile                  # Airflow image
├── Dockerfile.backend          # FastAPI image
├── requirements.backend.txt    # Python dependencies
├── init_db.py                  # Database initialization + seeding
├── healthcare_fraud.db         # SQLite database
└── .env                        # Environment variables
```

---

## 📊 Data Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Synthetic   │    │   Bronze    │    │   Silver    │    │    Gold     │
│  Claims CSV  │───▶│   (Raw)     │───▶│  (Cleaned)  │───▶│ (Aggregate) │
│  20,100 rows │    │  20,100     │    │  20,072     │    │  Analytics  │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                                │
                                                ▼
                                       ┌─────────────┐
                                       │   SQLite /   │
                                       │  Azure SQL   │
                                       │  (10 tables) │
                                       └──────┬──────┘
                                              │
                                    ┌─────────┴─────────┐
                                    ▼                   ▼
                             ┌─────────────┐    ┌─────────────┐
                             │   FastAPI   │    │   XGBoost   │
                             │   Routes    │───▶│  Predictor  │
                             │  (44 APIs)  │    │ (24 feats)  │
                             └──────┬──────┘    └─────────────┘
                                    │
                                    ▼
                             ┌─────────────┐
                             │   React     │
                             │  Dashboard  │
                             │ (27 pages)  │
                             └─────────────┘
```

---

## 🚀 Deployment

### Frontend (Vercel)

The frontend is deployed on Vercel:

```bash
cd frontend
npm run build
# Deploy dist/ to Vercel
```

### Backend (Docker)

```bash
docker build -f Dockerfile.backend -t fraud-backend .
docker run -p 8000:8000 fraud-backend
```

### Full Stack (Docker Compose)

```bash
docker-compose up -d
# Backend:  http://localhost:8000
# Airflow:  http://localhost:8080
# Kafka:    localhost:9092
```

---

