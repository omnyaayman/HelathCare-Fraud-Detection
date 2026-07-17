
import sqlite3
import os
from datetime import date

db_path = os.path.join(os.path.dirname(__file__), "healthcare_fraud.db")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("--- Testing Stats Query ---")
stats_query = """
    SELECT
        COUNT(*) AS total_claims,
        SUM(CASE WHEN Status IN ('Under Review', 'Submitted', 'AI Scored') THEN 1 ELSE 0 END) AS pending_review,
        SUM(CASE WHEN Is_Fraudulent = 1 THEN 1 ELSE 0 END) AS total_fraud,
        AVG(Claim_Amount) AS avg_claim_amount,
        SUM(CASE WHEN Is_Fraudulent = 1 THEN Claim_Amount ELSE 0 END) AS financial_exposure,
        SUM(CASE WHEN Is_Fraudulent = 1 AND Status IN ('Rejected', 'Fraud Confirmed', 'Closed') THEN Claim_Amount ELSE 0 END) AS money_saved,
        AVG(Fraud_Score) AS avg_fraud_score,
        SUM(CASE WHEN Status = 'Approved' THEN 1 ELSE 0 END) AS approved_claims,
        SUM(CASE WHEN Status = 'Rejected' THEN 1 ELSE 0 END) AS rejected_claims
    FROM Claims
"""

cursor.execute(stats_query)
row = cursor.fetchone()
print(f"total_claims: {row[0]}")
print(f"pending_review: {row[1]}")
print(f"total_fraud: {row[2]}")
print(f"avg_claim_amount: {row[3]}")
print(f"financial_exposure: {row[4]}")
print(f"money_saved: {row[5]}")
print(f"avg_fraud_score: {row[6]}")
print(f"approved_claims: {row[7]}")
print(f"rejected_claims: {row[8]}")


print("\n--- Testing Claims Query ---")
claims_query = """
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
    ORDER BY c.Claim_Date DESC
"""

cursor.execute(claims_query)
claims = cursor.fetchall()
print(f"Total claims from query: {len(claims)}")
if claims:
    print(f"First claim: {claims[0]}")


print("\n--- Testing Patients Query ---")
patients_query = """
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
        po.CoPay_Amount
    FROM Patient pt
    LEFT JOIN Policy po ON pt.Patient_ID = po.Patient_ID
    ORDER BY pt.Name
"""

cursor.execute(patients_query)
patients = cursor.fetchall()
print(f"Total patients from query: {len(patients)}")
if patients:
    print(f"First patient: {patients[0]}")


print("\n--- Testing Policies Query ---")
policies_query = """
    SELECT
        po.Policy_ID,
        po.Patient_ID,
        pt.Name as patient_name,
        po.Policy_Start_Date,
        po.Policy_End_Date,
        po.Annual_Deductible,
        po.CoPay_Amount
    FROM Policy po
    JOIN Patient pt ON po.Patient_ID = pt.Patient_ID
    ORDER BY po.Policy_End_Date
"""

cursor.execute(policies_query)
policies = cursor.fetchall()
print(f"Total policies from query: {len(policies)}")


conn.close()
