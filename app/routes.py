import datetime
import uuid
import decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from schemas import ClaimCreate, ClaimUpdate
from core.state import state
from services.azure_db import SessionLocal
from core.config import settings

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def format_row(row):
    if not row:
        return None
    data = dict(row._mapping)
    for k, v in data.items():
        if isinstance(v, decimal.Decimal):
            data[k] = float(v)
    return data

@router.post("/process-claim")
async def process_claim(claim: ClaimCreate, db: Session = Depends(get_db)):
    claim_id = str(uuid.uuid4())
    payload = {
        "claim_id": claim_id,
        "policy_number": claim.policy_number,
        "claim_amount": float(claim.claim_amount),
        "service_type": claim.service_type,
        "provider_id": claim.provider_id if hasattr(claim, 'provider_id') else None,
        "claim_date": datetime.datetime.utcnow().isoformat()
    }
    # Save initial record
    try:
        db.execute(text(f"""
            INSERT INTO {settings.DB_SCHEMA}.{settings.TABLE_CLAIMS}
            (claim_id, policy_number, claim_amount, fraud_score, is_fraud, risk_level)
            VALUES (:id, :p, :a, 0, 0, 'PENDING')
        """), {"id": claim_id, "p": claim.policy_number, "a": float(claim.claim_amount)})
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Database error: {str(e)}")
    if not state.KAFKA_PRODUCER:
        raise HTTPException(500, "Kafka unavailable")
    try:
        await state.KAFKA_PRODUCER.send_and_wait(settings.TOPIC_CLAIMS_RAW, payload)
    except Exception as e:
        raise HTTPException(500, f"Kafka error: {str(e)}")
    return {"claim_id": claim_id, "status": "queued", "message": "Claim sent for fraud detection"}

@router.get("/my-claims")
async def get_claims(db: Session = Depends(get_db)):
    result = db.execute(text(f"""
        SELECT * FROM {settings.DB_SCHEMA}.{settings.TABLE_CLAIMS}
        ORDER BY claim_id DESC
    """)).fetchall()
    return [format_row(r) for r in result]

@router.patch("/claims/{claim_id}")
async def update_claim(claim_id: str, data: ClaimUpdate, db: Session = Depends(get_db)):
    is_fraud = 1 if data.status == "Fraud Confirmed" else 0
    db.execute(text(f"""
        UPDATE {settings.DB_SCHEMA}.{settings.TABLE_CLAIMS}
        SET is_fraud = :f
        WHERE claim_id = :id
    """), {"f": is_fraud, "id": claim_id})
    db.commit()
    return {"status": "updated", "claim_id": claim_id}