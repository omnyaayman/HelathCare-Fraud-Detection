from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
import uvicorn

# استيراد الإعدادات والمسارات
from services.azure_db import SessionLocal
from app.routes import router as api_router
from core.constants import TABLE_PROVIDER  # استيراد اسم جدول المزودين

app = FastAPI(
    title="Healthcare Fraud Detection System",
    description="Backend API powered by FastAPI, Azure SQL, and XGBoost",
    version="1.0.0"
)

# 1️⃣ إعدادات CORS (الربط بين بورت 5173 وبورت 8000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # في بيئة التطوير نسمح بالكل، في الإنتاج نحدد رابط الـ React
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBasic()

# دالة الحصول على جلسة الداتابيز
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 2️⃣ نظام التحقق من الهوية المركزي (Authentication)
def authenticate(credentials: HTTPBasicCredentials = Depends(security), db: Session = Depends(get_db)):
    """التحقق من المستخدمين سواء كانوا أدمن تأمين أو مزودي خدمات (مستشفيات)"""
    
    # أ. حساب الإدارة (Insurance Admin) - بيانات ثابتة للمشروع
    if credentials.username == "admin_insurance" and credentials.password == "password123":
        return {"username": credentials.username, "role": "insurance"}
    
    # ب. حسابات المستشفيات (Providers) - جلب البيانات من Azure SQL
    # نستخدم اسم الجدول من الثوابت لضمان الدقة
    query = text(f"SELECT Password FROM [dbo].[{TABLE_PROVIDER}] WHERE Username = :u")
    result = db.execute(query, {"u": credentials.username}).fetchone()
    
    # التحقق من تطابق كلمة المرور (في المشروع نستخدم نصاً عادياً، في الحقيقة نستخدم Hashing)
    if result and result[0] == credentials.password:
        return {"username": credentials.username, "role": "provider"}
    
    # ج. رفض الدخول في حالة عدم التطابق
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid username or password",
        headers={"WWW-Authenticate": "Basic"},
    )

# 3️⃣ مسار تسجيل الدخول (Login Endpoint)
@app.post("/api/login")
async def login(user_data: dict = Depends(authenticate)):
    """يستخدمه الفرونت إند لمعرفة دور المستخدم بعد نجاح التحقق"""
    return {
        "username": user_data["username"],
        "role": user_data["role"],
        "message": f"Welcome back, {user_data['username']}!"
    }

# 4️⃣ ربط مسارات الـ API (كل العمليات تحت حماية تسجيل الدخول)
app.include_router(
    api_router, 
    prefix="/api", 
    dependencies=[Depends(authenticate)]
)

# 5️⃣ فحص جاهزية السيرفر والداتابيز (Health Check)
@app.get("/health")
async def health_check(db: Session = Depends(get_db)):
    try:
        # محاولة تنفيذ استعلام بسيط للتأكد من اتصال Azure SQL
        db.execute(text("SELECT 1"))
        return {
            "status": "online",
            "database": "connected",
            "provider": "Azure SQL Server",
            "engine": "FastAPI + Uvicorn"
        }
    except Exception as e:
        return {"status": "error", "database_connection": str(e)}

# تشغيل السيرفر
if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)