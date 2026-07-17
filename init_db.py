
import sqlite3
import datetime
import pandas as pd
import os

db_path = os.path.join(os.path.dirname(__file__), "healthcare_fraud.db")

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

# Create Provider table with Lat/Lng
cursor.execute("""
CREATE TABLE Provider (
    Provider_ID INTEGER PRIMARY KEY AUTOINCREMENT,
    Provider_Type TEXT NOT NULL,
    Provider_Specialty TEXT,
    Provider_City TEXT,
    Provider_State TEXT,
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
    Patient_Age INTEGER,
    Patient_Gender TEXT,
    Patient_City TEXT,
    Patient_State TEXT,
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
    Deductible_Amount REAL,
    CoPay_Amount REAL,
    FOREIGN KEY (Patient_ID) REFERENCES Patient(Patient_ID)
)
""")

# Create Service table
cursor.execute("""
CREATE TABLE Service (
    Service_ID INTEGER PRIMARY KEY AUTOINCREMENT,
    Service_Name TEXT NOT NULL,
    Deductible_Amount REAL,
    CoPay_Amount REAL
)
""")

# Create Claims table
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
    Status TEXT NOT NULL,
    Claim_Date TEXT NOT NULL,
    Service_Date TEXT NOT NULL,
    FOREIGN KEY (Patient_ID) REFERENCES Patient(Patient_ID),
    FOREIGN KEY (Provider_ID) REFERENCES Provider(Provider_ID),
    FOREIGN KEY (Policy_ID) REFERENCES Policy(Policy_ID),
    FOREIGN KEY (Service_ID) REFERENCES Service(Service_ID)
)
""")

# Create LabeledData table with auditor
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

print("Reading cleaned data...")
df = pd.read_csv("data/silver/cleaned_data.csv")

# Providers (unique by Provider_Type, Provider_Specialty, Provider_City, Provider_State)
print("Inserting providers...")
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

provider_map = {}
for idx, row in df[["Provider_Type", "Provider_Specialty", "Provider_City", "Provider_State"]].drop_duplicates().reset_index(drop=True).iterrows():
    city = row["Provider_City"]
    lat, lng = city_coords.get(city, (39.8283, -98.5795))
    cursor.execute("""
        INSERT INTO Provider (Provider_Type, Provider_Specialty, Provider_City, Provider_State, Latitude, Longitude, Total_Claims, Fraud_Claims, Avg_Fraud_Score)
        VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0)
    """, (row["Provider_Type"], row["Provider_Specialty"], row["Provider_City"], row["Provider_State"], lat, lng))
    provider_map[f"{row['Provider_Type']}_{row['Provider_Specialty']}_{row['Provider_City']}_{row['Provider_State']}"] = cursor.lastrowid

print(f"  Providers: {len(provider_map)}")

# Patients
print("Inserting patients...")
patient_map = {}
for idx, row in df[["Patient_ID", "Patient_Age", "Patient_Gender", "Patient_City", "Patient_State"]].drop_duplicates(subset="Patient_ID").iterrows():
    cursor.execute("""
        INSERT INTO Patient (Patient_ID, Patient_Age, Patient_Gender, Patient_City, Patient_State, Total_Claims)
        VALUES (?, ?, ?, ?, ?, 0)
    """, (row["Patient_ID"], row["Patient_Age"], row["Patient_Gender"], row["Patient_City"], row["Patient_State"]))
    patient_map[row["Patient_ID"]] = cursor.lastrowid
print(f"  Patients: {len(patient_map)}")

# Policies
print("Inserting policies...")
policy_map = {}
for idx, row in df[["Policy_Number", "Patient_ID", "Policy_Expiration_Date", "Deductible_Amount", "CoPay_Amount"]].drop_duplicates(subset="Policy_Number").iterrows():
    cursor.execute("""
        INSERT INTO Policy (Policy_ID, Patient_ID, Policy_Start_Date, Policy_End_Date, Deductible_Amount, CoPay_Amount)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (row["Policy_Number"], patient_map.get(row["Patient_ID"], None), "2020-01-01", row["Policy_Expiration_Date"], row["Deductible_Amount"], row["CoPay_Amount"]))
    policy_map[row["Policy_Number"]] = cursor.lastrowid
print(f"  Policies: {len(policy_map)}")

# Services
print("Inserting services...")
service_map = {}
for idx, row in df[["Service_Type", "Deductible_Amount", "CoPay_Amount"]].drop_duplicates().reset_index(drop=True).iterrows():
    cursor.execute("""
        INSERT INTO Service (Service_Name, Deductible_Amount, CoPay_Amount)
        VALUES (?, ?, ?)
    """, (row["Service_Type"], row["Deductible_Amount"], row["CoPay_Amount"]))
    service_map[row["Service_Type"]] = cursor.lastrowid
print(f"  Services: {len(service_map)}")

# Claims
print("Inserting claims...")
statuses = ["Submitted", "AI Scored", "Under Review", "Approved", "Rejected", "Fraud Confirmed", "Investigated", "Closed"]
claims = []
for idx, row in df.iterrows():
    provider_key = f"{row['Provider_Type']}_{row['Provider_Specialty']}_{row['Provider_City']}_{row['Provider_State']}"
    provider_id = provider_map[provider_key]
    patient_id = patient_map[row["Patient_ID"]]
    policy_id = row["Policy_Number"]
    service_id = service_map.get(row["Service_Type"], None)
    is_fraudulent = int(row["Is_Fraudulent"])
    status = statuses[0] if is_fraudulent == 1 else statuses[3]

    cursor.execute("""
        INSERT INTO Claims (Patient_ID, Provider_ID, Policy_ID, Service_ID, Diagnosis_Code, Procedure_Code, Number_of_Procedures, Admission_Type, Discharge_Type, Length_of_Stay_Days, Claim_Amount, Deductible_Amount, CoPay_Amount, Number_of_Previous_Claims_Patient, Number_of_Previous_Claims_Provider, Provider_Patient_Distance_Miles, Claim_Submitted_Late, Is_Fraudulent, Status, Claim_Date, Service_Date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        patient_id, provider_id, policy_id, service_id,
        row["Diagnosis_Code"], row["Procedure_Code"], row["Number_of_Procedures"],
        row["Admission_Type"], row["Discharge_Type"], row["Length_of_Stay_Days"],
        row["Claim_Amount"], row["Deductible_Amount"], row["CoPay_Amount"],
        row["Number_of_Previous_Claims_Patient"],
        row["Number_of_Previous_Claims_Provider"],
        row["Provider_Patient_Distance_Miles"],
        int(row["Claim_Submitted_Late"]),
        is_fraudulent,
        status,
        row["Claim_Date"], row["Service_Date"]
    ))

    claims.append({
        "Claim_ID": cursor.lastrowid,
        "Is_Fraudulent": is_fraudulent,
        "Provider_ID": provider_id
    })

print(f"  Claims: {len(claims)}")

# Calculate provider total claims
for claim in claims:
    cursor.execute("UPDATE Provider SET Total_Claims = Total_Claims + 1 WHERE Provider_ID = ?", (claim["Provider_ID"],))
    if claim["Is_Fraudulent"]:
        cursor.execute("UPDATE Provider SET Fraud_Claims = Fraud_Claims + 1 WHERE Provider_ID = ?", (claim["Provider_ID"],))

# Model Metrics
print("Inserting initial model metrics...")
total_claims = len(claims)
fraud_claims = sum(1 for c in claims if c["Is_Fraudulent"])
cursor.execute("""
    INSERT INTO ModelMetrics (accuracy, precision, recall, f1_score, roc_auc, model_version, last_training_date, training_samples, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
""", (0.92, 0.88, 0.85, 0.86, 0.94, "1.0.0", datetime.datetime.now().isoformat(), total_claims, datetime.datetime.now().isoformat()))

# Notifications
print("Inserting initial notifications...")
cursor.execute("""
    INSERT INTO Notifications (title, message, type, created_at)
    VALUES (?, ?, ?, ?)
""", ("High Risk Claims Alert", f"{fraud_claims} high risk claims require review", "fraud", datetime.datetime.now().isoformat()))
cursor.execute("""
    INSERT INTO Notifications (title, message, type, created_at)
    VALUES (?, ?, ?, ?)
""", ("New Claims Submitted", f"{total_claims} new claims have been processed", "info", datetime.datetime.now().isoformat()))
cursor.execute("""
    INSERT INTO Notifications (title, message, type, created_at)
    VALUES (?, ?, ?, ?)
""", ("Model Retraining Complete", "Model version 1.0.0 is deployed", "success", datetime.datetime.now().isoformat()))

# Audit Logs
print("Inserting audit logs...")
audit_logs = [
    (datetime.datetime.now().isoformat(), "admin_insurance", "LOGIN", "N/A", "127.0.0.1"),
    (datetime.datetime.now().isoformat(), "admin_insurance", "VIEW_DASHBOARD", "Executive Dashboard", "127.0.0.1"),
    (datetime.datetime.now().isoformat(), "admin_insurance", "VIEW_CLAIMS", "Claims List", "127.0.0.1"),
]
for ts, user, action, record, ip in audit_logs:
    cursor.execute("""
        INSERT INTO AuditLogs (timestamp, user, action, affected_record, ip_address)
        VALUES (?, ?, ?, ?, ?)
    """, (ts, user, action, record, ip))

conn.commit()

# Labeled Data (from fraud cases)
print("Inserting labeled data...")
claim_count = 0
for idx, row in df[df["Is_Fraudulent"] == 1].head(20).iterrows():
    is_fraud = int(row["Is_Fraudulent"])
    label = "Fraud" if is_fraud else "Clean"
    cursor.execute("""
        INSERT INTO LabeledData (claim_id, patient_name, provider_name, amount, label, is_fraudulent, claim_date, auditor, audit_date, created_at, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        int(row["Claim_ID"]),
        f"Patient {int(row['Patient_ID'])}",
        f"{row['Provider_Type']} {row['Provider_Specialty']}",
        row["Claim_Amount"],
        label,
        is_fraud,
        row["Claim_Date"],
        "admin_insurance",
        datetime.datetime.now().isoformat(),
        datetime.datetime.now().isoformat(),
        "Initial labeling"
    ))
    claim_count +=1
# Now some clean ones
for idx, row in df[df["Is_Fraudulent"] == 0].head(20).iterrows():
    is_fraud = int(row["Is_Fraudulent"])
    label = "Fraud" if is_fraud else "Clean"
    cursor.execute("""
        INSERT INTO LabeledData (claim_id, patient_name, provider_name, amount, label, is_fraudulent, claim_date, auditor, audit_date, created_at, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        int(row["Claim_ID"]),
        f"Patient {int(row['Patient_ID'])}",
        f"{row['Provider_Type']} {row['Provider_Specialty']}",
        row["Claim_Amount"],
        label,
        is_fraud,
        row["Claim_Date"],
        "admin_insurance",
        datetime.datetime.now().isoformat(),
        datetime.datetime.now().isoformat(),
        "Initial labeling"
    ))
    claim_count +=1

conn.commit()
conn.close()

print("="*50)
print("Successfully initialized database!")
print(f"  Providers: {len(provider_map)}")
print(f"  Patients: {len(patient_map)}")
print(f"  Policies: {len(policy_map)}")
print(f"  Services: {len(service_map)}")
print(f"  Claims: {len(claims)}")
print(f"  Labeled Data: {claim_count}")
print("="*50)
