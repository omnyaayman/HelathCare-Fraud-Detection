from services.azure_db import engine
from sqlalchemy import text

def update_provider_table():
    try:
        with engine.connect() as connection:
            print("Connected to Azure SQL. Syncing Schema...")

            # 1. إنشاء الجدول لو مش موجود أصلاً (أضمن طريقة)
            create_table_query = text("""
            IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Providers]') AND type in (N'U'))
            BEGIN
                CREATE TABLE [dbo].[Providers] (
                    id INT PRIMARY KEY IDENTITY(1,1),
                    username NVARCHAR(50) UNIQUE,
                    password NVARCHAR(100),
                    provider_name NVARCHAR(100)
                )
                PRINT 'Table [dbo].[Providers] created.'
            END
            """)
            connection.execute(create_table_query)
            connection.commit()

            # 2. إضافة الأعمدة (في حالة إن الجدول كان موجود بس ناقص)
            for col in ['username', 'password']:
                try:
                    connection.execute(text(f"ALTER TABLE [dbo].[Providers] ADD {col} NVARCHAR(100)"))
                    connection.commit()
                    print(f"- Column '{col}' added.")
                except:
                    pass # العمود موجود فعلاً

            # 3. إضافة مستخدم للتجربة
            # جربنا نستخدم dbo.Providers لضمان الوصول للمكان الصح
            check = connection.execute(text("SELECT * FROM [dbo].[Providers] WHERE username = 'admin_hospital'")).fetchone()
            
            if not check:
                insert_query = text("""
                    INSERT INTO [dbo].[Providers] (username, password, provider_name) 
                    VALUES ('admin_hospital', 'pass1234', 'Main Provider')
                """)
                connection.execute(insert_query)
                connection.commit()
                print("- Test user 'admin_hospital' created successfully.")

            print("\n✅ Database is ready!")

    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    update_provider_table()