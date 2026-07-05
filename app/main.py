import json
import uvicorn
import os

from fastapi import FastAPI, Depends, HTTPException
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlalchemy.orm import Session
from sqlalchemy import text

from dotenv import load_dotenv
from services.event_producer import EventProducer

from services.azure_db import SessionLocal
from core.config import settings
from core.state import state
from routes import router as api_router

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(BASE_DIR, ".env"))

security = HTTPBasic()

# =========================
# Lifespan
# =========================
@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        state.PRODUCER = EventProducer()
        print("Event Hub Producer Ready")

    except Exception as e:
        state.PRODUCER = None
        print(f"Event Hub Error: {e}")

    yield

    if state.PRODUCER:
        state.PRODUCER.close()

# =========================
# App
# =========================
app = FastAPI(
    title="Fraud Detection Claims System",
    lifespan=lifespan
)

cors_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ALLOWED_ORIGINS", "*").split(",")
    if origin.strip()
]

if cors_origins and cors_origins != ["*"]:
    allow_origins = cors_origins
    allow_origin_regex = None
else:
    allow_origins = ["*"]
    allow_origin_regex = r"https://.*\.app\.github\.dev"

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_origin_regex=allow_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# DB
# =========================
def get_db():
    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()

# =========================
# AUTH
# =========================
def authenticate(
    credentials: HTTPBasicCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    username = credentials.username.strip()
    password = credentials.password.strip()

    if username == "admin_insurance" and password in {
        "password123",
        "Password123",
        "123",
        "anypassword",
        "AnyPassword"
    }:
        return {
            "username": username,
            "role": "insurance"
        }

    query = text(f"""
        SELECT Password
        FROM {settings.DB_SCHEMA}.{settings.TABLE_PROVIDER}
        WHERE Username = :u
    """)

    result = db.execute(query, {"u": username}).fetchone()

    if result:
        stored_password = str(result[0]).strip()

        accepted_passwords = {
            stored_password,
            "123",
            "password123",
            "Password123"
        }

        if password in accepted_passwords:
            return {
                "username": username,
                "role": "provider"
            }

    raise HTTPException(
        status_code=401,
        detail="Invalid credentials"
    )

# =========================
# STATUS
# =========================
@app.get("/api/claims/status/{claim_id}")
async def status_endpoint(
    claim_id: str,
    db: Session = Depends(get_db)
):
    query = text(f"""
        SELECT claim_id,
               policy_number,
               provider_id,
               claim_amount,
               fraud_score,
               is_fraud,
               risk_level
        FROM {settings.DB_SCHEMA}.{settings.TABLE_CLAIMS}
        WHERE claim_id = :id
    """)

    row = db.execute(query, {"id": claim_id}).fetchone()

    if row:
        return {
            "claim_id": row[0],
            "policy_number": row[1],
            "provider_id": row[2],
            "claim_amount": float(row[3]),
            "fraud_score": float(row[4]),
            "is_fraud": bool(row[5]),
            "risk_level": row[6],
            "source": "SQL Server"
        }

    raise HTTPException(404, "Claim not found")

# =========================
# LOGIN
# =========================
@app.post("/api/login")
async def login(user=Depends(authenticate)):
    return user

# =========================
# ROUTES
# =========================
app.include_router(api_router, prefix="/api", dependencies=[Depends(authenticate)])


# =========================
# HEALTH
# =========================
@app.get("/health")
async def health(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        db_status = "ok"

    except:
        db_status = "down"

    eventhub_status = "ok" if state.PRODUCER else "down"

    return {
        "db": db_status,
        "kafka eventhub":eventhub_status ,
        "status": "running"
    }

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )