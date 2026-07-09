import pandas as pd

# Task 1
def load_data():
    print("🔹 Task 1: Load")
    return pd.read_csv("data/bronze/synthetic_health_claims.csv")

# Task 2
def clean_data(df):
    print("🔹 Task 2: Clean")
    df = df.dropna()
    df = df.drop_duplicates()
    return df

# Task 3
def transform_data(df):
    print("🔹 Task 3: Transform")
    result = df.groupby("Patient_City")["Is_Fraudulent"].sum().reset_index()
    result.columns = ["City", "Fraud_Cases"]
    return result

# Task 4
def save_data(df):
    print("🔹 Task 4: Save")
    df.to_csv("data/gold/fraud_summary.csv", index=False)

# DAG Execution
if __name__ == "__main__":
    df = load_data()
    df = clean_data(df)
    df = transform_data(df)
    save_data(df)

    print("Pipeline Finished ✅")
    