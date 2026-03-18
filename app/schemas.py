from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import date, datetime

# 1️⃣ بيانات تقديم مطالبة (Submit Claim)
# دي الحقول اللي الموديل بيحتاجها عشان يحسب الـ Features الـ 24
class ClaimCreate(BaseModel):
    policy_number: str = Field(..., example="XAI215993963")
    claim_amount: float = Field(..., gt=0)
    service_type: str = Field(..., example="Inpatient")
    diagnosis_code: Optional[str] = "N/A"
    procedure_code: Optional[str] = "N/A"
    admission_type: Optional[str] = "Emergency"
    distance_miles: Optional[float] = 0.0
    hospital_id: Optional[str] = None
    check_only: Optional[bool] = False

# 2️⃣ تحديث حالة المطالبة (Audit/Review)
# لصفحات ReviewClaims و FlaggedClaims
class ClaimUpdate(BaseModel):
    status: str = Field(..., example="Fraud Confirmed")
    label: Optional[str] = None # 'Fraud' أو 'Real'

# 3️⃣ إدارة السياسات والتأمين (Policy/Copay)
# لصفحة CopayManagement
class PolicyUpdate(BaseModel):
    copay: Optional[float] = Field(None, ge=0, le=100)
    annual_deductible: Optional[float] = Field(None, ge=0)
    policy_end: Optional[date] = None

# 4️⃣ إدارة بيانات المرضى (Patient Management)
class PatientUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = Field(None, ge=0, le=120)
    city: Optional[str] = None
    state: Optional[str] = None

# 5️⃣ السجلات المصنفة (Labeled Data)
# لإضافة بيانات التدريب يدوياً أو Bulk
class LabeledRecordCreate(BaseModel):
    claim_id: str
    patient_name: Optional[str] = None
    provider_name: Optional[str] = None
    amount: float
    label: str  # 'Fraud' أو 'Real'
    notes: Optional[str] = None

# 6️⃣ إحصائيات الداشبورد والموديل (Full Metrics)
# دي بتغذي صفحة Model Performance و Insurance Dashboard
class DashboardStats(BaseModel):
    total_claims: int
    flagged_claims: int
    confirmed_fraud: int
    cleared_claims: int
    total_patients: int
    model_accuracy: float
    model_precision: float
    model_recall: float
    model_f1: float
    last_retrain: Optional[str] = None
    model_history: List[Dict[str, Any]] = []

    # يسمح لـ Pydantic بقراءة البيانات من كائنات SQLAlchemy (Azure SQL)
    model_config = ConfigDict(from_attributes=True)

# 7️⃣ بيانات تسجيل الدخول (Auth)
class UserLogin(BaseModel):
    username: str
    password: str

# 8️⃣ استجابة تسجيل الدخول (Login Response)
class LoginResponse(BaseModel):
    username: str
    role: str # 'admin' or 'provider'
    message: str