# setup_azure_sql.py
import pyodbc

# 🚀 انقل الـ Connection String اللي نجحت معاك في التست بالملي هنا:
connection_string = (
    "Driver={ODBC Driver 18 for SQL Server};"
    "Server=tcp:depiproject.database.windows.net,1433;"
    "Database=depi;"
    "Uid=rootAdmin;"
    "Pwd=Admin#123;"
    "Encrypt=yes;"
    "TrustServerCertificate=yes;" # 👈 نفس اللي شغلت التست بالملي
    "Connection Timeout=30;"
)

# كود الـ SQL DDL الموحد والمأمن بالسيرفر
SQL_DDL = """
-- 1. فحص وجود الجدول القديم وحذفه لتجنب تضارب السكيما
IF OBJECT_ID('dbo.Claims', 'U') IS NOT NULL
BEGIN
    DROP TABLE dbo.Claims;
    PRINT '⚠️ تم حذف جدول Claims القديم بنجاح نظرًا لتحديث السكيما.';
END

-- 2. إنشاء الجدول بالهيكل الخرساني الموحد (Lowercase Columns لتطابق الـ ML)
CREATE TABLE dbo.Claims (
    claim_id VARCHAR(50) NOT NULL PRIMARY KEY,      -- معرف الـ UUID الفريد للمطالبة
    policy_number VARCHAR(50) NOT NULL,            -- رقم بوليصة التأمين
    claim_amount DECIMAL(18, 2) NOT NULL,          -- قيمة المطالبة المادية
    provider_id VARCHAR(50) NOT NULL,             -- معرف المستشفى / المزود
    fraud_score FLOAT NOT NULL,                    -- نسبة الاحتيال المستخرجة من الموديل
    is_fraud BIT NOT NULL,                         -- (0 للنظيف، 1 للمحتال)
    risk_level VARCHAR(20) NOT NULL,               -- مستوى الخطر (CRITICAL, HIGH, MEDIUM, LOW)
    created_at DATETIME DEFAULT GETDATE()          -- توقيت الإدخال التلقائي للحركة
);

PRINT '✅ تم إنشاء جدول dbo.Claims الجديد بالـ Schema الصحيحة 100%.';
"""

def setup_database():
    print("🔄 [Setup] جاري الاتصال بقاعدة بيانات Azure SQL Server...")
    conn = None
    try:
        conn = pyodbc.connect(connection_string, autocommit=True)
        cursor = conn.cursor()
        
        print("🚀 [Setup] جاري تهيئة وضبط الجداول والـ Schema...")
        cursor.execute(SQL_DDL)
        
        print("✨ [نجاح ساحق] قاعدة البيانات الآن جاهزة ومحصنة تماماً للاستعلام والـ Fallback!")
        
    except pyodbc.Error as odbc_err:
        print(f"❌ خطأ حرج في الـ ODBC أثناء تهيئة الداتابيز: {odbc_err}")
    except Exception as e:
        print(f"❌ خطأ عام: {str(e)}")
    finally:
        if conn:
            conn.close()
            print("🔒 تم إغلاق الاتصال بأمان.")

if __name__ == "__main__":
    setup_database()