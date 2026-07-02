from dotenv import load_dotenv
import os
import pyodbc

# تحميل بيانات ملف الـ .env
load_dotenv()

server = os.getenv("DB_SERVER")
database = os.getenv("DB_NAME")
username = os.getenv("DB_USER")
password = os.getenv("DB_PWD")
driver = os.getenv("DB_DRIVER")

# الـ Connection String المعتمدة لـ ODBC Driver 18 مع Azure SQL
conn_str = f'''
DRIVER={{ODBC Driver 18 for SQL Server}};
SERVER={server};
DATABASE={database};
UID={username};
PWD={password};
Encrypt=yes;
TrustServerCertificate=yes;
Connection Timeout=30;
''' 

print("Connecting to Azure SQL Database...")

try:
    # فتح الاتصال
    conn = pyodbc.connect(conn_str)
    print("✅ Connected successfully!")
    
    # تيست سريع لقراءة نسخة السيرفر للتأكد 100%
    cursor = conn.cursor()
    cursor.execute("SELECT @@VERSION")
    row = cursor.fetchone()
    print(f"🖥️ Azure SQL Version: {row[0][:50]}...")
    
    # إغلاق الاتصال بنظافة
    cursor.close()
    conn.close()
    print("🔒 Connection closed cleanly.")

except Exception as e:
    print("❌ ERROR: Failed to connect!")
    print(e)