from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from core.config import settings

# إعدادات المحرك (Engine) مع الربط القوي بـ Azure
# أضفنا pool_size و pool_recycle لمنع سقوط الاتصال بعد فترة خمول
# Support both SQLite (local) and Azure SQL (production)
is_sqlite = settings.DATABASE_URL.startswith("sqlite")
connect_args = {"timeout": 30} if is_sqlite else {}

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10 if not is_sqlite else 5,
    max_overflow=20 if not is_sqlite else 10,
    pool_recycle=300,
    connect_args=connect_args if connect_args else {}
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