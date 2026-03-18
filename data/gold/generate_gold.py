import pandas as pd


df = pd.read_csv("data/silver/cleaned_data.csv")


claims_per_patient = df.groupby("Patient_ID").size().reset_index(name="num_claims")


avg_cost = df.groupby("Patient_ID")["Claim_Amount"].mean().reset_index(name="avg_claim_amount")


fraud_cases = df[df["Claim_Amount"] > 10000]

claims_per_patient.to_csv("data/gold/claims_per_patient.csv", index=False)
avg_cost.to_csv("data/gold/avg_cost.csv", index=False)
fraud_cases.to_csv("data/gold/fraud_cases.csv", index=False)

print("Gold layer created ✅")