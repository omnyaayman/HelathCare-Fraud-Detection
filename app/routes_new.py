# NEW ENDPOINTS appended by final polish

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.orm import Session
import datetime

# We reuse router, get_db, get_current_user, ensure_sample_data, format_row, log_audit from routes.py
# These are defined below for standalone use; they will be mounted separately.

_router = APIRouter()

def _get_db():
    from services.azure_db import SessionLocal
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def _format_row(row):
    if row is None:
        return None
    d = dict(row._mapping)
    import decimal
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

def _ensure_sample_data(db):
    try:
        count = db.execute(text("SELECT COUNT(*) FROM Claims")).scalar()
        return count > 0
    except:
        return False

@_router.get("/stats/trends")
async def get_stats_trends(db = Depends(_get_db)):
    try:
        thirty_days_ago = (datetime.date.today() - datetime.timedelta(days=30)).isoformat()
        sixty_days_ago = (datetime.date.today() - datetime.timedelta(days=60)).isoformat()

        cur = db.execute(text("""
            SELECT COUNT(*) as total_claims,
                   SUM(CASE WHEN Is_Fraudulent = 1 THEN 1 ELSE 0 END) as total_fraud,
                   SUM(CASE WHEN Is_Fraudulent = 1 AND Status IN ('Rejected','Fraud Confirmed','Closed') THEN Claim_Amount ELSE 0 END) as money_saved,
                   COUNT(DISTINCT Provider_ID) as active_providers
            FROM Claims WHERE Claim_Date >= :start
        """), {"start": thirty_days_ago}).fetchone()

        prev = db.execute(text("""
            SELECT COUNT(*) as total_claims,
                   SUM(CASE WHEN Is_Fraudulent = 1 THEN 1 ELSE 0 END) as total_fraud,
                   SUM(CASE WHEN Is_Fraudulent = 1 AND Status IN ('Rejected','Fraud Confirmed','Closed') THEN Claim_Amount ELSE 0 END) as money_saved
            FROM Claims WHERE Claim_Date >= :start AND Claim_Date < :end
        """), {"start": sixty_days_ago, "end": thirty_days_ago}).fetchone()

        def trend(c, p):
            if p and p > 0:
                return round(((c / p) - 1) * 100, 1)
            return 0

        return {
            "claims_trend": trend(cur.total_claims or 0, prev.total_claims or 0),
            "fraud_trend": trend(cur.total_fraud or 0, prev.total_fraud or 0),
            "money_saved_trend": trend(cur.money_saved or 0, prev.money_saved or 0),
            "suspicious_providers_active": int(cur.active_providers or 0),
        }
    except Exception as e:
        print(f"Trends error: {e}")
        return {"claims_trend": 0, "fraud_trend": 0, "money_saved_trend": 0, "suspicious_providers_active": 0}


@_router.post("/notifications/generate")
async def generate_notifications(db = Depends(_get_db)):
    try:
        db.execute(text("DELETE FROM Notifications WHERE id NOT IN (SELECT id FROM Notifications ORDER BY created_at DESC LIMIT 20)"))
        now = datetime.datetime.now().isoformat()
        today_str = datetime.date.today().isoformat()

        recent_fraud = db.execute(text("""
            SELECT COUNT(*) FROM Claims WHERE Is_Fraudulent = 1 AND Claim_Date = :today AND Status IN ('Submitted','Under Review')
        """), {"today": today_str}).scalar() or 0

        if recent_fraud > 0:
            db.execute(text("INSERT INTO Notifications (title, message, type, created_at) VALUES (:t, :m, :tp, :ca)"),
                {"t": "Fraud Claims Detected", "m": f"{recent_fraud} high-risk claims flagged today by AI model", "tp": "fraud", "ca": now})

        provider_blocked = db.execute(text("""
            SELECT p.Name, COUNT(c.Claim_ID) as cnt FROM Provider p
            JOIN Claims c ON p.Provider_ID = c.Provider_ID
            WHERE c.Is_Fraudulent = 1 GROUP BY p.Provider_ID ORDER BY cnt DESC LIMIT 1
        """)).fetchone()

        if provider_blocked:
            db.execute(text("INSERT INTO Notifications (title, message, type, created_at) VALUES (:t, :m, :tp, :ca)"),
                {"t": "Provider Blocked", "m": f"{provider_blocked.Name} blocked from auto-enroll ({provider_blocked.cnt} fraud claims)", "tp": "fraud", "ca": now})

        today_claims = db.execute(text("SELECT COUNT(*) FROM Claims WHERE Claim_Date = :today"), {"today": today_str}).scalar() or 0
        week_avg = db.execute(text("""
            SELECT AVG(cnt) FROM (SELECT COUNT(*) as cnt FROM Claims WHERE Claim_Date >= :d GROUP BY Claim_Date)
        """), {"d": (datetime.date.today() - datetime.timedelta(days=7)).isoformat()}).scalar() or 0

        if week_avg > 0 and today_claims > week_avg * 1.5:
            db.execute(text("INSERT INTO Notifications (title, message, type, created_at) VALUES (:t, :m, :tp, :ca)"),
                {"t": "High Volume Alert", "m": f"Today's volume ({today_claims}) is {((today_claims/week_avg)-1)*100:.0f}% above weekly avg", "tp": "info", "ca": now})
        elif week_avg > 0:
            db.execute(text("INSERT INTO Notifications (title, message, type, created_at) VALUES (:t, :m, :tp, :ca)"),
                {"t": "Weekly Summary", "m": f"Avg daily claims: {week_avg:.0f}, fraudulent: {recent_fraud}", "tp": "info", "ca": now})

        large_claim = db.execute(text("""
            SELECT c.Claim_ID, c.Claim_Amount, p.Name, pt.Name as pn FROM Claims c
            JOIN Provider p ON c.Provider_ID = p.Provider_ID
            JOIN Patient pt ON c.Patient_ID = pt.Patient_ID
            WHERE DATE(c.Claim_Date) = :today ORDER BY c.Claim_Amount DESC LIMIT 1
        """), {"today": today_str}).fetchone()

        if large_claim and large_claim.Claim_Amount > 20000:
            db.execute(text("INSERT INTO Notifications (title, message, type, created_at) VALUES (:t, :m, :tp, :ca)"),
                {"t": "Large Claim Submitted", "m": f"Claim #{large_claim.Claim_ID} of ${large_claim.Claim_Amount:.0f} by {large_claim.Name} for {large_claim.pn}",
                 "tp": "info", "ca": now})

        if recent_fraud > 0:
            db.execute(text("INSERT INTO Notifications (title, message, type, created_at) VALUES (:t, :m, :tp, :ca)"),
                {"t": "Model Drift Warning", "m": f"Fraud rate in last 24h: {(recent_fraud/(today_claims or 1))*100:.1f}% — monitoring distribution shift", "tp": "fraud", "ca": now})

        db.commit()

        all_n = db.execute(text("SELECT * FROM Notifications ORDER BY created_at DESC LIMIT 50")).fetchall()
        return {"data": [_format_row(r) for r in all_n]}
    except Exception as e:
        print(f"Generate notifications error: {e}")
        return {"data": []}


@_router.get("/reports/data")
async def get_report_data(
    db = Depends(_get_db),
    date_range: str = Query("all"),
    provider_id: int = Query(None),
    patient_id: int = Query(None),
    status: str = Query(None)
):
    try:
        _ensure_sample_data(db)
        wp, params = [], {}
        if date_range == "7":
            wp.append("c.Claim_Date >= :ds"); params["ds"] = (datetime.date.today() - datetime.timedelta(days=7)).isoformat()
        elif date_range == "30":
            wp.append("c.Claim_Date >= :ds"); params["ds"] = (datetime.date.today() - datetime.timedelta(days=30)).isoformat()
        elif date_range == "90":
            wp.append("c.Claim_Date >= :ds"); params["ds"] = (datetime.date.today() - datetime.timedelta(days=90)).isoformat()
        if provider_id:
            wp.append("p.Provider_ID = :provider_id"); params["provider_id"] = provider_id
        if patient_id:
            wp.append("pt.Patient_ID = :patient_id"); params["patient_id"] = patient_id
        if status and status.upper() != "ALL":
            wp.append("c.Status = :status"); params["status"] = status
        w = " AND ".join(wp) if wp else "1=1"

        counts = db.execute(text(f"""SELECT COUNT(*) as total_claims,
            SUM(CASE WHEN c.Is_Fraudulent = 1 THEN 1 ELSE 0 END) as total_fraud,
            SUM(c.Claim_Amount) as total_amount, AVG(c.Claim_Amount) as avg_amount,
            AVG(c.Fraud_Score) as avg_fraud_score
            FROM Claims c LEFT JOIN Provider p ON c.Provider_ID = p.Provider_ID
            LEFT JOIN Patient pt ON c.Patient_ID = pt.Patient_ID WHERE {w}"""), params).fetchone()

        fb_prov = db.execute(text(f"""SELECT p.Name, COUNT(*) as total,
            SUM(CASE WHEN c.Is_Fraudulent = 1 THEN 1 ELSE 0 END) as fraud_count
            FROM Claims c JOIN Provider p ON c.Provider_ID = p.Provider_ID
            WHERE {w} GROUP BY p.Provider_ID ORDER BY fraud_count DESC LIMIT 10"""), params).fetchall()

        fb_diag = db.execute(text(f"""SELECT c.Diagnosis_Code, COUNT(*) as cnt,
            SUM(CASE WHEN c.Is_Fraudulent = 1 THEN 1 ELSE 0 END) as fraud_count
            FROM Claims c LEFT JOIN Provider p ON c.Provider_ID = p.Provider_ID
            LEFT JOIN Patient pt ON c.Patient_ID = pt.Patient_ID
            WHERE {w} GROUP BY c.Diagnosis_Code ORDER BY fraud_count DESC LIMIT 10"""), params).fetchall()

        fb_month = db.execute(text(f"""SELECT strftime('%Y-%m', c.Claim_Date) as month,
            COUNT(*) as total, SUM(CASE WHEN c.Is_Fraudulent = 1 THEN 1 ELSE 0 END) as fraud,
            SUM(c.Claim_Amount) as amount
            FROM Claims c LEFT JOIN Provider p ON c.Provider_ID = p.Provider_ID
            LEFT JOIN Patient pt ON c.Patient_ID = pt.Patient_ID
            WHERE {w} GROUP BY month ORDER BY month"""), params).fetchall()

        dist = db.execute(text(f"""SELECT CASE
            WHEN c.Claim_Amount < 1000 THEN '< $1K' WHEN c.Claim_Amount < 5000 THEN '$1K - $5K'
            WHEN c.Claim_Amount < 10000 THEN '$5K - $10K' WHEN c.Claim_Amount < 50000 THEN '$10K - $50K'
            ELSE '$50K+' END as range_name,
            COUNT(*) as count, SUM(CASE WHEN c.Is_Fraudulent = 1 THEN 1 ELSE 0 END) as fraud_count
            FROM Claims c LEFT JOIN Provider p ON c.Provider_ID = p.Provider_ID
            LEFT JOIN Patient pt ON c.Patient_ID = pt.Patient_ID
            WHERE {w} GROUP BY range_name ORDER BY MIN(c.Claim_Amount)"""), params).fetchall()

        claims_list = db.execute(text(f"""SELECT c.Claim_ID as id, pt.Name as patient_name,
            p.Name as provider_name, c.Claim_Amount as amount,
            c.Status, c.Is_Fraudulent as is_fraud, c.Claim_Date as date,
            c.Fraud_Score as score, c.Diagnosis_Code as diagnosis
            FROM Claims c JOIN Patient pt ON c.Patient_ID = pt.Patient_ID
            JOIN Provider p ON c.Provider_ID = p.Provider_ID
            WHERE {w} ORDER BY c.Claim_Date DESC LIMIT 500"""), params).fetchall()

        return {
            "counts": _format_row(counts),
            "fraud_by_provider": [{"name": r.Name, "total": r.total, "fraud_count": r.fraud_count} for r in fb_prov],
            "fraud_by_diagnosis": [{"code": r.Diagnosis_Code, "count": r.cnt, "fraud_count": r.fraud_count} for r in fb_diag],
            "fraud_by_month": [{"month": r.month or "0000-00", "total": r.total, "fraud": r.fraud, "amount": r.amount} for r in fb_month],
            "claim_distribution": [{"range_name": r.range_name, "count": r.count, "fraud_count": r.fraud_count} for r in dist],
            "claims": [_format_row(r) for r in claims_list]
        }
    except Exception as e:
        print(f"Report data error: {e}")
        import traceback; traceback.print_exc()
        return {"counts": None, "fraud_by_provider": [], "fraud_by_diagnosis": [], "fraud_by_month": [], "claim_distribution": [], "claims": []}


@_router.get("/reports/export")
async def export_reports(
    db = Depends(_get_db),
    date_range: str = Query("all"),
    provider_id: int = Query(None),
    patient_id: int = Query(None),
    status: str = Query(None)
):
    try:
        wp, params = [], {}
        if date_range == "7":
            wp.append("c.Claim_Date >= :ds"); params["ds"] = (datetime.date.today() - datetime.timedelta(days=7)).isoformat()
        elif date_range == "30":
            wp.append("c.Claim_Date >= :ds"); params["ds"] = (datetime.date.today() - datetime.timedelta(days=30)).isoformat()
        elif date_range == "90":
            wp.append("c.Claim_Date >= :ds"); params["ds"] = (datetime.date.today() - datetime.timedelta(days=90)).isoformat()
        if provider_id:
            wp.append("p.Provider_ID = :provider_id"); params["provider_id"] = provider_id
        if patient_id:
            wp.append("pt.Patient_ID = :patient_id"); params["patient_id"] = patient_id
        if status and status.upper() != "ALL":
            wp.append("c.Status = :status"); params["status"] = status
        w = " AND ".join(wp) if wp else "1=1"

        rows = db.execute(text(f"""SELECT c.Claim_ID, pt.Name as patient_name, p.Name as provider_name,
            c.Diagnosis_Code, c.Claim_Amount, c.Fraud_Score, c.Status, c.Claim_Date
            FROM Claims c JOIN Patient pt ON c.Patient_ID = pt.Patient_ID
            JOIN Provider p ON c.Provider_ID = p.Provider_ID
            WHERE {w} ORDER BY c.Claim_Date DESC"""), params).fetchall()

        return {"data": [_format_row(r) for r in rows], "total": len(rows)}
    except Exception as e:
        print(f"Export error: {e}")
        return {"data": [], "total": 0}
