from database import get_connection

def test():
    try:
        conn = get_connection()
        cursor = conn.cursor()
        print(" you are connected to azure")

        cursor.execute("SELECT * FROM test")
        rows = cursor.fetchall()

        print("Data from 'test' table:")
        for row in rows:
            print(row)

    except Exception as e:
        print("Connection failed:", e)

    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    test()