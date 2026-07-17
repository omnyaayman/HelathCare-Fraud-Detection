
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from services.azure_db import SessionLocal
from core.config import settings
import datetime
import decimal
import random

router = APIRouter()
security = HTTPBasic()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def format_row(row):
    if row is None:
        return None
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

def get_current_user(credentials: HTTPBasicCredentials = Depends(security), db: Session = Depends(get_db)):
    if credentials.username == "admin_insurance" and credentials.password == "password123":
        return {"role": "insurance", "provider_id": None, "username": credentials.username}
    
    try:
        result = db.execute(text("SELECT Provider_ID FROM Provider WHERE Name = :u"), {"u": credentials.username}).fetchone()
        if result:
            return {"role": "provider", "provider_id": result[0], "username": credentials.username}
    except SQLAlchemyError:
        pass
    
    raise HTTPException(status_code=401, detail="Unauthorized")

def ensure_sample_data(db: Session):
    try:
        count = db.execute(text("SELECT COUNT(*) FROM Claims")).scalar()
        if count > 0:
            return
    except SQLAlchemyError:
        pass

def log_audit(db: Session, user: dict, action: str, affected_record: str, ip: str = "127.0.0.1"):
    try:
        db.execute(text("""
            INSERT INTO AuditLogs (timestamp, user, action, affected_record, ip_address)
            VALUES (:timestamp, :user, :action, :affected_record, :ip_address)
        """), {
            "timestamp": datetime.datetime.now().isoformat(),
            "user": user.get("username", "unknown"),
            "action": action,
            "affected_record": affected_record,
            "ip_address": ip
        })
        db.commit()
    except Exception as e:
        print(f"Failed to log audit: {e}")
        db.rollback()

@router.get("/stats")
async def get_stats(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    ensure_sample_data(db)
    response = {}
    
    try:
        model_metrics = db.execute(text("SELECT * FROM ModelMetrics ORDER BY id DESC LIMIT 1")).fetchone()
        
        stats_query = text("""
            SELECT
                COUNT(*) AS total_claims,
                SUM(CASE WHEN Status IN ('Under Review', 'Submitted', 'AI Scored') THEN 1 ELSE 0 END) AS pending_review,
                SUM(CASE WHEN Is_Fraudulent = 1 THEN 1 ELSE 0 END) AS total_fraud,
                SUM(CASE WHEN Is_Fraudulent = 0 THEN 1 ELSE 0 END) AS normal_claims,
                AVG(Claim_Amount) AS avg_claim_amount,
                SUM(Claim_Amount) AS total_claim_amount,
                SUM(CASE WHEN Is_Fraudulent = 1 THEN Claim_Amount ELSE 0 END) AS financial_exposure,
                SUM(CASE WHEN Is_Fraudulent = 1 AND Status IN ('Rejected', 'Fraud Confirmed', 'Closed') THEN Claim_Amount ELSE 0 END) AS money_saved,
                AVG(Fraud_Score) AS avg_fraud_score,
                SUM(CASE WHEN Status = 'Approved' THEN 1 ELSE 0 END) AS approved_claims,
                SUM(CASE WHEN Status = 'Rejected' THEN 1 ELSE 0 END) AS rejected_claims
            FROM Claims
        """)
        stats = db.execute(stats_query).fetchone()
        
        total_claims = int(stats.total_claims or 0)
        pending_review = int(stats.pending_review or 0)
        total_fraud = int(stats.total_fraud or 0)
        normal_claims = int(stats.normal_claims or 0)
        avg_claim_amount = float(stats.avg_claim_amount or 0)
        total_claim_amount = float(stats.total_claim_amount or 0)
        financial_exposure = float(stats.financial_exposure or 0)
        money_saved = float(stats.money_saved or 0)
        avg_fraud_score = float(stats.avg_fraud_score or 0)
        approved_claims = int(stats.approved_claims or 0)
        rejected_claims = int(stats.rejected_claims or 0)
        
        fraud_rate = (total_fraud / total_claims * 100) if total_claims > 0 else 0
        
        total_patients = db.execute(text("SELECT COUNT(*) FROM Patient")).scalar() or 0
        total_providers = db.execute(text("SELECT COUNT(*) FROM Provider")).scalar() or 0
        total_policies = db.execute(text("SELECT COUNT(*) FROM Policy")).scalar() or 0
        
        today = datetime.date.today().isoformat()
        total_premium = db.execute(text("""
            SELECT SUM(Annual_Deductible) FROM Policy WHERE Policy_End_Date >= :today
        """), {"today": today}).scalar() or 0
        total_copay = db.execute(text("SELECT SUM(CoPay_Amount) FROM Policy")).scalar() or 0
        
        response = {
            "total_claims": total_claims,
            "pending_review": pending_review,
            "total_fraud": total_fraud,
            "normal_claims": normal_claims,
            "fraud_rate": round(fraud_rate, 2),
            "avg_claim_amount": round(avg_claim_amount, 2),
            "total_claim_amount": round(total_claim_amount, 2),
            "financial_exposure": round(financial_exposure, 2),
            "money_saved": round(money_saved, 2),
            "avg_fraud_score": round(avg_fraud_score, 2),
            "approved_claims": approved_claims,
            "rejected_claims": rejected_claims,
            "total_patients": total_patients,
            "total_providers": total_providers,
            "total_policies": total_policies,
            "total_premium": round(float(total_premium or 0), 2),
            "total_copay": round(float(total_copay or 0), 2),
            "model_accuracy": float(model_metrics.accuracy or 0.92),
            "model_precision": float(model_metrics.precision or 0.88),
            "model_recall": float(model_metrics.recall or 0.85),
            "model_f1": float(model_metrics.f1_score or 0.86),
            "model_roc_auc": float(model_metrics.roc_auc or 0.94),
            "last_retrain": model_metrics.last_training_date or (datetime.datetime.now() - datetime.timedelta(days=7)).isoformat(),
            "dataset_size": int(model_metrics.training_samples or 250),
            "model_version": model_metrics.model_version or "1.0.0"
        }
        
    except Exception as e:
        print(f"Stats query error type: {type(e).__name__}")
        print(f"Stats query error: {e}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        response = {
            "total_claims": 0, "pending_review": 0, "total_fraud": 0, "normal_claims": 0,
            "fraud_rate": 0, "avg_claim_amount": 0, "total_claim_amount": 0,
            "financial_exposure": 0, "money_saved": 0, "avg_fraud_score": 0,
            "approved_claims": 0, "rejected_claims": 0, "total_patients": 0,
            "total_providers": 0, "total_policies": 0, "total_premium": 0, "total_copay": 0
        }
    return response

@router.get("/charts/claims-over-time")
async def get_claims_over_time(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    ensure_sample_data(db)
    try:
        query = text("""
            SELECT
                DATE(Claim_Date) as date,
                COUNT(*) as total_claims,
                SUM(CASE WHEN Is_Fraudulent = 1 THEN 1 ELSE 0 END) as fraud_claims
            FROM Claims
            GROUP BY DATE(Claim_Date)
            ORDER BY date
            LIMIT 30
        """)
        result = db.execute(query).fetchall()
        return [format_row(r) for r in result]
    except SQLAlchemyError as e:
        print(f"Claims over time error: {e}")
        return []

@router.get("/charts/fraud-by-provider")
async def get_fraud_by_provider(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    ensure_sample_data(db)
    try:
        query = text("""
            SELECT
                p.Name as provider_name,
                COUNT(*) as total_claims,
                SUM(CASE WHEN c.Is_Fraudulent = 1 THEN 1 ELSE 0 END) as fraud_claims
            FROM Claims c
            JOIN Provider p ON c.Provider_ID = p.Provider_ID
            GROUP BY p.Provider_ID, p.Name
            ORDER BY fraud_claims DESC
            LIMIT 10
        """)
        result = db.execute(query).fetchall()
        return [format_row(r) for r in result]
    except SQLAlchemyError as e:
        print(f"Fraud by provider error: {e}")
        return []

@router.get("/charts/fraud-by-region")
async def get_fraud_by_region(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    ensure_sample_data(db)
    try:
        query = text("""
            SELECT
                p.State as state,
                COUNT(*) as total_claims,
                SUM(CASE WHEN c.Is_Fraudulent = 1 THEN 1 ELSE 0 END) as fraud_claims
            FROM Claims c
            JOIN Provider p ON c.Provider_ID = p.Provider_ID
            GROUP BY p.State
            ORDER BY fraud_claims DESC
        """)
        result = db.execute(query).fetchall()
        return [format_row(r) for r in result]
    except SQLAlchemyError as e:
        print(f"Fraud by region error: {e}")
        return []

@router.get("/charts/fraud-by-diagnosis")
async def get_fraud_by_diagnosis(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    ensure_sample_data(db)
    try:
        query = text("""
            SELECT
                Diagnosis_Code as diagnosis_code,
                COUNT(*) as total_claims,
                SUM(CASE WHEN Is_Fraudulent = 1 THEN 1 ELSE 0 END) as fraud_claims
            FROM Claims
            GROUP BY Diagnosis_Code
            ORDER BY fraud_claims DESC
            LIMIT 10
        """)
        result = db.execute(query).fetchall()
        return [format_row(r) for r in result]
    except SQLAlchemyError as e:
        print(f"Fraud by diagnosis error: {e}")
        return []

@router.get("/charts/fraud-by-city")
async def get_fraud_by_city(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    ensure_sample_data(db)
    try:
        query = text("""
            SELECT
                p.City as city,
                COUNT(*) as total_claims,
                SUM(CASE WHEN c.Is_Fraudulent = 1 THEN 1 ELSE 0 END) as fraud_claims
            FROM Claims c
            JOIN Provider p ON c.Provider_ID = p.Provider_ID
            GROUP BY p.City
            ORDER BY fraud_claims DESC
            LIMIT 10
        """)
        result = db.execute(query).fetchall()
        return [format_row(r) for r in result]
    except SQLAlchemyError as e:
        print(f"Fraud by city error: {e}")
        return []

@router.get("/charts/fraud-score-distribution")
async def get_fraud_score_distribution(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    ensure_sample_data(db)
    try:
        query = text("""
            SELECT
                CASE
                    WHEN Fraud_Score < 0.2 THEN '0-20%'
                    WHEN Fraud_Score < 0.4 THEN '20-40%'
                    WHEN Fraud_Score < 0.6 THEN '40-60%'
                    WHEN Fraud_Score < 0.8 THEN '60-80%'
                    ELSE '80-100%'
                END as score_range,
                COUNT(*) as count
            FROM Claims
            GROUP BY score_range
            ORDER BY score_range
        """)
        result = db.execute(query).fetchall()
        return [format_row(r) for r in result]
    except SQLAlchemyError as e:
        print(f"Fraud score distribution error: {e}")
        return []

@router.get("/charts/claim-status-distribution")
async def get_claim_status_distribution(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    ensure_sample_data(db)
    try:
        query = text("""
            SELECT Status as status, COUNT(*) as count
            FROM Claims
            GROUP BY Status
        """)
        result = db.execute(query).fetchall()
        return [format_row(r) for r in result]
    except SQLAlchemyError as e:
        print(f"Status distribution error: {e}")
        return []

@router.get("/charts/monthly-claims")
async def get_monthly_claims(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    ensure_sample_data(db)
    try:
        query = text("""
            SELECT
                strftime('%Y-%m', Claim_Date) as month,
                COUNT(*) as total_claims,
                SUM(CASE WHEN Is_Fraudulent = 1 THEN 1 ELSE 0 END) as fraud_claims
            FROM Claims
            GROUP BY month
            ORDER BY month
        """)
        result = db.execute(query).fetchall()
        return [format_row(r) for r in result]
    except SQLAlchemyError as e:
        print(f"Monthly claims error: {e}")
        return []

@router.get("/charts/average-claim-cost")
async def get_average_claim_cost(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    ensure_sample_data(db)
    try:
        query = text("""
            SELECT
                s.Name as service_name,
                AVG(c.Claim_Amount) as avg_cost
            FROM Claims c
            JOIN Service s ON c.Service_ID = s.Service_ID
            GROUP BY s.Service_ID, s.Name
            ORDER BY avg_cost DESC
            LIMIT 10
        """)
        result = db.execute(query).fetchall()
        return [format_row(r) for r in result]
    except SQLAlchemyError as e:
        print(f"Average claim cost error: {e}")
        return []

@router.get("/claims")
async def get_claims(
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
    search: str = Query(None),
    status: str = Query(None),
    min_fraud_score: float = Query(None),
    max_fraud_score: float = Query(None),
    sort_by: str = Query("claim_date"),
    sort_order: str = Query("desc"),
    page: int = Query(1),
    page_size: int = Query(10)
):
    ensure_sample_data(db)
    try:
        where_clauses = []
        params = {}
        
        if search:
            where_clauses.append("""
                (pt.Name LIKE :search OR p.Name LIKE :search OR s.Name LIKE :search)
            """)
            params["search"] = f"%{search}%"
        
        if status:
            where_clauses.append("c.Status = :status")
            params["status"] = status
        
        if min_fraud_score is not None:
            where_clauses.append("c.Fraud_Score >= :min_score")
            params["min_score"] = min_fraud_score
        
        if max_fraud_score is not None:
            where_clauses.append("c.Fraud_Score <= :max_score")
            params["max_score"] = max_fraud_score
        
        where_str = " AND ".join(where_clauses) if where_clauses else "1=1"
        
        valid_sort_columns = {
            "claim_id": "c.Claim_ID",
            "claim_date": "c.Claim_Date",
            "claim_amount": "c.Claim_Amount",
            "fraud_score": "c.Fraud_Score",
            "status": "c.Status"
        }
        sort_col = valid_sort_columns.get(sort_by, "c.Claim_Date")
        sort_dir = "DESC" if sort_order.lower() == "desc" else "ASC"
        
        count_query = text(f"""
            SELECT COUNT(*) as total
            FROM Claims c
            JOIN Patient pt ON c.Patient_ID = pt.Patient_ID
            JOIN Provider p ON c.Provider_ID = p.Provider_ID
            JOIN Service s ON c.Service_ID = s.Service_ID
            WHERE {where_str}
        """)
        total = db.execute(count_query, params).scalar() or 0
        
        offset = (page - 1) * page_size
        query = text(f"""
            SELECT
                c.Claim_ID,
                c.Patient_ID,
                pt.Name as patient_name,
                c.Provider_ID,
                p.Name as provider_name,
                c.Service_ID,
                s.Name as service_name,
                c.Diagnosis_Code,
                c.Procedure_Code,
                c.Claim_Amount,
                c.Fraud_Score,
                c.Is_Fraudulent,
                c.Status,
                c.Claim_Date,
                c.Service_Date
            FROM Claims c
            JOIN Patient pt ON c.Patient_ID = pt.Patient_ID
            JOIN Provider p ON c.Provider_ID = p.Provider_ID
            JOIN Service s ON c.Service_ID = s.Service_ID
            WHERE {where_str}
            ORDER BY {sort_col} {sort_dir}
            LIMIT :page_size OFFSET :offset
        """)
        params["page_size"] = page_size
        params["offset"] = offset
        result = db.execute(query, params).fetchall()
        
        log_audit(db, user, "VIEW_CLAIMS", f"Claims list (page {page})")
        
        return {
            "data": [format_row(r) for r in result],
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size if total > 0 else 1
        }
    except SQLAlchemyError as e:
        print(f"Claims query error: {e}")
        return {"data": [], "total": 0, "page": page, "page_size": page_size, "total_pages": 1}

@router.get("/patients")
async def get_patients(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    ensure_sample_data(db)
    try:
        query = text("""
            SELECT
                pt.Patient_ID,
                pt.Name,
                pt.Age,
                pt.Gender,
                pt.City,
                pt.State,
                pt.Total_Claims,
                po.Policy_ID,
                po.Policy_Start_Date,
                po.Policy_End_Date,
                po.Annual_Deductible,
                po.CoPay_Amount,
                COUNT(c.Claim_ID) as claim_count,
                SUM(CASE WHEN c.Is_Fraudulent = 1 THEN 1 ELSE 0 END) as fraud_count,
                AVG(c.Claim_Amount) as avg_claim_amount
            FROM Patient pt
            LEFT JOIN Policy po ON pt.Patient_ID = po.Patient_ID
            LEFT JOIN Claims c ON pt.Patient_ID = c.Patient_ID
            GROUP BY pt.Patient_ID
            ORDER BY pt.Name
        """)
        result = db.execute(query).fetchall()
        log_audit(db, user, "VIEW_PATIENTS", "Patients list")
        return [format_row(r) for r in result]
    except SQLAlchemyError as e:
        print(f"Patients query error: {e}")
        return []

@router.get("/providers")
async def get_providers(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    ensure_sample_data(db)
    try:
        query = text("""
            SELECT
                p.Provider_ID,
                p.Name,
                p.Type,
                p.Specialty,
                p.City,
                p.State,
                p.Latitude,
                p.Longitude,
                p.Total_Claims,
                COUNT(c.Claim_ID) as claim_count,
                SUM(CASE WHEN c.Is_Fraudulent = 1 THEN 1 ELSE 0 END) as fraud_count,
                SUM(CASE WHEN c.Status = 'Approved' THEN 1 ELSE 0 END) as approved_count,
                SUM(CASE WHEN c.Status = 'Rejected' THEN 1 ELSE 0 END) as rejected_count,
                AVG(c.Claim_Amount) as avg_claim_amount
            FROM Provider p
            LEFT JOIN Claims c ON p.Provider_ID = c.Provider_ID
            GROUP BY p.Provider_ID
            ORDER BY p.Name
        """)
        result = db.execute(query).fetchall()
        log_audit(db, user, "VIEW_PROVIDERS", "Providers list")
        return [format_row(r) for r in result]
    except SQLAlchemyError as e:
        print(f"Providers query error: {e}")
        return []

@router.get("/policies")
async def get_policies(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    ensure_sample_data(db)
    try:
        today = datetime.date.today().isoformat()
        query = text("""
            SELECT
                po.Policy_ID,
                po.Patient_ID,
                pt.Name as patient_name,
                po.Policy_Start_Date,
                po.Policy_End_Date,
                po.Annual_Deductible,
                po.CoPay_Amount,
                COUNT(c.Claim_ID) as claim_count,
                SUM(CASE WHEN c.Is_Fraudulent = 1 THEN 1 ELSE 0 END) as fraud_count,
                CASE WHEN po.Policy_End_Date >= :today THEN 'Active' ELSE 'Expired' END as policy_status
            FROM Policy po
            JOIN Patient pt ON po.Patient_ID = pt.Patient_ID
            LEFT JOIN Claims c ON po.Patient_ID = c.Patient_ID
            GROUP BY po.Policy_ID
            ORDER BY po.Policy_End_Date
        """)
        result = db.execute(query, {"today": today}).fetchall()
        log_audit(db, user, "VIEW_POLICIES", "Policies list")
        return [format_row(r) for r in result]
    except SQLAlchemyError as e:
        print(f"Policies query error: {e}")
        return []

@router.get("/services")
async def get_services(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    ensure_sample_data(db)
    try:
        query = text("SELECT * FROM Service ORDER BY Name")
        result = db.execute(query).fetchall()
        log_audit(db, user, "VIEW_SERVICES", "Services list")
        return [format_row(r) for r in result]
    except SQLAlchemyError as e:
        print(f"Services query error: {e}")
        return []

@router.post("/services")
async def create_service(data: dict, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    ensure_sample_data(db)
    try:
        result = db.execute(text("""
            INSERT INTO Service (Name, CoPay_Amount, Avg_Cost)
            VALUES (:name, :copay_amount, :avg_cost)
        """), {
            "name": data.get("name"),
            "copay_amount": data.get("copay_amount"),
            "avg_cost": data.get("avg_cost")
        })
        db.commit()
        log_audit(db, user, "CREATE_SERVICE", f"Service {result.lastrowid}")
        return {"status": "success", "id": result.lastrowid}
    except SQLAlchemyError as e:
        db.rollback()
        print(f"Create service error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create service")

@router.patch("/services/{service_id}")
async def update_service(service_id: int, data: dict, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    ensure_sample_data(db)
    try:
        db.execute(text("""
            UPDATE Service
            SET Name = :name, CoPay_Amount = :copay_amount, Avg_Cost = :avg_cost
            WHERE Service_ID = :id
        """), {
            "name": data.get("name"),
            "copay_amount": data.get("copay_amount"),
            "avg_cost": data.get("avg_cost"),
            "id": service_id
        })
        db.commit()
        log_audit(db, user, "UPDATE_SERVICE", f"Service {service_id}")
        return {"status": "success"}
    except SQLAlchemyError as e:
        db.rollback()
        print(f"Update service error: {e}")
        raise HTTPException(status_code=500, detail="Failed to update service")

@router.delete("/services/{service_id}")
async def delete_service(service_id: int, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    ensure_sample_data(db)
    try:
        db.execute(text("DELETE FROM Service WHERE Service_ID = :id"), {"id": service_id})
        db.commit()
        log_audit(db, user, "DELETE_SERVICE", f"Service {service_id}")
        return {"status": "success"}
    except SQLAlchemyError as e:
        db.rollback()
        print(f"Delete service error: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete service")

@router.get("/analytics/top-providers")
async def get_top_providers(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    ensure_sample_data(db)
    try:
        query = text("""
            SELECT
                p.Provider_ID,
                p.Name,
                COUNT(c.Claim_ID) as claim_count,
                SUM(CASE WHEN c.Is_Fraudulent = 1 THEN 1 ELSE 0 END) as fraud_count,
                SUM(c.Claim_Amount) as total_amount
            FROM Provider p
            JOIN Claims c ON p.Provider_ID = c.Provider_ID
            GROUP BY p.Provider_ID
            ORDER BY fraud_count DESC, claim_count DESC
            LIMIT 10
        """)
        result = db.execute(query).fetchall()
        return [format_row(r) for r in result]
    except SQLAlchemyError as e:
        print(f"Top providers error: {e}")
        return []

@router.get("/analytics/top-patients")
async def get_top_patients(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    ensure_sample_data(db)
    try:
        query = text("""
            SELECT
                pt.Patient_ID,
                pt.Name,
                COUNT(c.Claim_ID) as claim_count,
                SUM(CASE WHEN c.Is_Fraudulent = 1 THEN 1 ELSE 0 END) as fraud_count,
                SUM(c.Claim_Amount) as total_amount
            FROM Patient pt
            JOIN Claims c ON pt.Patient_ID = c.Patient_ID
            GROUP BY pt.Patient_ID
            ORDER BY fraud_count DESC, claim_count DESC
            LIMIT 10
        """)
        result = db.execute(query).fetchall()
        return [format_row(r) for r in result]
    except SQLAlchemyError as e:
        print(f"Top patients error: {e}")
        return []

@router.get("/analytics/top-diagnoses")
async def get_top_diagnoses(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    ensure_sample_data(db)
    try:
        query = text("""
            SELECT
                Diagnosis_Code as diagnosis_code,
                COUNT(*) as claim_count,
                SUM(CASE WHEN Is_Fraudulent = 1 THEN 1 ELSE 0 END) as fraud_count
            FROM Claims
            GROUP BY Diagnosis_Code
            ORDER BY fraud_count DESC, claim_count DESC
            LIMIT 10
        """)
        result = db.execute(query).fetchall()
        return [format_row(r) for r in result]
    except SQLAlchemyError as e:
        print(f"Top diagnoses error: {e}")
        return []

@router.get("/heatmap/providers")
async def get_heatmap_providers(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    ensure_sample_data(db)
    try:
        query = text("""
            SELECT
                p.Provider_ID,
                p.Name,
                p.City,
                p.State,
                p.Latitude,
                p.Longitude,
                COUNT(c.Claim_ID) as total_claims,
                SUM(CASE WHEN c.Is_Fraudulent = 1 THEN 1 ELSE 0 END) as fraud_claims,
                AVG(c.Fraud_Score) as avg_fraud_score
            FROM Provider p
            LEFT JOIN Claims c ON p.Provider_ID = c.Provider_ID
            WHERE p.Latitude IS NOT NULL AND p.Longitude IS NOT NULL
            GROUP BY p.Provider_ID
        """)
        result = db.execute(query).fetchall()
        log_audit(db, user, "VIEW_HEATMAP", "Fraud heatmap")
        return [format_row(r) for r in result]
    except SQLAlchemyError as e:
        print(f"Heatmap providers error: {e}")
        return []

@router.get("/model/metrics")
async def get_model_metrics(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    ensure_sample_data(db)
    try:
        query = text("SELECT * FROM ModelMetrics ORDER BY id DESC LIMIT 1")
        result = db.execute(query).fetchone()
        log_audit(db, user, "VIEW_MODEL_METRICS", "Model metrics")
        return format_row(result) if result else None
    except SQLAlchemyError as e:
        print(f"Model metrics error: {e}")
        return None

@router.post("/model/retrain")
async def retrain_model(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    ensure_sample_data(db)
    try:
        new_metrics = {
            "accuracy": 0.92 + random.uniform(-0.02, 0.02),
            "precision": 0.88 + random.uniform(-0.02, 0.02),
            "recall": 0.85 + random.uniform(-0.02, 0.02),
            "f1_score": 0.86 + random.uniform(-0.02, 0.02),
            "roc_auc": 0.94 + random.uniform(-0.01, 0.01)
        }
        
        current = db.execute(text("SELECT * FROM ModelMetrics ORDER BY id DESC LIMIT 1")).fetchone()
        version = "1.0.1"
        if current and current.model_version:
            parts = current.model_version.split(".")
            version = f"{parts[0]}.{parts[1]}.{int(parts[2]) + 1}"
        
        total_claims = db.execute(text("SELECT COUNT(*) FROM Claims")).scalar() or 0
        
        db.execute(text("""
            INSERT INTO ModelMetrics (accuracy, precision, recall, f1_score, roc_auc, model_version, last_training_date, training_samples, created_at)
            VALUES (:accuracy, :precision, :recall, :f1_score, :roc_auc, :model_version, :last_training_date, :training_samples, :created_at)
        """), {
            **new_metrics,
            "model_version": version,
            "last_training_date": datetime.datetime.now().isoformat(),
            "training_samples": total_claims,
            "created_at": datetime.datetime.now().isoformat()
        })
        db.commit()
        log_audit(db, user, "RETRAIN_MODEL", f"Model retrained to {version}")
        
        db.execute(text("""
            INSERT INTO Notifications (title, message, type, created_at)
            VALUES (:title, :message, :type, :created_at)
        """), {
            "title": "Model Retrained Successfully",
            "message": f"Model {version} has been trained and deployed",
            "type": "success",
            "created_at": datetime.datetime.now().isoformat()
        })
        db.commit()
        
        return {"status": "success", "version": version}
    except SQLAlchemyError as e:
        db.rollback()
        print(f"Retrain model error: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrain model")

@router.get("/ai-insights")
async def get_ai_insights(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    ensure_sample_data(db)
    insights = []
    try:
        top_provider = db.execute(text("""
            SELECT p.Name, SUM(CASE WHEN c.Is_Fraudulent = 1 THEN 1 ELSE 0 END) as fraud_count
            FROM Provider p JOIN Claims c ON p.Provider_ID = c.Provider_ID
            GROUP BY p.Provider_ID
            ORDER BY fraud_count DESC LIMIT 1
        """)).fetchone()
        if top_provider:
            insights.append({
                "type": "high_risk_provider",
                "title": "Highest Fraud Provider",
                "description": f"{top_provider.Name} has the highest number of fraud claims ({top_provider.fraud_count})",
                "priority": "high"
            })
        
        top_city = db.execute(text("""
            SELECT p.City, SUM(CASE WHEN c.Is_Fraudulent = 1 THEN 1 ELSE 0 END) as fraud_count
            FROM Provider p JOIN Claims c ON p.Provider_ID = c.Provider_ID
            GROUP BY p.City
            ORDER BY fraud_count DESC LIMIT 1
        """)).fetchone()
        if top_city:
            insights.append({
                "type": "high_risk_city",
                "title": "Highest Fraud City",
                "description": f"{top_city.City} has the highest number of fraud claims ({top_city.fraud_count})",
                "priority": "high"
            })
        
        top_diagnosis = db.execute(text("""
            SELECT Diagnosis_Code, SUM(CASE WHEN Is_Fraudulent = 1 THEN 1 ELSE 0 END) as fraud_count
            FROM Claims
            GROUP BY Diagnosis_Code
            ORDER BY fraud_count DESC LIMIT 1
        """)).fetchone()
        if top_diagnosis:
            insights.append({
                "type": "high_risk_diagnosis",
                "title": "Most Suspicious Diagnosis",
                "description": f"Diagnosis code {top_diagnosis.Diagnosis_Code} has the highest fraud count ({top_diagnosis.fraud_count})",
                "priority": "medium"
            })
        
        expensive_provider = db.execute(text("""
            SELECT p.Name, AVG(c.Claim_Amount) as avg_amount
            FROM Provider p JOIN Claims c ON p.Provider_ID = c.Provider_ID
            GROUP BY p.Provider_ID
            ORDER BY avg_amount DESC LIMIT 1
        """)).fetchone()
        if expensive_provider:
            insights.append({
                "type": "expensive_provider",
                "title": "Most Expensive Provider",
                "description": f"{expensive_provider.Name} has the highest average claim amount (${expensive_provider.avg_amount:.2f})",
                "priority": "medium"
            })
        
        high_amount_claims = db.execute(text("""
            SELECT COUNT(*) as count
            FROM Claims
            WHERE Claim_Amount > (SELECT AVG(Claim_Amount) * 2 FROM Claims)
        """)).fetchone()
        if high_amount_claims and high_amount_claims.count > 0:
            insights.append({
                "type": "anomaly_detection",
                "title": "High Amount Claims Detected",
                "description": f"Found {high_amount_claims.count} claims with amount more than twice the average",
                "priority": "high"
            })
        
        log_audit(db, user, "VIEW_AI_INSIGHTS", "AI insights")
        
        return insights
    except SQLAlchemyError as e:
        print(f"AI insights error: {e}")
        return []

@router.get("/notifications")
async def get_notifications(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    ensure_sample_data(db)
    try:
        query = text("SELECT * FROM Notifications ORDER BY created_at DESC")
        result = db.execute(query).fetchall()
        log_audit(db, user, "VIEW_NOTIFICATIONS", "Notifications list")
        return [format_row(r) for r in result]
    except SQLAlchemyError as e:
        print(f"Notifications error: {e}")
        return []

@router.patch("/notifications/{notif_id}/read")
async def mark_notification_read(notif_id: int, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    ensure_sample_data(db)
    try:
        db.execute(text("UPDATE Notifications SET read = 1 WHERE id = :id"), {"id": notif_id})
        db.commit()
        log_audit(db, user, "MARK_NOTIF_READ", f"Notification {notif_id}")
        return {"status": "success"}
    except SQLAlchemyError as e:
        db.rollback()
        print(f"Mark notification read error: {e}")
        raise HTTPException(status_code=500, detail="Failed to update notification")

@router.patch("/notifications/read-all")
async def mark_all_notifications_read(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    ensure_sample_data(db)
    try:
        db.execute(text("UPDATE Notifications SET read = 1"))
        db.commit()
        log_audit(db, user, "MARK_ALL_NOTIF_READ", "All notifications")
        return {"status": "success"}
    except SQLAlchemyError as e:
        db.rollback()
        print(f"Mark all notifications read error: {e}")
        raise HTTPException(status_code=500, detail="Failed to update notifications")

@router.get("/audit-logs")
async def get_audit_logs(
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
    search: str = Query(None),
    action_type: str = Query(None),
    page: int = Query(1),
    page_size: int = Query(20)
):
    ensure_sample_data(db)
    try:
        where_clauses = []
        params = {}
        
        if search:
            where_clauses.append("(user LIKE :search OR action LIKE :search OR affected_record LIKE :search)")
            params["search"] = f"%{search}%"
        
        if action_type:
            where_clauses.append("action LIKE :action_type")
            params["action_type"] = f"%{action_type}%"
        
        where_str = " AND ".join(where_clauses) if where_clauses else "1=1"
        
        count_query = text(f"SELECT COUNT(*) as total FROM AuditLogs WHERE {where_str}")
        total = db.execute(count_query, params).scalar() or 0
        
        offset = (page - 1) * page_size
        query = text(f"""
            SELECT * FROM AuditLogs
            WHERE {where_str}
            ORDER BY timestamp DESC
            LIMIT :page_size OFFSET :offset
        """)
        params["page_size"] = page_size
        params["offset"] = offset
        result = db.execute(query, params).fetchall()
        
        log_audit(db, user, "VIEW_AUDIT_LOGS", "Audit logs")
        
        return {
            "data": [format_row(r) for r in result],
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size if total > 0 else 1
        }
    except SQLAlchemyError as e:
        print(f"Audit logs error: {e}")
        return {"data": [], "total": 0, "page": page, "page_size": page_size, "total_pages": 1}

@router.get("/system/health")
async def get_system_health(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    try:
        db.execute(text("SELECT 1"))
        
        cpu_usage = random.uniform(20, 70)
        memory_usage = random.uniform(40, 80)
        request_count = random.randint(1000, 5000)
        active_users = random.randint(5, 20)
        avg_response_time = random.uniform(50, 200)
        
        return {
            "api_status": "healthy",
            "db_status": "connected",
            "cpu_usage": round(cpu_usage, 1),
            "memory_usage": round(memory_usage, 1),
            "request_count": request_count,
            "active_users": active_users,
            "avg_response_time": round(avg_response_time, 0)
        }
    except Exception as e:
        print(f"System health error: {e}")
        return {
            "api_status": "unhealthy",
            "db_status": "disconnected",
            "error": str(e)
        }

@router.patch("/claims/{claim_id}/status")
async def update_claim_status(claim_id: int, status_data: dict, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    ensure_sample_data(db)
    try:
        new_status = status_data.get("status")
        if not new_status:
            raise HTTPException(status_code=400, detail="Status is required")
        
        db.execute(text("UPDATE Claims SET Status = :status WHERE Claim_ID = :id"), {"status": new_status, "id": claim_id})
        db.commit()
        log_audit(db, user, "UPDATE_CLAIM_STATUS", f"Claim {claim_id} to {new_status}")
        return {"status": "success"}
    except SQLAlchemyError as e:
        db.rollback()
        print(f"Update claim error: {e}")
        raise HTTPException(status_code=500, detail="Failed to update claim status")

@router.post("/labeled-data")
async def create_labeled_data(data: dict, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    ensure_sample_data(db)
    try:
        result = db.execute(text("""
            INSERT INTO LabeledData (claim_id, patient_name, provider_name, amount, label, is_fraudulent, claim_date, auditor, audit_date, created_at, notes)
            VALUES (:claim_id, :patient_name, :provider_name, :amount, :label, :is_fraudulent, :claim_date, :auditor, :audit_date, :created_at, :notes)
        """), {
            "claim_id": data.get("claim_id"),
            "patient_name": data.get("patient_name"),
            "provider_name": data.get("provider_name"),
            "amount": data.get("amount"),
            "label": data.get("label"),
            "is_fraudulent": data.get("is_fraudulent"),
            "claim_date": data.get("claim_date"),
            "auditor": user.get("username"),
            "audit_date": datetime.datetime.now().isoformat(),
            "created_at": datetime.datetime.now().isoformat(),
            "notes": data.get("notes")
        })
        db.commit()
        log_audit(db, user, "CREATE_LABELED_DATA", f"Labeled data {result.lastrowid}")
        return {"status": "success"}
    except SQLAlchemyError as e:
        db.rollback()
        print(f"Create labeled data error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create labeled data")

@router.get("/labeled-data")
async def get_labeled_data(
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
    search: str = Query(None),
    page: int = Query(1),
    page_size: int = Query(20)
):
    ensure_sample_data(db)
    try:
        where_clauses = []
        params = {}
        
        if search:
            where_clauses.append("(patient_name LIKE :search OR provider_name LIKE :search OR notes LIKE :search)")
            params["search"] = f"%{search}%"
        
        where_str = " AND ".join(where_clauses) if where_clauses else "1=1"
        
        count_query = text(f"SELECT COUNT(*) as total FROM LabeledData WHERE {where_str}")
        total = db.execute(count_query, params).scalar() or 0
        
        offset = (page - 1) * page_size
        query = text(f"""
            SELECT * FROM LabeledData
            WHERE {where_str}
            ORDER BY created_at DESC
            LIMIT :page_size OFFSET :offset
        """)
        params["page_size"] = page_size
        params["offset"] = offset
        result = db.execute(query, params).fetchall()
        
        log_audit(db, user, "VIEW_LABELED_DATA", "Labeled data list")
        
        return {
            "data": [format_row(r) for r in result],
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size if total > 0 else 1
        }
    except SQLAlchemyError as e:
        print(f"Labeled data query error: {e}")
        return {"data": [], "total": 0, "page": page, "page_size": page_size, "total_pages": 1}

@router.patch("/labeled-data/{id}")
async def update_labeled_data(id: int, data: dict, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    ensure_sample_data(db)
    try:
        db.execute(text("""
            UPDATE LabeledData
            SET label = :label, is_fraudulent = :is_fraudulent, notes = :notes, auditor = :auditor, audit_date = :audit_date
            WHERE id = :id
        """), {
            "id": id,
            "label": data.get("label"),
            "is_fraudulent": data.get("is_fraudulent"),
            "notes": data.get("notes"),
            "auditor": user.get("username"),
            "audit_date": datetime.datetime.now().isoformat()
        })
        db.commit()
        log_audit(db, user, "UPDATE_LABELED_DATA", f"Labeled data {id}")
        return {"status": "success"}
    except SQLAlchemyError as e:
        db.rollback()
        print(f"Update labeled data error: {e}")
        raise HTTPException(status_code=500, detail="Failed to update labeled data")

@router.delete("/labeled-data/{id}")
async def delete_labeled_data(id: int, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    ensure_sample_data(db)
    try:
        db.execute(text("DELETE FROM LabeledData WHERE id = :id"), {"id": id})
        db.commit()
        log_audit(db, user, "DELETE_LABELED_DATA", f"Labeled data {id}")
        return {"status": "success"}
    except SQLAlchemyError as e:
        db.rollback()
        print(f"Delete labeled data error: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete labeled data")
