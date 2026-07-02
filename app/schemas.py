from pydantic import BaseModel, Field
from typing import Optional

# =========================
# CLAIM CREATE
# =========================
class ClaimCreate(BaseModel):
    policy_number: str
    claim_amount: float = Field(gt=0)
    service_type: str
    provider_id: Optional[str] = None
    check_only: Optional[bool] = False

# =========================
# CLAIM UPDATE
# =========================
class ClaimUpdate(BaseModel):
    status: str

# =========================
# RESPONSE
# =========================
class ClaimStatusResponse(BaseModel):
    claim_id: str
    policy_number: str
    claim_amount: float
    provider_id: str
    fraud_score: float
    is_fraud: bool
    risk_level: str
    source: Optional[str]