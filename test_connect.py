from dotenv import load_dotenv
import os
import pyodbc

# تحميل بيانات .env
load_dotenv()

server = os.getenv("DB_SERVER")
database = os.getenv("DB_NAME")
username = os.getenv("DB_USER")
password = os.getenv("DB_PWD")
driver = os.getenv("DB_DRIVER")

conn_str = f'''
DRIVER=ODBC Driver 18 for SQL Server;
SERVER={server};
DATABASE={database};
UID={username};
PWD={password};
Encrypt=yes;
TrustServerCertificate=no;
Connection Timeout=30;
''' 

print("Connecting to Azure...")

try:
    conn = pyodbc.connect(conn_str)
    print("✅ Connected successfully!")
except Exception as e:
    print("❌ ERROR:", e)