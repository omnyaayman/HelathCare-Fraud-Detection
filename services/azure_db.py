from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from core.config import settings

# إعدادات المحرك (Engine) مع الربط القوي بـ Azure
# أضفنا pool_size و pool_recycle لمنع سقوط الاتصال بعد فترة خمول
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,      # يتأكد من أن الاتصال فعال قبل كل طلب
    pool_size=10,            # عدد الاتصالات الدائمة
    max_overflow=20,         # أقصى زيادة للاتصالات عند الضغط
    pool_recycle=300,        # إعادة تدوير الاتصال كل 5 دقائق لمنع الـ Timeout
    connect_args={
        "timeout": 30        # زيادة وقت انتظار الاتصال لـ 30 ثانية
    }
)

# إنشاء مصنع الجلسات
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# القاعدة الأساسية لتعريف الجداول (Models)
Base = declarative_base()

# دالة الحصول على الجلسة (Dependency Injection)
def get_db():
    db = SessionLocal()
    try:
        # اختبار سريع للاتصال قبل إرسال الجلسة للراوتس
        # db.execute("SELECT 1") 
        yield db
    except Exception as e:
        print(f"❌ Database Session Error: {e}")
        raise
    finally:
        db.close()