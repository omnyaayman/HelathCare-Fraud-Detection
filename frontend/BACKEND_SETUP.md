# Backend API Setup Guide

This document describes the API endpoints that the frontend expects. Build your backend (e.g., FastAPI, Express, Django) to implement these endpoints.

## Base URL

Set via the `VITE_API_URL` environment variable. Defaults to `http://localhost:8000`.

Create a `.env` file in the project root:

```
VITE_API_URL=http://localhost:8000
```

---

## Authentication

All endpoints except `POST /auth/login` require a Bearer token in the `Authorization` header:

```
Authorization: Bearer <token>
```

---

## Endpoints

### 1. `POST /auth/login`

Authenticates a user and returns a token.

**Request body:**

```json
{
  "username": "string",
  "password": "string"
}
```

**Response (200):**

```json
{
  "id": 1,
  "username": "hospital_admin",
  "name": "City General Hospital",
  "role": "hospital",
  "token": "jwt-token-string"
}
```

`role` must be one of: `"hospital"`, `"insurance"`, `"admin"`

**Error (401):**

```json
{
  "detail": "Invalid username or password"
}
```

---

### 2. `GET /admin/users`

Returns all users in the system. **Admin-only**.

**Response (200):**

```json
[
  {
    "id": 1,
    "username": "hospital_admin",
    "name": "City General Hospital",
    "role": "hospital"
  },
  {
    "id": 2,
    "username": "admin",
    "name": "System Administrator",
    "role": "admin"
  }
]
```

> Do **not** return passwords.

---

### 3. `POST /admin/users`

Creates a new user. **Admin-only**.

**Request body:**

```json
{
  "username": "string",
  "password": "string",
  "name": "string",
  "role": "hospital | insurance | admin"
}
```

**Response (201):**

```json
{
  "id": 6,
  "username": "new_hospital",
  "name": "New Hospital",
  "role": "hospital"
}
```

**Error (409):**

```json
{
  "detail": "Username already exists"
}
```

---

### 4. `DELETE /admin/users/{id}`

Deletes a user by ID. **Admin-only**. Do not allow admins to delete themselves.

**Response (200):**

```json
{
  "success": true
}
```

**Error (400):**

```json
{
  "detail": "Cannot delete your own account"
}
```

---

### 5. `POST /claims`

Submits a new insurance claim.

**Request body:**

```json
{
  "patient_name": "string",
  "patient_id": "string",
  "provider": "string",
  "procedure": "string",
  "diagnosis_code": "string",
  "amount": 15000,
  "submitted_at": "2025-01-15T10:30:00Z"
}
```

**Response (201):**

```json
{
  "id": "CLM-0001",
  "status": "Pending",
  "fraud_score": 0.0,
  "...all submitted fields"
}
```

---

### 6. `GET /claims`

Returns a list of claims. Supports optional query parameters for filtering:

- `?status=Pending`
- `?provider=CityMed`
- `?min_score=0.6`
- `?page=1&limit=50`

**Response (200):**

```json
[
  {
    "id": "CLM-0001",
    "patient_name": "John Doe",
    "patient_id": "PAT-1234",
    "provider": "City Medical Center",
    "procedure": "MRI Brain",
    "diagnosis_code": "G43.909",
    "amount": 15000,
    "fraud_score": 0.85,
    "status": "Flagged",
    "label": null,
    "submitted_at": "2025-01-15T10:30:00Z",
    "processed_at": "2025-01-15T11:00:00Z"
  }
]
```

**Field definitions:**

| Field | Type | Values |
|-------|------|--------|
| `status` | string | `Pending`, `Processing`, `Flagged`, `Cleared`, `Fraud Confirmed` |
| `label` | string or null | `null`, `Real`, `Fraud` |
| `fraud_score` | float | `0.0` to `1.0` |

---

### 7. `GET /claims/{id}`

Returns a single claim by ID.

**Response (200):** Same shape as a single item in `GET /claims`.

---

### 8. `PATCH /claims/{id}`

Updates a claim's label (used by insurance reviewers).

**Request body:**

```json
{
  "label": "Fraud"
}
```

`label` must be `"Real"` or `"Fraud"`.

**Response (200):**

```json
{
  "id": "CLM-0001",
  "label": "Fraud",
  "status": "Fraud Confirmed"
}
```

When `label` = `"Fraud"`, set `status` to `"Fraud Confirmed"`.  
When `label` = `"Real"`, set `status` to `"Cleared"`.

---

### 9. `GET /admin/metrics`

Returns system-wide analytics for the admin dashboard. **Admin-only**.

**Response (200):**

```json
{
  "total_claims": 1250,
  "flagged_claims": 180,
  "confirmed_fraud": 95,
  "cleared_claims": 975,
  "total_amount": 18500000,
  "fraud_amount": 2850000,
  "model_accuracy": 0.94,
  "model_precision": 0.91,
  "model_recall": 0.88,
  "model_f1": 0.89,
  "last_retrain": "2025-01-10T08:00:00Z",
  "claims_by_status": {
    "Pending": 120,
    "Processing": 45,
    "Flagged": 180,
    "Cleared": 810,
    "Fraud Confirmed": 95
  },
  "monthly_trend": [
    { "month": "Jan", "total": 200, "flagged": 30 },
    { "month": "Feb", "total": 220, "flagged": 35 }
  ],
  "model_history": [
    {
      "version": "v1.0",
      "date": "2024-06-15",
      "accuracy": 0.89,
      "f1": 0.85
    },
    {
      "version": "v1.1",
      "date": "2024-09-20",
      "accuracy": 0.92,
      "f1": 0.88
    }
  ]
}
```

---

### 10. `POST /admin/retrain`

Triggers model retraining (e.g., via Airflow DAG). **Admin-only**.

**Response (200):**

```json
{
  "success": true,
  "message": "Retraining pipeline started",
  "dag_run_id": "manual__2025-01-15T12:00:00Z"
}
```

---

### 11. `GET /admin/model-history`

Returns model version history. **Admin-only**.

**Response (200):**

```json
[
  {
    "version": "v1.0",
    "date": "2024-06-15",
    "accuracy": 0.89,
    "f1": 0.85
  }
]
```

---

### 12. `GET /patients`

Returns all patients for the authenticated hospital.

**Response (200):**

```json
[
  {
    "patient_id": "PAT-10001",
    "name": "John Doe",
    "age": 45,
    "gender": "Male",
    "contact": "555-0100",
    "insurance_id": "INS-12345",
    "medical_history": "Type 2 diabetes, hypertension"
  }
]
```

---

### 13. `POST /patients`

Creates a new patient record.

**Request body:**

```json
{
  "name": "John Doe",
  "age": 45,
  "gender": "Male",
  "contact": "555-0100",
  "insurance_id": "INS-12345",
  "medical_history": "Type 2 diabetes"
}
```

**Response (201):**

```json
{
  "patient_id": "PAT-10001",
  "name": "John Doe",
  "age": 45,
  "gender": "Male",
  "contact": "555-0100",
  "insurance_id": "INS-12345",
  "medical_history": "Type 2 diabetes"
}
```

---

### 14. `DELETE /patients/{patient_id}`

Deletes a patient by ID.

**Response (200):**

```json
{ "success": true }
```

---

### 15. `POST /patients/bulk`

Bulk import patients from CSV data. Accepts an array of patient objects.

**Request body:**

```json
[
  { "name": "Jane Smith", "age": 32, "gender": "Female", "contact": "555-0200", "insurance_id": "INS-22222", "medical_history": "" },
  { "name": "Bob Lee", "age": 58, "gender": "Male", "contact": "555-0300", "insurance_id": "INS-33333", "medical_history": "Heart condition" }
]
```

**Response (201):**

```json
{ "imported": 2 }
```

---

### 16. `GET /patients/export`

Returns all patients as a downloadable list (same shape as `GET /patients`).

---

### 17. `GET /labeled-data`

Returns all labeled (verified fraud/real) records for the authenticated insurance company. This data is used for model retraining.

**Response (200):**

```json
[
  {
    "id": "LBL-10001",
    "claim_id": "CLM-0001",
    "patient_name": "John Doe",
    "provider": "City Medical Center",
    "procedure": "MRI Brain",
    "amount": 15000,
    "label": "Fraud",
    "notes": "Duplicate billing confirmed",
    "submitted_at": "2025-01-15T10:30:00Z"
  }
]
```

`label` must be `"Fraud"` or `"Real"`.

---

### 18. `POST /labeled-data`

Creates a new labeled record.

**Request body:**

```json
{
  "claim_id": "CLM-0001",
  "patient_name": "John Doe",
  "provider": "City Medical Center",
  "procedure": "MRI Brain",
  "amount": 15000,
  "label": "Fraud",
  "notes": "Duplicate billing confirmed"
}
```

**Response (201):**

```json
{
  "id": "LBL-10001",
  "claim_id": "CLM-0001",
  "patient_name": "John Doe",
  "provider": "City Medical Center",
  "procedure": "MRI Brain",
  "amount": 15000,
  "label": "Fraud",
  "notes": "Duplicate billing confirmed",
  "submitted_at": "2025-01-15T10:30:00Z"
}
```

---

### 19. `POST /labeled-data/bulk`

Bulk import labeled data from CSV. Accepts an array of objects.

**Request body:**

```json
[
  { "claim_id": "CLM-0001", "patient_name": "John Doe", "provider": "City Med", "procedure": "MRI", "amount": 15000, "label": "Fraud", "notes": "" },
  { "claim_id": "CLM-0002", "patient_name": "Jane Smith", "provider": "Valley Hosp", "procedure": "X-Ray", "amount": 500, "label": "Real", "notes": "" }
]
```

**Response (201):**

```json
{ "imported": 2 }
```

---

### 20. `GET /labeled-data/export`

Returns all labeled data as a downloadable list (same shape as `GET /labeled-data`).

---

## Quick Start Example (FastAPI + Python)

```bash
pip install fastapi uvicorn python-jose[cryptography] passlib[bcrypt]
```

```python
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Implement your routes here matching the endpoints above.
# Use JWT tokens for authentication.
# Store users in a database (PostgreSQL, SQLite, etc.).
# The fraud detection model should be loaded and used to score claims.

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

---

## Database Schema (suggested)

### users

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER | Primary key, auto-increment |
| username | VARCHAR(100) | Unique |
| password_hash | VARCHAR(255) | bcrypt hash |
| name | VARCHAR(200) | Display name |
| role | VARCHAR(20) | `hospital`, `insurance`, `admin` |

### claims

| Column | Type | Notes |
|--------|------|-------|
| id | VARCHAR(20) | Primary key, e.g. `CLM-0001` |
| patient_name | VARCHAR(200) | Denormalized from patients.name |
| patient_id | VARCHAR(20) | FK to patients.patient_id |
| provider | VARCHAR(200) | |
| procedure | VARCHAR(200) | |
| diagnosis_code | VARCHAR(20) | |
| amount | DECIMAL(12,2) | |
| fraud_score | FLOAT | 0.0 to 1.0 |
| status | VARCHAR(30) | |
| label | VARCHAR(10) | Nullable |
| submitted_at | TIMESTAMP | |
| processed_at | TIMESTAMP | Nullable |

### patients

| Column | Type | Notes |
|--------|------|-------|
| patient_id | VARCHAR(20) | Primary key, e.g. `PAT-10001` |
| name | VARCHAR(200) | |
| age | INTEGER | |
| gender | VARCHAR(10) | Male, Female, Other |
| contact | VARCHAR(100) | Phone or email |
| insurance_id | VARCHAR(50) | |
| medical_history | TEXT | |
| hospital_id | INTEGER | FK to users.id (the hospital that owns this patient) |

### labeled_data

| Column | Type | Notes |
|--------|------|-------|
| id | VARCHAR(20) | Primary key, e.g. `LBL-10001` |
| claim_id | VARCHAR(20) | Optional FK to claims.id |
| patient_name | VARCHAR(200) | |
| provider | VARCHAR(200) | |
| procedure | VARCHAR(200) | |
| amount | DECIMAL(12,2) | |
| label | VARCHAR(10) | `Fraud` or `Real` |
| notes | TEXT | |
| submitted_at | TIMESTAMP | |
| insurance_id | INTEGER | FK to users.id (insurance company that submitted this) |

---

## CORS

Make sure your backend allows the frontend origin. During development, the Vite dev server runs on `http://localhost:5173` or `http://localhost:5174`.

## Notes

- Passwords must be hashed (bcrypt) before storing — never store plain text.
- JWT tokens should have a reasonable expiry (e.g., 24 hours).
- The `fraud_score` is computed by the ML model when a claim is submitted or processed.
- The `/admin/retrain` endpoint should trigger your ML pipeline (Airflow DAG, Celery task, etc.).
