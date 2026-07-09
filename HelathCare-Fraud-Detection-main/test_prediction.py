import sys
# --- [إضافة الكلاس هنا لحل مشكلة التحميل نهائياً] ---
class FraudInferenceSystem:
    pass

from ML.predictor import predictor

def run_independent_test():
    print("\n" + "="*65)
    print("      HEALTHCARE FRAUD DETECTION - INDIVIDUAL MODEL TEST      ")
    print("="*65)

    sample_claim = {
        'Claim_Amount': 15000000.0,
        'Deductible_Amount': 500.0,
        'CoPay_Amount': 50.0,
        'Patient_Age': 45,
        'Gender': 'Male',
        'Provider_Type': 'Clinic',
        'Provider_Specialty': 'Cardiology',
        'Diagnosis_Code': 'I10',
        'Admission_Type': 'Elective',
        'Discharge_Type': 'Home',
        'Service_Type': 'Inpatient',
        'Number_of_Procedures': 2,
        'Length_of_Stay_Days': 12,
        'Number_of_Previous_Claims_Patient': 500,
        'Number_of_Previous_Claims_Provider': 1,
        'Provider_Patient_Distance_Miles': 150.0, 
        'Days_to_Claim': 2,
        'Days_to_Expiration': 300,
        'Claim_Submitted_Late': 0
    }

    result = predictor.predict(sample_claim)

    if result.get("status") == "Error":
        print(f"❌ SYSTEM ERROR: {result.get('message')}")
        return

    print("-" * 65)
    print(f"{'MODEL NAME':<25} | {'PROBABILITY':<15} | {'STATUS':<15}")
    print("-" * 65)

    model_mapping = {
        'xgb': '1. XGBoost Model',
        'clf': '2. Ensemble Classifier',
        'complete': '3. Complete Fraud System'
    }

    for key, name in model_mapping.items():
        if key in result:
            prob = result[key]
            status = "⚠️  FRAUD" if prob > 50 else "✅  LEGIT"
            print(f"{name:<25} | {prob:<13}% | {status:<15}")

    print("-" * 65)
    print("="*65 + "\n")

if __name__ == "__main__":
    run_independent_test()