                      # Healthcare Fraud Detection System Overview

## 1. What this system does

This project is a full-stack healthcare fraud detection platform. It ingests healthcare claims and provider/patient data, runs them through a fraud detection pipeline, and exposes dashboards and management screens for insurance and provider users.

The system combines:
- a FastAPI backend for authentication, API endpoints, and business logic
- a React/Vite frontend for dashboards and management pages
- Azure SQL / SQL Server as the primary operational database
- Kafka for event streaming
- Airflow for orchestration and scheduled tasks
- dbt for transformations and data modeling
- Metabase for analytics dashboards
- a machine learning fraud model for scoring claims

---

## 2. High-level architecture

### Frontend
The frontend is a React application served by Vite. It provides:
- login screens
- insurance dashboards
- patient and provider management pages
- claim review pages
- provider claim submission and tracking pages

### Backend
The backend is a FastAPI service. It provides:
- authentication and login endpoints
- claim processing endpoints
- patient and provider listing endpoints
- health and status endpoints
- integration points for the fraud pipeline

### Data layer
The application uses Azure SQL tables for operational data. The project also uses data lake-style folders under the data/ tree for bronze, silver, and gold layers, which are used by the ETL pipeline and downstream analytics.

### Event streaming
Kafka is used to transport claim events between the ingestion and processing steps. Events are published when a claim is submitted and can be consumed by downstream services.

### Workflow orchestration
Airflow is used to coordinate recurring ETL and model retraining tasks. The DAGs manage data movement and transformations without manual intervention.

### Analytics and reporting
dbt builds transformed data models and Metabase provides visual dashboards.

---

## 3. Main components

### 3.1 Frontend
Location: frontend/

Responsibilities:
- render all UI pages
- send requests to the backend API
- manage login state and user session
- display dashboards and lists of patients, providers, claims, and metrics

Key files:
- frontend/src/App.jsx: routes and navigation
- frontend/src/api.js: shared API client
- frontend/src/context/AuthContext.jsx: authentication state
- frontend/src/pages/: page-level UI components

### 3.2 Backend
Location: app/

Responsibilities:
- handle user authentication
- expose REST API endpoints
- connect to the database using SQLAlchemy and pyodbc
- publish claims into Kafka
- serve health and operational status

Key files:
- app/main.py: FastAPI app creation, auth, middleware, health endpoint
- app/routes.py: API endpoints for claims, patients, providers, services, stats
- app/schemas.py: request/response schemas

### 3.3 Core configuration
Location: core/

Responsibilities:
- central settings
- constants
- runtime state

Key files:
- core/config.py: database and Kafka connection settings
- core/constants.py: shared names and constants
- core/state.py: runtime state for producer objects and similar values

### 3.4 Machine learning module
Location: ML/

Responsibilities:
- train or retrain fraud detection models
- score incoming claims
- provide the model artifact used by the prediction pipeline

### 3.5 Data pipeline
Location: data/ and airflow/

Responsibilities:
- ingest data from source tables into bronze
- clean and standardize into silver
- build curated analytics into gold
- orchestrate data refresh and model retraining

---

## 4. End-to-end pipeline

### Step 1: Claim submission
A provider submits a claim through the frontend.

What happens:
1. The React page collects claim details.
2. The frontend sends a request to the backend endpoint /api/process-claim.
3. The backend creates a claim record in the SQL database.
4. The backend publishes a raw claim event to Kafka.

### Step 2: Kafka event flow
The claim event enters the Kafka topic for raw claims.

What happens:
- the event is available for downstream consumers
- the fraud consumer can read the message and process it
- the event acts as a handoff between the submission layer and the scoring layer

### Step 3: Fraud scoring
A consumer or processing service evaluates the claim using the fraud model.

What happens:
- the claim details are loaded
- the model scores the claim for fraud probability
- the result is classified as fraud or not fraud
- the output is persisted back to the data layer or sent to the next stage

### Step 4: Database persistence
The claim result and supporting metadata are stored in the database.

What happens:
- the claim status is updated
- fraud scores and labels become available for review
- insurance staff can inspect and confirm suspicious claims

### Step 5: Review and action
Insurance users review flagged claims in the UI.

What happens:
- the claims page loads reviewable data from the backend
- analysts inspect the claim details
- they mark claims as fraud confirmed or cleared
- the decision updates the backend state

### Step 6: Analytics and reporting
dbt and Metabase build reporting-ready versions of the data.

What happens:
- raw and transformed data are modeled into marts and analytics views
- dashboards display trends, fraud counts, provider risk, and patient distributions

---

## 5. Authentication flow

The backend uses HTTP Basic authentication.

### Login behavior
- the frontend sends the username and password to /api/login
- the backend validates the credentials
- if valid, it returns the user identity and role
- the frontend stores the session information locally

### Supported demo accounts
- insurance admin: admin_insurance / password123
- provider demo user: username 1 / password 123

The backend also allows a few compatibility passwords so the UI and earlier demo flows keep working.

---

## 6. Data model concepts

### Claims
Represents submitted healthcare claims.

Typical fields include:
- claim_id
- policy_number
- claim_amount
- fraud_score
- is_fraud
- risk_level

### Patients
Represents patients in the healthcare dataset.

Typical fields include:
- Patient_ID
- Age
- Gender
- City
- State
- Total_Claims_Count

### Providers
Represents hospitals, clinics, pharmacies, urgent care centers, and similar providers.

Typical fields include:
- Provider_ID
- Provider_Type
- Specialty
- City
- State
- Total_Claims_Count

### Policies
Represents insurance policies associated with patient claims.

---

## 7. How the app is started

The stack is orchestrated through Docker Compose.

Common services include:
- app: FastAPI backend
- frontend: React/Vite frontend
- kafka: event streaming broker
- zookeeper: Kafka dependency
- airflow services: orchestration
- metabase: dashboards
- dbt: transformation jobs

You can start the stack with the provided Docker helper scripts or with docker compose.

---

## 8. Important runtime notes

### CORS and browser access
Because the frontend is served from a containerized environment, the backend includes CORS settings that allow browser requests from the expected frontend origins.

### Authentication requirements
Most backend endpoints are protected and require a valid login session.

### Data availability
Some endpoints return real data from SQL Server when the connection is healthy. If database connectivity is unavailable, the system falls back to empty or demo-safe responses.

---

## 9. What each major page does

### Login page
Lets users log in as insurance or provider users.

### Insurance dashboard
Shows fraud-related KPIs and operational overviews.

### Review claims
Lets insurance reviewers inspect and approve or reject suspicious claims.

### Patient management
Shows the patient records available to the insurance staff.

### Provider management
Shows the provider records available for management and review.

### Provider dashboard
Shows claims and metrics for provider-side users.

### Submit claim
Allows a provider to submit a claim to the fraud pipeline.

---

## 10. Current implementation status

The project is functioning as a working demo platform with:
- working Docker-based startup
- backend authentication and API endpoints
- frontend pages for login, dashboards, and management views
- live SQL-backed patient and provider data retrieval
- Kafka-based claim event publishing
- analytics and reporting infrastructure

Some parts remain demo-oriented and may be simplified compared with a production-grade system.

---

## 11. Suggested next improvements

- move authentication to a proper user table with hashed passwords
- add full CRUD persistence for patients and providers
- connect the model scoring pipeline end-to-end to Kafka consumers
- improve the UI with stronger error handling and pagination
- add role-based access control for insurance versus provider users
- add tests for API and frontend workflows

---

## 12. Summary

This system is a healthcare fraud detection application that takes claims, evaluates them with machine learning, stores results in a database, and exposes the data through a dashboard-driven web application. It is designed to help insurance teams review suspicious claims and to give providers a way to submit and track claims.
