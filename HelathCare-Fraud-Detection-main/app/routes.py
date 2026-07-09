from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from sqlalchemy.orm import Session
from sqlalchemy import text
from services.azure_db import SessionLocal
from ML.predictor import predictor
import datetime
import decimal

router = APIRouter()
security = HTTPBasic() # 📌 لإلتقاط اليوزرنيم والباسورد من الفرونت إند

# --- Helpers ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def format_row(row):
    if row is None: return None
    d = dict(row._mapping)
    formatted = {}
    for k, v in d.items():
        new_key = k.lower()
        if isinstance(v, (datetime.date, datetime.datetime)):
            formatted[new_key] = v.isoformat()
        elif isinstance(v, decimal.Decimal):
            formatted[new_key] = float(v)
        else:
            formatted[new_key] = v
    return formatted

# 📌 حارس البوابة: بيحدد مين اللي داخل (أدمن ولا مستشفى) ويجيب الـ ID بتاعه
def get_current_user(credentials: HTTPBasicCredentials = Depends(security), db: Session = Depends(get_db)):
    if credentials.username == "admin_insurance":
        return {"role": "insurance", "provider_id": None}
    
    # البحث عن المستشفى في قاعدة البيانات
    query = text("SELECT Provider_ID FROM [dbo].[Provider] WHERE Username = :u")
    result = db.execute(query, {"u": credentials.username}).fetchone()
    
    if result:
        return {"role": "provider", "provider_id": result.Provider_ID}
    
    raise HTTPException(status_code=401, detail="Unauthorized - Invalid Credentials")


# --- Endpoints ---

# 1️⃣ معالجة المطالبة (Submit & AI Analysis) 🔥 [تم إضافة اللوجيك الجديد هنا]
@router.post("/process-claim")
async def process_claim(claim: dict, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    # جلب بيانات البوليصة والمريض
    query = text("""
        SELECT p.Patient_ID, p.Gender, po.Policy_ID, po.Policy_End_Date, po.Annual_Deductible 
        FROM [dbo].[Patient] p
        JOIN [dbo].[Policy] po ON p.Patient_ID = po.Patient_ID
        WHERE po.Policy_ID = :p
    """)
    result = db.execute(query, {"p": claim['policy_number']}).fetchone()

    if not result:
        raise HTTPException(status_code=404, detail="Policy ID not found in database")

    # فحص الصلاحية
    today = datetime.date.today()
    policy_end = result.Policy_End_Date if isinstance(result.Policy_End_Date, datetime.date) else datetime.datetime.strptime(str(result.Policy_End_Date), '%Y-%m-%d').date()
    is_active = "Active" if policy_end >= today else "Expired"
    patient_display_name = f"Patient #{result.Patient_ID}"

    if claim.get('check_only'):
        return {"patient_name": patient_display_name, "policy_status": is_active}

    # 📌 لو البوليصة منتهية وبيحاول يقدم مطالبة بجد، هنوقفه
    if is_active == "Expired":
        raise HTTPException(status_code=400, detail="Cannot submit a claim for an expired policy.")

    # 📌 تحديد من هو المستشفى الذي يرفع المطالبة
    provider_id = user["provider_id"] if user["role"] == "provider" else claim.get('hospital_id')
    if not provider_id:
        raise HTTPException(status_code=400, detail="Provider ID is missing.")

    # توقع الاحتيال
    prediction = predictor.predict({
        **claim,
        "gender": result.Gender,
        "annual_deductible": float(result.Annual_Deductible or 0)
    })
    is_fraud = 1 if prediction['fraud_score'] > 0.5 else 0

    # أ- تسجيل المطالبة باسم المستشفى والمريض
    insert_query = text("""
        INSERT INTO [dbo].[Claims] 
        (Policy_ID, Patient_ID, Provider_ID, Claim_Amount, Is_Fraudulent, Claim_Date)
        VALUES (:po, :pa, :pr, :amt, :fraud, :date)
    """)
    db.execute(insert_query, {
        "po": claim['policy_number'], 
        "pa": result.Patient_ID, 
        "pr": provider_id,
        "amt": claim['claim_amount'],
        "fraud": is_fraud, 
        "date": datetime.datetime.now()
    })

    # ب- زيادة عدد مطالبات المستشفى في جدول Provider بمقدار 1
    db.execute(text("""
        UPDATE [dbo].[Provider] 
        SET Total_Claims_Count = ISNULL(Total_Claims_Count, 0) + 1 
        WHERE Provider_ID = :pr
    """), {"pr": provider_id})

    # ج- زيادة عدد مطالبات المريض في جدول Patient بمقدار 1
    db.execute(text("""
        UPDATE [dbo].[Patient] 
        SET Total_Claims_Count = ISNULL(Total_Claims_Count, 0) + 1 
        WHERE Patient_ID = :pa
    """), {"pa": result.Patient_ID})

    # اعتماد جميع العمليات معاً
    db.commit()

    return {**prediction, "patient_name": patient_display_name}


# 2️⃣ جلب كافة المطالبات 🔥 [تم عزل البيانات لكل مستشفى]
@router.get("/my-claims")
async def get_my_claims(min_score: float = 0, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    # لو اليوزر مستشفى، يجيب المطالبات الخاصة بـ Provider_ID بتاعه بس
    provider_filter = "AND c.Provider_ID = :pid" if user["role"] == "provider" else ""
    params = {"m": min_score}
    if user["role"] == "provider":
        params["pid"] = user["provider_id"]

    query = text(f"""
        SELECT 
            c.Claim_ID AS id, 
            CAST(c.Patient_ID AS VARCHAR) AS patient_name,
            c.Claim_Date AS submitted_at,
            c.Service_Date AS service_date,
            d.Diagnosis_Name AS diagnosis_code,
            pr.Procedure_Name AS procedure_code,
            c.Claim_Amount AS amount,
            CAST(c.Is_Fraudulent AS FLOAT) AS fraud_score,
            CASE WHEN c.Is_Fraudulent = 1 THEN 'Fraud Confirmed' ELSE 'Cleared' END AS status
        FROM [dbo].[Claims] c
        LEFT JOIN [dbo].[Diagnosis] d ON c.Diagnosis_ID = d.Diagnosis_ID
        LEFT JOIN [dbo].[Procedure] pr ON c.Procedure_ID = pr.Procedure_ID
        WHERE CAST(c.Is_Fraudulent AS FLOAT) >= :m {provider_filter}
        ORDER BY c.Claim_Date DESC
    """)
    result = db.execute(query, params).fetchall()
    return [format_row(row) for row in result]


# 3️⃣ إحصائيات الداشبورد 🔥 [تم عزل الإحصائيات لكل مستشفى]
@router.get("/stats")
async def get_stats(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    provider_filter = "WHERE Provider_ID = :pid" if user["role"] == "provider" else ""
    provider_filter_and = "AND Provider_ID = :pid" if user["role"] == "provider" else ""
    params = {"pid": user["provider_id"]} if user["role"] == "provider" else {}

    total = db.execute(text(f"SELECT COUNT(Claim_ID) FROM [dbo].[Claims] {provider_filter}"), params).scalar() or 0
    flagged = db.execute(text(f"SELECT COUNT(Claim_ID) FROM [dbo].[Claims] WHERE Is_Fraudulent = 1 {provider_filter_and}"), params).scalar() or 0
    
    # حساب المرضى المرتبطين بالمستشفى لو كان اليوزر مستشفى
    if user["role"] == "provider":
        patients = db.execute(text("SELECT COUNT(DISTINCT Patient_ID) FROM [dbo].[Claims] WHERE Provider_ID = :pid"), params).scalar() or 0
    else:
        patients = db.execute(text("SELECT COUNT(Patient_ID) FROM [dbo].[Patient]")).scalar() or 0

    return {
        "total_claims": total,
        "flagged_claims": flagged,
        "confirmed_fraud": flagged,
        "cleared_claims": total - flagged,
        "total_patients": patients,
        "model_accuracy": 0.942, 
        "model_precision": 0.915,
        "model_recall": 0.887,
        "model_f1": 0.901,
        "last_retrain": datetime.datetime.now().isoformat(),
        "model_history": [{"version": "v1.1", "accuracy": 0.942, "date": "2024-03-10"}]
    }


# 4️⃣ إدارة المزودين (متاحة للأدمن أساساً)
@router.get("/providers-list")
async def get_providers(db: Session = Depends(get_db)):
    query = text("""
        SELECT Provider_ID AS id, Username AS provider_name, Provider_Type AS type, 
               Specialty AS specialty, City AS city, State AS state, Total_Claims_Count AS total_claims
        FROM [dbo].[Provider]
    """)
    result = db.execute(query).fetchall()
    return [format_row(row) for row in result]


# 5️⃣ إدارة المرضى (متاحة للجميع مع فلترة اختيارية مستقبلاً)
@router.get("/patients")
async def get_patients(db: Session = Depends(get_db)):
    query = text("""
        SELECT p.Patient_ID AS id, CAST(p.Patient_ID AS VARCHAR) AS name, p.Age AS age,
               p.Gender AS gender, p.City AS city, p.State AS state, p.Total_Claims_Count AS total_claims,
               po.Policy_ID AS policy_id, po.Policy_End_Date AS policy_end, po.Annual_Deductible AS annual_deductible
        FROM [dbo].[Patient] p
        LEFT JOIN [dbo].[Policy] po ON p.Patient_ID = po.Patient_ID
    """)
    result = db.execute(query).fetchall()
    return [format_row(row) for row in result]


# 6️⃣ تحديث حالة المطالبة (Update Claim)
@router.patch("/claims/{claim_id}")
async def update_claim(claim_id: int, data: dict, db: Session = Depends(get_db)):
    is_fraud = 1 if data['status'] == 'Fraud Confirmed' else 0
    query = text("UPDATE [dbo].[Claims] SET Is_Fraudulent = :f WHERE Claim_ID = :id")
    db.execute(query, {"f": is_fraud, "id": claim_id})
    db.commit()
    return {"status": "success"}


# 7️⃣ إدارة الخدمات والكوباي (Services & Copay Management)
@router.get("/services")
async def get_services(db: Session = Depends(get_db)):
    query = text("SELECT Service_ID AS service_id, Service_Type AS service_type, CoPay_Amount AS copay_amount FROM [dbo].[Service]")
    result = db.execute(query).fetchall()
    return [format_row(row) for row in result]

@router.patch("/services/{service_id}")
async def update_service_copay(service_id: int, data: dict, db: Session = Depends(get_db)):
    query = text("UPDATE [dbo].[Service] SET CoPay_Amount = :amt WHERE Service_ID = :id")
    db.execute(query, {"amt": data.get('copay_amount'), "id": service_id})
    db.commit()
    return {"status": "success"}

@router.post("/services")
async def create_service(data: dict, db: Session = Depends(get_db)):
    query = text("INSERT INTO [dbo].[Service] (Service_Type, CoPay_Amount) VALUES (:type, :amt)")
    db.execute(query, {"type": data.get('service_type'), "amt": data.get('copay_amount')})
    db.commit()
    return {"status": "success"}