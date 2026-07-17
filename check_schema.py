
import sqlite3

conn = sqlite3.connect('healthcare_fraud.db')
cursor = conn.cursor()

print("=== Tables and Columns ===\n")

cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()

for (table_name,) in tables:
    print(f"--- Table: {table_name} ---")
    cursor.execute(f"PRAGMA table_info({table_name})")
    cols = cursor.fetchall()
    for col in cols:
        print(f"  {col[1]} ({col[2]})")
    print()

conn.close()
