from sqlalchemy import inspect
from services.azure_db import engine

def get_database_schema():
    # أداة التفتيش في SQLAlchemy
    inspector = inspect(engine)
    
    print(f"--- [استكشاف قاعدة البيانات: depi] ---")
    
    # 1. الحصول على أسماء كل الجداول
    tables = inspector.get_table_names()
    
    if not tables:
        print("⚠️ لم يتم العثور على أي جداول! تأكد من صلاحيات المستخدم.")
        return

    for table_name in tables:
        print(f"\n📌 الجدول: {table_name}")
        print("-" * 30)
        
        # 2. الحصول على تفاصيل الأعمدة لكل جدول
        columns = inspector.get_columns(table_name)
        
        for column in columns:
            name = column['name']
            type_ = column['type']
            nullable = "نعم" if column['nullable'] else "لا"
            print(f"🔹 العمود: {name:<20} | النوع: {str(type_):<15} | يقبل Null: {nullable}")

if __name__ == "__main__":
    try:
        get_database_schema()
    except Exception as e:
        print(f"❌ حدث خطأ أثناء الاستكشاف: {e}")