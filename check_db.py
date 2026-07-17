import sqlite3

conn = sqlite3.connect('healthcare_fraud.db')
cursor = conn.cursor()

print("=== Checking Database ===")

# Check tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()
print(f"\nTables: {[t[0] for t in tables]}")

# Check row counts
for table in ['Provider', 'Patient', 'Policy', 'Service', 'Claims', 'LabeledData']:
    try:
        cursor.execute(f"SELECT COUNT(*) FROM {table}")
        count = cursor.fetchone()[0]
        print(f"{table}: {count} rows")
        if count > 0 and table in ['Claims']:
            cursor.execute(f"SELECT * FROM {table} LIMIT 3")
            rows = cursor.fetchall()
            print(f"Sample rows from {table}: {rows}")
    except Exception as e:
        print(f"Error checking {table}: {e}")

conn.close()
