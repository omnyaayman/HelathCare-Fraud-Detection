from sqlalchemy import text
from services.azure_db import SessionLocal

print("--- [START] Testing Connection ---")

try:
    print("Connecting to Azure...")
    db = SessionLocal()
    db.execute(text("SELECT 1"))
    print("✅ CONNECTION SUCCESSFUL!")
except Exception as e:
    print(f"❌ ERROR: {e}")
finally:
    if 'db' in locals():
        db.close()
    print("--- [END] Testing ---")