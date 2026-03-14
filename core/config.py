import os
import urllib.parse # تأكد إنها parse
from dotenv import load_dotenv

load_dotenv()

class Settings:
    DB_SERVER = os.getenv("DB_SERVER")
    DB_NAME = os.getenv("DB_NAME")
    DB_USER = os.getenv("DB_USER")
    DB_PWD = os.getenv("DB_PWD")
    DB_DRIVER = os.getenv("DB_DRIVER") # تأكد إنها: {ODBC Driver 18 for SQL Server}

    # صياغة الرابط بشكل مباشر وأكثر توافقاً مع Driver 18
    connection_string = (
        f"Driver={DB_DRIVER};"
        f"Server=tcp:{DB_SERVER},1433;" # إضافة البورت 1433 مهمة لـ Azure
        f"Database={DB_NAME};"
        f"Uid={DB_USER};"
        f"Pwd={DB_PWD};"
        "Encrypt=yes;"
        "TrustServerCertificate=yes;" # غيرنا دي لـ yes عشان نتخطى مشاكل الشهادات المحلية
        "Connection Timeout=30;"
    )
    
    params = urllib.parse.quote_plus(connection_string)
    DATABASE_URL = f"mssql+pyodbc:///?odbc_connect={params}"

settings = Settings()