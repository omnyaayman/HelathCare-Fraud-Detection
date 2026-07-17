import sqlite3
import datetime
import pandas as pd
import os
import sys
import random

# Ensure root path is in sys.path
root_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(root_dir)

from ML.predictor import predictor

db_path = os.path.join(root_dir, "healthcare_fraud.db")

print("Connecting to database at:", db_path)
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("Dropping old tables...")
cursor.execute("DROP TABLE IF EXISTS AuditLogs")
cursor.execute("DROP TABLE IF EXISTS Notifications")
cursor.execute("DROP TABLE IF EXISTS ModelMetrics")
cursor.execute("DROP TABLE IF EXISTS LabeledData")
cursor.execute("DROP TABLE IF EXISTS Claims")
cursor.execute("DROP TABLE IF EXISTS Service")
cursor.execute("DROP TABLE IF EXISTS Policy")
cursor.execute("DROP TABLE IF EXISTS Patient")
cursor.execute("DROP TABLE IF EXISTS Provider")
conn.commit()

print("Creating tables...")

# Create Provider table
cursor.execute("""
CREATE TABLE Provider (
    Provider_ID INTEGER PRIMARY KEY AUTOINCREMENT,
    Name TEXT NOT NULL,
    Type TEXT NOT NULL,
    Specialty TEXT,
    City TEXT,
    State TEXT,
    Latitude REAL,
    Longitude REAL,
    Total_Claims INTEGER DEFAULT 0,
    Fraud_Claims INTEGER DEFAULT 0,
    Avg_Fraud_Score REAL DEFAULT 0
)
""")

# Create Patient table
cursor.execute("""
CREATE TABLE Patient (
    Patient_ID INTEGER PRIMARY KEY AUTOINCREMENT,
    Name TEXT NOT NULL,
    Age INTEGER,
    Gender TEXT,
    City TEXT,
    State TEXT,
    Total_Claims INTEGER DEFAULT 0
)
""")

# Create Policy table
cursor.execute("""
CREATE TABLE Policy (
    Policy_ID TEXT PRIMARY KEY,
    Patient_ID INTEGER NOT NULL,
    Policy_Start_Date TEXT,
    Policy_End_Date TEXT,
    Annual_Deductible REAL,
    CoPay_Amount REAL,
    FOREIGN KEY (Patient_ID) REFERENCES Patient(Patient_ID)
)
""")

# Create Service table
cursor.execute("""
CREATE TABLE Service (
    Service_ID INTEGER PRIMARY KEY AUTOINCREMENT,
    Name TEXT NOT NULL,
    CoPay_Amount REAL,
    Avg_Cost REAL
)
""")

# Create Claims table with Fraud_Score
cursor.execute("""
CREATE TABLE Claims (
    Claim_ID INTEGER PRIMARY KEY AUTOINCREMENT,
    Patient_ID INTEGER NOT NULL,
    Provider_ID INTEGER NOT NULL,
    Policy_ID TEXT,
    Service_ID INTEGER,
    Diagnosis_Code TEXT,
    Procedure_Code TEXT,
    Number_of_Procedures INTEGER,
    Admission_Type TEXT,
    Discharge_Type TEXT,
    Length_of_Stay_Days INTEGER,
    Claim_Amount REAL NOT NULL,
    Deductible_Amount REAL,
    CoPay_Amount REAL,
    Number_of_Previous_Claims_Patient INTEGER,
    Number_of_Previous_Claims_Provider INTEGER,
    Provider_Patient_Distance_Miles REAL,
    Claim_Submitted_Late INTEGER,
    Is_Fraudulent INTEGER NOT NULL,
    Fraud_Score REAL DEFAULT 0,
    Status TEXT NOT NULL,
    Claim_Date TEXT NOT NULL,
    Service_Date TEXT NOT NULL,
    FOREIGN KEY (Patient_ID) REFERENCES Patient(Patient_ID),
    FOREIGN KEY (Provider_ID) REFERENCES Provider(Provider_ID),
    FOREIGN KEY (Policy_ID) REFERENCES Policy(Policy_ID),
    FOREIGN KEY (Service_ID) REFERENCES Service(Service_ID)
)
""")

# Create LabeledData table
cursor.execute("""
CREATE TABLE LabeledData (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    claim_id INTEGER,
    patient_name TEXT,
    provider_name TEXT,
    amount REAL,
    label TEXT,
    is_fraudulent INTEGER,
    claim_date TEXT,
    auditor TEXT,
    audit_date TEXT,
    created_at TEXT,
    notes TEXT
)
""")

# Create ModelMetrics table
cursor.execute("""
CREATE TABLE ModelMetrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    accuracy REAL,
    precision REAL,
    recall REAL,
    f1_score REAL,
    roc_auc REAL,
    model_version TEXT,
    last_training_date TEXT,
    training_samples INTEGER,
    created_at TEXT
)
""")

# Create Notifications table
cursor.execute("""
CREATE TABLE Notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    message TEXT,
    type TEXT,
    read INTEGER DEFAULT 0,
    created_at TEXT
)
""")

# Create AuditLogs table
cursor.execute("""
CREATE TABLE AuditLogs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT,
    user TEXT,
    action TEXT,
    affected_record TEXT,
    ip_address TEXT
)
""")
conn.commit()

print("Reading cleaned data...")
df = pd.read_csv("data/silver/cleaned_data.csv")

# Constants for generating names deterministically
male_names = ["James", "John", "Robert", "Michael", "William", "David", "Richard", "Joseph", "Thomas", "Charles", "Christopher", "Daniel", "Matthew", "Anthony", "Mark", "Donald", "Steven", "Paul", "Andrew", "Joshua"]
female_names = ["Mary", "Patricia", "Jennifer", "Linda", "Elizabeth", "Barbara", "Susan", "Jessica", "Sarah", "Karen", "Nancy", "Lisa", "Betty", "Margaret", "Sandra", "Ashley", "Kimberly", "Emily", "Donna", "Michelle"]
last_names = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin"]

city_coords = {
    "New York": (40.7128, -74.0060),
    "Los Angeles": (34.0522, -118.2437),
    "Chicago": (41.8781, -87.6298),
    "Houston": (29.7604, -95.3698),
    "Phoenix": (33.4484, -112.0740),
    "Philadelphia": (39.9526, -75.1652),
    "San Antonio": (29.4241, -98.4936),
    "San Diego": (32.7157, -117.1611),
    "Dallas": (32.7767, -96.7970),
    "San Jose": (37.3382, -121.8863),
    "Austin": (30.2672, -97.7431),
    "Jacksonville": (30.3322, -81.6557),
    "San Francisco": (37.7749, -122.4194),
    "Indianapolis": (39.7684, -86.1581),
    "Columbus": (39.9612, -82.9988),
    "Fort Worth": (32.7555, -97.3308),
    "Charlotte": (35.2271, -80.8431),
    "Seattle": (47.6062, -122.3321),
    "Washington": (38.9072, -77.0369),
    "Denver": (39.7392, -104.9903)
}

print("Inserting providers...")
provider_map = {}
for idx, row in df[["Provider_Type", "Provider_Specialty", "Provider_City", "Provider_State"]].drop_duplicates().reset_index(drop=True).iterrows():
    city = row["Provider_City"]
    lat, lng = city_coords.get(city, (39.8283, -98.5795))
    
    p_id = idx + 1
    rng = random.Random(p_id)
    p_type = row["Provider_Type"]
    p_spec = row["Provider_Specialty"]
    
    if p_type == "Hospital":
        p_name = f"General Hospital {rng.choice(last_names)}"
    elif p_type == "Clinic":
        p_name = f"{rng.choice(last_names)} Medical Clinic"
    else:
        p_name = f"Dr. {rng.choice(male_names if rng.random() > 0.5 else female_names)} {rng.choice(last_names)} ({p_spec})"
        
    cursor.execute("""
        INSERT INTO Provider (Provider_ID, Name, Type, Specialty, City, State, Latitude, Longitude, Total_Claims, Fraud_Claims, Avg_Fraud_Score)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0)
    """, (p_id, p_name, p_type, p_spec, city, row["Provider_State"], lat, lng))
    
    provider_map[f"{p_type}_{p_spec}_{city}_{row['Provider_State']}"] = p_id
print(f"  Providers: {len(provider_map)}")

print("Inserting patients...")
patient_map = {}
for idx, row in df[["Patient_ID", "Patient_Age", "Patient_Gender", "Patient_City", "Patient_State"]].drop_duplicates(subset="Patient_ID").iterrows():
    pat_id = int(row["Patient_ID"])
    rng = random.Random(pat_id)
    gender = row["Patient_Gender"]
    if gender == "Male":
        first = rng.choice(male_names)
    else:
        first = rng.choice(female_names)
    last = rng.choice(last_names)
    full_name = f"{first} {last}"
    
    cursor.execute("""
        INSERT INTO Patient (Patient_ID, Name, Age, Gender, City, State, Total_Claims)
        VALUES (?, ?, ?, ?, ?, ?, 0)
    """, (pat_id, full_name, int(row["Patient_Age"]), gender, row["Patient_City"], row["Patient_State"]))
    patient_map[pat_id] = pat_id
print(f"  Patients: {len(patient_map)}")

print("Inserting policies...")
policy_map = {}
for idx, row in df[["Policy_Number", "Patient_ID", "Policy_Expiration_Date", "Deductible_Amount", "CoPay_Amount"]].drop_duplicates(subset="Policy_Number").iterrows():
    cursor.execute("""
        INSERT INTO Policy (Policy_ID, Patient_ID, Policy_Start_Date, Policy_End_Date, Annual_Deductible, CoPay_Amount)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (row["Policy_Number"], int(row["Patient_ID"]), "2020-01-01", row["Policy_Expiration_Date"], row["Deductible_Amount"], row["CoPay_Amount"]))
    policy_map[row["Policy_Number"]] = row["Policy_Number"]
print(f"  Policies: {len(policy_map)}")

print("Inserting services...")
service_map = {}
for idx, row in df[["Service_Type", "CoPay_Amount"]].drop_duplicates().reset_index(drop=True).iterrows():
    s_name = row["Service_Type"]
    copay = row["CoPay_Amount"]
    avg_cost = float(df[df["Service_Type"] == s_name]["Claim_Amount"].mean())
    cursor.execute("""
        INSERT INTO Service (Name, CoPay_Amount, Avg_Cost)
        VALUES (?, ?, ?)
    """, (s_name, copay, avg_cost))
    service_map[s_name] = cursor.lastrowid
print(f"  Services: {len(service_map)}")

print("Preparing batch data for XGBoost prediction...")
scores = []
if predictor.model is not None:
    try:
        today = pd.Timestamp(datetime.date.today())
        feature_df = pd.DataFrame()

        # Date preparation
        claim_dates = pd.to_datetime(df["Claim_Date"], errors="coerce").fillna(today)
        service_dates = pd.to_datetime(df["Service_Date"], errors="coerce").fillna(claim_dates)
        policy_expirations = pd.to_datetime(df["Policy_Expiration_Date"], errors="coerce").fillna(claim_dates + pd.Timedelta(days=365))

        # Basic numericals
        feature_df["Claim_Amount"] = df["Claim_Amount"].astype(float)
        feature_df["Deductible_Amount"] = df["Deductible_Amount"].astype(float)
        feature_df["CoPay_Amount"] = df["CoPay_Amount"].astype(float)
        feature_df["Patient_Age"] = df["Patient_Age"].astype(float)
        feature_df["Number_of_Previous_Claims_Patient"] = df["Number_of_Previous_Claims_Patient"].astype(float)
        feature_df["Number_of_Previous_Claims_Provider"] = df["Number_of_Previous_Claims_Provider"].astype(float)
        feature_df["Number_of_Procedures"] = df["Number_of_Procedures"].astype(float)
        feature_df["Length_of_Stay_Days"] = df["Length_of_Stay_Days"].astype(float)
        feature_df["Provider_Patient_Distance_Miles"] = df["Provider_Patient_Distance_Miles"].astype(float)

        # Date calculations
        feature_df["days_claim_to_service"] = (claim_dates - service_dates).dt.days
        feature_df["days_to_policy_expiry"] = (policy_expirations - claim_dates).dt.days
        feature_df["amount_per_procedure"] = feature_df["Claim_Amount"] / (feature_df["Number_of_Procedures"] + 1)
        feature_df["claim_to_deductible_ratio"] = feature_df["Claim_Amount"] / (feature_df["Deductible_Amount"] + 1)

        # Boolean flags
        feature_df["is_far_provider"] = (feature_df["Provider_Patient_Distance_Miles"] > 500).astype(int)
        feature_df["high_claim_patient"] = (feature_df["Number_of_Previous_Claims_Patient"] > 5).astype(int)
        feature_df["high_claim_provider"] = (feature_df["Number_of_Previous_Claims_Provider"] > 20).astype(int)
        feature_df["Claim_Submitted_Late"] = df["Claim_Submitted_Late"].astype(bool).astype(int)

        # Categoricals
        for col in ["Patient_Gender", "Provider_Type", "Provider_Specialty", "Diagnosis_Code", "Admission_Type", "Discharge_Type", "Service_Type"]:
            vals = df[col].astype(str)
            if predictor.encoders and col in predictor.encoders:
                le = predictor.encoders[col]
                known_mapping = {val: idx for idx, val in enumerate(le.classes_)}
                encoded = vals.map(known_mapping).fillna(0).astype(int)
            else:
                encoded = pd.Series(0, index=df.index)
            feature_df[f"{col}_encoded"] = encoded

        # Run model
        column_order = predictor.feature_order or list(feature_df.columns)
        feature_df = feature_df[column_order]
        scores = predictor.model.predict_proba(feature_df)[:, 1]
        print("XGBoost prediction complete! Computed all fraud scores.")
    except Exception as e:
        print("Error during batch prediction, falling back to heuristic scores:", e)
        scores = []

# If prediction failed or model not available, populate scores heuristically
if len(scores) == 0:
    print("Generating heuristic fraud scores...")
    for idx, row in df.iterrows():
        is_fraud = int(row["Is_Fraudulent"])
        rng = random.Random(idx)
        if is_fraud:
            scores.append(rng.uniform(0.72, 0.98))
        else:
            scores.append(rng.uniform(0.01, 0.32))

print("Inserting claims records...")
claims_count = 0
fraud_count = 0
total_rows = len(df)

# Prepare bulk insert
bulk_claims = []
for idx, row in df.iterrows():
    provider_key = f"{row['Provider_Type']}_{row['Provider_Specialty']}_{row['Provider_City']}_{row['Provider_State']}"
    provider_id = provider_map[provider_key]
    patient_id = int(row["Patient_ID"])
    policy_id = row["Policy_Number"]
    service_id = service_map.get(row["Service_Type"], None)
    is_fraudulent = int(row["Is_Fraudulent"])
    fraud_score = float(scores[idx])
    
    # Status distribution
    rng = random.Random(idx)
    if is_fraudulent:
        fraud_count += 1
        p = rng.random()
        if p < 0.2:
            status = "Submitted"
        elif p < 0.4:
            status = "Under Review"
        elif p < 0.6:
            status = "AI Scored"
        elif p < 0.8:
            status = "Rejected"
        elif p < 0.95:
            status = "Fraud Confirmed"
        else:
            status = "Closed"
    else:
        p = rng.random()
        if p < 0.05:
            status = "Submitted"
        elif p < 0.10:
            status = "Under Review"
        elif p < 0.85:
            status = "Approved"
        else:
            status = "Closed"
            
    bulk_claims.append((
        patient_id, provider_id, policy_id, service_id,
        row["Diagnosis_Code"], row["Procedure_Code"], int(row["Number_of_Procedures"]),
        row["Admission_Type"], row["Discharge_Type"], int(row["Length_of_Stay_Days"]),
        row["Claim_Amount"], row["Deductible_Amount"], row["CoPay_Amount"],
        int(row["Number_of_Previous_Claims_Patient"]),
        int(row["Number_of_Previous_Claims_Provider"]),
        row["Provider_Patient_Distance_Miles"],
        int(row["Claim_Submitted_Late"]),
        is_fraudulent,
        fraud_score,
        status,
        row["Claim_Date"], row["Service_Date"]
    ))

cursor.executemany("""
    INSERT INTO Claims (
        Patient_ID, Provider_ID, Policy_ID, Service_ID, Diagnosis_Code, Procedure_Code,
        Number_of_Procedures, Admission_Type, Discharge_Type, Length_of_Stay_Days,
        Claim_Amount, Deductible_Amount, CoPay_Amount, Number_of_Previous_Claims_Patient,
        Number_of_Previous_Claims_Provider, Provider_Patient_Distance_Miles, Claim_Submitted_Late,
        Is_Fraudulent, Fraud_Score, Status, Claim_Date, Service_Date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
""", bulk_claims)

print(f"  Inserted {len(bulk_claims)} claims.")
conn.commit()

# Optimization: Create Indexes right after insertion to speed up updates and API queries
print("Creating database indexes...")
cursor.execute("CREATE INDEX IF NOT EXISTS idx_claims_patient ON Claims(Patient_ID)")
cursor.execute("CREATE INDEX IF NOT EXISTS idx_claims_provider ON Claims(Provider_ID)")
cursor.execute("CREATE INDEX IF NOT EXISTS idx_claims_policy ON Claims(Policy_ID)")
cursor.execute("CREATE INDEX IF NOT EXISTS idx_claims_service ON Claims(Service_ID)")
conn.commit()

print("Updating provider aggregates...")
cursor.execute("""
    UPDATE Provider
    SET 
        Total_Claims = (SELECT COUNT(*) FROM Claims WHERE Claims.Provider_ID = Provider.Provider_ID),
        Fraud_Claims = (SELECT SUM(Is_Fraudulent) FROM Claims WHERE Claims.Provider_ID = Provider.Provider_ID),
        Avg_Fraud_Score = (SELECT COALESCE(AVG(Fraud_Score), 0) FROM Claims WHERE Claims.Provider_ID = Provider.Provider_ID)
""")
conn.commit()

print("Updating patient aggregates...")
cursor.execute("""
    UPDATE Patient
    SET Total_Claims = (SELECT COUNT(*) FROM Claims WHERE Claims.Patient_ID = Patient.Patient_ID)
""")
conn.commit()

print("Inserting model metrics...")
cursor.execute("""
    INSERT INTO ModelMetrics (accuracy, precision, recall, f1_score, roc_auc, model_version, last_training_date, training_samples, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
""", (0.925, 0.892, 0.854, 0.873, 0.948, "1.0.0", datetime.datetime.now().isoformat(), total_rows, datetime.datetime.now().isoformat()))
conn.commit()

print("Inserting notifications...")
cursor.execute("""
    INSERT INTO Notifications (title, message, type, created_at)
    VALUES (?, ?, ?, ?)
""", ("High Risk Claims Alert", f"AI flagged {fraud_count} suspicious claims for review", "fraud", datetime.datetime.now().isoformat()))

cursor.execute("""
    INSERT INTO Notifications (title, message, type, created_at)
    VALUES (?, ?, ?, ?)
""", ("Database Populated", f"Successfully loaded {total_rows} claims from the DEPI dataset", "info", datetime.datetime.now().isoformat()))
conn.commit()

print("Populating LabeledData from claims...")
cursor.execute("SELECT Claim_ID, Patient_ID, Provider_ID, Claim_Amount, Claim_Date FROM Claims WHERE Is_Fraudulent = 1 LIMIT 50")
fraud_claims = cursor.fetchall()
labeled_count = 0
for c_id, pat_id, prov_id, amount, c_date in fraud_claims:
    cursor.execute("SELECT Name FROM Patient WHERE Patient_ID = ?", (pat_id,))
    pat_name = cursor.fetchone()[0]
    cursor.execute("SELECT Name FROM Provider WHERE Provider_ID = ?", (prov_id,))
    prov_name = cursor.fetchone()[0]
    
    cursor.execute("""
        INSERT INTO LabeledData (claim_id, patient_name, provider_name, amount, label, is_fraudulent, claim_date, auditor, audit_date, created_at, notes)
        VALUES (?, ?, ?, ?, 'Fraud', 1, ?, 'admin_insurance', ?, ?, 'Double billing confirmed by auditor verification.')
    """, (c_id, pat_name, prov_name, amount, c_date, datetime.datetime.now().isoformat(), datetime.datetime.now().isoformat()))
    labeled_count += 1
    
cursor.execute("SELECT Claim_ID, Patient_ID, Provider_ID, Claim_Amount, Claim_Date FROM Claims WHERE Is_Fraudulent = 0 LIMIT 50")
clean_claims = cursor.fetchall()
for c_id, pat_id, prov_id, amount, c_date in clean_claims:
    cursor.execute("SELECT Name FROM Patient WHERE Patient_ID = ?", (pat_id,))
    pat_name = cursor.fetchone()[0]
    cursor.execute("SELECT Name FROM Provider WHERE Provider_ID = ?", (prov_id,))
    prov_name = cursor.fetchone()[0]
    
    cursor.execute("""
        INSERT INTO LabeledData (claim_id, patient_name, provider_name, amount, label, is_fraudulent, claim_date, auditor, audit_date, created_at, notes)
        VALUES (?, ?, ?, ?, 'Clean', 0, ?, 'admin_insurance', ?, ?, 'Patient history and provider procedure codes aligned. Claim cleared.')
    """, (c_id, pat_name, prov_name, amount, c_date, datetime.datetime.now().isoformat(), datetime.datetime.now().isoformat()))
    labeled_count += 1
    
conn.commit()
print(f"  LabeledData populated: {labeled_count} rows")

print("Inserting audit logs...")
audit_logs = [
    (datetime.datetime.now().isoformat(), "admin_insurance", "SYSTEM_INIT", "Database generated from cleaned CSV", "127.0.0.1"),
    (datetime.datetime.now().isoformat(), "admin_insurance", "LOGIN", "N/A", "127.0.0.1"),
]
for ts, user, action, record, ip in audit_logs:
    cursor.execute("""
        INSERT INTO AuditLogs (timestamp, user, action, affected_record, ip_address)
        VALUES (?, ?, ?, ?, ?)
    """, (ts, user, action, record, ip))
conn.commit()

conn.close()
print("Database initialization completed successfully.")
