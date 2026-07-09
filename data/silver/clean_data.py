import pandas as pd

df = pd.read_csv("data/bronze/synthetic_health_claims.csv")

df = df.drop_duplicates()

df = df.dropna()

df.to_csv("data/silver/cleaned_data.csv", index=False)

print("Data cleaned and saved to silver layer ✅")