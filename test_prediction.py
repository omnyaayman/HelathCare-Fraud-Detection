"""
Local smoke test for the fraud prediction pipeline.

Run with:  python test_prediction.py

Verifies that:
  - The model actually loads (ML/xgb_fraud_model.pkl).
  - A clearly suspicious claim and a clearly normal claim get different,
    non-default scores (i.e. the pipeline is no longer hardcoded to 0.5).
  - A partial claim payload shaped like what app/routes.py sends today
    still produces a real score instead of crashing.
"""

from ML.predictor import predictor

SUSPICIOUS_CLAIM = {
    "Claim_Amount": 1000000.0,
    "Patient_Age": 20,
    "Patient_Gender": "Male",
    "Provider_Type": "Specialist Office",
    "Provider_Specialty": "Cardiology",
    "Diagnosis_Code": "I21",
    "Number_of_Procedures": 1,
    "Admission_Type": "Elective",
    "Discharge_Type": "Deceased",
    "Length_of_Stay_Days": 0,
    "Service_Type": "Outpatient",
    "Deductible_Amount": 100,
    "CoPay_Amount": 10,
    "Number_of_Previous_Claims_Patient": 80,
    "Number_of_Previous_Claims_Provider": 50,
    "Provider_Patient_Distance_Miles": 800.0,
    "Claim_Submitted_Late": True,
    "Claim_Date": "2024-06-01",
    "Service_Date": "2023-01-01",
    "Policy_Expiration_Date": "2025-01-01",
}

NORMAL_CLAIM = {
    "Claim_Amount": 250.0,
    "Patient_Age": 34,
    "Patient_Gender": "Female",
    "Provider_Type": "Clinic",
    "Provider_Specialty": "General Practice",
    "Diagnosis_Code": "I10",
    "Number_of_Procedures": 1,
    "Admission_Type": "Elective",
    "Discharge_Type": "Home",
    "Length_of_Stay_Days": 0,
    "Service_Type": "Outpatient",
    "Deductible_Amount": 500,
    "CoPay_Amount": 25,
    "Number_of_Previous_Claims_Patient": 2,
    "Number_of_Previous_Claims_Provider": 5,
    "Provider_Patient_Distance_Miles": 8.0,
    "Claim_Submitted_Late": False,
    "Claim_Date": "2024-06-01",
    "Service_Date": "2024-05-30",
    "Policy_Expiration_Date": "2025-01-01",
}

# Shaped like what app/routes.py's /process-claim endpoint actually sends
# today (lower_snake_case, missing several training fields).
PARTIAL_API_CLAIM = {
    "policy_number": "XAI215993963",
    "claim_amount": 4500.0,
    "service_type": "Inpatient",
    "diagnosis_code": "C50.919",
    "procedure_code": "N/A",
    "admission_type": "Emergency",
    "distance_miles": 620.0,
    "hospital_id": None,
    "gender": "Male",
    "annual_deductible": 300.0,
}


def run_test():
    print("=" * 65)
    print("  HEALTHCARE FRAUD DETECTION - PREDICTION PIPELINE TEST")
    print("=" * 65)

    if predictor.model is None:
        print("[FAIL] Model failed to load - check ML/xgb_fraud_model.pkl")
        return

    results = {
        "Suspicious claim": predictor.predict(SUSPICIOUS_CLAIM),
        "Normal claim": predictor.predict(NORMAL_CLAIM),
        "Partial API-shaped claim": predictor.predict(PARTIAL_API_CLAIM),
    }

    print(f"{'CASE':<28} | {'FRAUD SCORE':<12} | {'DECISION'}")
    print("-" * 65)
    for name, result in results.items():
        if "error" in result:
            print(f"{name:<28} | ERROR: {result['error']}")
            continue
        print(f"{name:<28} | {result['fraud_score']:<12} | {result['prediction']}")

    scores = [r["fraud_score"] for r in results.values() if "error" not in r]
    print("-" * 65)
    if len(set(scores)) > 1:
        print("[OK] Scores vary across inputs - model is actually being used.")
    else:
        print("[WARN] All scores identical - pipeline may still be falling back.")
    print("=" * 65)


if __name__ == "__main__":
    run_test()
